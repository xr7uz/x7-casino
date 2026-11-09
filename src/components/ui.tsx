import { useEffect, useState, type ReactNode } from "react";
import { LuChevronLeft, LuInfo, LuStar } from "react-icons/lu";
import { useStore } from "../store";
import { gameById } from "../games/registry";
import { isRed, rankLabel, type Card } from "../lib/cards";
import { tap } from "../lib/haptics";

/** Rahmen jedes Spiels: Kopfzeile mit Zurück, Titel, Favorit und Regeln. */
export function GameShell({ id, onBack, rules, children }: { id: string; onBack: () => void; rules: string; children: ReactNode }) {
  const g = gameById(id);
  const { s, toggleFav, edge } = useStore();
  const [showRules, setShowRules] = useState(false);
  const fav = s.favorites.includes(id);
  const Icon = g.icon;
  return (
    <div className="game" style={{ ["--g" as string]: g.hue }}>
      <header className="game__head">
        <button className="iconbtn" onClick={onBack} aria-label="Zurück zur Lobby"><LuChevronLeft /></button>
        <div className="game__title">
          <span className="game__icon"><Icon /></span>
          <div>
            <h1>{g.name}</h1>
            <p>{g.edgeLabel(edge)}</p>
          </div>
        </div>
        <button className={`iconbtn ${fav ? "is-on" : ""}`} onClick={() => toggleFav(id)} aria-label="Favorit"><LuStar /></button>
        <button className="iconbtn" onClick={() => setShowRules((v) => !v)} aria-label="Regeln"><LuInfo /></button>
      </header>
      {showRules && <div className="rules">{rules}</div>}
      <div className="game__body">{children}</div>
    </div>
  );
}

/** Einsatzfeld mit ½, ×2 und Max. */
export function BetInput({ value, onChange, disabled, label = "Einsatz" }: { value: number; onChange: (n: number) => void; disabled?: boolean; label?: string }) {
  const { player, fmt } = useStore();
  const clamp = (n: number) => Math.max(1, Math.min(Math.floor(player.balance), Math.round(n)));
  return (
    <div className="bet">
      <label className="bet__label" htmlFor="bet-input">{label}<span>{fmt(player.balance)} verfügbar</span></label>
      <div className="bet__row">
        <input
          id="bet-input"
          type="number"
          inputMode="numeric"
          min={1}
          value={value}
          disabled={disabled}
          onChange={(e) => onChange(Math.max(0, Math.floor(Number(e.target.value) || 0)))}
        />
        <button disabled={disabled} onClick={() => { tap(); onChange(clamp(value / 2)); }}>½</button>
        <button disabled={disabled} onClick={() => { tap(); onChange(clamp(value * 2)); }}>×2</button>
        <button disabled={disabled} onClick={() => { tap(); onChange(clamp(player.balance)); }}>Max</button>
      </div>
    </div>
  );
}

/** Großer Aktionsknopf */
export function Action({ children, onClick, disabled, tone = "primary" }: { children: ReactNode; onClick: () => void; disabled?: boolean; tone?: "primary" | "ghost" | "win" }) {
  return (
    <button className={`action action--${tone}`} disabled={disabled} onClick={() => { tap("medium"); onClick(); }}>
      {children}
    </button>
  );
}

/** Spielkarte */
export function PlayingCard({ c, hidden, small }: { c?: Card; hidden?: boolean; small?: boolean }) {
  if (!c || hidden) return <div className={`pcard pcard--back ${small ? "pcard--sm" : ""}`} aria-label="verdeckte Karte" />;
  return (
    <div className={`pcard ${isRed(c) ? "pcard--red" : ""} ${small ? "pcard--sm" : ""}`} aria-label={`${rankLabel(c.r)} ${c.s}`}>
      <span className="pcard__r">{rankLabel(c.r)}</span>
      <span className="pcard__s">{c.s}</span>
      <span className="pcard__big">{c.s}</span>
    </div>
  );
}

/** Ergebnis-Banner nach einer Runde */
export function Outcome({ bet, payout, text }: { bet: number; payout: number; text?: string }) {
  const { fmt } = useStore();
  const net = payout - bet;
  const kind = net > 0 ? "win" : net === 0 ? "push" : "loss";
  const big = bet > 0 && payout >= bet * 5;
  return (
    <div className={`outcome outcome--${kind}`} role="status">
      {kind === "win" && <Sparks />}
      <strong>{kind === "win" ? `+${fmt(net)}` : kind === "push" ? "Unentschieden" : `−${fmt(bet - payout)}`}</strong>
      {text && <span>{text}</span>}
      {big && <CoinRain mult={payout / bet} />}
    </div>
  );
}

/** Effekt 1a: kleine Funken bei jedem Gewinn */
function Sparks() {
  return (
    <span className="sparks" aria-hidden="true">
      {Array.from({ length: 12 }, (_, i) => <i key={i} style={{ ["--a" as string]: `${i * 30}deg`, ["--d" as string]: `${40 + (i % 3) * 14}px` }} />)}
    </span>
  );
}

/** Effekt 1b: Münzregen und Großanzeige bei großen Gewinnen (ab 5×) */
function CoinRain({ mult }: { mult: number }) {
  const [show, setShow] = useState(true);
  useEffect(() => { const t = setTimeout(() => setShow(false), 2200); return () => clearTimeout(t); }, []);
  if (!show) return null;
  return (
    <div className="coinrain" aria-hidden="true">
      <div className="coinrain__big">{mult >= 20 ? "MEGA WIN" : "BIG WIN"}<small>{mult.toFixed(1)}×</small></div>
      {Array.from({ length: 28 }, (_, i) => (
        <i key={i} style={{ left: `${(i * 37) % 100}%`, ["--dl" as string]: `${(i % 7) * 90}ms`, ["--du" as string]: `${1300 + (i % 5) * 160}ms`, ["--rot" as string]: `${(i % 2 ? 1 : -1) * (200 + i * 13)}deg` }} />
      ))}
    </div>
  );
}

/** Hinweis bei zu wenig Guthaben bzw. im Turnier */
export function useBetGuard() {
  const { player, roundsDone } = useStore();
  return { done: roundsDone, broke: player.balance < 1 };
}

export function Multiplier({ value, big }: { value: number; big?: boolean }) {
  return <span className={`mult ${big ? "mult--big" : ""}`}>{value.toFixed(2)}×</span>;
}

/** Zahl, die weich auf ihren Zielwert hochzählt */
export function useAnimatedNumber(target: number, ms = 400) {
  const [v, setV] = useState(target);
  useEffect(() => {
    const from = v;
    const start = performance.now();
    let raf = 0;
    const step = (t: number) => {
      const k = Math.min(1, (t - start) / ms);
      setV(from + (target - from) * (1 - Math.pow(1 - k, 3)));
      if (k < 1) raf = requestAnimationFrame(step);
    };
    raf = requestAnimationFrame(step);
    return () => cancelAnimationFrame(raf);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [target]);
  return v;
}
