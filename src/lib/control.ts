/**
 * Ergebnis-Steuerung für den Solo-Modus („Alles gewinnen“, „Alles verlieren“, Sequenzen).
 * Ein Spiel holt pro Runde genau einmal die Vorgabe ab und erzeugt dann ein passendes Zufallsergebnis.
 */
export type Ctrl = "win" | "loss" | null;
export type Kind = "win" | "loss" | "push";

/** Erzeugt Ergebnisse, bis eines zur Vorgabe passt (Gewinn = mehr zurück als eingesetzt). */
export function forced<T>(ctrl: Ctrl, gen: () => T, kind: (t: T) => Kind, tries = 600): T {
  if (!ctrl) return gen();
  let last = gen();
  for (let i = 0; i < tries; i++) {
    if (kind(last) === ctrl) return last;
    last = gen();
  }
  return last;
}
export const kindOf = (bet: number, payout: number): Kind => (payout > bet + 1e-9 ? "win" : payout < bet - 1e-9 ? "loss" : "push");
