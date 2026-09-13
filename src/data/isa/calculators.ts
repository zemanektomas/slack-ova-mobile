/**
 * Kalkulátory pro pokročilé uživatele (F5 v0.7.4).
 *
 * Data + formule pro 4 kalkulátory:
 *   1. anchorAngle  — síla na jednu nohu kotvy dle úhlu
 *   2. force        — peak force při pádu (Jörren 2015 data)
 *   3. ma           — mechanical advantage compound pulley
 *   4. deviation    — síla na deviaci (redirect pulley)
 *
 * Formule + referenční data pro tabulky. Komponenty používají tyto exporty.
 */

// -----------------------------------------------------------------------------
// 1. ANCHOR ANGLE
// -----------------------------------------------------------------------------

/**
 * Per-leg síla dle úhlu mezi rameny kotvy.
 * Formule: F_per_leg = F_total / (2 × cos(θ/2))
 *
 * Vrátí Infinity pro θ ≥ 180°.
 */
export function anchorPerLegForce(totalForceKn: number, angleDeg: number): number {
  if (angleDeg >= 180) return Infinity;
  if (angleDeg < 0) angleDeg = 0;
  const rad = (angleDeg / 2) * Math.PI / 180;
  const cos = Math.cos(rad);
  if (cos <= 0) return Infinity;
  return totalForceKn / (2 * cos);
}

/** Semafor hodnocení úhlu kotvy. */
export type AngleRating = 'ideal' | 'ok' | 'max' | 'caution' | 'stop' | 'never';

export function rateAngle(angleDeg: number): AngleRating {
  if (angleDeg <= 30) return 'ideal';
  if (angleDeg <= 45) return 'ok';
  if (angleDeg <= 60) return 'max';
  if (angleDeg <= 90) return 'caution';
  if (angleDeg <= 120) return 'stop';
  return 'never';
}

/** Referenční tabulka úhlů pro rychlé porovnání. */
export const ANGLE_REFERENCE_TABLE = [0, 30, 45, 60, 90, 120, 150];

// -----------------------------------------------------------------------------
// 2. FORCE ESTIMATOR (Jörren 2015 SlackLab data)
// -----------------------------------------------------------------------------

export type WebbingMaterial = 'PA' | 'PES' | 'HMPE';

/**
 * Peak-to-working ratio per materiál (dle Jörren 2015, 20m testovací lajna).
 * Anchor peak = ratio × working tension.
 */
export const PEAK_RATIO_20M: Record<WebbingMaterial, number> = {
  PA: 3.1,      // nylon popruh (2.3 → 7.2 kN test)
  PES: 4.3,     // polyester (2.2 → 9.1 kN test)
  HMPE: 6.8,   // UHMWPE (2.2 → 15.0 kN test)
};

/**
 * Leash peak (síla na odsedku).
 * Empiricky ze studie: leash peak ~ 40-70% anchor peak.
 */
export const LEASH_RATIO_TO_ANCHOR = 0.65;

/**
 * Extrapoluje peak force pro délky odlišné od 20m (Jörren baseline).
 * Delší lajna = víc stretch = nižší peak.
 * Aproximace: peak(L) ≈ peak(20) × (20/L)^0.3
 */
function lengthCorrection(lengthM: number): number {
  if (lengthM <= 20) return 1;
  return Math.pow(20 / lengthM, 0.3);
}

export interface ForceEstimate {
  anchorPeakKn: number;
  leashPeakKn: number;
  vsWorkingLimit: number;   // % z ISA:21 §1.3 working load ≤ 12 kN
  vsBackupfallLimit: number; // % z 8 kN
}

export function estimateForce(
  material: WebbingMaterial,
  lengthM: number,
  workingKn: number,
): ForceEstimate {
  const ratio = PEAK_RATIO_20M[material];
  const anchorPeak = workingKn * ratio * lengthCorrection(lengthM);
  const leashPeak = anchorPeak * LEASH_RATIO_TO_ANCHOR;
  return {
    anchorPeakKn: anchorPeak,
    leashPeakKn: leashPeak,
    vsWorkingLimit: (anchorPeak / 12) * 100,
    vsBackupfallLimit: (leashPeak / 8) * 100,
  };
}

/** Referenční tabulka délek pro porovnání. */
export const LENGTH_REFERENCE_TABLE = [20, 30, 50, 100, 200];

// -----------------------------------------------------------------------------
// 3. MA CALCULATOR
// -----------------------------------------------------------------------------

/**
 * Mechanical advantage compound pulley.
 * Teorie: MA = 2^N_movable
 * Reálné: MA × 0.9^N_pulley (cascading friction, 10% loss per pulley)
 *
 * Pull distance = MA × weblock_travel (tail metrů per 1m lajny).
 */
