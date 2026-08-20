// Karty pro ISA preview — editovat obsah tady, refresh browser = okamžitá změna.
// Kategorie: basics / anchor / safety-rules / environmental / gear / rescue / people
// Váha (safety impact): 1-5

const CARDS = [
  // ========== EXISTUJÍCÍ (14) ==========
  {
    id: 'novice', status: 'existing', pictogram: '🌱', category: 'basics', weight: 4,
    title: 'Začínáš? Přečti si nejdřív',
    subtitle: '5 bodů — nováček advisory',
    points: [
      { label: 'Highline NENÍ DIY z apky', detail: 'Apka je reference, ne substituce tréninku. Highline = life-safety, chyba = fatal.' },
      { label: 'Nikdy nestavěj sám', detail: 'První highlines jen se zkušeným rigerem. Minimum 2-3 lidí.' },
      { label: 'Najdi si komunitu', detail: 'FB skupiny, ISA cluby, lokální slack.cz komunita. Nauč se od lidí, ne z textu.' },
      { label: 'Choď na kurzy (ISA)', detail: 'ISA Instructor C, Rigger Cert. Formální trénink je nezastupitelný.' },
      { label: 'Začni na nízkých parkových lajnách', detail: 'Postup od nízkých po vyšší postupně. Rok+ zkušeností než první HL.' }
    ],
    references: 'Komunitní best practice, ISA training pathway',
    postCert: null
  },
  {
    id: 'isa21-limits', status: 'existing', pictogram: '⚡', category: 'safety-rules', weight: 5,
    title: 'ISA:21 Force Limits',
    subtitle: 'Klíčové limity celého systému',
    points: [
      { label: 'Leash fall ≤ 12 kN', detail: 'Peak force na tělo při pádu do odsedky (dimenzující scénář).' },
      { label: 'Backup fall ≤ 8 kN', detail: 'Peak force na spoj mainline↔backup (nižší = backup se aktivuje s minimem shock).' },
      { label: 'Working load ≤ 12 kN', detail: 'Maximální tension v mainline (klidový + user weight + wind).' }
    ],
    references: 'ISA:21:2023 §1.3 Force Limits',
    postCert: null
  },
  {
    id: 'serene', status: 'existing', pictogram: '🎯', category: 'anchor', weight: 5,
    title: 'SERENE (anchor framework)',
    subtitle: 'Solid / Equalized / Redundant / Efficient / No Extension',
    points: [
      { label: 'S — Solid', detail: 'Každý anchor point sám o sobě pevný a schopný nést load.' },
      { label: 'E — Equalized', detail: 'Síla rovnoměrně rozdělená mezi body (úhly, délky ramen).' },
      { label: 'R — Redundant', detail: 'Více bodů, jeden může selhat bez fatálního výsledku.' },
      { label: 'E — Efficient', detail: 'Bez zbytečné komplexity. Jednoduchá kotva = spolehlivá kotva.' },
      { label: 'NE — No Extension', detail: 'Když jeden bod selže, kotva se NESMÍ prodloužit (aby lezec nespadl navíc dolů).' }
    ],
    references: 'Standard climbing/mountaineering framework',
    postCert: 'Zvážit sloučení se SNARE SANE (oba jsou memory hooks pro totéž).'
  },
  {
    id: 'snare-sane', status: 'existing', pictogram: '🎯', category: 'anchor', weight: 5,
    title: 'SNARE SANE (anchor framework)',
    subtitle: '6 bodů (2026 update, redukováno z 9)',
    points: [
      { label: 'S — Strength', detail: 'Kotva má MBS požadavek (48 kN primary, 24 kN backup — v aplikaci).' },
      { label: 'N — No Abrasion', detail: 'Žádná abraze proti struktuře (kůra stromu, ostrá hrana).' },
      { label: 'A — Redundancy', detail: 'Redundance kotevního materiálu.' },
      { label: 'R — Equalization', detail: 'Vyvážení sil mezi body.' },
      { label: 'E — Small Angles', detail: '< 60° mezi rameny.' },
      { label: 'NE — No Extension', detail: 'Ztráta 1 bodu nesmí prodloužit kotvu.' }
    ],
    references: 'ISA / komunitní framework (2026 update)',
    postCert: 'ISA odstranila 3 body z 9 na 6. Aplikace už reflektuje. Zvážit sloučení se SERENE.'
  },
  {
    id: 'nylon-rule', status: 'existing', pictogram: '🧵', category: 'safety-rules', weight: 5,
    title: 'All-Nylon Rule (sub-40m HL)',
    subtitle: 'Kritické pro krátké highlines',
    points: [
      { label: 'HL < 40 m → main + backup oba NYLON (PA)', detail: 'Nylon stretch tlumí ráz při pádu.' },
      { label: 'PES/UHMWPE by peak přesáhly 12 kN', detail: 'Krátké lajny nemají stretch z délky, materiál musí tlumit.' },
      { label: 'HL > 40 m → PES/UHMWPE OK', detail: 'Stretch je z délky lajny sama.' }
    ],
    references: 'ISA:21, Jörren 2015 SlackLab data',
    postCert: null
  },
  {
    id: 'wind', status: 'existing', pictogram: '🌬️', category: 'environmental', weight: 5,
    title: 'Wind Advisory',
    subtitle: 'ISA 2020 warning',
    points: [
      { label: '< 5 m/s → OK', detail: 'Klidné podmínky, standardní použití.' },
      { label: '5–15 m/s → caution', detail: 'Kratší lajny raději demontovat. Longlines snížit tension.' },
      { label: '> 15 m/s → EVACUATE', detail: 'Hrozí electrostatic + resonance. Nechodit, nedokončit rig.' },
      { label: 'Longlines (100+ m) speciálně sensitive', detail: 'Resonance je exponenciálně horší s délkou.' }
    ],
    references: 'ISA Wind Advisory 2020',
    postCert: null
  },
  {
    id: 'rlt', status: 'existing', pictogram: '⏳', category: 'gear', weight: 4,
    title: 'RLT — Rated Lifetime',
    subtitle: 'Kolik cyklů může gear v provozu',
    points: [
      { label: 'Weblock: ~300-500 pulls per session', detail: 'Slacktivity seaHorse RLT ~1000 pulls (spec).' },
      { label: 'Webbing: dní UV expozice + počet tenze cyklů', detail: 'PA rychleji degraduje na UV než PES.' },
      { label: 'Log per gear per session', detail: 'Prostřed. tracker nebo sešit. Bez záznamu neznáš stav.' }
    ],
    references: 'ISA:41/51 concept',
    postCert: null
  },
  {
    id: 'electrostatic', status: 'existing', pictogram: '⚡', category: 'environmental', weight: 5,
    title: 'Electrostatic Discharge',
    subtitle: 'ISA 2025 warning',
    points: [
      { label: 'HL může naakumulovat několik kV+', detail: 'Suchý vzduch + wind + solar radiation nabíjí popruh.' },
      { label: 'Bouřka → EVACUATE immediately', detail: 'Elektromagnetická indukce, blesk. Nedokončit rig.' },
      { label: 'ČR incident 2024 — dokumentovaný zásah', detail: 'Známý case study, ne teoretické riziko.' }
    ],
    references: 'ISA Electrostatic Discharge Warning 2025',
    postCert: null
  },
  {
    id: 'two-attachments', status: 'existing', pictogram: '🔗', category: 'safety-rules', weight: 5,
    title: 'Vždy 2 Attachments',
    subtitle: 'Klíčové rescue pravidlo',
    points: [
      { label: 'Vždy 2 attachments k systému', detail: 'Sedák + backup PAS, nebo hlavní odsedka + backup leash.' },
      { label: 'Nikdy neodpojit primary bez load-test secondary', detail: 'Sedni si / zavěš se na secondary než odpojíš primary.' },
      { label: 'Platí pro rescue, transfer, weblock work', detail: 'Nejen během chůze — během jakékoliv práce s HL.' }
    ],
    references: 'ISA:21, rescue procedure',
    postCert: null
  },
  {
    id: 'buddy-check', status: 'existing', pictogram: '👁️', category: 'people', weight: 5,
    title: 'Buddy Check',
    subtitle: 'Pre-flight kontrola druhým párem očí',
    points: [
      { label: 'Sedák', detail: 'Bezpečně dotažený, straps správně, žádný krut.' },
      { label: 'Karabiny + PAS', detail: 'Zavřené, load-bearing pozice.' },
      { label: 'Leash → weblock', detail: 'Správně spojeno, ne nakřížený.' },
      { label: 'Weblock tie-off', detail: 'Připojený a dotažený.' },
      { label: 'Kotvy', detail: 'Krátký visual walk k oběma koncům.' },
      { label: 'Verbální projev "ready to walk?"', detail: 'Slovní potvrzení, ne jen kývnutí.' }
    ],
    references: 'Standard pre-flight procedure',
    postCert: null
  },
  {
    id: 'suspension-trauma', status: 'existing', pictogram: '⚕️', category: 'rescue', weight: 4,
    title: 'Suspension Trauma',
    subtitle: 'Medical concern po pádu',
    points: [
      { label: 'Visení > 15-30 min = risk', detail: 'Blood pooling v nohou, syncopa, potenciál smrt.' },
      { label: 'Rescue urgent', detail: 'Priority je dostat oběť z visení, ne diagnostika.' },
      { label: 'Uložit POSTUPNĚ na záda', detail: 'NIKDY prudké lehnutí (blood dump do srdce = arrest).' },
      { label: 'Sedmý pozice preferovaně', detail: 'Polohovat kolena nad úroveň srdce.' }
    ],
    references: 'Medical / mountain rescue literature',
    postCert: null
  },
  {
    id: 'bowline-warning', status: 'existing', pictogram: '🚫', category: 'gear', weight: 4,
    title: 'Dračí smyčka NIKDY na HL kotvě',
    subtitle: 'Bowline se rozvazuje pod cyklickou zátěží',
    points: [
      { label: 'Bowline (dračí smyčka) se rozvazuje', detail: 'Pod cyklickou zátěží (mikropohyby) se v čase uvolní.' },
      { label: 'Na HL kotvě po hodinách selže', detail: 'Rig může vydržet den, ne týden.' },
      { label: 'ISA:21 §3.3.2 EXPLICITNÍ ZÁKAZ', detail: 'Na main / backup / anchoring nikdy.' },
      { label: 'Alternativy: bufák (figure-8 loop), scaffold', detail: 'Cyklicky stabilní uzly.' }
    ],
    references: 'ISA:21 §3.3.2',
    postCert: 'Zvážit rozšíření o alternativy (co použít místo).'
  },
  {
    id: 'weblock-tieoff', status: 'existing', pictogram: '🔒', category: 'gear', weight: 5,
    title: 'Weblock vždy s Tie-Off',
    subtitle: 'Poslední krok riggingu kotvítka',
    points: [
      { label: 'Weblock drží popruh, sám bez tie-off není bezpečný', detail: 'Popruh se může vysmeknout pod cyklickou zátěží nebo změnou úhlu.' },
      { label: 'Tie-off = zajištění popruhu proti vysmeknutí', detail: 'Typicky Barrel knot (thimble varianta) přes leash ring nebo backup.' },
      { label: 'ISA:21 §3.11.1.2', detail: 'Explicit requirement.' },
      { label: 'Roberto/Erika/Sirio checkli u každého kandidáta', detail: 'Kritický bod, kontrolovaný na kurzu.' }
    ],
    references: 'ISA:21 §3.11.1.2',
    postCert: null
  },
  {
    id: 'rig-workflow', status: 'existing', pictogram: '🔧', category: 'anchor', weight: 5,
    title: 'Kompletní Rig Workflow',
    subtitle: '0-8 fází + 3 gates + průřezové vrstvy',
    points: [
      { label: 'Fáze 0-8', detail: 'Přípravy → kotvy → main → backup → tension → checks → walk-ready.' },
      { label: '3 gates A/B/C', detail: 'A: kotvy schváleny. B: systém před tenzí. C: lajna schválena k chůzi.' },
      { label: 'Průřezové vrstvy', detail: 'Materiál / bezpečnost / lidé.' }
    ],
    references: 'ISA:21 workflow, komunitní best practice',
    postCert: 'PŘEPSAT: (1) "Main a backup má být oddělené" je NEPLATNÉ — 2 šekly OK. (2) BFK nepotřebuje separátní backup.',
    postCertCritical: true
  },

  // ========== NAVRHOVANÉ NOVÉ (19) ==========
  {
    id: 'anchor-mbs', status: 'new', pictogram: '⚖️', category: 'anchor', weight: 5,
    title: 'Anchor Material MBS Požadavky',
    subtitle: '48 kN primary / 24 kN backup',
    points: [
      { label: 'Primary anchoring material: 48 kN', detail: '"Tested in application" — ne z etikety. ISA:21 Příloha 2 řádek 9.' },
      { label: 'Secondary anchoring material: 24 kN', detail: 'ISA:21 Příloha 2 řádek 12.' },
      { label: 'Spanset larks foot ×0.5 (fialový 1T → ~40 kN)', detail: 'JEN backup material — nesplňuje primary 48 kN.' },
      { label: 'Spanset basket hitch ×~2 (fialový 1T → ~150 kN)', detail: 'Primary OK, angle < 60°.' },
      { label: '8mm lano BFK/Sliding-X: 4 body pro primary', detail: '2 body 34 kN (Sliding-X) / 26 kN (BFK) — ne. 3 body 42 kN — ne. 4 body 59-64 kN — ano.' }
    ],
    references: 'ISA:21 Příloha 2, ISA:53, komunitní pull-test data',
    postCert: 'Nejdůležitější post-cert insight. Real-world časté chyby.'
  },
  {
    id: 'bfk-sliding-x', status: 'new', pictogram: '🪢', category: 'anchor', weight: 5,
    title: 'BFK / Sliding-X Specifika',
    subtitle: 'BFK NEpotřebuje separátní backup',
    points: [
      { label: 'BFK = Big Fat Knot = internally redundant', detail: 'Více pramenů (6+) = internal backup.' },
      { label: 'BFK NEpotřebuje separátní backup material', detail: '*** POST-CERT INSIGHT *** — přepisuje "main a backup vždy odděleně" pravidlo.' },
      { label: '4-point BFK z 8mm lana ~ 64 kN', detail: 'Splňuje primary 48 kN požadavek.' },
      { label: 'Sliding-X 4-point ~ 59 kN', detail: 'Podobná pevnost, o něco horší efficiency v ohybech.' },
      { label: 'Kdy BFK vs. Sliding-X — dle geometrie', detail: 'Sliding-X self-equalizuje při změně úhlu (dynamic loading). BFK je fixed geometry.' }
    ],
    references: 'Balance Community pull-test data, kurz 16.-18.8.2026 (Roberto)',
    postCert: 'Priorita 1 — přepisuje běžnou instrukci.'
  },
  {
    id: 'spanset-usage', status: 'new', pictogram: '🎨', category: 'anchor', weight: 5,
    title: 'Spanset Použití',
    subtitle: 'Basket vs. larks foot',
    points: [
      { label: 'Barvy: fialový 1T / zelený 2T / žlutý 3T', detail: '78 kN / 140 kN / 210 kN direct tah.' },
      { label: 'BASKET HITCH (dvojmo, < 60°) ×~2', detail: 'Primary ready. Fialový 1T basket ~150 kN.' },
      { label: 'LARKS FOOT (liščí smyčka) ×~0.5', detail: 'Jen backup material. Fialový 1T larks foot ~40 kN — pod primary 48 kN.' },
      { label: 'NIKDY 180° angle', detail: 'Side-load shackle failure + matematicky nekonečná síla.' },
      { label: 'Padding proti abrazi', detail: 'Kůra stromu, ostrá hrana kamene. Kus starého popruhu nebo textil.' }
    ],
    references: 'ISA:53, komunitní pull-test data',
    postCert: null
  },
  {
    id: 'attachment-structure', status: 'new', pictogram: '🔩', category: 'anchor', weight: 5,
    title: 'Attachment Structure (Borháky)',
    subtitle: 'MBS 48 kN required',
    points: [
      { label: 'ISA:21 Příloha 2 řádek 8: MBS 48 kN', detail: 'Attachment structure = borhák nebo natural anchor.' },
      { label: 'Reálné pull-test: 30-50 kN dle install', detail: 'HowNot2 data — glue-in vs. mechanical, hloubka, orientace.' },
      { label: 'Chemické (glue-in 12 mm) preferovány pro HL', detail: 'Vyšší strength, no cyclic loosening.' },
      { label: 'Rock quality kritická', detail: 'Pískovec pod HL neužívat. Žula, vápenec, tvrdé bloky OK.' },
      { label: 'Pre-rig check: visual + tap-test', detail: 'Poslechnout dutinu, žádné vlasové trhliny.' }
    ],
    references: 'ISA:21 Příloha 2, HowNot2 pull-test database',
    postCert: null
  },
  {
    id: 'high-directionals', status: 'new', pictogram: '📐', category: 'anchor', weight: 3,
    title: 'High Directionals',
    subtitle: 'A-frame / Hang / Monopod / X-frame',
    points: [
      { label: 'A-frame (ground-standing)', detail: 'Obě nohy na zemi, střední H (2-4 m nad kotvou).' },
      { label: 'Hang frame (visící z upper anchor)', detail: 'Pro velké H (> 5 m), neni na zemi.' },
      { label: 'Monopod (jedna noha)', detail: 'Specializace, wing-support anchoring.' },
      { label: 'X-frame / T-frame', detail: 'Advanced geometries pro specific projects.' },
      { label: 'Dřevo 5×10 cm zlom při 25 kN', detail: 'Jerry Miszewski test data — standard construction lumber limit.' }
    ],
    references: 'Balance Community, Jerry Miszewski test data',
    postCert: null
  },
  {
    id: 'rescue-basics', status: 'new', pictogram: '🚨', category: 'rescue', weight: 5,
    title: 'Rescue Basics',
    subtitle: 'Každá HL by měla mít plán',
    points: [
      { label: 'Z-drag 3:1 pro victim recovery', detail: 'Standardní mechanical advantage pro dostání oběti nahoru.' },
      { label: 'Knot passing (main + backup redundance during hoist)', detail: 'Přechod uzlu přes weblock/pulley — 2 attachments always.' },
      { label: 'Min 2 attachments per rescuer to rope', detail: 'PAS + backup, nikdy 1 attachment during rescue.' },
      { label: 'Test load secondary attachment před odpojením primary', detail: 'Fully weight secondary, pak odepni primary.' },
      { label: 'Rescue kit: 4× Rolexy + Micro Traxion + GriGri + 9mm lano', detail: 'Basic kit — každý HL setup by měl mít.' }
    ],
    references: 'Kurz 16.-18.8.2026, ISA rescue training',
    postCert: null
  },
  {
    id: 'taping-methods', status: 'new', pictogram: '🎗️', category: 'gear', weight: 3,
    title: 'Taping Methods',
    subtitle: '5 metod tejpování backup ↔ mainline',
    points: [
      { label: 'Backup-Affixed Slider ⭐ (doporučeno)', detail: 'Balance Community preference. Backup fixed, main klouže.' },
      { label: 'Standard Tape', detail: 'Krátké session, jednodušší. Neni sliding — omezuje flexibility.' },
      { label: 'Old School Slider', detail: 'Long-term, labor intensive. Nejlepší pro semi-permanent HL.' },
      { label: 'Main-Affixed Slider', detail: 'Alternativa Backup-Affixed. Ne tak preferovaná (méně control loop size).' },
      { label: '❌ Euro Slider — NEDOPORUČENO', detail: 'Časté selhání (tab pull-out). Balance Community explicit warning.' },
      { label: 'Rozteč 30-60 cm, 3-4 wraps, tape end DOWN', detail: 'Standardní parametry.' }
    ],
    references: 'Balance Community — 5 metod tape guide',
    postCert: null
  },
  {
    id: 'soft-release', status: 'new', pictogram: '🎬', category: 'gear', weight: 4,
    title: 'Soft Release + Hai Thai',
    subtitle: 'Bezpečný release tenze',
    points: [
      { label: 'Soft release wraps (Slacktivity EQB, MBS 60 kN)', detail: 'Speciální webbing pro release — vyšší MBS + specifický weave.' },
      { label: 'HAI THAI METHOD = flip webbing inside weblock', detail: 'Post-cert learning. Metoda release bez re-connect Buckingham.' },
      { label: 'MMO transfer of tension (rope-based)', detail: 'Munter-Mule-Overhand. Rescue technique.' },
      { label: 'Line grip: WLL 15 kN / MBS 45 kN (longlineGrip pro HL)', detail: 'Ne EQB Grippen (jen 15 kN MBS — nedostatek pro HL).' },
      { label: 'NIKDY re-connect Buckingham na tail', detail: 'Weblock blokuje — pull výsledek nebude přesný.' }
    ],
    references: 'Kurz 16.-18.8.2026, Slacktivity manuály',
    postCert: null
  },
  {
    id: 'longline-recs', status: 'new', pictogram: '📏', category: 'safety-rules', weight: 3,
    title: 'Longline Recommendations',
    subtitle: '100+ m specifika (ISA 2020)',
    points: [
      { label: 'Resonance rizika ve větru', detail: 'Longlines mají vlastní frekvenci — vítr může excitovat resonance.' },
      { label: 'Segmentation (intermittent connections 30-60 m)', detail: 'Rozděl lajnu na segmenty s ISA:52 connectors.' },
      { label: 'Peak tension calculation', detail: 'Nad 100 m je peak tension exponenciálně vyšší.' },
      { label: 'Extra rescue plán', detail: 'Víc lidí, kvalifikovaní na rope work, komunikační plán.' }
    ],
    references: 'ISA Longline Recommendations 2020',
    postCert: null
  },
  {
    id: 'buckingham', status: 'new', pictogram: '⚙️', category: 'gear', weight: 3,
    title: 'Buckingham Tensioning',
    subtitle: 'Simple 3:1 / Compound 5:1 / 9:1',
    points: [
      { label: 'Simple 3:1 = max 2 kN per person', detail: 'Basic setup, malé lajny.' },
      { label: 'Compound 5:1 = max 4 kN per person', detail: 'Sweet spot pro solo tensioning.' },
      { label: 'Compound 9:1 = max 5 kN per person', detail: 'Diminishing returns nad 9:1.' },
      { label: 'Reálná MA je 50-60% teoretické', detail: 'Friction v pulleys degraduje MA.' },
      { label: 'Balance Community official data', detail: 'Naměřené hodnoty, ne odhady.' }
    ],
    references: 'Balance Community — Basics of Buckingham',
    postCert: null
  },
  {
    id: 'force-estimator-basics', status: 'new', pictogram: '📊', category: 'safety-rules', weight: 4,
    title: 'Force Estimator Basics',
    subtitle: 'Jörren 2015 SlackLab data',
    points: [
      { label: 'PA (nylon): peak ~7 kN @ 2.2 kN working (20m HL)', detail: 'Nejlepší tlumení, nejnižší peak.' },
      { label: 'PES: peak ~10 kN', detail: 'Střední tlumení.' },
      { label: 'UHMWPE (Dyneema): peak ~15 kN', detail: 'Nejtvrdší ráz, nejvyšší peak.' },
      { label: 'Formule: peak(L) = peak(20) × (20/L)^0.3', detail: 'Delší lajna = nižší peak (více tlumení z délky).' },
      { label: 'Leash fall > backup fall', detail: 'ISA:21 12 kN vs 8 kN limits.' }
    ],
    references: 'Jörren 2015 SlackLab experimental data',
    postCert: null
  },
  {
    id: 'pre-flight', status: 'new', pictogram: '✈️', category: 'people', weight: 4,
    title: 'Pre-Flight Checklist',
    subtitle: 'Rozšíření Buddy Check',
    points: [
      { label: 'Visual walkthrough (od kotvy A k kotvě B)', detail: 'Kompletně projít lajnu, koukat na tape/uzly/backup.' },
      { label: 'Environmental (bouřka? teplota? vítr?)', detail: 'Podmínky se mohou změnit rychle.' },
      { label: 'People (kdo ve vzduchu, kdo v landing zóně?)', detail: 'Awareness kdo je kde.' },
      { label: 'Emergency plan (rescuer / medic / phone signal)', detail: 'Kdo dělá co v případě problému.' },
      { label: 'Access route (cesta k autu, k helicopter LZ)', detail: 'Kdyby bylo potřeba dostat oběť pryč.' }
    ],
    references: 'Standard mountain safety practice',
    postCert: null
  },
  {
    id: 'temp-weather', status: 'new', pictogram: '🌡️', category: 'environmental', weight: 3,
    title: 'Cold Weather / Heat',
    subtitle: 'Environmental modifiers',
    points: [
      { label: 'Cold (< 5°C): tape křehne, nylon tuhne', detail: 'Karabiny mrznou (možný jam). Kontrolovat funkci před chůzí.' },
      { label: 'Heat (> 30°C): tape měkne (klouže)', detail: 'UV zvyšuje RLT depletion. Popruhy expandují (change v tenzi).' },
      { label: 'Wet: nylon absorbuje vodu', detail: 'Temporary MBS drop až -20%. Dyneema/PES water-repellent.' }
    ],
    references: 'Manufacturer specs, mountain safety',
    postCert: null
  },
  {
    id: 'anchor-tie-back', status: 'new', pictogram: '↩️', category: 'anchor', weight: 4,
    title: 'Anchor Tie-Back',
    subtitle: 'Redundance na úrovni celé kotvy',
    points: [
      { label: 'ISA:21 §3.12 secondary anchoring', detail: 'Backup vazba na JINÝ anchor point.' },
      { label: 'Pokud primary selže, tie-back drží', detail: 'Load-bearing redundance.' },
      { label: 'Redundance materiálu ≠ redundance kotvy', detail: 'Anchor tie-back je druhá úroveň redundance.' }
    ],
    references: 'ISA:21 §3.12.1',
    postCert: null
  },
  {
    id: 'site-survey', status: 'new', pictogram: '🗺️', category: 'people', weight: 4,
    title: 'Site Survey',
    subtitle: 'Pre-project planning',
    points: [
      { label: 'Weather forecast (24-72h)', detail: 'Windy, meteoblue, yr.no — cross-check více zdrojů.' },
      { label: 'Landing zone check', detail: 'Kameny, keře, voda, lidé, zvířata. Fall zone bezpečná.' },
      { label: 'Hikers / turisti', detail: 'Traversal cesta pod HL? Signage / marshalling?' },
      { label: 'Wildlife (birds nesting? zvířata?)', detail: 'Ptáci v hnízdění → nikdy nerig. Bear/predators awareness.' },
      { label: 'Emergency access', detail: 'Auto k základně? Ambulance dostupnost? Helicopter LZ?' }
    ],
    references: 'Mountain safety pratice, ISA training',
    postCert: null
  },
  {
    id: 'two-piece', status: 'new', pictogram: '🔗', category: 'gear', weight: 3,
    title: 'Two-Piece Intermittent Connection',
    subtitle: 'ISA:52 requirements pro segmentaci',
    points: [
      { label: 'Mainline-Mainline: 32 kN', detail: 'ISA:52 minimum pro connector.' },
      { label: 'Mainline-Backup: 24 kN', detail: 'Nižší, backup není load-bearing.' },
      { label: 'Jak spojit segmenty popruhu (sewn pillow, Frankenstein)', detail: 'Sewn connection přes průmyslový šev.' },
      { label: '80% MBS nejslabšího popruhu', detail: 'Type A+ 32+ kN sewn loop.' }
    ],
    references: 'ISA:52, ISA:41',
    postCert: null
  },
  {
    id: 'documentation', status: 'new', pictogram: '📋', category: 'gear', weight: 3,
    title: 'Documentation & Log Book',
    subtitle: 'Long-term maintenance',
    points: [
      { label: 'RLT tracker (per gear item)', detail: 'Sledovat cykly/hodiny každého kritického kusu.' },
      { label: 'Session log (kdo, kdy, tension, incidents)', detail: 'Historie eventů — user injuries, gear failures.' },
      { label: 'Incident reporting (ISA SAIR)', detail: 'Formální hlášení nehod pro ISA safety database.' },
      { label: 'Vlastní gear inventory', detail: 'Fotky, sériové čísla, datum nákupu, garance.' }
    ],
    references: 'ISA SAIR, komunitní best practice',
    postCert: null
  },
  {
    id: 'weather-escape', status: 'new', pictogram: '⛈️', category: 'environmental', weight: 4,
    title: 'Weather Escape Plan',
    subtitle: 'Kdy skončit před bouřkou',
    points: [
      { label: 'Threshold rules', detail: 'Bouřka do 30 min → hned de-tension. Vítr > 15 m/s → evacuate.' },
      { label: 'De-tension speed (jak rychle release Buckingham)', detail: 'Klidný release = neřezat tape, jen loosen.' },
      { label: 'Gear evacuation priorities', detail: 'Life-safety first (leash, backup), pak infrastructure (webbing, weblock).' },
      { label: 'Anchor de-rigging bezpečně', detail: 'Backup material lifter last (redundance zachována).' }
    ],
    references: 'ISA Wind Advisory 2020, standard weather protocols',
    postCert: null
  },
  {
    id: 'ethics', status: 'new', pictogram: '🌿', category: 'people', weight: 3,
    title: 'Environmental Ethics',
    subtitle: 'Komunitní odpovědnost',
    points: [
      { label: 'Padding proti stromové kůře', detail: 'NIKDY přímý webbing na strom — starý popruh nebo textil.' },
      { label: 'Bolted anchors permanent → zvážit alternativy', detail: 'Natural anchors preferovány kde možné.' },
      { label: 'Leave no trace (magnesium, tape residue)', detail: 'Ušetřit lesu / útesu — vyzvednout co jsi přinesl.' },
      { label: 'Permits (národní parky, přírodní rezervace)', detail: 'Legální požadavky, respektovat správu území.' },
      { label: 'Access ethics (talk to landowners, hikers)', detail: 'Sociální fabric komunity.' }
    ],
    references: 'Access Fund, komunitní best practice',
    postCert: null
  }
];

// Metadata pro kategorie
const CATEGORY_LABELS = {
  'basics': '🌱 Základ',
  'anchor': '⛓️ Kotvy',
  'safety-rules': '⚡ Bezpečnostní pravidla',
  'environmental': '🌦️ Prostředí',
  'gear': '🔧 Vybavení',
  'rescue': '🚨 Rescue',
  'people': '👥 Lidé'
};
