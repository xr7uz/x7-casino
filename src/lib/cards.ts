import { shuffle } from "./rng";

export type Suit = "♠" | "♥" | "♦" | "♣";
export type Card = { r: number; s: Suit }; // r: 2..14 (14 = Ass)
export const suits: Suit[] = ["♠", "♥", "♦", "♣"];

export function deck(n = 1): Card[] {
  const d: Card[] = [];
  for (let k = 0; k < n; k++) for (const s of suits) for (let r = 2; r <= 14; r++) d.push({ r, s });
  return shuffle(d);
}
export const rankLabel = (r: number) => ({ 11: "J", 12: "Q", 13: "K", 14: "A" } as Record<number, string>)[r] ?? String(r);
export const isRed = (c: Card) => c.s === "♥" || c.s === "♦";

/** Blackjack-Wert einer Hand */
export function bjValue(cards: Card[]): { total: number; soft: boolean } {
  let total = 0, aces = 0;
  for (const c of cards) {
    if (c.r === 14) { aces++; total += 11; } else total += Math.min(c.r, 10);
  }
  while (total > 21 && aces) { total -= 10; aces--; }
  return { total, soft: aces > 0 };
}

/** Bewertung der besten 5 aus 7 Karten (höherer Wert = bessere Hand) */
export const handNames = ["Höchste Karte", "Ein Paar", "Zwei Paare", "Drilling", "Straße", "Flush", "Full House", "Vierling", "Straight Flush"];
export function evalHand(cards: Card[]): { score: number; cat: number } {
  const bySuit: Record<string, number[]> = {};
  const counts = new Map<number, number>();
  for (const c of cards) {
    (bySuit[c.s] ??= []).push(c.r);
    counts.set(c.r, (counts.get(c.r) ?? 0) + 1);
  }
  const straightHigh = (ranks: number[]) => {
    const set = new Set(ranks);
    if (set.has(14)) set.add(1);
    for (let h = 14; h >= 5; h--) {
      let ok = true;
      for (let i = 0; i < 5; i++) if (!set.has(h - i)) { ok = false; break; }
      if (ok) return h;
    }
    return 0;
  };
  const pack = (cat: number, ks: number[]) => cat * 15 ** 5 + ks.slice(0, 5).reduce((s, k, i) => s + k * 15 ** (4 - i), 0);
  for (const s in bySuit) {
    if (bySuit[s].length >= 5) {
      const sf = straightHigh(bySuit[s]);
      if (sf) return { score: pack(8, [sf]), cat: 8 };
    }
  }
  const groups = [...counts.entries()].sort((a, b) => b[1] - a[1] || b[0] - a[0]);
  const ranksDesc = [...counts.keys()].sort((a, b) => b - a);
  const kick = (excl: number[]) => ranksDesc.filter((r) => !excl.includes(r));
  if (groups[0][1] === 4) return { score: pack(7, [groups[0][0], ...kick([groups[0][0]])]), cat: 7 };
  if (groups[0][1] === 3 && groups[1] && groups[1][1] >= 2) return { score: pack(6, [groups[0][0], groups[1][0]]), cat: 6 };
  for (const s in bySuit) if (bySuit[s].length >= 5) return { score: pack(5, bySuit[s].sort((a, b) => b - a)), cat: 5 };
  const st = straightHigh(ranksDesc);
  if (st) return { score: pack(4, [st]), cat: 4 };
  if (groups[0][1] === 3) return { score: pack(3, [groups[0][0], ...kick([groups[0][0]])]), cat: 3 };
  if (groups[0][1] === 2 && groups[1] && groups[1][1] === 2) {
    const [a, b] = [groups[0][0], groups[1][0]];
    return { score: pack(2, [a, b, ...kick([a, b])]), cat: 2 };
  }
  if (groups[0][1] === 2) return { score: pack(1, [groups[0][0], ...kick([groups[0][0]])]), cat: 1 };
  return { score: pack(0, ranksDesc), cat: 0 };
}