export interface MAResult {
  theoreticalMA: number;
  realMA: number;
  efficiency: number;         // 0..1
  pullDistanceRatio: number;  // metrů tail per 1 metr weblock travel
}

/**
 * @param movablePulleys — počet movable pulleys (compound stages)
 * @param fixedPulleys — počet fixed pulleys (redirect, nemá vliv na MA, jen friction)
 */
export function calculateMA(movablePulleys: number, fixedPulleys: number = 0): MAResult {
  if (movablePulleys <= 0) return { theoreticalMA: 1, realMA: 1, efficiency: 1, pullDistanceRatio: 1 };
  const theoreticalMA = Math.pow(2, movablePulleys);
  const totalPulleys = movablePulleys + fixedPulleys;
  const efficiency = Math.pow(0.9, totalPulleys);
  const realMA = theoreticalMA * efficiency;
  return {
    theoreticalMA,
    realMA,
    efficiency,
    pullDistanceRatio: theoreticalMA,
  };
}

/** Referenční tabulka počtu pulleys. */
export const MA_REFERENCE_TABLE = [1, 2, 3, 4, 5];

/** Buckingham system oficiální data (Balance Community). */
export const BUCKINGHAM_CONFIGS = [
  { name: 'Simple 3:1', theoreticalMA: 3, maxTensionKn: 2.0, description: '1× line grip + 1× Rolex na weblock tail' },
  { name: 'Compound 5:1', theoreticalMA: 5, maxTensionKn: 4.0, description: '+ 2-3m low-stretch rope se spliced eyes + 2. pulley' },
  { name: '9:1', theoreticalMA: 9, maxTensionKn: 5.0, description: '2 grips + 3 rollers, nejvíc friction' },
];

// -----------------------------------------------------------------------------
// 4. DEVIATION FORCE
// -----------------------------------------------------------------------------

/**
 * Síla na deviaci (redirect pulley) — Ropelab formule.
 * F = 2 × T × sin(θ/2)
 *
 * θ = úhel deviace (0° = žádná deviace, 180° = obrat 180°)
 * Poměr F/T:
 *   0°   = 0.00 × T
 *   60°  = 1.00 × T
 *   90°  = 1.41 × T
 *   120° = 1.73 × T
 *   180° = 2.00 × T (maximum)
 */
export function deviationForce(tensionKn: number, deviationAngleDeg: number): number {
  const rad = (deviationAngleDeg / 2) * Math.PI / 180;
  return 2 * tensionKn * Math.sin(rad);
}

/** Referenční tabulka úhlů deviace. */
export const DEVIATION_ANGLE_TABLE = [30, 60, 90, 120, 150, 180];

// -----------------------------------------------------------------------------
// 5. SAG TENSION (Kváš 2013 / RopeLab 2022) — jediný experimentálně ověřený
// -----------------------------------------------------------------------------

/**
 * Statický tah v mainline z geometrie (délka + průvěs + váha chodce).
 *
 * Formule (praktický tvar, přesná pod 1 % v pásmu highline):
 *   T [kN] = m [kg] × L [m] × 10 / (4 × sag [m] × 1000)
 * kde:
 *   m = váha chodce (kg)
 *   L = rozpětí lajny (m)
 *   sag = průvěs uprostřed (m)
 *   10 = g (m/s²), 1000 = kN převod
 *
 * Ověřeno tenzometrem (Kváš 2013, ČAS): odchylka 0,21 % a 1,12 %.
 * Delaney RopeLab 2022 (s. 55-62) potvrzuje nezávisle, kvantifikuje chybu:
 * −2 % při 10 % průvěsu, −3,5 % při 13 %, pod 1 % v pásmu highline.
 *
 * Pravidlo ČAS: rozpětí / průvěs ≤ 50 (jinak přes ISA:21 limit 12 kN).
 */
export function sagTension(walkerKg: number, spanM: number, sagM: number): number {
  if (sagM <= 0 || spanM <= 0) return Infinity;
  return (walkerKg * spanM * 10) / (4 * sagM * 1000);
}

/** Rating dle výsledného tahu (proti ISA:21 §1.3 limit 12 kN). */
export type SagRating = 'ideal' | 'ok' | 'max' | 'caution' | 'stop';

export function rateSagTension(tensionKn: number): SagRating {
  if (tensionKn <= 3) return 'ideal';    // volné longline / rodeo
  if (tensionKn <= 5) return 'ok';        // komfort HL
  if (tensionKn <= 8) return 'max';       // napnutá HL
  if (tensionKn <= 12) return 'caution';  // hranice ISA:21 §1.3
  return 'stop';                           // nad ISA limit
}

