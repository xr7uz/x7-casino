/** Zufall aus der Krypto-API des Geräts (gleichverteilt, nicht vorhersagbar). */
export function rand(): number {
  const a = new Uint32Array(1);
  crypto.getRandomValues(a);
  return a[0] / 2 ** 32;
}
export const randInt = (min: number, max: number) => Math.floor(rand() * (max - min + 1)) + min;
export function shuffle<T>(arr: T[]): T[] {
  const a = arr.slice();
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}
export function pickWeighted<T>(items: { item: T; w: number }[]): T {
  const total = items.reduce((s, x) => s + x.w, 0);
  let r = rand() * total;
  for (const x of items) { if ((r -= x.w) <= 0) return x.item; }
  return items[items.length - 1].item;
}
export const round2 = (n: number) => Math.round(n * 100) / 100;
export function binom(n: number, k: number): number {
  if (k < 0 || k > n) return 0;
  let r = 1;
  for (let i = 1; i <= k; i++) r = (r * (n - k + i)) / i;
  return r;
}
