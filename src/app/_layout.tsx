import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useEffect } from 'react';
import { useColorScheme } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Location from 'expo-location';
import { getDb, getMeta } from '../db';
import { getSlacklineCount } from '../db/queries';
import { seedFromCsv } from '../db/seed';
import { seedFromSlackmap } from '../db/slackmap';
import { reverseGeocodeCountry } from '../db/reverseGeocode';
import { useAuthStore } from '../store/authStore';
import { useMapStore } from '../store/mapStore';
import { useTheme } from '../theme';

const STATE_FILTER_INITIALIZED_KEY = 'slackline_state_filter_initialized';

const queryClient = new QueryClient();

export default function RootLayout() {
  const t = useTheme();
  const scheme = useColorScheme();
  const hydrate = useAuthStore((s) => s.hydrate);
  const hydrateMap = useMapStore((s) => s.hydrate);

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
        const seededCsv = await getMeta('seeded_from_csv');
        console.log('[init] csv pre-seed: count=', count, 'marker=', seededCsv);
        if (count === 0 || !seededCsv) {
          const r = await seedFromCsv();
          console.log('[init] csv seed result:', r);
        }
      } catch (e) {
        console.warn('[seed-csv] failed', String(e));
      }

      // Slackmap — naseedujeme z bundled JSON (assets/seed/slackmap_world.json).
      // Bundle obsahuje detaily pro všechny země; pull-to-refresh sáhne k netu.
      // Marker verzuje formát: bump = vynucené re-seed z bundle při dalším startu.
      //   bundled-v1: původní (state = ISO-2)
      //   bundled-v2: state normalizovaný na lidsky čitelné jméno (ISO -> "Česká republika"…)
      try {
        const seededSm = await getMeta('seeded_from_slackmap');
        console.log('[init] slackmap marker:', seededSm);
        if (seededSm !== 'bundled-v2') {
          const r = await seedFromSlackmap();
          console.log('[init] slackmap seed result:', r);
        }
        const finalCount = await getSlacklineCount();
        console.log('[init] total slacklines after seed:', finalCount);
      } catch (e) {
        console.warn('[seed-slackmap] failed', String(e));
      }

      // Tiché auto-detect zemi pro výchozí filter:
      // - Pokud user **má** GPS permission a marker ještě není uložený → detekuj.
      // - Pokud permission chybí, marker neuložíme — necháme šanci, že příště
      //   user dá permission (skrz crosshair) a my si detekci dohoneme.
      // - Marker se uloží i když detekce vrátí null (Nominatim 5s timeout)
      //   abychom to neopakovali při každém startu, ale **jen pokud bylo
      //   permission granted** — to je signál, že už user GPS chtěl.
      try {
        const initialized = await AsyncStorage.getItem(STATE_FILTER_INITIALIZED_KEY);
        console.log('[init-state-filter] initialized marker:', initialized);
        if (!initialized) {
          const perm = await Location.getForegroundPermissionsAsync();
          console.log('[init-state-filter] perm:', perm.status, 'granted:', perm.granted);
          if (perm.granted) {
            const pos = await Location.getLastKnownPositionAsync();
            console.log('[init-state-filter] lastKnown pos:', pos ? `${pos.coords.latitude},${pos.coords.longitude}` : 'null');
            if (pos) {
              const country = await reverseGeocodeCountry(pos.coords.latitude, pos.coords.longitude);
              console.log('[init-state-filter] reverse geocode country:', country);
              if (country) {
                useMapStore.getState().setStateFilter(country);
                console.log('[init-state-filter] setStateFilter applied');
              }
            }
            // Detekce proběhla (uspěla nebo selhala síťově) — neopakovat
            await AsyncStorage.setItem(STATE_FILTER_INITIALIZED_KEY, new Date().toISOString());
          } else {
            console.log('[init-state-filter] perm not granted — skipping detect, no marker');
          }
        }
      } catch (e) {
        console.warn('[init-state-filter] failed', String(e));
      }
    })();
  }, [hydrate]);

  return (
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
  );
}