/** Referenční tabulka sag % pro dané rozpětí (default 80 kg). */
export const SAG_PERCENT_TABLE = [1, 2, 3, 5, 7, 10, 15, 20];

/** L/sag poměr — ČAS pravidlo max 50. */
export function lSagRatio(spanM: number, sagM: number): number {
  if (sagM <= 0) return Infinity;
  return spanM / sagM;
}

// -----------------------------------------------------------------------------
// 6. TAPE SPACING GENERATOR (Balance Community + TZ spoj-as-node insight)
// -----------------------------------------------------------------------------

export type LineType = 'walking' | 'trick' | 'longline' | 'rodeo';

/**
 * Balance Community tape spacing recommendations per délka lajny.
 * Zdroj: balancecommunity.com/blogs/slack-science/all-about-highline-tape-spacing
 */
interface SpacingRange {
  min: number;
  max: number;
}

export function bcSpacingRange(lengthM: number): SpacingRange {
  if (lengthM <= 20) return { min: 1.0, max: 2.0 };
  if (lengthM <= 50) return { min: 1.5, max: 3.0 };
  if (lengthM <= 100) return { min: 2.0, max: 5.0 };
  if (lengthM <= 200) return { min: 3.0, max: 6.0 };
  return { min: 3.0, max: 7.0 };
}

/** End zone rozteče (u kotev — friction + abrasion). */
const END_ZONE_RANGE: SpacingRange = { min: 1.0, max: 1.5 };

/** End zone délka (m) — první/poslední úsek u kotev. */
const END_ZONE_LENGTH_M = 10;

/** Trick zone spacing (pokud typ = trick, kolem středu). */
const TRICK_ZONE_RANGE: SpacingRange = { min: 1.0, max: 1.5 };
const TRICK_ZONE_FRACTION = 0.18; // ~18 % délky lajny kolem středu

export interface TapeSpanSegment {
  interval: number; // rozteč od předchozího tape pointu
  zone: 'end' | 'transition' | 'trick' | 'spoj-approach';
}

export interface TapePlan {
  segments: TapeSpanSegment[];
  hasJoin: boolean;
  joinIndex: number; // index v segments kde SPOJ (spojka mezi dvěma polovinami), -1 pokud nemá
  totalTapePoints: number;
  totalTapeM: number; // odhad délky pásky v m (22 cm/point standard method)
  bcRange: SpacingRange;
  lengthM: number;
  type: LineType;
}

/**
 * Deterministický random generator (mulberry32) — pro reprodukovatelnost.
 * Seed z Date.now() při Regenerate.
 */
