import type { Card, DeckMap } from "./types";

const LOTR_GAME_ID = "a21af4e8-be4b-4cda-a6b6-534f9717391f";

const STATIC_SECTIONS = [
  { name: "Sideboard", shared: false, cards: [] as Card[] },
  { name: "Quest", shared: true },
  { name: "Encounter", shared: true },
  { name: "Special", shared: true },
  { name: "Setup", shared: true },
];

function escapeXml(str: string): string {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

export function generateO8d(
  heroes: Card[],
  deck: DeckMap,
  allCards: Card[],
  deckName: string
): string {
  const cardByCode = new Map(allCards.map((c) => [c.code, c]));

  // Group non-hero deck cards by their .o8d section name
  const sections = new Map<string, { card: Card; qty: number }[]>();
  for (const [code, qty] of deck) {
    const card = cardByCode.get(code);
    if (!card) continue;
    const section = card.section;
    if (!sections.has(section)) sections.set(section, []);
    sections.get(section)!.push({ card, qty });
  }

  const lines: string[] = [];
  lines.push(`<?xml version="1.0" encoding="utf-8" standalone="yes"?>`);
  lines.push(`<deck game="${LOTR_GAME_ID}">`);

  // Heroes section
  lines.push(`  <section name="Hero" shared="False">`);
  for (const hero of heroes) {
    lines.push(
      `    <card qty="1" id="${hero.octgnid}">${escapeXml(hero.name)}</card>`
    );
  }
  lines.push(`  </section>`);

  // Deck sections
  const sectionOrder = ["Ally", "Attachment", "Event", "Side Quest", "Contract"];
  for (const sectionName of sectionOrder) {
    const entries = sections.get(sectionName) ?? [];
    lines.push(`  <section name="${sectionName}" shared="False">`);
    for (const { card, qty } of entries) {
      lines.push(
        `    <card qty="${qty}" id="${card.octgnid}">${escapeXml(card.name)}</card>`
      );
    }
    lines.push(`  </section>`);
  }

  // Static empty sections
  lines.push(`  <section name="Sideboard" shared="False"></section>`);
  lines.push(`  <section name="Quest" shared="True" />`);
  lines.push(`  <section name="Encounter" shared="True" />`);
  lines.push(`  <section name="Special" shared="True" />`);
  lines.push(`  <section name="Setup" shared="True" />`);
  lines.push(`  <notes><![CDATA[Built with LOTR LCG Deck Builder]]></notes>`);
  lines.push(`</deck>`);

  return lines.join("\n");
}

export function downloadO8d(
  heroes: Card[],
  deck: DeckMap,
  allCards: Card[],
  deckName: string
): void {
  const xml = generateO8d(heroes, deck, allCards, deckName);
  const blob = new Blob([xml], { type: "application/xml" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `${deckName.replace(/[^a-z0-9]/gi, "-").toLowerCase()}.o8d`;
  a.click();
  URL.revokeObjectURL(url);
}
