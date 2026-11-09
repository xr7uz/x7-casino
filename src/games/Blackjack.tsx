import { useRef, useState } from "react";
import { useStore } from "../store";
import { bjValue, deck, type Card } from "../lib/cards";
import { round2 } from "../lib/rng";
import { Action, BetInput, GameShell, Outcome, PlayingCard, useBetGuard } from "../components/ui";

type Phase = "bet" | "play" | "done";

/** Grundstrategie (vereinfacht) für den Trainingsmodus */
function hint(player: Card[], dealerUp: Card, canDouble: boolean): string {
  const { total, soft } = bjValue(player);
  const d = Math.min(dealerUp.r === 14 ? 11 : dealerUp.r, 11);
  const up = dealerUp.r >= 10 && dealerUp.r <= 13 ? 10 : d;
  if (soft) {
    if (total >= 19) return "Stehen";
    if (total === 18) return up >= 9 ? "Karte" : canDouble && up >= 3 && up <= 6 ? "Verdoppeln" : "Stehen";
    return canDouble && up >= 4 && up <= 6 ? "Verdoppeln" : "Karte";
  }
  if (total >= 17) return "Stehen";
  if (total >= 13) return up <= 6 ? "Stehen" : "Karte";
  if (total === 12) return up >= 4 && up <= 6 ? "Stehen" : "Karte";
  if (total === 11) return canDouble ? "Verdoppeln" : "Karte";
  if (total === 10) return canDouble && up <= 9 ? "Verdoppeln" : "Karte";
  if (total === 9) return canDouble && up >= 3 && up <= 6 ? "Verdoppeln" : "Karte";
  return "Karte";
}

export default function Blackjack({ onBack }: { onBack: () => void }) {
  const { placeBet, settle, s } = useStore();
  const [bet, setBet] = useState(10);
  const [stake, setStake] = useState(10);
  const [phase, setPhase] = useState<Phase>("bet");
  const [pl, setPl] = useState<Card[]>([]);
  const [dl, setDl] = useState<Card[]>([]);
  const [res, setRes] = useState<{ bet: number; payout: number; text: string } | null>(null);
  const shoe = useRef<Card[]>(deck(6));
  const { done } = useBetGuard();

  const draw = () => {
    if (shoe.current.length < 30) shoe.current = deck(6);
    return shoe.current.pop()!;
  };

  const finish = (p: Card[], d: Card[], st: number, natural = false) => {
    let dd = d;
    const pv = bjValue(p).total;
    if (pv <= 21 && !natural) {
      while (bjValue(dd).total < 17) dd = [...dd, draw()];
    }
    const dv = bjValue(dd).total;
    let payout = 0, text = "";
    if (natural) {
      const dealerBJ = bjValue(dd).total === 21 && dd.length === 2;
      payout = dealerBJ ? st : round2(st * 2.5); text = dealerBJ ? "Beide Blackjack" : "Blackjack! 3:2";
    } else if (pv > 21) { text = `Überkauft (${pv})`; }
    else if (dv > 21) { payout = st * 2; text = `Dealer überkauft (${dv})`; }
    else if (pv > dv) { payout = st * 2; text = `${pv} schlägt ${dv}`; }
    else if (pv === dv) { payout = st; text = `Gleichstand ${pv}`; }
    else text = `${dv} schlägt ${pv}`;
    setDl(dd); setPhase("done"); setRes({ bet: st, payout, text });
    settle("blackjack", st, payout);
  };

  const deal = () => {
    if (!placeBet(bet)) return;
    const p = [draw(), draw()], d = [draw(), draw()];
    setPl(p); setDl(d); setStake(bet); setRes(null); setPhase("play");
    if (bjValue(p).total === 21) finish(p, d, bet, true);
  };
  const hit = () => {
    const p = [...pl, draw()];
    setPl(p);
    if (bjValue(p).total >= 21) finish(p, dl, stake);
  };
  const stand = () => finish(pl, dl, stake);
  const double = () => {
    if (!placeBet(stake)) return;
    const p = [...pl, draw()];
    setPl(p); setStake(stake * 2);
    finish(p, dl, stake * 2);
  };

  const pv = bjValue(pl);
  const hideHole = phase === "play";
  const canDouble = phase === "play" && pl.length === 2;

  return (
    <GameShell id="blackjack" onBack={onBack} rules="6 Decks. Dealer steht ab 17. Blackjack zahlt 3:2, normaler Gewinn 1:1. Verdoppeln nur mit den ersten zwei Karten.">
      <div className="table">
        <div className="hand">
          <span className="hand__label">Dealer {phase !== "bet" && !hideHole ? `· ${bjValue(dl).total}` : ""}</span>
          <div className="hand__cards">{dl.map((c, i) => <PlayingCard key={i} c={c} hidden={hideHole && i === 1} />)}</div>
        </div>
        <div className="hand">
          <span className="hand__label">Du {pl.length ? `· ${pv.soft && pv.total <= 21 ? "soft " : ""}${pv.total}` : ""}</span>
          <div className="hand__cards">{pl.map((c, i) => <PlayingCard key={i} c={c} />)}</div>
        </div>
        {s.settings.training && phase === "play" && dl[0] && (
          <p className="coach">Trainer: <b>{hint(pl, dl[0], canDouble)}</b> wäre nach Grundstrategie richtig.</p>
        )}
        {res && <Outcome bet={res.bet} payout={res.payout} text={res.text} />}
        {phase === "play" ? (
          <div className="actions3">
            <Action tone="ghost" onClick={hit}>Karte</Action>
            <Action onClick={stand}>Stehen</Action>
            <Action tone="ghost" onClick={double} disabled={!canDouble}>Verdoppeln</Action>
          </div>
        ) : (
          <>
            <BetInput value={bet} onChange={setBet} />
            <Action onClick={deal} disabled={done}>Austeilen</Action>
          </>
        )}
      </div>
    </GameShell>
  );
}
