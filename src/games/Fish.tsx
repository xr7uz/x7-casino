import { useEffect, useRef, useState } from "react";
import { useStore } from "../store";
import { rand, round2 } from "../lib/rng";
import { BetInput, GameShell } from "../components/ui";
import { tap } from "../lib/haptics";
import { play } from "../lib/sound";

type FishT = { id: number; x: number; y: number; vx: number; r: number; mult: number; color: string; wob: number };
type Bullet = { x: number; y: number; vx: number; vy: number; bet: number; born: number };
type Pop = { x: number; y: number; text: string; t: number; win: boolean };

const KINDS = [
  { mult: 2, r: 13, color: "#ffe4d8", w: 50 },
  { mult: 5, r: 18, color: "#ff69b4", w: 28 },
  { mult: 12, r: 25, color: "#c24366", w: 14 },
  { mult: 30, r: 34, color: "#ffd166", w: 6 },
  { mult: 100, r: 44, color: "#b48cff", w: 2 },
];
const W = 360, H = 460;

export default function Fish({ onBack }: { onBack: () => void }) {
  const { placeBet, settle, edge } = useStore();
  const [bet, setBet] = useState(5);
  const [stats, setStats] = useState({ shots: 0, catches: 0, net: 0 });
  const canvas = useRef<HTMLCanvasElement>(null);
  const fish = useRef<FishT[]>([]);
  const bullets = useRef<Bullet[]>([]);
  const pops = useRef<Pop[]>([]);
  const aim = useRef(-Math.PI / 2);
  const betRef = useRef(bet);
  betRef.current = bet;
  const api = useRef({ placeBet, settle, edge });
  api.current = { placeBet, settle, edge };

  useEffect(() => {
    const cv = canvas.current!;
    const ctx = cv.getContext("2d")!;
    const dpr = Math.min(2, window.devicePixelRatio || 1);
    cv.width = W * dpr; cv.height = H * dpr; ctx.scale(dpr, dpr);
    let raf = 0, last = performance.now(), id = 0;
    const spawn = () => {
      const tot = KINDS.reduce((a, b) => a + b.w, 0);
      let r = rand() * tot, k = KINDS[0];
      for (const x of KINDS) { if ((r -= x.w) <= 0) { k = x; break; } }
      const left = rand() < 0.5;
      fish.current.push({ id: id++, x: left ? -k.r * 2 : W + k.r * 2, y: 40 + rand() * (H - 170), vx: (left ? 1 : -1) * (30 + rand() * 50) * (k.mult > 20 ? 0.6 : 1), r: k.r, mult: k.mult, color: k.color, wob: rand() * 6 });
    };
    for (let i = 0; i < 6; i++) { spawn(); fish.current[i].x = rand() * W; }

    const drawFish = (f: FishT, t: number) => {
      const dir = Math.sign(f.vx);
      ctx.save();
      ctx.translate(f.x, f.y + Math.sin(t / 400 + f.wob) * 4);
      ctx.scale(dir, 1);
      ctx.fillStyle = f.color;
      ctx.beginPath(); ctx.ellipse(0, 0, f.r, f.r * 0.6, 0, 0, Math.PI * 2); ctx.fill();
      ctx.beginPath(); ctx.moveTo(-f.r * 0.8, 0); ctx.lineTo(-f.r * 1.5, -f.r * 0.5); ctx.lineTo(-f.r * 1.5, f.r * 0.5); ctx.closePath(); ctx.fill();
      ctx.fillStyle = "#10070b"; ctx.beginPath(); ctx.arc(f.r * 0.5, -f.r * 0.15, Math.max(1.6, f.r * 0.1), 0, Math.PI * 2); ctx.fill();
      ctx.restore();
      ctx.fillStyle = "rgba(255,255,255,.85)"; ctx.font = "600 11px system-ui"; ctx.textAlign = "center";
      ctx.fillText(`${f.mult}×`, f.x, f.y + f.r * 0.6 + 14);
    };

    const loop = (t: number) => {
      const dt = Math.min(0.05, (t - last) / 1000); last = t;
      // Wasser
      const g = ctx.createLinearGradient(0, 0, 0, H);
      g.addColorStop(0, "#1a0b2e"); g.addColorStop(1, "#0b0609");
      ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
      ctx.fillStyle = "rgba(255,105,180,.05)";
      for (let i = 0; i < 5; i++) { ctx.beginPath(); ctx.arc((t / 30 + i * 90) % (W + 60) - 30, H - 60 - i * 70, 2 + i, 0, Math.PI * 2); ctx.fill(); }
      if (fish.current.length < 9 && rand() < 0.03) spawn();
      fish.current = fish.current.filter((f) => f.x > -120 && f.x < W + 120);
      for (const f of fish.current) { f.x += f.vx * dt; drawFish(f, t); }
      // Kugeln
      const { settle: st, edge: e } = api.current;
      bullets.current = bullets.current.filter((b) => {
        b.x += b.vx * dt; b.y += b.vy * dt;
        if (b.x < 4 || b.x > W - 4) b.vx *= -1;
        if (b.y < 4) b.vy *= -1;
        const hit = fish.current.find((f) => Math.hypot(f.x - b.x, f.y - b.y) < f.r);
        if (hit) {
          const p = Math.min(1, (1 - e) / hit.mult);
          const caught = rand() < p;
          const payout = caught ? round2(b.bet * hit.mult) : 0;
          st("fish", b.bet, payout);
          setStats((s) => ({ shots: s.shots + 1, catches: s.catches + (caught ? 1 : 0), net: round2(s.net + payout - b.bet) }));
          pops.current.push({ x: hit.x, y: hit.y, text: caught ? `+${payout}` : "×", t, win: caught });
          if (caught) { fish.current = fish.current.filter((f) => f !== hit); tap("medium"); play("coin"); } else play("tick");
          return false;
        }
        if (t - b.born > 5000 || b.y > H) { st("fish", b.bet, b.bet); return false; } // nichts getroffen: Einsatz zurück
        ctx.fillStyle = "#ffe4d8"; ctx.beginPath(); ctx.arc(b.x, b.y, 4, 0, Math.PI * 2); ctx.fill();
        return true;
      });
      // Treffer-Anzeigen
      pops.current = pops.current.filter((p) => t - p.t < 900);
      for (const p of pops.current) {
        const k = (t - p.t) / 900;
        ctx.globalAlpha = 1 - k; ctx.fillStyle = p.win ? "#ffd166" : "#ffffff"; ctx.font = "800 18px system-ui"; ctx.textAlign = "center";
        ctx.fillText(p.text, p.x, p.y - k * 30); ctx.globalAlpha = 1;
      }
      // Kanone
      ctx.save(); ctx.translate(W / 2, H - 18); ctx.rotate(aim.current + Math.PI / 2);
      ctx.fillStyle = "#800021"; ctx.fillRect(-7, -38, 14, 38);
      ctx.restore();
      ctx.fillStyle = "#c24366"; ctx.beginPath(); ctx.arc(W / 2, H - 14, 20, Math.PI, 0); ctx.fill();
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
  }, []);

  const shoot = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const x = ((e.clientX - rect.left) / rect.width) * W, y = ((e.clientY - rect.top) / rect.height) * H;
    const a = Math.atan2(y - (H - 18), x - W / 2);
    if (a > -0.1 || a < -Math.PI + 0.1) return;
    aim.current = a;
    if (!api.current.placeBet(betRef.current)) return;
    tap(); play("press");
    bullets.current.push({ x: W / 2 + Math.cos(a) * 40, y: H - 18 + Math.sin(a) * 40, vx: Math.cos(a) * 420, vy: Math.sin(a) * 420, bet: betRef.current, born: performance.now() });
  };

  return (
    <GameShell id="fish" onBack={onBack} rules="Tippe ins Wasser, um zu schießen. Jeder Schuss kostet deinen Einsatz. Trifft er einen Fisch, wird er mit einer Wahrscheinlichkeit passend zum Multiplikator gefangen. Trifft der Schuss nichts, bekommst du den Einsatz zurück.">
      <div className="fish">
        <canvas ref={canvas} data-lenis-prevent className="fish__canvas" onPointerDown={shoot} aria-label="Fischjagd-Spielfeld, tippen zum Schießen" />
        <div className="stats3">
          <div><span>Schüsse</span><b>{stats.shots}</b></div>
          <div><span>Fänge</span><b>{stats.catches}</b></div>
          <div><span>Ergebnis</span><b className={stats.net >= 0 ? "pos" : "neg"}>{stats.net >= 0 ? "+" : ""}{stats.net}</b></div>
        </div>
        <BetInput value={bet} onChange={setBet} label="Einsatz pro Schuss" />
      </div>
    </GameShell>
  );
}
