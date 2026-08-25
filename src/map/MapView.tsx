// MapLibre integrace. Mapy.cz raster tiles (aerial/outdoor) + OSM fallback.
// Sleduje bounds změny → mapStore, kreslí markery z viditelných slacklines.

import { useEffect, useMemo, useRef, useState } from 'react';
import { StyleSheet, View, Pressable, Image, LayoutChangeEvent } from 'react-native';
import Animated, { useAnimatedStyle, useSharedValue, type SharedValue } from 'react-native-reanimated';
import { useTranslation } from 'react-i18next';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import {
  Map, Camera, GeoJSONSource, Layer,
  type MapRef, type CameraRef, type GeoJSONSourceRef,
} from '@maplibre/maplibre-react-native';
import { useMapStore, MapKind } from '../store/mapStore';
import { useTheme } from '../theme';
import { useUserLocation } from './useLocation';
import type { SlacklineListItem } from '../types';

// v11 nemá setAccessToken — MapLibre je vendor-agnostic, token nikdy nebyl potřeba.

const MAPY_KEY = process.env.EXPO_PUBLIC_MAPY_CZ_API_KEY ?? '';

// Font glyphs URL pro textovou vrstvu (cluster count). MapLibre potřebuje
// glyphs endpoint pro `textField` v symbol vrstvě. Použijem OpenMapTiles free font CDN
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
  /**
   * Horní hrana bottom sheetu (px od horní hrany kontejneru), z Gorhomu.
   * Ovládací tlačítka se podle ní pozicují přímo v UI threadu, takže sledují
   * tažení plynule. Diskrétní `sheetHeight` ze storu na to nestačí — aktualizuje
   * se až při dosednutí, takže tlačítka po animaci skákala (v0.7.14).
   */
  sheetPosition?: SharedValue<number>;
}

