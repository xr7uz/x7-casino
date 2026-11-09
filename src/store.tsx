import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { setHaptics, success } from "./lib/haptics";
import { newRoomCode, pushLive, type Result, type RoomInfo } from "./lib/online";

/**
 * Zentraler Zustand der App. Es gibt nur Spielgeld ("Credits"):
 * nicht kaufbar, nicht auszahlbar, nicht übertragbar. Alles bleibt lokal auf dem Gerät.
 */

export type Theme = "noir" | "rose" | "royale";
export type Player = {
  id: string;
  name: string;
  color: string;
  balance: number;
  rounds: number;
  wagered: number;
  returned: number;
  biggestWin: number;
  tourRounds: number;
};
export type HistoryItem = { t: number; player: string; game: string; bet: number; payout: number };
export type Settings = {
  theme: Theme;
  currency: string;
  haptics: boolean;
  training: boolean;
  smooth: boolean; // Premium Smooth Scrolling
  edge: number; // Hausvorteil in Prozent für mathematische Spiele (0–10)
  onboarded: boolean;
};
export type Party = {
  enabled: boolean;
  roundsPerTurn: number;
  tournament: { active: boolean; roundsEach: number; startBalance: number; finished: boolean };
};

export type Online = RoomInfo & {
  name: string;
  balance: number;
  played: number;
  wagered: number;
  returned: number;
  finished: boolean;
  results: Result[];
  host: boolean;
};

type State = {
  deviceId: string;
  online: Online | null;
  players: Player[];
  activeId: string;
  settings: Settings;
  party: Party;
  favorites: string[];
  history: HistoryItem[];
  turnRounds: number;
  lastBonus: string;
};

export const START_BALANCE = 1000;
const colors = ["#ff69b4", "#c24366", "#ffd166", "#5ec2ff", "#7ee08a", "#b48cff"];
const uid = () => Math.random().toString(36).slice(2, 9);
const newPlayer = (name: string, i: number, balance = START_BALANCE): Player => ({
  id: uid(), name, color: colors[i % colors.length], balance, rounds: 0, wagered: 0, returned: 0, biggestWin: 0, tourRounds: 0,
});

function initial(): State {
  const p = newPlayer("Du", 0);
  return {
    deviceId: uid() + uid(),
    online: null,
    players: [p],
    activeId: p.id,
    settings: { theme: "noir", currency: "◆", haptics: true, smooth: true, training: false, edge: 3, onboarded: false },
    party: { enabled: false, roundsPerTurn: 1, tournament: { active: false, roundsEach: 10, startBalance: 1000, finished: false } },
    favorites: [],
    history: [],
    turnRounds: 0,
    lastBonus: "",
  };
}

const KEY = "x7casino-v1";
function load(): State {
  try {
    const raw = localStorage.getItem(KEY);
    if (raw) { const d = JSON.parse(raw); const i = initial(); return { ...i, ...d, settings: { ...i.settings, ...d.settings } }; }
  } catch { /* leer */ }
  return initial();
}

type Ctx = {
  s: State;
  player: Player;
  fmt: (n: number) => string;
  edge: number;
  placeBet: (amount: number) => boolean;
  settle: (game: string, bet: number, payout: number) => void;
  refill: () => void;
  setBalance: (n: number) => void;
  canRefill: boolean;
  claimBonus: () => number;
  bonusReady: boolean;
  setSettings: (p: Partial<Settings>) => void;
  toggleFav: (id: string) => void;
  addPlayer: (name: string) => void;
  removePlayer: (id: string) => void;
  renamePlayer: (id: string, name: string) => void;
  setActive: (id: string) => void;
  setParty: (p: Partial<Party>) => void;
  nextPlayer: () => void;
  needsHandover: boolean;
  startTournament: (roundsEach: number, startBalance: number) => void;
  endTournament: () => void;
  resetStats: () => void;
  clearHistory: () => void;
  locked: boolean;
  roundsDone: boolean;
  createRoom: (name: string, rounds: number, start: number) => void;
  joinRoom: (room: RoomInfo, name: string) => void;
  leaveRoom: () => void;
  addResult: (r: Result) => "ok" | "wrong-room" | "own";
};

const StoreCtx = createContext<Ctx | null>(null);

