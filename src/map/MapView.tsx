// MapLibre integrace. Mapy.cz raster tiles (aerial/outdoor) + OSM fallback.
// Sleduje bounds změny → mapStore, kreslí markery z viditelných slacklines.

import { useEffect, useMemo, useRef } from 'react';
import { StyleSheet, View, Pressable, Image } from 'react-native';
import { useTranslation } from 'react-i18next';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import MapLibreGL, { MapView, Camera, ShapeSource, CircleLayer, LineLayer, PointAnnotation, SymbolLayer } from '@maplibre/maplibre-react-native';
import { useMapStore, MapKind } from '../store/mapStore';
import { useTheme } from '../theme';
import { useUserLocation } from './useLocation';
import type { SlacklineListItem } from '../types';

MapLibreGL.setAccessToken(null);

const MAPY_KEY = process.env.EXPO_PUBLIC_MAPY_CZ_API_KEY ?? '';

// Font glyphs URL pro SymbolLayer text rendering (cluster count). MapLibre potřebuje
// glyphs endpoint pro `textField` v SymbolLayer. Použijem OpenMapTiles free font CDN
// (Open Sans Regular, fungujе s každým MapLibre style i bez vlastních fontů).
const GLYPHS_URL = 'https://orangemug.github.io/font-glyphs/glyphs/{fontstack}/{range}.pbf';

