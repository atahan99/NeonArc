import { cellFromPoint } from "./term.js";

// Touches become the same keys the keyboard sends, so a game only declares a `touch` map:
//   swipe: "once" (one key per swipe) | "drag" (one key per SWIPE_PX moved)
//   tap:   key sent on tap; with cellAt()/cursorAt() the cursor is first walked to the tapped cell
//   hold:  key sent on long-press (after the same cursor walk)
//   keys:  [[label, key], ...] on-screen buttons (built by the shell)
const SWIPE_PX = 24, HOLD_MS = 450, SLOP = 10;

function tapAt(g, x, y, key, press) {
  if (g.cellAt) {
    const { line, col } = cellFromPoint(x, y);
    const cell = g.cellAt(line, col);
    if (!cell) return;
    const cur = g.cursorAt(), dr = cell.r - cur.r, dc = cell.c - cur.c;
    for (let i = 0; i < Math.abs(dr); i++) press(g, dr > 0 ? "ArrowDown" : "ArrowUp");
    for (let i = 0; i < Math.abs(dc); i++) press(g, dc > 0 ? "ArrowRight" : "ArrowLeft");
  }
  if (key) press(g, key);
}

/** getGame() returns the running game if it takes touch input; press(g, key) feeds it a key. */
export function initTouch(viewport, getGame, press) {
  let gest = null;
  const moved = (e) => Math.abs(e.clientX - gest.x) > SLOP || Math.abs(e.clientY - gest.y) > SLOP;

  viewport.addEventListener("pointerdown", (e) => {
    const g = getGame();
    if (!g || e.button > 0) return;
    e.preventDefault();
    try { viewport.setPointerCapture(e.pointerId); } catch { /* already released */ }
    const { clientX: x, clientY: y } = e;
    gest = { x, y, lx: x, ly: y, done: false, timer: null };
    if (g.touch.hold) {
      gest.timer = setTimeout(() => { gest.done = true; tapAt(g, x, y, g.touch.hold, press); }, HOLD_MS);
    }
  });

  viewport.addEventListener("pointermove", (e) => {
    const g = getGame();
    if (!g || !gest) return;
    if (moved(e)) clearTimeout(gest.timer);
    const dx = e.clientX - gest.lx, dy = e.clientY - gest.ly;
    if (!g.touch.swipe || Math.max(Math.abs(dx), Math.abs(dy)) < SWIPE_PX) return;
    if (g.touch.swipe === "once" && gest.done) return;
    gest.done = true;
    gest.lx = e.clientX;
    gest.ly = e.clientY;
    press(g, Math.abs(dx) > Math.abs(dy) ? (dx > 0 ? "ArrowRight" : "ArrowLeft") : (dy > 0 ? "ArrowDown" : "ArrowUp"));
  });

  function end(e) {
    if (!gest) return;
    const g = getGame();
    clearTimeout(gest.timer);
    if (g && e.type === "pointerup" && !gest.done && !moved(e) && g.touch.tap !== undefined) {
      tapAt(g, e.clientX, e.clientY, g.touch.tap, press);
    }
    gest = null;
  }
  viewport.addEventListener("pointerup", end);
  viewport.addEventListener("pointercancel", end);
}
