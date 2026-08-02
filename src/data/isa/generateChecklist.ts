/**
 * Generator kontextově-aware checklist per konkrétní lajnu (F5 v0.7.2).
 *
 * Vstup: SlacklineDetail (délka, výška, typ, popis kotev)
 * Výstup: array kartotéky (podmnožina CARDS[]) v pořadí "kritické → doporučené → info"
 *
 * Logika (v0.7.2 baseline):
 *
 * VŽDY (bez ohledu na parametry):
 *   - commandments (hero, 10 pravidel)
 *   - buddy-check
 *   - snare-sane
 *   - two-attachments
 *   - suspension-trauma (info)
 *
 * PODMÍNEČNĚ:
 *   - nylon-rule       → pokud length < 40 && type=='highline'
 *   - electrostatic    → pokud length > 60 (delší lajny mají vyšší riziko dyneema)
 *                        NEBO type=='longline' (často UHMWPE)
 *   - wind             → pokud height > 5 (nad terénem, kde vítr zasáhne)
 *
 * Karty které v0.7.2 NEmá:
 *   - Kotva na borhácích / stromě / boulderu (detailně) → v0.8.0+
 *   - Tejpování / segmentace                            → v0.8.0+
 *   - Deviace (redirect)                                → v0.9.0+
 *
 * Pořadí ve výstupu:
 *   1. Hero: commandments (na začátku, "10 zásad")
 *   2. Contextually critical (nylon-rule pokud aktivní)
 *   3. Buddy check
 *   4. SNARE SANE
 *   5. Weblock / two-attachments
 *   6. Wind (pokud height > 5)
 *   7. Electrostatic (pokud delší)
 *   8. Suspension trauma (info, dole)
 */

import { CARDS, CardData } from './cards';
import type { SlacklineDetail } from '../../types';

export interface ChecklistContext {
  /** Kartotéka v pořadí zobrazení v UI */
  cards: CardData[];
  /** Debug info: proč byly vybrány (pro budoucí "why is this shown?" tooltip) */
  reasoning: string[];
}

function findCard(id: string): CardData | undefined {
  return CARDS.find((c) => c.id === id);
}

export function generateChecklistForLine(line: SlacklineDetail): ChecklistContext {
  const reasoning: string[] = [];
  const cards: CardData[] = [];

  const length = line.length ?? 0;
  const height = line.height ?? 0;
  const type = (line.type ?? '').toLowerCase();
  const isHighline = type === 'highline';
  const isLongline = type === 'longline';

  // 1. HERO: 10 zásad (vždy první)
  const commandments = findCard('commandments');
  if (commandments) {
    cards.push(commandments);
    reasoning.push('Základní 10 zásad se ukazuje vždy');
  }

  // 2. Contextually critical: nylon rule (pokud HL pod 40m)
  if (isHighline && length > 0 && length < 40) {
    const nylonRule = findCard('nylon-rule');
    if (nylonRule) {
      cards.push(nylonRule);
      reasoning.push(`All-nylon rule: highline pod 40 m (${length} m)`);
    }
  }

  // 3. Buddy check (vždy)
  const buddyCheck = findCard('buddy-check');
  if (buddyCheck) {
    cards.push(buddyCheck);
    reasoning.push('Kontrola v páru se dělá před každou chůzí');
  }

  // 4. SNARE SANE anchor assessment (vždy)
  const snareSane = findCard('snare-sane');
  if (snareSane) {
    cards.push(snareSane);
    reasoning.push('SNARE SANE se aplikuje na každou kotvu');
  }

  // 5. Two attachments (vždy)
  const twoAttachments = findCard('two-attachments');
  if (twoAttachments) {
    cards.push(twoAttachments);
    reasoning.push('Dvě nezávislá připojení jsou univerzální safety pravidlo');
  }

  // 6. Wind (pokud height > 5)
  if (height > 5) {
    const wind = findCard('wind');
    if (wind) {
      cards.push(wind);
      reasoning.push(`Kontrola větru: lajna ${height} m nad terénem`);
    }
  }

  // 7. Electrostatic (pokud delší lajna)
  if (length > 60 || isLongline) {
    const electrostatic = findCard('electrostatic');
    if (electrostatic) {
      cards.push(electrostatic);
      reasoning.push(
        isLongline
          ? 'Electrostatic warning: longline typu často UHMWPE'
          : `Electrostatic warning: delší lajna (${length} m)`,
      );
    }
  }

  // 8. Suspension trauma awareness (info, dole)
  const suspensionTrauma = findCard('suspension-trauma');
  if (suspensionTrauma) {
    cards.push(suspensionTrauma);
    reasoning.push('Suspension trauma je awareness — dobrá znalost pro každou lajnu');
  }

  return { cards, reasoning };
}

/** Utility: kolik bodů (checklist items) má celý pre-generated checklist. */
export function countTotalItems(cards: CardData[]): number {
  return cards.reduce((acc, c) => acc + (c.checklist?.length ?? 0), 0);
}
