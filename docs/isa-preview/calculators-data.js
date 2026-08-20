// Kalkulátory pro ISA preview — jednoduché numerické výpočty s live update.
// Přidat nový = objekt v CALCULATORS[] + implementace `compute()`.

const CALCULATORS = [
  // ========== EXISTUJÍCÍ (4) ==========
  {
    id: 'anchor-angle', status: 'existing', pictogram: '📐', weight: 5,
    title: 'Úhel kotvy',
    description: 'Vypočte per-leg sílu podle úhlu mezi rameny kotvy. Kritické: nad 120° síla roste exponenciálně.',
    inputs: [
      { id: 'angle', label: 'Úhel mezi rameny (°)', type: 'range', min: 0, max: 180, default: 60, step: 5 },
      { id: 'load', label: 'Total load (kN)', type: 'number', default: 12, min: 1, max: 50, step: 1 }
    ],
    compute: (v) => {
      const rad = (v.angle * Math.PI) / 180;
      const fPerLeg = v.load / (2 * Math.cos(rad / 2));
      let rating, ratingLabel;
      if (v.angle < 60) { rating = 'safe'; ratingLabel = '🟢 Bezpečné'; }
      else if (v.angle < 90) { rating = 'safe'; ratingLabel = '🟢 OK'; }
      else if (v.angle < 120) { rating = 'caution'; ratingLabel = '🟡 Caution'; }
      else if (v.angle < 150) { rating = 'danger'; ratingLabel = '🔴 Nebezpečné'; }
      else { rating = 'fatal'; ratingLabel = '💀 Fatal'; }
      return { value: fPerLeg.toFixed(1), unit: 'kN per rameno', rating, ratingLabel };
    },
    notes: [
      'ISA:21: úhel < 60° preferovaný, < 90° acceptable, > 120° NIKDY.',
      'Při 180° matematicky nekonečná síla (impossible).',
      'Basket hitch spanset ×~1.7-2 (dvojmo, angle < 60°).'
    ],
    references: 'ISA:21 §... anchor equalization'
  },
  {
    id: 'force-estimator', status: 'existing', pictogram: '📊', weight: 4,
    title: 'Odhad síly (fall force)',
    description: 'Peak force při pádu, dle délky HL, materiálu a working tension. Jörren 2015 SlackLab data.',
    inputs: [
      { id: 'length', label: 'Délka HL (m)', type: 'number', default: 50, min: 5, max: 500, step: 5 },
      { id: 'material', label: 'Materiál', type: 'select', options: [
        { value: 'pa', label: 'Nylon (PA)' },
        { value: 'pes', label: 'Polyester (PES)' },
        { value: 'uhmwpe', label: 'UHMWPE (Dyneema)' }
      ], default: 'pa' },
      { id: 'tension', label: 'Working tension (kN)', type: 'number', default: 2.5, min: 0.5, max: 15, step: 0.5 }
    ],
    compute: (v) => {
      const peakAt20 = { pa: 7, pes: 10, uhmwpe: 15 }[v.material];
      const peak = peakAt20 * Math.pow(20 / v.length, 0.3);
      const leashPeak = peak * 0.85; // approximation — leash sees ~85% of anchor peak
      const isaLimit = 12;
      let rating, ratingLabel;
      if (peak < 6) { rating = 'safe'; ratingLabel = '🟢 Bezpečné'; }
      else if (peak < 9) { rating = 'safe'; ratingLabel = '🟢 OK'; }
      else if (peak < isaLimit) { rating = 'caution'; ratingLabel = '🟡 Caution'; }
      else if (peak < 15) { rating = 'danger'; ratingLabel = '🔴 Nad ISA:21 limit'; }
      else { rating = 'fatal'; ratingLabel = '💀 Nad safe limit'; }
      return {
        value: peak.toFixed(1),
        unit: `kN peak (leash ~${leashPeak.toFixed(1)} kN)`,
        rating, ratingLabel
      };
    },
    notes: [
      'ISA:21 §1.3: leash fall ≤ 12 kN, backup fall ≤ 8 kN.',
      'Formule: peak(L) = peak(20) × (20/L)^0.3 (Jörren 2015 aproximace).',
      'PA (nylon) tlumí nejlépe → nejnižší peak. UHMWPE nejtvrdší ráz.',
      'Working tension 2-3 kN je normální pro rekreační HL.'
    ],
    references: 'Jörren 2015 SlackLab, ISA:21'
  },
  {
    id: 'mechanical-advantage', status: 'existing', pictogram: '⚙️', weight: 3,
    title: 'Mechanical Advantage (MA)',
    description: 'Kalkuluje teoretickou i reálnou MA a odhad pull distance. Buckingham reference.',
    inputs: [
      { id: 'movable', label: 'Movable pulleys', type: 'number', default: 2, min: 1, max: 6, step: 1 },
      { id: 'fixed', label: 'Fixed pulleys', type: 'number', default: 1, min: 0, max: 6, step: 1 },
      { id: 'pull', label: 'Pull force (kg)', type: 'number', default: 40, min: 5, max: 100, step: 5 }
    ],
    compute: (v) => {
      const theoretical = Math.pow(2, v.movable);
      const totalPulleys = v.movable + v.fixed;
      const efficiency = Math.pow(0.9, totalPulleys); // 10% loss per pulley
      const realMA = theoretical * efficiency;
      const pullKN = v.pull * 0.00981;
      const outputKN = pullKN * realMA;
      const pullDistance = realMA * 1; // for 1m rope pulled through system
      return {
        value: `${theoretical}:1 teoretická → ${realMA.toFixed(1)}:1 reálná`,
        unit: `→ ${outputKN.toFixed(2)} kN v lajně (z ${v.pull} kg pull)`,
        rating: 'safe', ratingLabel: `Pull distance ×${pullDistance.toFixed(1)}`
      };
    },
    notes: [
      'Reálná MA je ~50-60% teoretické (Buckingham data).',
      'Sweet spot: Compound 5:1 pro sólo tensioning.',
      'Simple 3:1 → max 2 kN per person. Compound 9:1 → max 5 kN.',
      'Nad 9:1 diminishing returns (setup time > pull time).'
    ],
    references: 'Balance Community — Basics of Buckingham'
  },
  {
    id: 'deviation-force', status: 'existing', pictogram: '↩️', weight: 4,
    title: 'Deviation Force',
    description: 'Síla na deviation point (pulley redirect, anchor bend). F = 2·T·sin(θ/2).',
    inputs: [
      { id: 'tension', label: 'Line tension (kN)', type: 'number', default: 10, min: 1, max: 30, step: 1 },
      { id: 'angle', label: 'Deviation angle (°) — kolik lajna zatočí', type: 'range', min: 0, max: 180, default: 90, step: 5 }
    ],
    compute: (v) => {
      const rad = (v.angle * Math.PI) / 180;
      const force = 2 * v.tension * Math.sin(rad / 2);
      const ratio = force / v.tension;
      let rating, ratingLabel;
      if (ratio < 0.7) { rating = 'safe'; ratingLabel = `${(ratio*100).toFixed(0)}% tension`; }
      else if (ratio < 1.4) { rating = 'caution'; ratingLabel = `${(ratio*100).toFixed(0)}% tension`; }
      else { rating = 'danger'; ratingLabel = `${(ratio*100).toFixed(0)}% tension`; }
      return {
        value: force.toFixed(2),
        unit: `kN na deviation point`,
        rating, ratingLabel
      };
    },
    notes: [
      'Deviation = pulley redirect, změna směru lajny.',
      '90° angle → deviation force = 1.4× line tension.',
      '120° angle → deviation force = 1.7× line tension.',
      'Anchor point v redirect polohu musí unést deviation force, ne jen line tension.'
    ],
    references: 'Standard rigging physics'
  },

  // ========== NAVRHOVANÉ NOVÉ (8) ==========
  {
    id: 'sag-tension', status: 'new', pictogram: '📉', weight: 4,
    title: 'Sag ↔ Tension',
    description: 'Vzájemný vztah tension a průhybu (sag) — parabolic approximation.',
    inputs: [
      { id: 'length', label: 'Délka lajny (m)', type: 'number', default: 50, min: 5, max: 500, step: 5 },
      { id: 'weight', label: 'Váha per m (kg/m)', type: 'number', default: 0.06, min: 0.02, max: 0.15, step: 0.01 },
      { id: 'tension', label: 'Tension (kN)', type: 'number', default: 5, min: 0.5, max: 15, step: 0.5 }
    ],
    compute: (v) => {
      const W = v.weight * v.length * 9.81 / 1000; // total weight in kN
      const sag = (W * v.length) / (8 * v.tension);
      const sagCm = sag * 100;
      let rating, ratingLabel;
      if (sagCm < 200) { rating = 'safe'; ratingLabel = '🟢 Nízký sag'; }
      else if (sagCm < 500) { rating = 'safe'; ratingLabel = '🟢 Normální'; }
      else if (sagCm < 1000) { rating = 'caution'; ratingLabel = '🟡 Vysoký sag'; }
      else { rating = 'danger'; ratingLabel = '🔴 Loose line'; }
      return {
        value: sag.toFixed(2),
        unit: `m sag (uprostřed lajny)`,
        rating, ratingLabel
      };
    },
    notes: [
      'Klidový sag — před chůzí. Se lezcem se prohne víc.',
      'Typický nylon HL 27 mm ~ 60 g/m. Dyneema ~ 40 g/m.',
      'Formule: sag = (W·L) / (8·T), parabolic approximation.'
    ],
    references: 'Standard cable mechanics'
  },
  {
    id: 'rlt-tracker', status: 'new', pictogram: '⏳', weight: 3,
    title: 'RLT Depletion Tracker',
    description: 'Kolik zbývá životnosti gearu (per Rated Lifetime specifikaci výrobce).',
    inputs: [
      { id: 'ratedCycles', label: 'RLT — max cyklů (dle výrobce)', type: 'number', default: 1000, min: 100, max: 10000, step: 100 },
      { id: 'usedCycles', label: 'Použito cyklů dosud', type: 'number', default: 200, min: 0, max: 10000, step: 10 }
    ],
    compute: (v) => {
      const remaining = v.ratedCycles - v.usedCycles;
      const percent = (remaining / v.ratedCycles) * 100;
      let rating, ratingLabel;
      if (percent > 50) { rating = 'safe'; ratingLabel = '🟢 OK'; }
      else if (percent > 20) { rating = 'caution'; ratingLabel = '🟡 Sleduj'; }
      else if (percent > 0) { rating = 'danger'; ratingLabel = '🔴 Blíží se RLT'; }
      else { rating = 'fatal'; ratingLabel = '💀 Přesáhl RLT'; }
      return {
        value: remaining,
        unit: `cyklů zbývá (${percent.toFixed(0)}%)`,
        rating, ratingLabel
      };
    },
    notes: [
      'Slacktivity seaHorse RLT ~1000 pulls.',
      'Nad 80% RLT → vyřadit z HL, jen do parku.',
      'Nad 100% RLT → discard completely.'
    ],
    references: 'ISA:41/51 RLT concept, Slacktivity specs'
  },
  {
    id: 'peak-at-bolt', status: 'new', pictogram: '🔩', weight: 4,
    title: 'Peak Force at Bolt',
    description: 'Síla na jeden borhák v 2-point anchor systému.',
    inputs: [
      { id: 'tension', label: 'Total anchor load (kN)', type: 'number', default: 12, min: 1, max: 50, step: 1 },
      { id: 'angle', label: 'Úhel mezi rameny (°)', type: 'range', min: 0, max: 180, default: 60, step: 5 }
    ],
    compute: (v) => {
      const rad = (v.angle * Math.PI) / 180;
      const forcePerBolt = v.tension / (2 * Math.cos(rad / 2));
      const isaMBS = 48;
      let rating, ratingLabel;
      if (forcePerBolt < 15) { rating = 'safe'; ratingLabel = '🟢 OK'; }
      else if (forcePerBolt < 30) { rating = 'safe'; ratingLabel = '🟢 Normální'; }
      else if (forcePerBolt < isaMBS) { rating = 'caution'; ratingLabel = '🟡 Blíží se limit'; }
      else { rating = 'danger'; ratingLabel = '🔴 Přesáhl ISA:21 borhák MBS'; }
      return {
        value: forcePerBolt.toFixed(1),
        unit: `kN per bolt`,
        rating, ratingLabel
      };
    },
    notes: [
      'ISA:21 Příloha 2 řádek 8: Attachment Structure MBS 48 kN.',
      'Reálné pull-test hodnoty borháků: 30-50 kN dle install kvality.',
      'Glue-in 12 mm chemical: 40 kN reálně.'
    ],
    references: 'ISA:21 Příloha 2, HowNot2 pull-test'
  },
  {
    id: 'anchor-material-selector', status: 'new', pictogram: '🎯', weight: 4,
    title: 'Anchor Material Selector',
    description: 'Doporučí konkrétní anchor material podle expected force + aplikace.',
    inputs: [
      { id: 'force', label: 'Expected max force (kN)', type: 'number', default: 12, min: 1, max: 50, step: 1 },
      { id: 'application', label: 'Aplikace', type: 'select', options: [
        { value: 'primary', label: 'Primary (48 kN required)' },
        { value: 'backup', label: 'Backup (24 kN required)' }
      ], default: 'primary' }
    ],
    compute: (v) => {
      const required = v.application === 'primary' ? 48 : 24;
      let recommendation, rating;
      if (v.application === 'primary') {
        if (v.force < 40) {
          recommendation = 'Fialový spanset 1T basket hitch (~150 kN), nebo 4-point BFK z 8mm (~64 kN)';
          rating = 'safe';
        } else {
          recommendation = 'Zelený spanset 2T basket (~280 kN), nebo dedicated primary sling';
          rating = 'caution';
        }
      } else {
        if (v.force < 24) {
          recommendation = 'Fialový spanset 1T larks foot (~40 kN), nebo 2-point Sliding-X z 8mm (~34 kN)';
          rating = 'safe';
        } else {
          recommendation = 'Fialový spanset basket, nebo dedicated backup';
          rating = 'safe';
        }
      }
      return {
        value: recommendation,
        unit: `(potřeba ≥${required} kN)`,
        rating,
        ratingLabel: v.force < required ? '🟢 Doporučené' : '🟡 Zkontrolovat'
      };
    },
    notes: [
      'Primary anchoring material: MBS 48 kN "in application" (ISA:21).',
      'Secondary anchoring material: MBS 24 kN "in application".',
      'Larks foot ×0.5, basket ×~2 (vůči direct pull MBS).'
    ],
    references: 'ISA:21 Příloha 2, ISA:53'
  },
  {
    id: 'buckingham-efficiency', status: 'new', pictogram: '⚙️', weight: 3,
    title: 'Buckingham Efficiency',
    description: 'Reálná MA vs. teoretická pro Buckingham konfigurace.',
    inputs: [
      { id: 'config', label: 'Konfigurace', type: 'select', options: [
        { value: '3', label: 'Simple 3:1' },
        { value: '5', label: 'Compound 5:1' },
        { value: '9', label: 'Compound 9:1' },
        { value: '15', label: 'Compound 15:1' }
      ], default: '5' },
      { id: 'people', label: 'Počet lidí', type: 'number', default: 1, min: 1, max: 4, step: 1 }
    ],
    compute: (v) => {
      const theoretical = parseInt(v.config);
      // Data ze Slacktivity YouTube měření
      const realMap = { '3': 1.7, '5': 3.0, '9': 5.0, '15': 8.0 };
      const real = realMap[v.config];
      const efficiency = (real / theoretical * 100).toFixed(0);
      const pullPerPerson = 40; // kg
      const totalPull = pullPerPerson * v.people * 0.00981; // kN
      const tension = totalPull * real;
      return {
        value: `${real}:1 reálná (${efficiency}% teoretické)`,
        unit: `→ ${tension.toFixed(1)} kN v lajně (${v.people}× 40 kg pull)`,
        rating: 'safe',
        ratingLabel: `Ušetříš ${(1 - real/theoretical) * 100 >> 0}% v pulling ale ztratíš ${(1 - real/theoretical) * 100 >> 0}% MA`
      };
    },
    notes: [
      'Data: Slacktivity YouTube pull-test.',
      'Simple 3:1 = max 2 kN per person. Compound 5:1 = max 4 kN. 9:1 = max 5 kN.',
      'Sweet spot je 5:1 pro solo — víc MA má diminishing returns.'
    ],
    references: 'Balance Community, Slacktivity'
  },
  {
    id: 'length-compat', status: 'new', pictogram: '🔗', weight: 3,
    title: 'Length Compatibility',
    description: 'Doporučená délka backup podle main (dle ISA:21 Příloha 5).',
    inputs: [
      { id: 'mainLen', label: 'Main length (m)', type: 'number', default: 50, min: 5, max: 500, step: 5 },
      { id: 'mainType', label: 'Main type', type: 'select', options: [
        { value: 'pa', label: 'Nylon (PA)' },
        { value: 'pes', label: 'Polyester (PES)' },
        { value: 'uhmwpe', label: 'UHMWPE' }
      ], default: 'pa' }
    ],
    compute: (v) => {
      // ISA:21 Příloha 5 — backup má být cca 0-3% delší než main (slight slack pro non-load-bearing)
      const backupMin = v.mainLen * 1.005;
      const backupMax = v.mainLen * 1.03;
      const recommendation = `${backupMin.toFixed(1)} — ${backupMax.toFixed(1)} m`;
      const under40 = v.mainLen < 40;
      const rating = 'safe';
      const nylonAlert = under40 && v.mainType !== 'pa' ? '⚠️ ALL-NYLON RULE: pro sub-40m HL musí být main PA!' : '';
      return {
        value: recommendation,
        unit: 'backup length (main + 0.5-3%)',
        rating,
        ratingLabel: nylonAlert || '🟢 OK'
      };
    },
    notes: [
      'Backup má být o něco delší než main (slight slack → nezatíží se během normální chůze).',
      'ISA:21 Příloha 5 length compatibility table.',
      'Sub-40m HL musí být main PA (nylon).'
    ],
    references: 'ISA:21 Příloha 5'
  },
  {
    id: 'peak-leash', status: 'new', pictogram: '🎗️', weight: 4,
    title: 'Peak Leash Force',
    description: 'Odhad peak force na leash při fall type + rigger weight + odsedka slack.',
    inputs: [
      { id: 'weight', label: 'Rigger weight (kg)', type: 'number', default: 75, min: 40, max: 130, step: 5 },
      { id: 'fallHeight', label: 'Fall height (m) — kolik lezec spadne', type: 'number', default: 1, min: 0.2, max: 5, step: 0.1 },
      { id: 'leashLength', label: 'Leash length (m)', type: 'number', default: 1.5, min: 0.5, max: 3, step: 0.1 }
    ],
    compute: (v) => {
      const fallFactor = v.fallHeight / v.leashLength;
      // Simplified: peak force ~ weight × (1 + sqrt(1 + 2·k·h/w·g)) where k = leash stiffness
      // Nylon leash stiffness aproximace
      const k = 4000; // N/m — rough for dynamic climbing rope
      const w = v.weight * 9.81;
      const peakN = w * (1 + Math.sqrt(1 + (2 * k * v.fallHeight) / w));
      const peakKN = peakN / 1000;
      const isaLimit = 12;
      let rating, ratingLabel;
      if (peakKN < 6) { rating = 'safe'; ratingLabel = '🟢 Bezpečné'; }
      else if (peakKN < 9) { rating = 'safe'; ratingLabel = '🟢 OK'; }
      else if (peakKN < isaLimit) { rating = 'caution'; ratingLabel = '🟡 Blíží se limit'; }
      else { rating = 'danger'; ratingLabel = '🔴 Nad ISA:21 12 kN'; }
      return {
        value: peakKN.toFixed(1),
        unit: `kN na leash (fall factor ${fallFactor.toFixed(2)})`,
        rating, ratingLabel
      };
    },
    notes: [
      'ISA:21 §1.3: leash fall ≤ 12 kN.',
      'Fall factor = fall height / leash length. FF > 1 je zásadní.',
      'Zjednodušený model — reálné hodnoty závisí na leash materiálu.'
    ],
    references: 'Standard rope physics, ISA:21'
  },
  {
    id: 'project-cost', status: 'new', pictogram: '💰', weight: 2,
    title: 'Project Cost / Gear List',
    description: 'Odhad meters tape, počet karabin/šeklů, gear list pro projekt.',
    inputs: [
      { id: 'length', label: 'Délka lajny (m)', type: 'number', default: 50, min: 5, max: 500, step: 5 },
      { id: 'tapeSpacing', label: 'Tape spacing (cm)', type: 'number', default: 40, min: 20, max: 100, step: 5 }
    ],
    compute: (v) => {
      const numTapes = Math.ceil((v.length * 100) / v.tapeSpacing);
      const tapeMeters = (numTapes * 22) / 100; // 22cm per tape avg (Backup-Affixed Slider)
      const bolts = 4; // 2 per side minimum
      const karabinas = 6; // 2 per side + 2 for leash
      return {
        value: `${numTapes} tapes → ${tapeMeters.toFixed(1)} m tejpu`,
        unit: `+ ${bolts} borháků + ${karabinas} karabin (min)`,
        rating: 'safe',
        ratingLabel: `Odhad`
      };
    },
    notes: [
      'Tape 22 cm per point (Backup-Affixed Slider, 3 wraps).',
      'Bolts: min 2 per anchor side = 4 total pro basic HL.',
      'Karabiny: 2 per anchor + 2 pro leash = 6 min. Reálně 8-10 s redundance.'
    ],
    references: 'Standard project planning'
  }
];
