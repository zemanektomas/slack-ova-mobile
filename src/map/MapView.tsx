// MapLibre integrace. Mapy.cz raster tiles (aerial/outdoor) + OSM fallback.
// Sleduje bounds změny → mapStore, kreslí markery z viditelných slacklines.

import { useMemo, useRef } from 'react';
import { StyleSheet, View, Pressable, Image, Text } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import MapLibreGL, { MapView, Camera, ShapeSource, CircleLayer, LineLayer } from '@maplibre/maplibre-react-native';
import { useMapStore, MapKind } from '../store/mapStore';
import { useTheme } from '../theme';
import { useUserLocation } from './useLocation';
import type { SlacklineListItem } from '../types';

MapLibreGL.setAccessToken(null);

const MAPY_KEY = process.env.EXPO_PUBLIC_MAPY_CZ_API_KEY ?? '';

function buildStyle(kind: MapKind) {
  // Mapy.cz: aerial = letecká, outdoor = turistická s vrstevnicemi
  if (kind !== 'osm' && MAPY_KEY) {
    const slug = kind === 'outdoor' ? 'outdoor' : 'aerial';
    return {
      version: 8,
      sources: {
        mapy: {
          type: 'raster',
          tiles: [`https://api.mapy.cz/v1/maptiles/${slug}/256/{z}/{x}/{y}?apikey=${MAPY_KEY}`],
          tileSize: 256,
          attribution: '© Seznam.cz a.s. © OpenStreetMap',
        },
      },
      layers: [{ id: 'mapy-layer', type: 'raster', source: 'mapy' }],
    };
  }
  // OSM (vybráno ručně nebo fallback bez klíče)
  return {
    version: 8,
    sources: {
      osm: {
        type: 'raster',
        tiles: ['https://tile.openstreetmap.org/{z}/{x}/{y}.png'],
        tileSize: 256,
        attribution: '© OpenStreetMap contributors',
      },
    },
    layers: [{ id: 'osm-layer', type: 'raster', source: 'osm' }],
  };
}

const KIND_ICONS: Record<MapKind, keyof typeof MaterialCommunityIcons.glyphMap> = {
  aerial: 'satellite-variant',
  outdoor: 'terrain',
  osm: 'map-outline',
};
const KIND_LABELS: Record<MapKind, string> = {
  aerial: 'Letecká',
  outdoor: 'Turistická',
  osm: 'Mapa',
};

interface Props {
  markers: SlacklineListItem[];
  selectedId?: number | null;
  onMarkerPress?: (id: number) => void;
}