function makeRand(seed: number): () => number {
  let s = seed | 0;
  return () => {
    s = (s + 0x6D2B79F5) | 0;
    let t = s;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function pickInRange(rand: () => number, range: SpacingRange, decimals = 1): number {
  const v = range.min + rand() * (range.max - range.min);
  return Math.round(v * Math.pow(10, decimals)) / Math.pow(10, decimals);
}

/**
 * Naplní zónu tape points s no-adjacent-duplicates + celkovým součtem = zoneLengthM.
 * Vrací seznam rozteček (intervalů).
 */
function fillZone(
  zoneLengthM: number,
  range: SpacingRange,
  rand: () => number,
  prevInterval: number | null,
): number[] {
  const intervals: number[] = [];
  let remaining = zoneLengthM;
  let last = prevInterval;
  let iterations = 0;
  const maxIter = 1000;

  while (remaining > range.max + 0.1 && iterations < maxIter) {
    iterations++;
    let candidate = pickInRange(rand, range);
    // No adjacent duplicate
    let tries = 0;
    while (last !== null && Math.abs(candidate - last) < 0.05 && tries < 20) {
      candidate = pickInRange(rand, range);
      tries++;
    }
    if (candidate > remaining) candidate = Math.max(range.min, remaining - range.min);
    intervals.push(candidate);
    remaining -= candidate;
    last = candidate;
  }
  // Poslední interval = zbývající vzdálenost (fit do rozsahu, nebo přijmi jako je)
  if (remaining > 0.05) {
    const finalInterval = Math.round(remaining * 10) / 10;
    intervals.push(finalInterval);
  }
  return intervals;
}

/**
 * Vygeneruje plán tejpování pro danou délku, typ a volitelný spoj.
 *
 * @param lengthM — délka lajny (m)
 * @param type — walking / trick / longline / rodeo
 * @param hasJoin — spoj uprostřed?
 * @param seed — random seed (Date.now() default)
 */
export function generateTapePlan(
  lengthM: number,
  type: LineType,
  hasJoin: boolean,
  seed: number = Date.now(),
): TapePlan {
  const rand = makeRand(seed);
  const bcRange = bcSpacingRange(lengthM);
  const endLen = Math.min(END_ZONE_LENGTH_M, lengthM * 0.15);
  const trickZoneLen = type === 'trick' ? lengthM * TRICK_ZONE_FRACTION : 0;

  const segments: TapeSpanSegment[] = [];
  let joinIndex = -1;

  // Half length (pokud spoj uprostřed, plán je zrcadlově kolem středu)
  const halfLength = hasJoin ? lengthM / 2 : lengthM;

  // Generate LEFT half (0 → midpoint or full line)
  {
    // Left end zone (od kotvy do endLen)
    const leftEnd = fillZone(endLen, END_ZONE_RANGE, rand, null);
    leftEnd.forEach((i) => segments.push({ interval: i, zone: 'end' }));

    // Left transition (endLen → half - trickZone/2)
    const trickHalf = trickZoneLen / 2;
    const transitionEnd = halfLength - trickHalf;
    const transitionLen = transitionEnd - endLen;
    if (transitionLen > 0) {
      const lastInt = segments.length > 0 ? segments[segments.length - 1].interval : null;
      const leftTrans = fillZone(transitionLen, bcRange, rand, lastInt);
      leftTrans.forEach((i) => segments.push({ interval: i, zone: 'transition' }));
    }

    // Left trick zone (pokud typ = trick)
    if (trickHalf > 0) {
      const lastInt = segments.length > 0 ? segments[segments.length - 1].interval : null;
      const leftTrick = fillZone(trickHalf, TRICK_ZONE_RANGE, rand, lastInt);
      leftTrick.forEach((i) => segments.push({ interval: i, zone: 'trick' }));
    }
  }

  // SPOJ marker
  if (hasJoin) {
    joinIndex = segments.length;
    // No cluster around spoj — spoj = natural node damper (TZ insight 13.9.2026)

    // RIGHT half (mirror image, but different random values)
    {
      const trickHalf = trickZoneLen / 2;
      // Right trick zone
      if (trickHalf > 0) {
        const lastInt = segments.length > 0 ? segments[segments.length - 1].interval : null;
        const rightTrick = fillZone(trickHalf, TRICK_ZONE_RANGE, rand, lastInt);
        rightTrick.forEach((i) => segments.push({ interval: i, zone: 'trick' }));
      }
      // Right transition
      const transitionLen = halfLength - trickHalf - endLen;
      if (transitionLen > 0) {
        const lastInt = segments.length > 0 ? segments[segments.length - 1].interval : null;
        const rightTrans = fillZone(transitionLen, bcRange, rand, lastInt);
        rightTrans.forEach((i) => segments.push({ interval: i, zone: 'transition' }));
      }
      // Right end zone
      const lastInt = segments.length > 0 ? segments[segments.length - 1].interval : null;
      const rightEnd = fillZone(endLen, END_ZONE_RANGE, rand, lastInt);
      rightEnd.forEach((i) => segments.push({ interval: i, zone: 'end' }));
    }
  }

  const totalTapePoints = segments.length;
  const totalTapeM = (totalTapePoints * 0.22); // 22 cm/point standard method

  return {
    segments,
    hasJoin,
    joinIndex,
    totalTapePoints,
    totalTapeM,
    bcRange,
    lengthM,
    type,
  };
}

/** Formátuje plán jako "1,3 – 1,0 – 1,4 – … – SPOJ – … – 1,1" string. */
export function formatTapePlan(plan: TapePlan): string {
  const parts: string[] = [];
  plan.segments.forEach((seg, idx) => {
    if (plan.hasJoin && idx === plan.joinIndex) parts.push('SPOJ');
    parts.push(seg.interval.toFixed(1).replace('.', ','));
  });
  // Pokud spoj je až za všemi levými segmenty (joinIndex == počet levých), přidej SPOJ na správné místo:
  // (výše řeší for-loop skrz idx === joinIndex; ale pokud joinIndex je na začátku pravé půle, se přidá při segmentu joinIndex — což je první pravý segment. Chybí vlastně, když idx projde joinIndex. Kontrola:)
  // Pokud plan.hasJoin ale SPOJ nebyl přidán (nikdy idx nedosáhne joinIndex protože joinIndex = segments.length je stejné jako idx nikdy nedosáhne), přidat na konec před posledními:
  return parts.join(' – ');
}

