import { useState } from "react";
import { LuGem, LuBomb } from "react-icons/lu";
import { useStore } from "../store";
import { round2, shuffle } from "../lib/rng";
import { Action, BetInput, GameShell, Outcome, useBetGuard } from "../components/ui";
import { tap } from "../lib/haptics";
import { play } from "../lib/sound";

const N = 25;
export function minesMult(mines: number, picks: number, edge: number) {
  let p = 1;
  for (let i = 0; i < picks; i++) p *= (N - mines - i) / (N - i);
  return picks === 0 ? 1 : round2((1 - edge) / p);
}

export default function Mines({ onBack }: { onBack: () => void }) {
  const { placeBet, settle, edge } = useStore();
  const [bet, setBet] = useState(10);
  const [mines, setMines] = useState(3);
  const [board, setBoard] = useState<boolean[] | null>(null); // true = Mine
  const [open, setOpen] = useState<number[]>([]);
  const [over, setOver] = useState(false);
  const [res, setRes] = useState<{ bet: number; payout: number } | null>(null);
  const { done } = useBetGuard();
  const playing = board && !over;
  const cur = minesMult(mines, open.length, edge);
  const next = minesMult(mines, open.length + 1, edge);

  const start = () => {
    if (!placeBet(bet)) return;
    setBoard(shuffle(Array.from({ length: N }, (_, i) => i < mines)));
    setOpen([]); setOver(false); setRes(null);
  };
  const pick = (i: number) => {
    if (!playing || open.includes(i)) return;
    if (board![i]) {
      tap("heavy"); play("boom");
      setOpen((o) => [...o, i]); setOver(true);
      setRes({ bet, payout: 0 }); settle("mines", bet, 0);
      return;
    }
    tap(); play("reveal");
    const o = [...open, i];
    setOpen(o);
    if (o.length === N - mines) cash(o.length);
  };
  const cash = (picks = open.length) => {
    if (!board || over || picks === 0) return;
    const payout = round2(bet * minesMult(mines, picks, edge));
    setOver(true); setRes({ bet, payout }); settle("mines", bet, payout);
  };

  return (
    <GameShell id="mines" onBack={onBack} rules="Unter 25 Feldern liegen Minen. Jeder gefundene Edelstein erhöht den Multiplikator. Steig jederzeit aus – triffst du eine Mine, ist der Einsatz weg.">
      <div className="mines">
        <div className="mines__grid">
          {Array.from({ length: N }, (_, i) => {
            const shown = open.includes(i) || over;
            const isMine = board?.[i];
            return (
              <button key={i} className={`tile ${shown ? (isMine ? "tile--mine" : "tile--gem") : ""} ${open.includes(i) ? "tile--picked" : ""}`} onClick={() => pick(i)} disabled={!playing} aria-label={`Feld ${i + 1}`}>
                {shown && board ? (isMine ? <LuBomb /> : <LuGem />) : null}
              </button>
            );
          })}
        </div>
        <div className="stats3">
          <div><span>Aktuell</span><b>{cur.toFixed(2)}×</b></div>
          <div><span>Nächstes Feld</span><b>{next.toFixed(2)}×</b></div>
          <div><span>Gewinn</span><b>{round2(bet * cur)}</b></div>
        </div>
        {res && <Outcome bet={res.bet} payout={res.payout} />}
        {!playing && (
          <>
            <div className="bet">
              <label className="bet__label" htmlFor="mines-n">Minen<span>{mines}</span></label>
              <input id="mines-n" className="range" data-lenis-prevent type="range" min={1} max={24} value={mines} onChange={(e) => setMines(Number(e.target.value))} />
            </div>
            <BetInput value={bet} onChange={setBet} />
          </>
        )}
        {playing
          ? <Action tone="win" onClick={() => cash()} disabled={open.length === 0}>Auszahlen · {round2(bet * cur)}</Action>
          : <Action onClick={start} disabled={done}>Spiel starten</Action>}
      </div>
    </GameShell>
  );
}
