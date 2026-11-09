/**
 * Smooth Scrolling für die App (Lenis), auch für Touch.
 * - Touch: weich nachgeführt mit natürlichem Schwung, ohne Trägheit, die sich „schwammig“ anfühlt
 * - Maus/Trackpad: geglättet
 * - aus bei „Bewegung reduzieren“ oder wenn in den Einstellungen deaktiviert
 * Bereiche mit eigenem Scrollen oder Gesten (Slider, Spielfelder) tragen data-lenis-prevent.
 */
import Lenis from "lenis";

let lenis: Lenis | null = null;
let raf = 0;

export function enableSmooth(on: boolean) {
  const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  if (!on || reduce || typeof Lenis !== "function") { disableSmooth(); return; }
  if (lenis) return;
  lenis = new Lenis({
    duration: 1.0,
    easing: (t: number) => (t === 1 ? 1 : 1 - Math.pow(2, -10 * t)),
    smoothWheel: true,
    syncTouch: true,       // Touch-Scrollen ebenfalls glätten
    syncTouchLerp: 0.085,  // wie direkt die Seite dem Finger folgt
    touchInertiaMultiplier: 28,
    gestureOrientation: "vertical",
  });
  const loop = (t: number) => { lenis?.raf(t); raf = requestAnimationFrame(loop); };
  raf = requestAnimationFrame(loop);
}

export function disableSmooth() {
  cancelAnimationFrame(raf);
  lenis?.destroy();
  lenis = null;
}

/** Nach oben springen (z. B. beim Wechsel von Tab oder Spiel) */
export function toTop() {
  if (lenis) lenis.scrollTo(0, { immediate: true });
  else window.scrollTo({ top: 0 });
}
