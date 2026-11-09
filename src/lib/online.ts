import { LIVE_URL } from "../config";

/** Einladungs- und Ergebnis-Codes für das Online-Turnier (funktioniert ohne Server). */
export type RoomInfo = { code: string; rounds: number; start: number };
export type Result = { code: string; name: string; balance: number; played: number; device: string };

const alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
export const newRoomCode = () => Array.from({ length: 5 }, () => alphabet[Math.floor(Math.random() * alphabet.length)]).join("");

export const inviteCode = (r: RoomInfo) => `X7-${r.code}-${r.rounds}-${r.start}`;
export function parseInvite(text: string): RoomInfo | null {
  const m = text.trim().toUpperCase().match(/X7-([A-Z0-9]{5})-(\d{1,3})-(\d{2,7})/);
  if (!m) return null;
  const rounds = Number(m[2]), start = Number(m[3]);
  if (rounds < 1 || rounds > 200 || start < 10) return null;
  return { code: m[1], rounds, start };
}

function checksum(s: string) {
  let h = 7;
  for (const ch of s) h = (h * 31 + ch.charCodeAt(0)) % 1679616; // 36^4
  return h.toString(36).toUpperCase().padStart(4, "0");
}
const b64 = (s: string) => btoa(unescape(encodeURIComponent(s))).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
const unb64 = (s: string) => decodeURIComponent(escape(atob(s.replace(/-/g, "+").replace(/_/g, "/"))));

export function resultCode(r: Result) {
  const body = b64(JSON.stringify([r.code, r.name, Math.round(r.balance * 100) / 100, r.played, r.device]));
  return `X7R.${body}.${checksum(body)}`;
}
export function parseResult(text: string): Result | null {
  const m = text.trim().match(/X7R\.([A-Za-z0-9_-]+)\.([A-Z0-9]{4})/);
  if (!m || checksum(m[1]) !== m[2]) return null;
  try {
    const [code, name, balance, played, device] = JSON.parse(unb64(m[1]));
    if (typeof code !== "string" || typeof name !== "string" || typeof balance !== "number") return null;
    return { code, name: String(name).slice(0, 16), balance, played: Number(played) || 0, device: String(device) };
  } catch { return null; }
}

/** Teilen: natives Teilen (iPhone), sonst Web Share, sonst Zwischenablage. Gibt zurück, was passiert ist. */
export async function shareText(text: string): Promise<"shared" | "copied" | "failed"> {
  try {
    const cap = (window as unknown as { Capacitor?: { isNativePlatform?: () => boolean } }).Capacitor;
    if (cap?.isNativePlatform?.()) {
      const { Share } = await import("@capacitor/share");
      await Share.share({ text });
      return "shared";
    }
  } catch { /* weiter mit Fallback */ }
  try {
    if (navigator.share) { await navigator.share({ text }); return "shared"; }
  } catch { /* abgebrochen */ }
  try { await navigator.clipboard.writeText(text); return "copied"; } catch { return "failed"; }
}

/* ---------- Optionale Live-Rangliste (Firebase Realtime Database über REST, ohne SDK) ---------- */
export const liveEnabled = () => LIVE_URL.trim().length > 0;
const base = () => LIVE_URL.replace(/\/$/, "");

export async function pushLive(room: string, r: Result & { finished: boolean }) {
  if (!liveEnabled()) return;
  try {
    await fetch(`${base()}/rooms/${room}/players/${r.device}.json`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: r.name, balance: r.balance, played: r.played, finished: r.finished, t: Date.now() }),
    });
  } catch { /* offline: nächster Versuch bei der nächsten Runde */ }
}

export async function fetchLive(room: string): Promise<Result[] | null> {
  if (!liveEnabled()) return null;
  try {
    const res = await fetch(`${base()}/rooms/${room}/players.json`);
    if (!res.ok) return null;
    const data = (await res.json()) as Record<string, { name: string; balance: number; played: number }> | null;
    return Object.entries(data ?? {}).map(([device, v]) => ({ code: room, device, name: String(v.name).slice(0, 16), balance: Number(v.balance) || 0, played: Number(v.played) || 0 }));
  } catch { return null; }
}
