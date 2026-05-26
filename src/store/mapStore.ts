import { create } from 'zustand';
import AsyncStorage from '@react-native-async-storage/async-storage';
import type { MapBounds } from '../types';

export type MapKind = 'aerial' | 'outdoor' | 'osm';

// Filtr datových zdrojů — která sada linií se zobrazí
export type SourceFilter = 'all' | 'csv' | 'slackmap';

const KIND_KEY = 'slackline_map_kind';
const SOURCE_KEY = 'slackline_source_filter';
const HIDE_LOGO_KEY = 'slackline_hide_logo';
const HIDE_CONTROLS_KEY = 'slackline_hide_controls';
const CENTER_KEY = 'slackline_map_center';  // JSON {lat, lon, zoom}

// Debounced persist: mapa se hýbe ~na každý pixel během pan/zoom, ukládat do
// AsyncStorage každý frame by bylo zbytečné. Počkáme 2 s bez pohybu, pak zápis.
let persistTimer: ReturnType<typeof setTimeout> | null = null;
function schedulePersistCenter() {
  if (persistTimer) clearTimeout(persistTimer);
  persistTimer = setTimeout(() => {
    const { center, zoom } = useMapStore.getState();
    AsyncStorage.setItem(CENTER_KEY, JSON.stringify({ lat: center.lat, lon: center.lon, zoom })).catch(() => {});
  }, 2000);
}

interface MapState {
  bounds: MapBounds | null;
  center: { lat: number; lon: number };
  zoom: number;
  // Výška bottom sheetu (v px), aby mapa věděla kolik z viewportu je překryté
  // a mohla centrovat na střed VIDITELNÉ plochy, ne celého MapView.
  sheetHeight: number;
  kind: MapKind;
  sourceFilter: SourceFilter;
  // Vyhledávání — jen v paměti, po restartu reset.
  search: string;
  // Volby viditelnosti UI prvků na mapě (persistují).
  hideLogo: boolean;
  hideControls: boolean;
  // Cíl pro "vystředit na lajně" tlačítko v InlineDetail. MapView na něj reaguje
  // useEffectem (flyTo). `nonce` se zvyšuje při každém požadavku, aby se efekt
  // odpálil i když souřadnice zůstanou stejné (tap stejné lajny po move mapy).
  focusTarget: { lat: number; lon: number; nonce: number } | null;
  setBounds: (b: MapBounds | null) => void;
  setCenter: (lat: number, lon: number) => void;
  setZoom: (z: number) => void;
  setSheetHeight: (h: number) => void;
  setKind: (k: MapKind) => void;
  setSourceFilter: (s: SourceFilter) => void;
  setSearch: (q: string) => void;
  setHideLogo: (h: boolean) => void;
  setHideControls: (h: boolean) => void;
  focusOn: (lat: number, lon: number) => void;
  hydrate: () => Promise<void>;
}

export const useMapStore = create<MapState>((set) => ({
  bounds: null,
  center: { lat: 49.8347, lon: 18.2820 },
  zoom: 10,
  sheetHeight: 0,
  kind: 'osm',
  sourceFilter: 'all',
  search: '',
  hideLogo: false,
  hideControls: false,
  focusTarget: null,
  setBounds: (bounds) => set({ bounds }),
  setCenter: (lat, lon) => {
    set({ center: { lat, lon } });
    schedulePersistCenter();
  },
  setZoom: (zoom) => {
    set({ zoom });
    schedulePersistCenter();
  },
  setSheetHeight: (sheetHeight) => set({ sheetHeight }),
  setKind: (kind) => {
    set({ kind });
    AsyncStorage.setItem(KIND_KEY, kind).catch(() => {});
  },
  setSourceFilter: (sourceFilter) => {
    set({ sourceFilter });
    AsyncStorage.setItem(SOURCE_KEY, sourceFilter).catch(() => {});
  },
  setSearch: (search) => set({ search }),
  setHideLogo: (hideLogo) => {
    set({ hideLogo });
    AsyncStorage.setItem(HIDE_LOGO_KEY, hideLogo ? '1' : '0').catch(() => {});
  },
  setHideControls: (hideControls) => {
    set({ hideControls });
    AsyncStorage.setItem(HIDE_CONTROLS_KEY, hideControls ? '1' : '0').catch(() => {});
  },
  focusOn: (lat, lon) => set((state) => ({
    focusTarget: { lat, lon, nonce: (state.focusTarget?.nonce ?? 0) + 1 },
  })),
  hydrate: async () => {
    try {
      const k = await AsyncStorage.getItem(KIND_KEY);
      if (k === 'aerial' || k === 'outdoor' || k === 'osm') set({ kind: k });
    } catch {}
    try {
      const s = await AsyncStorage.getItem(SOURCE_KEY);
      if (s === 'all' || s === 'csv' || s === 'slackmap') set({ sourceFilter: s });
    } catch {}
    try {
      const hl = await AsyncStorage.getItem(HIDE_LOGO_KEY);
      if (hl === '1') set({ hideLogo: true });
    } catch {}
    try {
      const hc = await AsyncStorage.getItem(HIDE_CONTROLS_KEY);
      if (hc === '1') set({ hideControls: true });
    } catch {}
    // Posledně zobrazená oblast — pokud user už apku použil, vrátíme ho tam.
    // První spuštění (nic persisted) zůstává default Ostrava (centrum komunity).
    try {
      const raw = await AsyncStorage.getItem(CENTER_KEY);
      if (raw) {
        const parsed = JSON.parse(raw) as { lat: number; lon: number; zoom: number };
        if (
          typeof parsed.lat === 'number' && typeof parsed.lon === 'number' &&
          typeof parsed.zoom === 'number' &&
          parsed.lat >= -90 && parsed.lat <= 90 &&
          parsed.lon >= -180 && parsed.lon <= 180 &&
          parsed.zoom >= 1 && parsed.zoom <= 20
        ) {
          set({ center: { lat: parsed.lat, lon: parsed.lon }, zoom: parsed.zoom });
        }
      }
    } catch {}
  },
}));