export function StoreProvider({ children }: { children: ReactNode }) {
  const [s, setS] = useState<State>(load);
  const saveTimer = useRef(0);

  useEffect(() => {
    window.clearTimeout(saveTimer.current);
    saveTimer.current = window.setTimeout(() => {
      try { localStorage.setItem(KEY, JSON.stringify(s)); } catch { /* voll/gesperrt */ }
    }, 150);
  }, [s]);

  useEffect(() => { setHaptics(s.settings.haptics); }, [s.settings.haptics]);
  useEffect(() => { document.documentElement.dataset.theme = s.settings.theme; }, [s.settings.theme]);

  const basePlayer = s.players.find((p) => p.id === s.activeId) ?? s.players[0];
  const on = s.online;
  // Im Online-Turnier spielt man mit eigenem, festem Turnier-Guthaben (das normale Guthaben bleibt unberührt)
  const player: Player = on ? { ...basePlayer, name: on.name, balance: on.balance, tourRounds: on.played } : basePlayer;
  const updatePlayer = (st: State, id: string, fn: (p: Player) => Player): State => ({
    ...st, players: st.players.map((p) => (p.id === id ? fn(p) : p)),
  });

  const fmt = useCallback((n: number) => {
    const v = Math.round(n * 100) / 100;
    const str = v.toLocaleString("de-DE", { maximumFractionDigits: 2, minimumFractionDigits: Number.isInteger(v) ? 0 : 2 });
    return `${str} ${s.settings.currency}`;
  }, [s.settings.currency]);

  const tour = s.party.tournament;
  const locked = tour.active || !!on;
  const roundsDone = on ? on.played >= on.rounds : tour.active && player.tourRounds >= tour.roundsEach;
  const today = new Date().toISOString().slice(0, 10);
  const pendingTurns = s.party.enabled && s.players.length > 1;

  const ctx = useMemo<Ctx>(() => ({
    s,
    player,
    fmt,
    edge: Math.max(0, Math.min(10, s.settings.edge)) / 100,
    locked,
    roundsDone,
    placeBet: (amount) => {
      if (amount <= 0 || amount > player.balance + 1e-9 || roundsDone) return false;
      if (on) { setS((st) => st.online ? { ...st, online: { ...st.online, balance: st.online.balance - amount } } : st); return true; }
      setS((st) => updatePlayer(st, player.id, (p) => ({ ...p, balance: p.balance - amount })));
      return true;
    },
    settle: (game, bet, payout) => {
      if (payout > bet) success();
      if (on) {
        setS((st) => {
          if (!st.online) return st;
          const o = st.online;
          const online = { ...o, balance: o.balance + payout, played: o.played + 1, wagered: o.wagered + bet, returned: o.returned + payout };
          online.finished = online.played >= online.rounds;
          pushLive(o.code, { code: o.code, name: o.name, balance: online.balance, played: online.played, device: st.deviceId, finished: online.finished });
          return { ...st, online, history: [{ t: Date.now(), player: "online", game, bet, payout }, ...st.history].slice(0, 300) };
        });
        return;
      }
      setS((st) => {
        let next = updatePlayer(st, st.activeId, (p) => ({
          ...p,
          balance: p.balance + payout,
          rounds: p.rounds + 1,
          wagered: p.wagered + bet,
          returned: p.returned + payout,
          biggestWin: Math.max(p.biggestWin, payout - bet),
          tourRounds: st.party.tournament.active ? p.tourRounds + 1 : p.tourRounds,
        }));
        next = { ...next, history: [{ t: Date.now(), player: st.activeId, game, bet, payout }, ...st.history].slice(0, 300), turnRounds: st.turnRounds + 1 };
        if (next.party.tournament.active && next.players.every((p) => p.tourRounds >= next.party.tournament.roundsEach)) {
          next = { ...next, party: { ...next.party, tournament: { ...next.party.tournament, finished: true } } };
        }
        return next;
      });
    },
    canRefill: !locked,
    refill: () => {
      if (locked) return;
      setS((st) => updatePlayer(st, st.activeId, (p) => ({ ...p, balance: Math.max(p.balance, 0) + START_BALANCE })));
    },
    setBalance: (n) => {
      if (locked || !Number.isFinite(n)) return;
      const v = Math.max(0, Math.min(1e12, Math.round(n * 100) / 100));
      setS((st) => updatePlayer(st, st.activeId, (p) => ({ ...p, balance: v })));
    },
    bonusReady: s.lastBonus !== today && !locked,
    claimBonus: () => {
      const amount = [250, 500, 750, 1000, 2500][Math.floor(Math.random() * 5)];
      setS((st) => ({ ...updatePlayer(st, st.activeId, (p) => ({ ...p, balance: p.balance + amount })), lastBonus: today }));
      return amount;
    },
    setSettings: (p) => setS((st) => ({ ...st, settings: { ...st.settings, ...p } })),
    toggleFav: (id) => setS((st) => ({ ...st, favorites: st.favorites.includes(id) ? st.favorites.filter((x) => x !== id) : [...st.favorites, id] })),
    addPlayer: (name) => setS((st) => st.players.length >= 6 ? st : ({ ...st, players: [...st.players, newPlayer(name.trim() || `Spieler ${st.players.length + 1}`, st.players.length)] })),
    removePlayer: (id) => setS((st) => {
      if (st.players.length <= 1) return st;
      const players = st.players.filter((p) => p.id !== id);
      return { ...st, players, activeId: st.activeId === id ? players[0].id : st.activeId };
    }),
    renamePlayer: (id, name) => setS((st) => updatePlayer(st, id, (p) => ({ ...p, name: name.slice(0, 16) || p.name }))),
    setActive: (id) => setS((st) => ({ ...st, activeId: id, turnRounds: 0 })),
    setParty: (p) => setS((st) => ({ ...st, party: { ...st.party, ...p } })),
    needsHandover: !on && pendingTurns && s.turnRounds >= s.party.roundsPerTurn && !tour.finished,
    nextPlayer: () => setS((st) => {
      const order = st.players.filter((p) => !st.party.tournament.active || p.tourRounds < st.party.tournament.roundsEach);
      if (!order.length) return { ...st, turnRounds: 0 };
      const idx = st.players.findIndex((p) => p.id === st.activeId);
      for (let k = 1; k <= st.players.length; k++) {
        const cand = st.players[(idx + k) % st.players.length];
        if (order.includes(cand)) return { ...st, activeId: cand.id, turnRounds: 0 };
      }
      return { ...st, turnRounds: 0 };
    }),
    startTournament: (roundsEach, startBalance) => setS((st) => ({
      ...st,
      players: st.players.map((p) => ({ ...p, balance: startBalance, tourRounds: 0 })),
      activeId: st.players[0].id,
      turnRounds: 0,
      party: { ...st.party, enabled: true, tournament: { active: true, roundsEach, startBalance, finished: false } },
    })),
    endTournament: () => setS((st) => ({ ...st, party: { ...st.party, tournament: { ...st.party.tournament, active: false, finished: false } }, turnRounds: 0 })),
    resetStats: () => setS((st) => ({ ...st, players: st.players.map((p) => ({ ...p, rounds: 0, wagered: 0, returned: 0, biggestWin: 0 })) })),
    clearHistory: () => setS((st) => ({ ...st, history: [] })),
    createRoom: (name, rounds, start) => setS((st) => ({
      ...st,
      online: { code: newRoomCode(), rounds, start, name: name.trim().slice(0, 16) || "Ich", balance: start, played: 0, wagered: 0, returned: 0, finished: false, results: [], host: true },
    })),
    joinRoom: (room, name) => setS((st) => ({
      ...st,
      online: { ...room, name: name.trim().slice(0, 16) || "Ich", balance: room.start, played: 0, wagered: 0, returned: 0, finished: false, results: [], host: false },
    })),
    leaveRoom: () => setS((st) => ({ ...st, online: null })),
    addResult: (r) => {
      if (!on) return "wrong-room";
      if (r.code !== on.code) return "wrong-room";
      if (r.device === s.deviceId) return "own";
      setS((st) => st.online ? { ...st, online: { ...st.online, results: [...st.online.results.filter((x) => x.device !== r.device), r] } } : st);
      return "ok";
    },
  }), [s, player, fmt, tour, today, pendingTurns, on, locked, roundsDone]);

  return <StoreCtx.Provider value={ctx}>{children}</StoreCtx.Provider>;
}

export function useStore() {
  const c = useContext(StoreCtx);
  if (!c) throw new Error("StoreProvider fehlt");
  return c;
}
