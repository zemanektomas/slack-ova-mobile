import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useEffect, useState } from 'react';
import { useColorScheme, View } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { initI18n } from '../i18n';
import { useLangStore } from '../store/langStore';
import { getDb, getMeta } from '../db';
import { getSlacklineCount } from '../db/queries';
import { seedFromSlackcz } from '../db/seedSlackcz';
import { seedFromSlackmap } from '../db/slackmap';
import { useAuthStore } from '../store/authStore';
import { useMapStore } from '../store/mapStore';
import { useLevelStore } from '../store/levelStore';
import { useTheme } from '../theme';
import { OnboardingSheet } from '../components/OnboardingSheet';

const queryClient = new QueryClient();

export default function RootLayout() {
  const t = useTheme();
  const scheme = useColorScheme();
  const hydrate = useAuthStore((s) => s.hydrate);
  const hydrateMap = useMapStore((s) => s.hydrate);
  const hydrateLevel = useLevelStore((s) => s.hydrate);
  const onboardingSeen = useLevelStore((s) => s.onboardingSeen);
  const [i18nReady, setI18nReady] = useState(false);
  const [mapHydrated, setMapHydrated] = useState(false);
  const [levelHydrated, setLevelHydrated] = useState(false);
  const [showOnboarding, setShowOnboarding] = useState(false);

  useEffect(() => {
    initI18n()
      .then((lang) => {
        // Synchronizuj store s detekovaným jazykem (bez persist callbacku)
        useLangStore.setState({ lang });
        setI18nReady(true);
      })
      .catch((e) => {
        console.warn('[init] i18n failed', String(e));
        setI18nReady(true); // pokračuj i kdyby selhala, máme fallback
      });
  }, []);

  useEffect(() => {
    (async () => {
      try {
        await getDb();
      } catch (e) {
        console.warn('[init] getDb failed', String(e));
        return;
      }
      try {
        // hydrateMap musí být await + gate render, jinak MapView mountuje s default
        // Ostrava center než stihne načíst persisted polohu → trh při startu.
        // auth hydrate (Slackmap JWT z secure-store) běží paralelně, ne čekáme —
        // sign-in/sign-out UI v Settings se zobrazí korektně po hydrate jakmile dorazí.
        await Promise.all([hydrate(), hydrateMap(), hydrateLevel()]);
      } catch (e) {
        console.warn('[init] hydrate failed', String(e));
      }
      setMapHydrated(true);
      setLevelHydrated(true);
      // Zobraz onboarding jen jednou při 1. instalaci (onboardingSeen === false)
      // Čekáme na hydrate než uděláme rozhodnutí — jinak by se blesklo na starých instalacích.
      const seen = useLevelStore.getState().onboardingSeen;
      if (!seen) {
        setShowOnboarding(true);
      }

      try {
        const count = await getSlacklineCount();
        const seededSlackcz = await getMeta('seeded_from_csv');
        console.log('[init] slackcz pre-seed: count=', count, 'marker=', seededSlackcz);
        // slackcz-v1 = fresh slack.cz JSON scraper (254 lajn, point2 + parking pro 52 %).
        // Predtim jsme nacitali z CSV (csv-v2, csv-v1, ISO timestamp z davnejsiho dev).
        // Bump na slackcz-v1 -> jednorazovy re-seed pro vsechny existujici instalace.
        if (count === 0 || !seededSlackcz || !seededSlackcz.startsWith('slackcz-v')) {
          const r = await seedFromSlackcz();
          console.log('[init] slackcz seed result:', r);
        }
      } catch (e) {
        console.warn('[seed-slackcz] failed', String(e));
      }

      // Slackmap — naseedujeme z bundled JSON (assets/seed/slackmap_world.json).
      // Bundle obsahuje detaily pro všechny země; pull-to-refresh sáhne k netu.
      // Marker verzuje formát: bump = vynucené re-seed z bundle při dalším startu.
      //   bundled-v1: původní (state = ISO-2)
      //   bundled-v2: state normalizovaný na lidsky čitelné jméno (ISO -> "Česká republika"…)
      //   bundled-v3: rich fields (anchorsInfo, accessInfo, isMeasured) + slackmap name `.trim()` fix
      try {
        const seededSm = await getMeta('seeded_from_slackmap');
        console.log('[init] slackmap marker:', seededSm);
        if (seededSm !== 'bundled-v3') {
          const r = await seedFromSlackmap();
          console.log('[init] slackmap seed result:', r);
        }
        const finalCount = await getSlacklineCount();
        console.log('[init] total slacklines after seed:', finalCount);
      } catch (e) {
        console.warn('[seed-slackmap] failed', String(e));
      }

    })();
  }, [hydrate]);

  if (!i18nReady || !mapHydrated || !levelHydrated) {
    return <View style={{ flex: 1, backgroundColor: t.bg }} />;
  }

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <QueryClientProvider client={queryClient}>
        <StatusBar style={scheme === 'dark' ? 'light' : 'dark'} />
        <Stack
          screenOptions={{
            headerStyle: { backgroundColor: t.surface },
            headerTintColor: t.text,
            headerTitleStyle: { color: t.text },
            contentStyle: { backgroundColor: t.bg },
          }}
        >
          <Stack.Screen name="index" options={{ headerShown: false }} />
        </Stack>
        <OnboardingSheet
          visible={showOnboarding}
          onClose={() => setShowOnboarding(false)}
        />
      </QueryClientProvider>
    </GestureHandlerRootView>
  );
}
