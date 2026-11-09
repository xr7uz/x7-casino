import { useEffect, useRef, useState, type ComponentType } from "react";
import { LuChartPie, LuCrown, LuHouse, LuSettings, LuUsers, LuRefreshCw } from "react-icons/lu";
import { useStore } from "./store";
import { tap } from "./lib/haptics";
import { useAnimatedNumber } from "./components/ui";
import { enableSmooth, toTop } from "./lib/smooth";
import { Lobby } from "./screens/Lobby";
import { Party } from "./screens/Party";
import { Stats } from "./screens/Stats";
import { Settings } from "./screens/Settings";
import Crash from "./games/Crash";
import Blackjack from "./games/Blackjack";
import Poker from "./games/Poker";
import Mines from "./games/Mines";
import Roulette from "./games/Roulette";
import Plinko from "./games/Plinko";
import Fish from "./games/Fish";
import HiLo from "./games/HiLo";
import Baccarat from "./games/Baccarat";
import Keno from "./games/Keno";
import Wheel from "./games/Wheel";
import Chicken from "./games/Chicken";
import Dice from "./games/Dice";
import Slots from "./games/Slots";
import DragonTiger from "./games/DragonTiger";
import Loot from "./games/Loot";

const gameComponents: Record<string, ComponentType<{ onBack: () => void }>> = {
  crash: Crash, blackjack: Blackjack, poker: Poker, mines: Mines, roulette: Roulette, plinko: Plinko, fish: Fish,
  hilo: HiLo, baccarat: Baccarat, keno: Keno, wheel: Wheel, chicken: Chicken, dice: Dice, slots: Slots,
  dragontiger: DragonTiger, loot: Loot,
};

type Tab = "lobby" | "party" | "stats" | "settings";

