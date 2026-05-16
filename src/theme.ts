// Theme tokens — light a dark varianty.
// useTheme() vrací aktivní paletu podle nastavení telefonu.
// app.json má userInterfaceStyle: "automatic" — RN poslouchá systém.

import { useColorScheme } from 'react-native';

export interface Theme {
  bg: string;          // hlavní pozadí obrazovky
  surface: string;     // pozadí karet, listů, header baru
  surfaceAlt: string;  // pozadí sort baru, řádků pod hover
  border: string;      // tenké oddělovače
  text: string;        // primary text
  textMuted: string;   // sekundární text, meta info
  textDim: string;     // labelky, "uppercase" hinty
  accent: string;      // UI aktivní stav (chip background, sort btn)
  accentOn: string;    // text na accent backgroundu
  markerHighline: string;  // marker highline (světle šedá — vyniká na mapě, hlavní fokus)
  markerOther: string;     // marker ostatní typy (longline, waterline, midline, ...) — tmavá
  markerSelected: string;  // vybraná lajna (marker + line)
  markerStroke: string;    // okraj markeru (kontrast vs. mapa)
  markerSelectedStroke: string; // okraj vybrané (musí být kontrast)
  userDot: string;         // moje poloha
  userDotStroke: string;   // okraj polohy
  danger: string;      // restriction, error stav
  dangerBg: string;
  mapStyle: 'light' | 'dark';
}

const light: Theme = {
  bg: '#f3f4f6',
  surface: '#ffffff',
  surfaceAlt: '#f9fafb',
  border: '#e5e7eb',
  text: '#111827',
  textMuted: '#6b7280',
  textDim: '#9ca3af',
  accent: '#111827',
  accentOn: '#ffffff',
  markerHighline: '#9ca3af',  // světle šedá — vyniká na podkladu mapy
  markerOther: '#1f2937',     // tmavě šedá — pro longline / waterline / ...
  markerSelected: '#ffffff',
  markerStroke: '#ffffff',
  markerSelectedStroke: '#000000',
  userDot: '#000000',
  userDotStroke: '#ffffff',
  danger: '#b91c1c',
  dangerBg: '#fee2e2',
  mapStyle: 'light',
};

const dark: Theme = {
  bg: '#0b0f17',
  surface: '#111827',
  surfaceAlt: '#1f2937',
  border: '#1f2937',
  text: '#f3f4f6',
  textMuted: '#9ca3af',
  textDim: '#6b7280',
  accent: '#f3f4f6',
  accentOn: '#0b0f17',
  markerHighline: '#d1d5db',  // světlejší = highlight v dark mode taky
  markerOther: '#6b7280',     // tmavší pro ostatní typy
  markerSelected: '#ffffff',
  markerStroke: '#000000',
  markerSelectedStroke: '#000000',
  userDot: '#ffffff',
  userDotStroke: '#000000',
  danger: '#fca5a5',
  dangerBg: '#3f1d1d',
  mapStyle: 'dark',
};

export function useTheme(): Theme {
  const scheme = useColorScheme();
  return scheme === 'dark' ? dark : light;
}
