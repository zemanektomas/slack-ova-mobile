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
