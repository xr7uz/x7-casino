import { useMemo, useState } from "react";
import { useStore } from "../store";
import { pickWeighted, rand, round2 } from "../lib/rng";
import { play } from "../lib/sound";
import { Action, BetInput, GameShell, Outcome, useBetGuard } from "../components/ui";

// Gegenstände mit Seltenheit; Werte werden auf den RTP normiert
const ITEMS = [
  { n: "Sticker", e: "🏷️", rar: "Gewöhnlich", w: 40, v: 0.2 },
  { n: "Schlüsselanhänger", e: "🔑", rar: "Gewöhnlich", w: 26, v: 0.5 },
  { n: "Sonnenbrille", e: "🕶️", rar: "Selten", w: 16, v: 1 },
  { n: "Sneaker", e: "👟", rar: "Selten", w: 10, v: 2 },
  { n: "Kopfhörer", e: "🎧", rar: "Episch", w: 5, v: 5 },
  { n: "Diamant", e: "💎", rar: "Legendär", w: 2.2, v: 15 },
  { n: "Die Uhr", e: "⌚", rar: "Mythisch", w: 0.8, v: 60 },
];
const rarClass: Record<string, string> = { Gewöhnlich: "c", Selten: "r", Episch: "e", Legendär: "l", Mythisch: "m" };

export default function Loot({ onBack }: { onBack: () => void }) {
  const { placeBet, settle, edge } = useStore();
  const [bet, setBet] = useState(10);
  const [strip, setStrip] = useState<number[]>([]);
  const [offset, setOffset] = useState(0);
  const [busy, setBusy] = useState(false);
  const [won, setWon] = useState<number | null>(null);
  const [res, setRes] = useState<{ bet: number; payout: number; text: string } | null>(null);
  const W = ITEMS.reduce((a, b) => a + b.w, 0);
  const values = useMemo(() => {
    const ev = ITEMS.reduce((s, x) => s + (x.w / W) * x.v, 0);
    return ITEMS.map((x) => round2((x.v * (1 - edge)) / ev));
  }, [edge, W]);
  const { done } = useBetGuard();
  const CELL = 92;

  const open = () => {
    if (!placeBet(bet)) return;
    const pick = () => pickWeighted(ITEMS.map((x, i) => ({ item: i, w: x.w })));
    const win = pick();
    const s = Array.from({ length: 40 }, (_, i) => (i === 34 ? win : pick()));
    setStrip(s); setOffset(0); setBusy(true); setWon(null); setRes(null); play("spin");
    requestAnimationFrame(() => requestAnimationFrame(() => setOffset(34 * CELL + rand() * (CELL - 20) - (CELL - 20) / 2)));
    setTimeout(() => {
      const payout = round2(bet * values[win]);
      setWon(win); setRes({ bet, payout, text: `${ITEMS[win].n} · ${ITEMS[win].rar}` }); settle("loot", bet, payout); setBusy(false);
    }, 4300);
  };

  return (
    <GameShell id="loot" onBack={onBack} rules="Öffne eine Box für deinen Einsatz. Jeder Gegenstand hat einen Wert in Vielfachen des Einsatzes – je seltener, desto mehr. Alles ist Spielgeld, Gegenstände sind rein symbolisch.">
      <div className="loot">
        <div className="loot__window">
          <div className="loot__strip" style={{ transform: `translateX(calc(50% - ${offset + CELL / 2}px))`, transition: busy ? "transform 4.1s cubic-bezier(.12,.8,.2,1)" : "none" }}>
            {(strip.length ? strip : [0, 1, 2, 3, 4, 5, 6]).map((it, i) => (
              <div key={i} className={`litem litem--${rarClass[ITEMS[it].rar]} ${won !== null && i === 34 ? "is-won" : ""}`} style={{ width: CELL - 8 }}>
                <span>{ITEMS[it].e}</span><small>{values[it]}×</small>
              </div>
            ))}
          </div>
          <span className="loot__pin" aria-hidden="true" />
        </div>
        <div className="loot__odds">
          {ITEMS.map((x, i) => <span key={x.n} className={`litem--${rarClass[x.rar]}`}><b>{x.e} {x.n}</b><em>{((x.w / W) * 100).toFixed(1)} % · {values[i]}×</em></span>)}
        </div>
        {res && <Outcome bet={res.bet} payout={res.payout} text={res.text} />}
        <BetInput value={bet} onChange={setBet} disabled={busy} label="Preis der Box" />
        <Action onClick={open} disabled={busy || done}>{busy ? "Öffnet …" : "Box öffnen"}</Action>
      </div>
    </GameShell>
  );
}
