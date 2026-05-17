// Watch user location. Vrací null dokud není permission nebo první fix.
// Při unmountu odregistruje subscription.

import { useEffect, useState } from 'react';
import * as Location from 'expo-location';

export interface UserLocation {
  lat: number;
  lon: number;
  accuracy: number | null; // metry
}

export function useUserLocation(): UserLocation | null {
  const [loc, setLoc] = useState<UserLocation | null>(null);

  useEffect(() => {
    let sub: Location.LocationSubscription | null = null;
    let cancelled = false;

    (async () => {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted' || cancelled) return;

      // Cached last-known fix přijde okamžitě (<100ms) — uživatel vidí čtvereček
      // na mapě hned po startu, ne až po prvním watchPosition callbacku
      // (Balanced accuracy ~2-5 s). Pokud OS nemá cache (čerstvá instalace),
      // vrátí null a počká si na watchPositionAsync.
      try {
        const last = await Location.getLastKnownPositionAsync({ maxAge: 5 * 60 * 1000 });
        if (last && !cancelled) {
          setLoc({
            lat: last.coords.latitude,
            lon: last.coords.longitude,
            accuracy: last.coords.accuracy,
          });
        }
      } catch {}

      sub = await Location.watchPositionAsync(
        {
          accuracy: Location.Accuracy.Balanced, // ~50m, šetří baterii
          timeInterval: 5000,
          distanceInterval: 10,
        },
        (pos) => {
          if (cancelled) return;
          setLoc({
            lat: pos.coords.latitude,
            lon: pos.coords.longitude,
            accuracy: pos.coords.accuracy,
          });
        },
      );
    })().catch((e) => console.warn('[location]', String(e)));

    return () => {
      cancelled = true;
      sub?.remove();
    };
  }, []);

  return loc;
}
