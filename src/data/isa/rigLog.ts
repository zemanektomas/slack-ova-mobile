/**
 * Full Rig Log — 3 hard gates + 9 tvrdých ano/ne + volitelný log (F5 v0.7.2).
 *
 * Vychází z pm/idea_rig_log.md — komplexní workflow stavby lajny od 0 do detension.
 *
 * Filozofie:
 * - 3 gates (A/B/C) jako hard checkpointy: "nahlas řekne OK a bez toho se nepokračuje"
 * - Body volitelné (rig log insight: "blokovat = lidi obejdou tím, že checklist nepoužijí")
 * - Log fields volitelné: max tension, doba stání, incident, vedoucí rigger
 *
 * Rozdíl vs. QuickCheck:
 * - QuickCheck (10 bodů) = pre-walk kontrola pro walkera. Před chůzí.
 * - Full rig log (Gates A+B+C + log) = kompletní workflow stavby lajny pro riggera.
 */

export type GateId = 'a' | 'b' | 'c';

export interface RigLogItem {
  id: string;
  labelKey: string;
  detailKey: string;
}

export interface RigLogGate {
  id: GateId;
  titleKey: string;
  descriptionKey: string;
  icon: string;
  items: RigLogItem[];
}

// -----------------------------------------------------------------------------
// GATE A — Kotvy schváleny (po posouzení kotev, před stavbou)
// -----------------------------------------------------------------------------

const GATE_A: RigLogGate = {
  id: 'a',
  titleKey: 'rigLog.gateA.title',
  descriptionKey: 'rigLog.gateA.description',
  icon: 'anchor',
  items: [
    {
      id: 'a1',
      labelKey: 'rigLog.gateA.a1',
      detailKey: 'rigLog.gateA.a1Detail',
    },
    {
      id: 'a2',
      labelKey: 'rigLog.gateA.a2',
      detailKey: 'rigLog.gateA.a2Detail',
    },
    {
      id: 'a3',
      labelKey: 'rigLog.gateA.a3',
      detailKey: 'rigLog.gateA.a3Detail',
    },
  ],
};

// -----------------------------------------------------------------------------
// GATE B — Systém schválen před natažením (po stavbě kotev + transport, před tension)
// -----------------------------------------------------------------------------

const GATE_B: RigLogGate = {
  id: 'b',
  titleKey: 'rigLog.gateB.title',
  descriptionKey: 'rigLog.gateB.description',
  icon: 'wrench',
  items: [
    {
      id: 'b1',
      labelKey: 'rigLog.gateB.b1',
      detailKey: 'rigLog.gateB.b1Detail',
    },
    {
      id: 'b2',
      labelKey: 'rigLog.gateB.b2',
      detailKey: 'rigLog.gateB.b2Detail',
    },
    {
      id: 'b3',
      labelKey: 'rigLog.gateB.b3',
      detailKey: 'rigLog.gateB.b3Detail',
    },
  ],
};

// -----------------------------------------------------------------------------
// GATE C — Lajna schválena k chůzi (druhý pár očí, před vstupem)
// -----------------------------------------------------------------------------

const GATE_C: RigLogGate = {
  id: 'c',
  titleKey: 'rigLog.gateC.title',
  descriptionKey: 'rigLog.gateC.description',
  icon: 'shield-check',
  items: [
    {
      id: 'c1',
      labelKey: 'rigLog.gateC.c1',
      detailKey: 'rigLog.gateC.c1Detail',
    },
    {
      id: 'c2',
      labelKey: 'rigLog.gateC.c2',
      detailKey: 'rigLog.gateC.c2Detail',
    },
    {
      id: 'c3',
      labelKey: 'rigLog.gateC.c3',
      detailKey: 'rigLog.gateC.c3Detail',
    },
  ],
};

// -----------------------------------------------------------------------------

export const RIG_LOG_GATES: RigLogGate[] = [GATE_A, GATE_B, GATE_C];

/** Utility: kolik bodů (checklist items) má full rig log celkem. */
export function countTotalGateItems(): number {
  return RIG_LOG_GATES.reduce((acc, g) => acc + g.items.length, 0);
}

// -----------------------------------------------------------------------------
// KOMPLETNÍ RIG WORKFLOW — 9 fází + 3 gates + průřezové vrstvy
// -----------------------------------------------------------------------------
//
// Vychází z pm/idea_rig_log.md příloha (papírová verze).
// Slouží jako **read-only referenční přehled** celého workflow stavby lajny —
// od plánu doma až po detension + odchod. Zobrazí se jako karta v Safety
// Companion (13. karta), NENÍ interaktivní (na rozdíl od Full Rig Log která
// je actionable checklist per lajnu).

export interface RigPhaseItem {
  labelKey: string;  // i18n klíč pro popis bodu (např. "rigWorkflow.p0.i1")
}

export interface RigPhase {
  id: string;               // 'p0' - 'p8'
  titleKey: string;         // i18n klíč titulu fáze
  icon: string;             // MaterialCommunityIcons
  items: RigPhaseItem[];    // 3-5 bodů per fáze
  gateAfter?: 'a' | 'b' | 'c';  // Který gate následuje (undefined = žádný)
}