export default function App() {
  const { s, player, fmt, setSettings, needsHandover, nextPlayer, endTournament, refill, canRefill } = useStore();
  const [tab, setTab] = useState<Tab>("lobby");
  const [game, setGame] = useState<string | null>(null);
  const [intro, setIntro] = useState(!s.settings.onboarded);
  const [onlineSeen, setOnlineSeen] = useState(false);
  useEffect(() => { if (!s.online) setOnlineSeen(false); }, [s.online]);

  useEffect(() => { enableSmooth(s.settings.smooth); }, [s.settings.smooth]);
  useEffect(() => { toTop(); }, [tab, game]);

  const Game = game ? gameComponents[game] : null;
  const t = s.party.tournament;
  const ranked = [...s.players].sort((a, b) => b.balance - a.balance);
  const nextUp = (() => {
    const i = s.players.findIndex((p) => p.id === player.id);
    for (let k = 1; k <= s.players.length; k++) {
      const c = s.players[(i + k) % s.players.length];
      if (!t.active || c.tourRounds < t.roundsEach) return c;
    }
    return player;
  })();

  return (
    <div className="app">
      <header className="topbar">
        <button className="who" onClick={() => setTab("party")} aria-label="Spieler wechseln">
          <span className="dot" style={{ background: player.color }} />{player.name}
          {s.online ? <small>Online · {s.online.played}/{s.online.rounds}</small> : t.active && <small>{player.tourRounds}/{t.roundsEach}</small>}
        </button>
        <Balance value={player.balance} fmt={fmt} />
        {player.balance < 1 && canRefill
          ? <button className="pill" onClick={refill}><LuRefreshCw /> Auffüllen</button>
          : <span className="topbar__spacer" />}
      </header>

      <main className="main" key={game ?? tab}>
        {Game ? <Game onBack={() => setGame(null)} />
          : tab === "lobby" ? <Lobby open={setGame} />
          : tab === "party" ? <Party />
          : tab === "stats" ? <Stats />
          : <Settings replayIntro={() => setIntro(true)} />}
      </main>

      {!game && (
        <nav className="tabbar" aria-label="Hauptnavigation">
          {([
            ["lobby", LuHouse, "Lobby"],
            ["party", LuUsers, "Party"],
            ["stats", LuChartPie, "Statistik"],
            ["settings", LuSettings, "Einstellungen"],
          ] as const).map(([id, Icon, label]) => (
            <button key={id} className={tab === id ? "is-on" : ""} onClick={() => { tap(); setTab(id); }} aria-current={tab === id ? "page" : undefined}>
              <Icon /><span>{label}</span>
            </button>
          ))}
        </nav>
      )}

      {needsHandover && !t.finished && (
        <div className="overlay" role="dialog" aria-modal="true" aria-labelledby="handover-t">
          <div className="sheet">
            <span className="dot dot--big" style={{ background: nextUp.color }} />
            <h2 id="handover-t">Gib das Handy an {nextUp.name}</h2>
            <p>Zug von {player.name} beendet{t.active ? ` · ${player.tourRounds}/${t.roundsEach} Runden` : ""}.</p>
            <button className="action action--primary" onClick={() => { tap("medium"); nextPlayer(); }}>{nextUp.name} ist dran</button>
          </div>
        </div>
      )}

      {t.active && t.finished && (
        <div className="overlay" role="dialog" aria-modal="true" aria-labelledby="result-t">
          <div className="sheet">
            <LuCrown className="sheet__crown" />
            <h2 id="result-t">{ranked[0].name} gewinnt!</h2>
            <ol className="board">
              {ranked.map((p, i) => {
                const net = p.balance - t.startBalance;
                return <li key={p.id}><span className="board__pos">{i + 1}</span><span className="dot" style={{ background: p.color }} /><b>{p.name}</b><span className={net >= 0 ? "pos" : "neg"}>{net >= 0 ? "+" : ""}{fmt(net)}</span></li>;
              })}
            </ol>
            <p className="muted">{ranked[ranked.length - 1].name} hat am meisten verloren.</p>
            <button className="action action--primary" onClick={() => { endTournament(); setGame(null); setTab("party"); }}>Zurück zur Party</button>
          </div>
        </div>
      )}

      {s.online?.finished && !onlineSeen && (
        <div className="overlay" role="dialog" aria-modal="true" aria-labelledby="online-t">
          <div className="sheet">
            <LuCrown className="sheet__crown" />
            <h2 id="online-t">Turnier geschafft!</h2>
            <p>Endstand: <b className={s.online.balance >= s.online.start ? "pos" : "neg"}>{fmt(s.online.balance)}</b> (Start {fmt(s.online.start)})</p>
            <p className="muted">Schick jetzt deinen Ergebnis-Code an die anderen und füg ihre Codes ein, um zu sehen, wer gewonnen hat.</p>
            <button className="action action--primary" onClick={() => { setOnlineSeen(true); setGame(null); setTab("party"); }}>Zur Rangliste</button>
          </div>
        </div>
      )}

      {intro && (
        <div className="overlay" role="dialog" aria-modal="true" aria-labelledby="intro-t">
          <div className="sheet sheet--intro">
            <p className="hero__kick">Willkommen bei</p>
            <h2 id="intro-t" className="intro__logo">X<span>7</span> Casino</h2>
            <ul className="intro__list">
              <li><b>Nur Spielgeld.</b> Kein echtes Geld, keine Käufe, keine Auszahlung.</li>
              <li><b>Alles gratis.</b> Credits jederzeit auffüllen oder frei einstellen.</li>
              <li><b>16 Spiele</b> von Blackjack bis Fischjagd – mit ehrlicher Mathematik.</li>
              <li><b>Party-Modus:</b> spielt zu mehreren auf einem Handy gegeneinander.</li>
            </ul>
            <p className="muted">Diese App simuliert Glücksspiel und ist für Erwachsene gedacht.</p>
            <button className="action action--primary" onClick={() => { setSettings({ onboarded: true }); setIntro(false); }}>Ich bin 18+ · Los geht’s</button>
          </div>
        </div>
      )}
    </div>
  );
}

/** Effekt 2: Guthaben zählt hoch/runter und leuchtet kurz in Gewinn- bzw. Verlustfarbe */
function Balance({ value, fmt }: { value: number; fmt: (n: number) => string }) {
  const shown = useAnimatedNumber(value, 500);
  const prev = useRef(value);
  const [flash, setFlash] = useState<"" | "up" | "down">("");
  useEffect(() => {
    if (value === prev.current) return;
    setFlash(value > prev.current ? "up" : "down");
    prev.current = value;
    const t = setTimeout(() => setFlash(""), 650);
    return () => clearTimeout(t);
  }, [value]);
  return <div className={`balance ${flash ? `balance--${flash}` : ""}`} aria-live="polite">{fmt(Math.round(shown * 100) / 100)}</div>;
}