function buildStyle(kind: MapKind) {
  // Mapy.cz: aerial = letecká, outdoor = turistická s vrstevnicemi
  if (kind !== 'osm' && MAPY_KEY) {
    const slug = kind === 'outdoor' ? 'outdoor' : 'aerial';
    return {
      version: 8,
      glyphs: GLYPHS_URL,
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
    glyphs: GLYPHS_URL,
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
  const hideLogo = useMapStore((s) => s.hideLogo);
  const hideControls = useMapStore((s) => s.hideControls);
  const userLoc = useUserLocation();
  const cameraRef = useRef<any>(null);
  const mapRef = useRef<any>(null);
  // ShapeSource ref — potřebujem pro `getClusterExpansionZoom(feature)` při tap
  // na cluster (zoom in dokud se cluster nerozpadne na single markery).
  const pointsSourceRef = useRef<any>(null);

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

  const zoomBy = async (delta: number) => {
    if (!mapRef.current || !cameraRef.current) return;
    try {
      const z = await mapRef.current.getZoom();
      cameraRef.current.zoomTo(Math.max(1, Math.min(20, z + delta)), 200);
    } catch {}
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
  //  - pointFeatures (s clusterem): JEN anchor1 — jeden bod per lajna, aby cluster
  //    počty odpovídaly počtu lajn (a ne kotev).
  //  - anchor2Features (bez clusteru, drobnější marker): druhá kotva jen pro vizuální
  //    completeness — uživatel vidí oba konce lajny, ale cluster jí nepočítá.
  //  - klik na anchor1 → detail; klik na anchor2 → také detail (UX symetrie).
  const lineFeatures: any[] = [];
  const pointFeatures: any[] = [];      // anchor1 (clusterované)
  const anchor2Features: any[] = [];    // anchor2 (drobné, bez clusteru)

  for (const m of markers) {
    if (!m.first_anchor) continue;
    const selected = selectedId === m.id ? 1 : 0;
    // isHighline = 1 pro highline, 0 pro vše ostatní (longline/waterline/midline/null/...).
    // Marker barva pak MapLibre expressional `case` rozhodne z této property.
    const isHighline = m.type === 'highline' ? 1 : 0;
    const a1 = [m.first_anchor.longitude, m.first_anchor.latitude];
    pointFeatures.push({
      type: 'Feature',
      id: `${m.id}-1`,
      properties: { slacklineId: m.id, name: m.name, role: 'anchor1', selected, isHighline },
      geometry: { type: 'Point', coordinates: a1 },
    });
    if (m.second_anchor) {
      const a2 = [m.second_anchor.longitude, m.second_anchor.latitude];
      anchor2Features.push({
        type: 'Feature',
        id: `${m.id}-2`,
        properties: { slacklineId: m.id, name: m.name, role: 'anchor2', selected, isHighline },
        geometry: { type: 'Point', coordinates: a2 },
      });
      lineFeatures.push({
        type: 'Feature',
        id: `${m.id}-line`,
        properties: { slacklineId: m.id, name: m.name, selected, isHighline },
        geometry: { type: 'LineString', coordinates: [a1, a2] },
      });
    }
  }

  const lineGeojson = { type: 'FeatureCollection' as const, features: lineFeatures };
  const pointGeojson = { type: 'FeatureCollection' as const, features: pointFeatures };
  const anchor2Geojson = { type: 'FeatureCollection' as const, features: anchor2Features };

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
            // Lines viditelné od zoom 9+ — souhlasí s clusterMaxZoomLevel: 8.
            // Pod tím (zoom 0-8) jsou clusters, čáry by jen rušily vizuál odzoomované mapy.
            minZoomLevel={9}
            style={{
              lineColor: [
                'case',
                ['==', ['get', 'selected'], 1], t.markerSelected,
                ['==', ['get', 'isHighline'], 1], t.markerHighline,
                t.markerOther,
              ],
              lineWidth: ['case', ['==', ['get', 'selected'], 1], 4, 2],
              lineOpacity: 0.95,
            }}
          />
        </ShapeSource>
        <ShapeSource
          id="slacklines-points-src"
          ref={pointsSourceRef}
          shape={pointGeojson}
          cluster
          clusterRadius={40}
          clusterMaxZoomLevel={8}
          onPress={async (e: any) => {
            const feat = e?.features?.[0];
            if (!feat) return;
            if (feat.properties?.cluster) {
              // Cluster tap — zoom in do oblasti kde se rozpadne na single markery.
              // MapLibre vrací zoom level kde MapBox clusters už nepřežijí.
              try {
                const zoom = await pointsSourceRef.current?.getClusterExpansionZoom(feat);
                const coords = feat.geometry?.coordinates;
                if (zoom && coords && cameraRef.current) {
                  cameraRef.current.setCamera({
                    centerCoordinate: coords,
                    zoomLevel: zoom,
                    animationDuration: 400,
                    padding: { paddingBottom: sheetHeight, paddingTop: 0, paddingLeft: 0, paddingRight: 0 },
                  });
                }
              } catch {}
              return;
            }
            const id = feat.properties?.slacklineId;
            if (id && onMarkerPress) onMarkerPress(id);
          }}
        >
          {/* Cluster background circle — větší než single marker, kontrast vs. mapa */}
          <CircleLayer
            id="slacklines-clusters"
            filter={['has', 'point_count']}
            style={{
              circleRadius: [
                'step',
                ['get', 'point_count'],
                14,    // < 10 lajn → 14 px
                10, 18,    // 10-99 → 18 px
                100, 22,   // 100-999 → 22 px
                1000, 28,  // 1000+ → 28 px
              ],
              circleColor: t.markerHighline,
              circleStrokeWidth: 2,
              circleStrokeColor: t.markerStroke,
              circleOpacity: 0.92,
            }}
          />
          {/* Cluster count text — uvnitř kruhu */}
          <SymbolLayer
            id="slacklines-cluster-count"
            filter={['has', 'point_count']}
            style={{
              textField: ['get', 'point_count_abbreviated'],
              // Open Sans Regular je k dispozici v orangemug font glyphs CDN (viz GLYPHS_URL).
              // Bez textFont MapLibre defaultne na ["Open Sans Regular","Arial Unicode MS Regular"]
              // a šahá pro `Arial Unicode MS Regular` který v CDN není → fail.
              textFont: ['Open Sans Regular'],
              textSize: 12,
              textColor: t.markerSelectedStroke,
              textIgnorePlacement: true,
              textAllowOverlap: true,
            }}
          />
          {/* Single pins (mimo cluster) — stejný jako předtím */}
          <CircleLayer
            id="slacklines-pins"
            filter={['!', ['has', 'point_count']]}
            style={{
              circleRadius: ['case', ['==', ['get', 'selected'], 1], 9, 6],
              circleColor: [
                'case',
                ['==', ['get', 'selected'], 1], t.markerSelected,
                ['==', ['get', 'isHighline'], 1], t.markerHighline,
                t.markerOther,
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

        {/* Anchor2 markery — bez clusteru, menší kruhy. Cluster count v points-src je
           jen z anchor1 (1 lajna = 1 počet). Anchor2 je vizuální completeness pro
           lajny s dvěma kotvami. */}
        <ShapeSource
          id="slacklines-anchor2-src"
          shape={anchor2Geojson}
          onPress={(e: any) => {
            const id = e?.features?.[0]?.properties?.slacklineId;
            if (id && onMarkerPress) onMarkerPress(id);
          }}
        >
          <CircleLayer
            id="slacklines-anchor2-pins"
            // Anchor2 markery jen od zoom 9+ (stejně jako lines). V cluster zoom
            // jsou by jen ruseni — viditelný je jen anchor1 v clusteru.
            minZoomLevel={9}
            style={{
              circleRadius: ['case', ['==', ['get', 'selected'], 1], 7, 4],
              circleColor: [
                'case',
                ['==', ['get', 'selected'], 1], t.markerSelected,
                ['==', ['get', 'isHighline'], 1], t.markerHighline,
                t.markerOther,
              ],
              circleStrokeWidth: 1.5,
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

      {!hideLogo && (
        <View style={styles.logoBox} pointerEvents="none">
          <Image
            source={require('../../assets/source/sl-ova-logo.png')}
            style={styles.logo}
            resizeMode="contain"
          />
        </View>
      )}

      {!hideControls && (
        <View style={[styles.controls, { bottom: sheetHeight + 12 }]} pointerEvents="box-none">
          <Pressable
            onPress={() => zoomBy(1)}
            style={[styles.ctrlBtn, { backgroundColor: t.surface, borderColor: t.border }]}
            accessibilityLabel={tr('home.zoomInLabel')}
          >
            <MaterialCommunityIcons name="plus" size={22} color={t.text} />
          </Pressable>
          <Pressable
            onPress={() => zoomBy(-1)}
            style={[styles.ctrlBtn, { backgroundColor: t.surface, borderColor: t.border }]}
            accessibilityLabel={tr('home.zoomOutLabel')}
          >
            <MaterialCommunityIcons name="minus" size={22} color={t.text} />
          </Pressable>
          <Pressable
            onPress={flyToUser}
            style={[
              styles.ctrlBtn,
              { backgroundColor: t.surface, borderColor: t.border },
              userLoc && { borderColor: t.userDot, borderWidth: 2 },
            ]}
            accessibilityLabel={tr('home.gpsLabel')}
          >
            <MaterialCommunityIcons name="crosshairs-gps" size={20} color={userLoc ? t.userDot : t.text} />
          </Pressable>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  map: { flex: 1 },
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
  controls: {
    position: 'absolute',
    // bottom = sheetHeight + 12 (dynamicky) aby ovládání plavalo nad bottom sheetem
    right: 8,
    gap: 8,
  },
  ctrlBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.2,
    shadowRadius: 2,
  },
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
