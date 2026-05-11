import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useEffect } from 'react';
import { useColorScheme } from 'react-native';
import { getDb, getMeta } from '../db';
import { getSlacklineCount } from '../db/queries';
import { seedFromCsv } from '../db/seed';
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
        if (count === 0 || !seededCsv) {
          await seedFromCsv();
        }
      } catch (e) {
        console.warn('[seed-csv] failed', String(e));
      }

      // Slackmap — naseedujeme z bundled JSON (assets/seed/slackmap_world.json).
      // Bundle obsahuje detaily pro všechny země; pull-to-refresh sáhne k netu.
      // Marker 'bundled-v1' = nový formát, vynutí re-seed po update bundlu.
      try {
        const seededSm = await getMeta('seeded_from_slackmap');
        if (seededSm !== 'bundled-v1') {
          await seedFromSlackmap();
        }
      } catch (e) {
        console.warn('[seed-slackmap] failed', String(e));
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