export default function MapViewComponent({ markers, selectedId, onMarkerPress }: Props) {
  const t = useTheme();
  const kind = useMapStore((s) => s.kind);
  const setKind = useMapStore((s) => s.setKind);
  const sourceFilter = useMapStore((s) => s.sourceFilter);
  const setSourceFilter = useMapStore((s) => s.setSourceFilter);
  const setBounds = useMapStore((s) => s.setBounds);
  const setCenter = useMapStore((s) => s.setCenter);
  const initialCenter = useMapStore((s) => s.center);
  const initialZoom = useMapStore((s) => s.zoom);
  const userLoc = useUserLocation();
  const cameraRef = useRef<any>(null);
  const mapRef = useRef<any>(null);

  const refreshBounds = async () => {
    try {
      if (!mapRef.current) return;
      const vb = await mapRef.current.getVisibleBounds();
      if (vb && vb.length === 2) {
        // vb = [[ne_lon, ne_lat], [sw_lon, sw_lat]]
        setBounds({
          sw: { lat: vb[1][1], lon: vb[1][0] },
          ne: { lat: vb[0][1], lon: vb[0][0] },
        });
      }
    } catch {}
  };

  const mapStyle = useMemo(() => buildStyle(kind), [kind]);

  const flyToUser = () => {
    if (!userLoc || !cameraRef.current) return;
    cameraRef.current.setCamera({
      centerCoordinate: [userLoc.lon, userLoc.lat],
      animationDuration: 600,
    });
  };

  const userGeojson = userLoc
    ? {
        type: 'FeatureCollection' as const,
        features: [
          {
            type: 'Feature' as const,
            properties: {},
            geometry: { type: 'Point' as const, coordinates: [userLoc.lon, userLoc.lat] },
          },
        ],
      }
    : { type: 'FeatureCollection' as const, features: [] };

  // Tři vrstvy:
  //  - lines: LineString mezi anchor1 a anchor2 (jen kde druhá kotva existuje)
  //  - pointsAll: všechny kotvy (první vždy, druhá kde je) — vykresluje se jako tečka
  //  - klik na bod → otevře detail příslušné slackline
  const lineFeatures: any[] = [];
  const pointFeatures: any[] = [];

  for (const m of markers) {
    if (!m.first_anchor) continue;
    const selected = selectedId === m.id ? 1 : 0;
    const source = m.source ?? 'csv';
    const a1 = [m.first_anchor.longitude, m.first_anchor.latitude];
    pointFeatures.push({
      type: 'Feature',
      id: `${m.id}-1`,
      properties: { slacklineId: m.id, name: m.name, role: 'anchor1', selected, source },
      geometry: { type: 'Point', coordinates: a1 },
    });
    if (m.second_anchor) {
      const a2 = [m.second_anchor.longitude, m.second_anchor.latitude];
      pointFeatures.push({
        type: 'Feature',
        id: `${m.id}-2`,
        properties: { slacklineId: m.id, name: m.name, role: 'anchor2', selected, source },
        geometry: { type: 'Point', coordinates: a2 },
      });
      lineFeatures.push({
        type: 'Feature',
        id: `${m.id}-line`,
        properties: { slacklineId: m.id, name: m.name, selected, source },
        geometry: { type: 'LineString', coordinates: [a1, a2] },
      });
    }
  }

  const lineGeojson = { type: 'FeatureCollection' as const, features: lineFeatures };
  const pointGeojson = { type: 'FeatureCollection' as const, features: pointFeatures };

  const KINDS: MapKind[] = MAPY_KEY ? ['aerial', 'outdoor', 'osm'] : ['osm'];

  return (
    <View
      style={styles.container}
      onLayout={() => setTimeout(refreshBounds, 200)}
    >
      <MapView
        ref={mapRef}
        style={styles.map}
        mapStyle={mapStyle as any}
        rotateEnabled={false}
        pitchEnabled={false}
        compassEnabled={false}
        onRegionDidChange={(feature: any) => {
          const vb = feature?.properties?.visibleBounds;
          const c = feature?.geometry?.coordinates;
          if (vb) {
            // vb = [[ne_lon, ne_lat], [sw_lon, sw_lat]]
            setBounds({
              sw: { lat: vb[1][1], lon: vb[1][0] },
              ne: { lat: vb[0][1], lon: vb[0][0] },
            });
          }
          if (c && Array.isArray(c) && c.length === 2) {
            setCenter(c[1], c[0]); // [lon, lat] → lat, lon
          }
        }}
      >
        <Camera
          ref={cameraRef}
          defaultSettings={{
            centerCoordinate: [initialCenter.lon, initialCenter.lat],
            zoomLevel: initialZoom,
          }}
        />
        <ShapeSource id="slacklines-lines-src" shape={lineGeojson}>
          <LineLayer
            id="slacklines-lines"
            style={{
              lineColor: [
                'case',
                ['==', ['get', 'selected'], 1], '#facc15',
                ['==', ['get', 'source'], 'slackmap'], '#6366f1', // indigo
                t.accent, // default = slack.cz modrá
              ],
              lineWidth: ['case', ['==', ['get', 'selected'], 1], 4, 2],
              lineOpacity: 0.95,
            }}
          />
        </ShapeSource>
        <ShapeSource
          id="slacklines-points-src"
          shape={pointGeojson}
          onPress={(e: any) => {
            const id = e?.features?.[0]?.properties?.slacklineId;
            if (id && onMarkerPress) onMarkerPress(id);
          }}
        >
          <CircleLayer
            id="slacklines-pins"
            style={{
              circleRadius: ['case', ['==', ['get', 'selected'], 1], 9, 6],
              circleColor: [
                'case',
                ['==', ['get', 'selected'], 1], '#facc15',
                ['==', ['get', 'source'], 'slackmap'], '#6366f1',
                t.accent,
              ],
              circleStrokeWidth: 2,
              circleStrokeColor: t.surface,
            }}
          />
        </ShapeSource>

        <ShapeSource id="user-location-src" shape={userGeojson}>
          <CircleLayer
            id="user-location-halo"
            style={{
              circleRadius: 14,
              circleColor: '#ef4444',
              circleOpacity: 0.18,
            }}
          />
          <CircleLayer
            id="user-location-dot"
            style={{
              circleRadius: 7,
              circleColor: '#ef4444',
              circleStrokeWidth: 2,
              circleStrokeColor: '#fff',
            }}
          />
        </ShapeSource>
      </MapView>

      <View style={styles.logoBox} pointerEvents="none">
        <Image
          source={{ uri: 'https://slack.cz/img/slack1.png' }}
          style={styles.logo}
          resizeMode="contain"
        />
      </View>

      <View style={[styles.kindBar, { backgroundColor: t.surface }]} pointerEvents="box-none">
        {KINDS.length > 1 && KINDS.map((k) => (
          <Pressable
            key={k}
            onPress={() => setKind(k)}
            style={[
              styles.kindBtn,
              kind === k && { backgroundColor: t.accent },
            ]}
            accessibilityLabel={KIND_LABELS[k]}
          >
            <MaterialCommunityIcons
              name={KIND_ICONS[k]}
              size={22}
              color={kind === k ? '#fff' : t.text}
            />
          </Pressable>
        ))}
        <Pressable
          onPress={flyToUser}
          disabled={!userLoc}
          style={styles.kindBtn}
          accessibilityLabel="Najdi mě"
        >
          <MaterialCommunityIcons
            name="crosshairs-gps"
            size={22}
            color={userLoc ? '#ef4444' : t.textDim}
          />
        </Pressable>
      </View>

      <View style={[styles.sourceBar, { backgroundColor: t.surface }]} pointerEvents="box-none">
        {([
          { key: 'all', label: 'Vše' },
          { key: 'csv', label: 'slack.cz' },
          { key: 'slackmap', label: 'Slackmap' },
        ] as { key: typeof sourceFilter; label: string }[]).map((s) => (
          <Pressable
            key={s.key}
            onPress={() => setSourceFilter(s.key)}
            style={[
              styles.sourceBtn,
              sourceFilter === s.key && { backgroundColor: t.accent },
            ]}
          >
            <Text
              style={[
                styles.sourceBtnText,
                { color: sourceFilter === s.key ? '#fff' : t.text },
              ]}
            >
              {s.label}
            </Text>
          </Pressable>
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  map: { flex: 1 },
  kindBar: {
    position: 'absolute',
    bottom: 12,
    right: 12,
    flexDirection: 'row',
    borderRadius: 8,
    overflow: 'hidden',
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.25,
    shadowRadius: 3,
  },
  kindBtn: { paddingHorizontal: 12, paddingVertical: 8 },
  kindBtnText: { fontSize: 12, fontWeight: '500' },
  sourceBar: {
    position: 'absolute',
    top: 8,
    right: 8,
    flexDirection: 'row',
    borderRadius: 8,
    overflow: 'hidden',
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.25,
    shadowRadius: 3,
  },
  sourceBtn: { paddingHorizontal: 10, paddingVertical: 6 },
  sourceBtnText: { fontSize: 11, fontWeight: '500' },
  logoBox: {
    position: 'absolute',
    top: -8,
    left: 8,
    height: 64,
    justifyContent: 'center',
  },
  logo: { width: 120, height: 40 },
});
