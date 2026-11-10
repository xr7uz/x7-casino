import type { IconType } from "react-icons";
import { LuCrown, LuDices, LuFlame, LuGem, LuMap, LuRocket, LuSparkles, LuStar, LuTrophy, LuZap, LuCompass, LuMedal } from "react-icons/lu";
import type { Player } from "../store";
import { games } from "../games/registry";

/** Erfahrung und Level aus dem Spielverhalten */
export function levelOf(p: Player) {
  const xp = Math.round(p.rounds * 10 + p.wagered * 0.5 + (p.wins ?? 0) * 15);
  const level = Math.floor(Math.sqrt(xp / 120)) + 1;
  const cur = (level - 1) ** 2 * 120, next = level ** 2 * 120;
  const ranks = ["Neuling", "Spieler", "Stammgast", "Profi", "Highroller", "Hai", "Legende", "X7 Elite"];
  return { xp, level, progress: (xp - cur) / (next - cur), toNext: next - xp, rank: ranks[Math.min(ranks.length - 1, Math.floor((level - 1) / 4))] };
}

export type Achievement = { id: string; name: string; desc: string; icon: IconType; done: (p: Player) => boolean };
export const achievements: Achievement[] = [
  { id: "first", name: "Erste Runde", desc: "Spiel deine erste Runde.", icon: LuDices, done: (p) => p.rounds >= 1 },
  { id: "firstwin", name: "Erster Gewinn", desc: "Gewinne eine Runde.", icon: LuStar, done: (p) => (p.wins ?? 0) >= 1 },
  { id: "r100", name: "Stammgast", desc: "Spiele 100 Runden.", icon: LuFlame, done: (p) => p.rounds >= 100 },
  { id: "r1000", name: "Dauergast", desc: "Spiele 1.000 Runden.", icon: LuMedal, done: (p) => p.rounds >= 1000 },
  { id: "w50", name: "Glückspilz", desc: "Gewinne 50 Runden.", icon: LuSparkles, done: (p) => (p.wins ?? 0) >= 50 },
  { id: "big", name: "Big Win", desc: "Gewinne das 10-Fache deines Einsatzes.", icon: LuZap, done: (p) => (p.maxMult ?? 0) >= 10 },
  { id: "mega", name: "Mega Win", desc: "Gewinne das 50-Fache deines Einsatzes.", icon: LuRocket, done: (p) => (p.maxMult ?? 0) >= 50 },
  { id: "high", name: "Highroller", desc: "Setz 1.000 oder mehr in einer Runde.", icon: LuGem, done: (p) => (p.maxBet ?? 0) >= 1000 },
  { id: "explore", name: "Entdecker", desc: "Spiele 10 verschiedene Spiele.", icon: LuCompass, done: (p) => (p.played ?? []).length >= 10 },
  { id: "all", name: "Alles gesehen", desc: "Spiele jedes Spiel mindestens einmal.", icon: LuMap, done: (p) => (p.played ?? []).length >= games.length },
  { id: "million", name: "Millionär", desc: "Hab 1.000.000 Guthaben.", icon: LuCrown, done: (p) => p.balance >= 1_000_000 },
  { id: "lvl10", name: "Level 10", desc: "Erreiche Level 10.", icon: LuTrophy, done: (p) => levelOf(p).level >= 10 },
];
