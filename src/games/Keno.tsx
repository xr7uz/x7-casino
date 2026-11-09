import { useMemo, useState } from "react";
import { useStore } from "../store";
import { binom, round2, shuffle } from "../lib/rng";
import { Action, BetInput, GameShell, Outcome, useBetGuard } from "../components/ui";

const POOL = 40, DRAW = 10;
const pHits = (picks: number, k: number) => (binom(picks, k) * binom(POOL - picks, DRAW - k)) / binom(POOL, DRAW);

/** Auszahlungstabelle: steigt mit der Trefferzahl, normiert auf den RTP */
function paytable(picks: number, edge: number) {
  const raw = Array.from({ length: picks + 1 }, (_, k) => {
    const need = Math.max(1, Math.ceil(picks / 3));
    return k < need ? 0 : Math.pow(k - need + 1, 2.2) * (1 + picks / 10);
  });
  const ev = raw.reduce((s, m, k) => s + m * pHits(picks, k), 0);
  return raw.map((m) => (ev ? round2((m * (1 - edge)) / ev) : 0));
}

export default function Keno({ onBack }: { onBack: () => void }) {
  const { placeBet, settle, edge } = useStore();
  const [bet, setBet] = useState(10);
  const [picks, setPicks] = useState<number[]>([]);
  const [drawn, setDrawn] = useState<number[]>([]);
  const [busy, setBusy] = useState(false);
  const [res, setRes] = useState<{ bet: number; payout: number; text: string } | null>(null);
  const pay = useMemo(() => paytable(Math.max(1, picks.length), edge), [picks.length, edge]);
  const { done } = useBetGuard();

  const toggle = (n: number) => {
    if (busy) return;
    setDrawn([]); setRes(null);
    setPicks((p) => p.includes(n) ? p.filter((x) => x !== n) : p.length < 10 ? [...p, n] : p);
  };
  const quick = () => { if (!busy) { setDrawn([]); setPicks(shuffle(Array.from({ length: POOL }, (_, i) => i + 1)).slice(0, 6)); } };
  const play = () => {
    if (!picks.length || !placeBet(bet)) return;
    const d = shuffle(Array.from({ length: POOL }, (_, i) => i + 1)).slice(0, DRAW);
    setBusy(true); setDrawn([]); setRes(null);
    d.forEach((n, i) => setTimeout(() => setDrawn((x) => [...x, n]), 120 * (i + 1)));
    setTimeout(() => {
      const hits = d.filter((n) => picks.includes(n)).length;
      const payout = round2(bet * pay[hits]);
      setRes({ bet, payout, text: `${hits} von ${picks.length} Treffern` });
      settle("keno", bet, payout); setBusy(false);
    }, 120 * (DRAW + 1));
  };

  return (
    <GameShell id="keno" onBack={onBack} rules="Wähle 1 bis 10 Zahlen aus 40. Es werden 10 gezogen. Je mehr Treffer, desto höher die Auszahlung laut Tabelle.">
      <div className="keno">
        <div className="keno__grid">
          {Array.from({ length: POOL }, (_, i) => i + 1).map((n) => {
            const p = picks.includes(n), d = drawn.includes(n);
            return <button key={n} className={`kcell ${p ? "is-pick" : ""} ${d ? "is-drawn" : ""} ${p && d ? "is-hit" : ""}`} onClick={() => toggle(n)}>{n}</button>;
          })}
        </div>
        <div className="keno__pay">
          {pay.map((m, k) => m > 0 && <span key={k}><b>{k}×</b> {m.toFixed(2)}</span>)}
        </div>
        {res && <Outcome bet={res.bet} payout={res.payout} text={res.text} />}
        <div className="actions2">
          <Action tone="ghost" onClick={quick} disabled={busy}>Zufällig 6</Action>
          <Action tone="ghost" onClick={() => { setPicks([]); setDrawn([]); }} disabled={busy}>Leeren</Action>
        </div>
        <BetInput value={bet} onChange={setBet} disabled={busy} />
        <Action onClick={play} disabled={busy || !picks.length || done}>{picks.length ? `Ziehen (${picks.length} gewählt)` : "Zahlen wählen"}</Action>
      </div>
    </GameShell>
  );
}