export const RIG_PHASES: RigPhase[] = [
  {
    id: 'p0',
    titleKey: 'rigWorkflow.p0.title',
    icon: 'home-outline',
    items: [
      { labelKey: 'rigWorkflow.p0.i1' },
      { labelKey: 'rigWorkflow.p0.i2' },
      { labelKey: 'rigWorkflow.p0.i3' },
      { labelKey: 'rigWorkflow.p0.i4' },
      { labelKey: 'rigWorkflow.p0.i5' },
    ],
  },
  {
    id: 'p1',
    titleKey: 'rigWorkflow.p1.title',
    icon: 'car-outline',
    items: [
      { labelKey: 'rigWorkflow.p1.i1' },
      { labelKey: 'rigWorkflow.p1.i2' },
      { labelKey: 'rigWorkflow.p1.i3' },
      { labelKey: 'rigWorkflow.p1.i4' },
      { labelKey: 'rigWorkflow.p1.i5' },
    ],
  },
  {
    id: 'p2',
    titleKey: 'rigWorkflow.p2.title',
    icon: 'magnify',
    items: [
      { labelKey: 'rigWorkflow.p2.i1' },
      { labelKey: 'rigWorkflow.p2.i2' },
      { labelKey: 'rigWorkflow.p2.i3' },
      { labelKey: 'rigWorkflow.p2.i4' },
      { labelKey: 'rigWorkflow.p2.i5' },
    ],
    gateAfter: 'a',
  },
  {
    id: 'p3',
    titleKey: 'rigWorkflow.p3.title',
    icon: 'anchor',
    items: [
      { labelKey: 'rigWorkflow.p3.i1' },
      { labelKey: 'rigWorkflow.p3.i2' },
      { labelKey: 'rigWorkflow.p3.i3' },
      { labelKey: 'rigWorkflow.p3.i4' },
      { labelKey: 'rigWorkflow.p3.i5' },
    ],
  },
  {
    id: 'p4',
    titleKey: 'rigWorkflow.p4.title',
    icon: 'arrow-right-bold-outline',
    items: [
      { labelKey: 'rigWorkflow.p4.i1' },
      { labelKey: 'rigWorkflow.p4.i2' },
      { labelKey: 'rigWorkflow.p4.i3' },
      { labelKey: 'rigWorkflow.p4.i4' },
    ],
  },
  {
    id: 'p5',
    titleKey: 'rigWorkflow.p5.title',
    icon: 'weight-lifter',
    items: [
      { labelKey: 'rigWorkflow.p5.i1' },
      { labelKey: 'rigWorkflow.p5.i2' },
      { labelKey: 'rigWorkflow.p5.i3' },
      { labelKey: 'rigWorkflow.p5.i4' },
      { labelKey: 'rigWorkflow.p5.i5' },
    ],
    gateAfter: 'b',
  },
  {
    id: 'p6',
    titleKey: 'rigWorkflow.p6.title',
    icon: 'eye-check-outline',
    items: [
      { labelKey: 'rigWorkflow.p6.i1' },
      { labelKey: 'rigWorkflow.p6.i2' },
      { labelKey: 'rigWorkflow.p6.i3' },
      { labelKey: 'rigWorkflow.p6.i4' },
      { labelKey: 'rigWorkflow.p6.i5' },
    ],
    gateAfter: 'c',
  },
  {
    id: 'p7',
    titleKey: 'rigWorkflow.p7.title',
    icon: 'walk',
    items: [
      { labelKey: 'rigWorkflow.p7.i1' },
      { labelKey: 'rigWorkflow.p7.i2' },
      { labelKey: 'rigWorkflow.p7.i3' },
      { labelKey: 'rigWorkflow.p7.i4' },
      { labelKey: 'rigWorkflow.p7.i5' },
    ],
  },
  {
    id: 'p8',
    titleKey: 'rigWorkflow.p8.title',
    icon: 'exit-run',
    items: [
      { labelKey: 'rigWorkflow.p8.i1' },
      { labelKey: 'rigWorkflow.p8.i2' },
      { labelKey: 'rigWorkflow.p8.i3' },
      { labelKey: 'rigWorkflow.p8.i4' },
      { labelKey: 'rigWorkflow.p8.i5' },
    ],
  },
];

/** Průřezové vrstvy — platí ve všech fázích */
export interface CrossCuttingLayer {
  id: string;
  titleKey: string;
  icon: string;
  itemKeys: string[];
}

export const CROSS_CUTTING_LAYERS: CrossCuttingLayer[] = [
  {
    id: 'material',
    titleKey: 'rigWorkflow.crossCutting.material.title',
    icon: 'cube-outline',
    itemKeys: [
      'rigWorkflow.crossCutting.material.i1',
      'rigWorkflow.crossCutting.material.i2',
      'rigWorkflow.crossCutting.material.i3',
    ],
  },
  {
    id: 'safety',
    titleKey: 'rigWorkflow.crossCutting.safety.title',
    icon: 'shield-outline',
    itemKeys: [
      'rigWorkflow.crossCutting.safety.i1',
      'rigWorkflow.crossCutting.safety.i2',
      'rigWorkflow.crossCutting.safety.i3',
    ],
  },
  {
    id: 'people',
    titleKey: 'rigWorkflow.crossCutting.people.title',
    icon: 'account-group-outline',
    itemKeys: [
      'rigWorkflow.crossCutting.people.i1',
      'rigWorkflow.crossCutting.people.i2',
      'rigWorkflow.crossCutting.people.i3',
    ],
  },
];
