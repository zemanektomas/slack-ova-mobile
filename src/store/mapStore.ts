import { create } from 'zustand';
import AsyncStorage from '@react-native-async-storage/async-storage';
import type { MapBounds } from '../types';

export type MapKind = 'aerial' | 'outdoor' | 'osm';

// Filtr datových zdrojů — která sada linií se zobrazí
export type SourceFilter = 'all' | 'csv' | 'slackmap';

const KIND_KEY = 'slackline_map_kind';
const SOURCE_KEY = 'slackline_source_filter';
const STATE_FILTER_KEY = 'slackline_state_filter';
// Marker, že auto-detect zemí proběhl alespoň jednou — i kdyby vrátil null,
// nechceme to opakovat při každém startu (Nominatim má 1 req/s limit).
const STATE_FILTER_INITIALIZED_KEY = 'slackline_state_filter_initialized';

interface MapState {
  bounds: MapBounds | null;
  center: { lat: number; lon: number };
  zoom: number;
  // Výška bottom sheetu (v px), aby mapa věděla kolik z viewportu je překryté
  // a mohla centrovat na střed VIDITELNÉ plochy, ne celého MapView.
  sheetHeight: number;
  kind: MapKind;
  sourceFilter: SourceFilter;
  // Text + cascading filtry pro seznam linií (persistují jen v paměti — po restartu reset).
  search: string;
  stateFilter: string | null;
  regionFilter: string | null;
  sectorFilter: string | null;
  setBounds: (b: MapBounds | null) => void;
  setCenter: (lat: number, lon: number) => void;
  setZoom: (z: number) => void;
  setSheetHeight: (h: number) => void;
  setKind: (k: MapKind) => void;
  setSourceFilter: (s: SourceFilter) => void;
  setSearch: (q: string) => void;
  setStateFilter: (s: string | null) => void;
  setRegionFilter: (r: string | null) => void;
  setSectorFilter: (s: string | null) => void;
  resetFilters: () => void;
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
  stateFilter: null,
  regionFilter: null,
  sectorFilter: null,
  setBounds: (bounds) => set({ bounds }),
  setCenter: (lat, lon) => set({ center: { lat, lon } }),
  setZoom: (zoom) => set({ zoom }),
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
  // State/region/sector jsou kaskádové — změna nadřazeného úrovně nuluje níže.
  // stateFilter navíc persistuje v AsyncStorage (přežije restart apky).
  setStateFilter: (stateFilter) => {
    set({ stateFilter, regionFilter: null, sectorFilter: null });
    // Použij speciální string pro null, AsyncStorage neumí undefined / null primitiva
    AsyncStorage.setItem(STATE_FILTER_KEY, stateFilter ?? '__none__').catch(() => {});
  },
  setRegionFilter: (regionFilter) => set({ regionFilter, sectorFilter: null }),
  setSectorFilter: (sectorFilter) => set({ sectorFilter }),
  resetFilters: () => {
    set({ search: '', stateFilter: null, regionFilter: null, sectorFilter: null });
    AsyncStorage.setItem(STATE_FILTER_KEY, '__none__').catch(() => {});
  },
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
      const sf = await AsyncStorage.getItem(STATE_FILTER_KEY);
      if (sf && sf !== '__none__') set({ stateFilter: sf });
    } catch {}
  },
}));