export default function MapViewComponent({ markers, selectedId, onMarkerPress, sheetPosition }: Props) {
  const t = useTheme();
  const { t: tr } = useTranslation();
  const kind = useMapStore((s) => s.kind);
  const sheetHeight = useMapStore((s) => s.sheetHeight);

  // Výška kontejneru — měřená, ne dopočítaná z okna. Root obrazovky je
  // SafeAreaView edges={['top']}, takže window height je o horní inset větší
  // a procenta snap pointů z ní počítaná sedí vedle.
  const containerH = useSharedValue(0);
  const onContainerLayout = (e: LayoutChangeEvent) => {
    containerH.value = e.nativeEvent.layout.height;
  };

  // Kolik sheet zabírá zdola + 12 px mezera. Počítá se v UI threadu z
  // animatedPosition, takže tlačítka sledují tažení plynule. Fallback na
  // diskrétní sheetHeight, kdyby prop nedorazil.
  const controlsStyle = useAnimatedStyle(() => {
    const occupied = sheetPosition
      ? Math.max(0, containerH.value - sheetPosition.value)
      : sheetHeight;
    return { bottom: occupied + 12 };
  }, [sheetHeight]);

  const setBounds = useMapStore((s) => s.setBounds);
  const setCenter = useMapStore((s) => s.setCenter);
  const initialCenter = useMapStore((s) => s.center);
  const initialZoom = useMapStore((s) => s.zoom);
  const hideLogo = useMapStore((s) => s.hideLogo);
  const hideControls = useMapStore((s) => s.hideControls);
  const userLoc = useUserLocation();
  // Konkretni typy, ne `any` — pri migraci na v11 `any` spolklo prejmenovane
  // metody (setCamera → setStop) a chyba spadla az za behu pri mountu.
  const cameraRef = useRef<CameraRef>(null);
  const mapRef = useRef<MapRef>(null);
  // GeoJSONSource ref — potřebujem pro `getClusterExpansionZoom(clusterId)` při tap
  // na cluster (zoom in dokud se cluster nerozpadne na single markery).
  const pointsSourceRef = useRef<GeoJSONSourceRef>(null);

  // Nativní metody v11 (getBounds, getZoom, setStop) vyhodí NullPointerException,
  // pokud je zavoláš dřív, než je nativní mapa hotová — a ta výjimka letí na
  // hlavním vlákně Androidu, takže ji JS try/catch nechytí a spadne celá apka
  // (v0.7.20). Proto se všechna nativní volání pouštějí až po onDidFinishLoadingMap.
  // Ref i state: ref kvůli guardům bez stale closure, state kvůli useEffectu.
  const [mapReady, setMapReady] = useState(false);
  const mapReadyRef = useRef(false);

  const refreshBounds = async () => {
    try {
      if (!mapRef.current || !mapReadyRef.current) return;
      // v11: LngLatBounds je ploché [west, south, east, north] (GeoJSON RFC pořadí)
      const b = await mapRef.current.getBounds();
      if (b && b.length === 4) {
        const [west, south, east, north] = b;
        setBounds({ sw: { lat: south, lon: west }, ne: { lat: north, lon: east } });
      }
    } catch {}
  };

  const handleMapReady = () => {
    mapReadyRef.current = true;
    setMapReady(true);
    refreshBounds();
  };

  const mapStyle = useMemo(() => buildStyle(kind), [kind]);

  const flyToUser = () => {
    if (!userLoc || !cameraRef.current || !mapReadyRef.current) return;
    cameraRef.current.setStop({
      center: [userLoc.lon, userLoc.lat],
      duration: 600,
      padding: { bottom: sheetHeight, top: 0, left: 0, right: 0 },
    });
  };

  // FlyTo na konkrétní lajnu (vyžádáno z InlineDetail přes mapStore.focusOn,
  // nebo automaticky při tap na řádek listu).
  // Zoom 15 = lajna i kotvy vidět detailně. Padding pod sheetem aby cíl nepadl
  // pod bottom sheet (uživatel má sheet typicky na Half = 50 %).
  //
  // ⚠️ V dep array MUSÍ být jen `focusTarget?.nonce` — kdyby tam byl i `sheetHeight`,
  // pohyb sheetu (drag, resize) by re-fire efekt a kamera by skočila zpět na starý
  // focus target i když user mezitím manuálně panoval mapou. sheetHeight se čte
  // ad-hoc při fire pro padding, ale jeho změna nesmí refire focus.
  const focusTarget = useMapStore((s) => s.focusTarget);
  useEffect(() => {
    if (!focusTarget || !cameraRef.current || !mapReadyRef.current) return;
    cameraRef.current.setStop({
      center: [focusTarget.lon, focusTarget.lat],
      zoom: 15,
      duration: 600,
      padding: { bottom: sheetHeight, top: 0, left: 0, right: 0 },
    });
  }, [focusTarget?.nonce]);

  // Pinch a tap se po SDK 54 (gesture-handler 2.28) míchají — na konci pinch-out
  // dorazí press event, trefí cluster a jeho handler odanimuje kameru zpátky
  // DOVNITŘ. Uživatel to vidí jako "mapa se sama zazoomuje zpět" (v0.7.14).
  // Press proto ignorujeme, pokud se mapa právě hýbala.
  const lastMoveAt = useRef(0);
  const markMoving = () => {
    lastMoveAt.current = Date.now();
  };
  /** true = press přišel jako ocásek gesta, ne jako záměrný tap */
  const pressDuringGesture = () => Date.now() - lastMoveAt.current < 300;

  const zoomBy = async (delta: number) => {
    if (!mapRef.current || !cameraRef.current || !mapReadyRef.current) return;
    try {
      const z = await mapRef.current.getZoom();
      cameraRef.current.zoomTo(Math.max(1, Math.min(20, z + delta)), { duration: 200 });
    } catch {}
  };

  // Při prvním mountu posuň kameru na initialCenter s ohledem na výšku sheetu,
  // aby se výchozí lokalita (Ostrava) zobrazila ve viditelné části mapy nad sheetem.
  // initialViewState v <Camera> tohle neumí — centruje vždy na střed mapy.
  const initialCenterApplied = useRef(false);
  useEffect(() => {
    if (initialCenterApplied.current) return;
    if (!cameraRef.current || sheetHeight === 0 || !mapReady) return;
    cameraRef.current.setStop({
      center: [initialCenter.lon, initialCenter.lat],
      zoom: initialZoom,
      duration: 0,
      padding: { bottom: sheetHeight, top: 0, left: 0, right: 0 },
    });
    initialCenterApplied.current = true;
  }, [sheetHeight, initialCenter, initialZoom, mapReady]);

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
      onLayout={(e) => {
        onContainerLayout(e);
        setTimeout(refreshBounds, 200);
      }}
    >
      <Map
        ref={mapRef}
        style={styles.map}
        mapStyle={mapStyle as any}
        touchRotate={false}
        touchPitch={false}
        compass={false}
        onDidFinishLoadingMap={handleMapReady}
        onRegionWillChange={markMoving}
        onRegionIsChanging={markMoving}
        onRegionDidChange={(e) => {
          markMoving();
          // v11 dává stav výřezu rovnou v nativeEvent — žádné hrabání v properties.
          const { center, bounds } = e.nativeEvent;
          if (bounds && bounds.length === 4) {
            const [west, south, east, north] = bounds;
            setBounds({ sw: { lat: south, lon: west }, ne: { lat: north, lon: east } });
          }
          if (center && center.length === 2) {
            setCenter(center[1], center[0]); // [lng, lat] → lat, lon
          }
        }}
      >
        <Camera
          ref={cameraRef}
          initialViewState={{
            center: [initialCenter.lon, initialCenter.lat],
            zoom: initialZoom,
          }}
        />
        <GeoJSONSource id="slacklines-lines-src" data={lineGeojson}>
          <Layer
            type="line"
            id="slacklines-lines"
            // Lines viditelné od zoom 9+ — souhlasí s clusterMaxZoom: 8.
            // Pod tím (zoom 0-8) jsou clusters, čáry by jen rušily vizuál odzoomované mapy.
            minzoom={9}
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
        </GeoJSONSource>
        <GeoJSONSource
          id="slacklines-points-src"
          ref={pointsSourceRef}
          data={pointGeojson}
          cluster
          clusterRadius={40}
          clusterMaxZoom={8}
          onPress={async (e) => {
            // Ocásek pinch/pan gesta — ne záměrný tap. Bez tohohle kamera po
            // pinch-out odanimuje zpátky dovnitř (cluster expansion zoom).
            if (pressDuringGesture() || !mapReadyRef.current) return;
            const feat: any = e?.nativeEvent?.features?.[0];
            if (!feat) return;
            if (feat.properties?.cluster) {
              // Cluster tap — zoom in do oblasti kde se rozpadne na single markery.
              // MapLibre vrací zoom level kde MapBox clusters už nepřežijí.
              try {
                // v11: cluster metody berou clusterId, ne celou feature
                const zoom = await pointsSourceRef.current?.getClusterExpansionZoom(
                  feat.properties.cluster_id,
                );
                const coords = feat.geometry?.coordinates;
                if (zoom && coords && cameraRef.current) {
                  cameraRef.current.setStop({
                    center: coords,
                    zoom,
                    duration: 400,
                    padding: { bottom: sheetHeight, top: 0, left: 0, right: 0 },
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
          <Layer
            type="circle"
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
          <Layer
            type="symbol"
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
          <Layer
            type="circle"
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
        </GeoJSONSource>

        {/* Anchor2 markery — bez clusteru, menší kruhy. Cluster count v points-src je
           jen z anchor1 (1 lajna = 1 počet). Anchor2 je vizuální completeness pro
           lajny s dvěma kotvami. */}
        <GeoJSONSource
          id="slacklines-anchor2-src"
          data={anchor2Geojson}
          onPress={(e) => {
            const id = (e?.nativeEvent?.features?.[0] as any)?.properties?.slacklineId;
            if (id && onMarkerPress) onMarkerPress(id);
          }}
        >
          <Layer
            type="circle"
            id="slacklines-anchor2-pins"
            // Anchor2 markery jen od zoom 9+ (stejně jako lines). V cluster zoom
            // jsou by jen ruseni — viditelný je jen anchor1 v clusteru.
            minzoom={9}
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
        </GeoJSONSource>

        {/* User polohu kreslíme čistě jako kruhové vrstvy (halo + dot). PointAnnotation
            v MapLibre RN je known issue — po camera move (flyTo, pan, focus na lajnu)
            občas vypadne z renderu a vrátí se až další coordinate change. kruhová vrstva
            přes GeoJSONSource je stabilní, MapLibre native side jasně mappuje source
            update na re-render. Vizuálně místo čtverečku máme kruh — na mapě je to
            srozumitelnější ("tady jsem" vs. waypoint pin). */}
        <GeoJSONSource id="user-location-src" data={userGeojson}>
          <Layer
            type="circle"
            id="user-location-halo"
            style={{
              circleRadius: 16,
              circleColor: t.userDot,
              circleOpacity: 0.18,
            }}
          />
          <Layer
            type="circle"
            id="user-location-dot"
            style={{
              circleRadius: 6,
              circleColor: t.userDot,
              circleStrokeColor: t.markerStroke,
              circleStrokeWidth: 2,
            }}
          />
        </GeoJSONSource>
      </Map>

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
        <Animated.View style={[styles.controls, controlsStyle]} pointerEvents="box-none">
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
        </Animated.View>
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
});
