// Mapuje ISO-2 country kódy ze Slackmap na čitelná česká jména.
// Cíl: sjednotit `state` sloupec přes oba datové zdroje (slack.cz CSV používá
// "Česká republika", Slackmap používá "CZ"). Filter UI pak vidí jednu hodnotu.
//
// Pokrývá top 30 zemí podle počtu lajn ve Slackmapě (~94 % datasetu).
// Pro neznámé kódy se vrací ISO-2 jako fallback — uživatel pořád pozná zemi,
// jen není přeloženo do češtiny.

const ISO_TO_CZ_NAME: Record<string, string> = {
  // Česko + sousední
  CZ: 'Česká republika',
  SK: 'Slovensko',
  DE: 'Německo',
  AT: 'Rakousko',
  PL: 'Polsko',
  HU: 'Maďarsko',
  // Top Evropa
  FR: 'Francie',
  GB: 'Velká Británie',
  ES: 'Španělsko',
  IT: 'Itálie',
  CH: 'Švýcarsko',
  NL: 'Nizozemsko',
  BE: 'Belgie',
  PT: 'Portugalsko',
  GR: 'Řecko',
  IE: 'Irsko',
  SE: 'Švédsko',
  NO: 'Norsko',
  FI: 'Finsko',
  DK: 'Dánsko',
  SI: 'Slovinsko',
  HR: 'Chorvatsko',
  RS: 'Srbsko',
  RO: 'Rumunsko',
  BG: 'Bulharsko',
  UA: 'Ukrajina',
  RU: 'Rusko',
  TR: 'Turecko',
  // Amerika
  US: 'USA',
  CA: 'Kanada',
  MX: 'Mexiko',
  BR: 'Brazílie',
  AR: 'Argentina',
  CL: 'Chile',
  CO: 'Kolumbie',
  PE: 'Peru',
  // Asie a Oceánie
  AU: 'Austrálie',
  NZ: 'Nový Zéland',
  JP: 'Japonsko',
  CN: 'Čína',
  IN: 'Indie',
  TH: 'Thajsko',
  // Afrika
  ZA: 'Jižní Afrika',
  MA: 'Maroko',
};

export function isoToCountryName(iso: string | null | undefined): string | null {
  if (!iso) return null;
  const upper = iso.toUpperCase().trim();
  return ISO_TO_CZ_NAME[upper] ?? upper;
}
