// MapLibre integrace. Mapy.cz raster tiles (aerial/outdoor) + OSM fallback.
// Sleduje bounds změny → mapStore, kreslí markery z viditelných slacklines.

import { useEffect, useMemo, useRef } from 'react';
import { StyleSheet, View, Pressable, Image } from 'react-native';
import { useTranslation } from 'react-i18next';
import MapLibreGL, { MapView, Camera, ShapeSource, CircleLayer, LineLayer, PointAnnotation } from '@maplibre/maplibre-react-native';
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

interface Props {
  markers: SlacklineListItem[];
  selectedId?: number | null;
  onMarkerPress?: (id: number) => void;
}

export default function MapViewComponent({ markers, selectedId, onMarkerPress }: Props) {
  const t = useTheme();
  const { t: tr } = useTranslation();
  const kind = useMapStore((s) => s.kind);
  const sheetHeight = useMapStore((s) => s.sheetHeight);
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
      padding: { paddingBottom: sheetHeight, paddingTop: 0, paddingLeft: 0, paddingRight: 0 },
    });
  };

  // Při prvním mountu posuň kameru na initialCenter s ohledem na výšku sheetu,
  // aby se výchozí lokalita (Ostrava) zobrazila ve viditelné části mapy nad sheetem.
  // defaultSettings v <Camera> tohle neumí — centruje vždy na střed MapView.
  const initialCenterApplied = useRef(false);
  useEffect(() => {
    if (initialCenterApplied.current) return;
    if (!cameraRef.current || sheetHeight === 0) return;
    cameraRef.current.setCamera({
      centerCoordinate: [initialCenter.lon, initialCenter.lat],
      zoomLevel: initialZoom,
      animationDuration: 0,
      padding: { paddingBottom: sheetHeight, paddingTop: 0, paddingLeft: 0, paddingRight: 0 },
    });
    initialCenterApplied.current = true;
  }, [sheetHeight, initialCenter, initialZoom]);

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
                ['==', ['get', 'selected'], 1], t.markerSelected,
                ['==', ['get', 'source'], 'slackmap'], t.markerSlackmap,
                t.markerCsv,
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
                ['==', ['get', 'selected'], 1], t.markerSelected,
                ['==', ['get', 'source'], 'slackmap'], t.markerSlackmap,
                t.markerCsv,
              ],
              circleStrokeWidth: 2,
              circleStrokeColor: [
                'case',
                ['==', ['get', 'selected'], 1], t.markerSelectedStroke,
                t.markerStroke,
              ],
            }}
          />
        </ShapeSource>

        <ShapeSource id="user-location-src" shape={userGeojson}>
          <CircleLayer
            id="user-location-halo"
            style={{
              circleRadius: 16,
              circleColor: t.userDot,
              circleOpacity: 0.18,
            }}
          />
        </ShapeSource>
        {userLoc && (
          <PointAnnotation
            key={`user-${t.userDot}-${t.markerStroke}`}
            id="user-location-marker"
            coordinate={[userLoc.lon, userLoc.lat]}
          >
            <View style={styles.userMarker}>
              <View
                style={[
                  styles.userMarkerSquare,
                  { backgroundColor: t.userDot, borderColor: t.markerStroke },
                ]}
              />
            </View>
          </PointAnnotation>
        )}
      </MapView>

      <Pressable
        onPress={flyToUser}
        style={[
          styles.logoBox,
          userLoc && { borderColor: t.userDot, borderWidth: 2, borderRadius: 30 },
        ]}
        accessibilityLabel={tr('home.gpsLabel')}
      >
        <Image
          source={require('../../assets/source/sl-ova-logo.png')}
          style={styles.logo}
          resizeMode="contain"
        />
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  map: { flex: 1 },
  gpsBtn: {
    position: 'absolute',
    bottom: 12,
    right: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 8,
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.25,
    shadowRadius: 3,
  },
  logoBox: {
    position: 'absolute',
    top: 8,
    left: 8,
    width: 56,
    height: 56,
    justifyContent: 'center',
    alignItems: 'center',
  },
  logo: { width: 56, height: 56 },
  userMarker: {
    width: 24,
    height: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  userMarkerSquare: {
    width: 14,
    height: 14,
    borderWidth: 2,
  },
});
