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
import { useTheme } from '../theme';

const queryClient = new QueryClient();

export default function RootLayout() {
  const t = useTheme();
  const scheme = useColorScheme();
  const hydrate = useAuthStore((s) => s.hydrate);
  const hydrateMap = useMapStore((s) => s.hydrate);
  const [i18nReady, setI18nReady] = useState(false);

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
        hydrate();
        hydrateMap();
      } catch (e) {
        console.warn('[init] hydrate failed', String(e));
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

  if (!i18nReady) {
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
      </QueryClientProvider>
    </GestureHandlerRootView>
  );
}
