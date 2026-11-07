// Output side of the terminal: the log, the board, storage and timers.
// Nothing here touches the DOM at import time, so the game rules can be tested in Node.

const $ = (id) => document.getElementById(id);

/** The shell plugs in here: timers call afterTick so the status bar stays current. */
export const hooks = { afterTick() {} };

/** True while a key-driven game waits for a typed command. Timers skip ticks while paused. */
export const state = { paused: false };

export function print(text, cls) {
  const log = $("terminal");
  let div;
  for (const line of String(text).split("\n")) {
    div = document.createElement("div");
    div.className = cls ? "line " + cls : "line";
    div.textContent = line || "​"; // keeps empty lines one line tall
    log.append(div);
  }
  log.scrollTop = log.scrollHeight;
  return div;
}

export function clearLog() {
  $("terminal").replaceChildren();
}

const ENTITIES = { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" };
export const esc = (s) => String(s).replace(/[&<>"']/g, (c) => ENTITIES[c]);

/** Board text in a palette colour (a class from style.css). The text is always escaped. */
export const span = (text, cls) => `<span class="${cls}">${esc(text)}</span>`;

export function center(s, w) {
  s = String(s);
  const left = Math.max(0, Math.floor((w - s.length) / 2));
  return " ".repeat(left) + s + " ".repeat(Math.max(0, w - s.length - left));
}

export const reducedMotion = () => matchMedia("(prefers-reduced-motion: reduce)").matches;

// ---------- board ----------
// The board font is sized so the text grid fills the viewport. Rows and columns only grow
// during a round (reset on launch), so the board doesn't jump when a GAME OVER line appears.
const LINE_H = 1.2;
let charW = 0, fitCols = 0, fitRows = 0;

export function setScreen(html) {
  const screen = $("screen");
  screen.innerHTML = html;
  const lines = screen.textContent.replace(/\n$/, "").split("\n");
  const cols = Math.max(fitCols, ...lines.map((l) => l.length));
  const rows = Math.max(fitRows, lines.length);
  if (cols !== fitCols || rows !== fitRows) {
    fitCols = cols;
    fitRows = rows;
    fitScreen(); // layout is only measured when the grid grows, not on every frame
  }
}

export function resetFit() {
  fitCols = fitRows = 0;
}

export function fitScreen() {
  const view = $("viewport"), screen = $("screen");
  if (!$("app").classList.contains("game") || !fitCols) return;
  if (!charW) {
    const probe = document.createElement("span");
    probe.style.fontSize = "100px";
    probe.textContent = "0000000000";
    screen.append(probe);
    charW = probe.getBoundingClientRect().width / 1000 || 0.6;
    probe.remove();
  }
  const cs = getComputedStyle(view);
  const w = view.clientWidth - parseFloat(cs.paddingLeft) - parseFloat(cs.paddingRight);
  const h = view.clientHeight - parseFloat(cs.paddingTop) - parseFloat(cs.paddingBottom);
  const px = Math.floor(Math.min(w / (fitCols * charW), h / (fitRows * LINE_H)) * 10) / 10;
  screen.style.fontSize = Math.max(8, Math.min(48, px)) + "px";
}

/** Screen point -> text line and column on the board, for tap-to-move. */
export function cellFromPoint(x, y) {
  const screen = $("screen");
  const rect = screen.getBoundingClientRect();
  const fs = parseFloat(getComputedStyle(screen).fontSize);
  return {
    line: Math.floor((y - rect.top) / (fs * LINE_H)),
    col: Math.floor((x - rect.left) / (fs * (charW || 0.6))),
  };
}

// ---------- storage ----------
export function load(key, def) {
  try {
    const v = localStorage.getItem(key), n = Number(v);
    return v === null || !Number.isFinite(n) ? def : n;
  } catch {
    return def;
  }
}

export function save(key, val) {
  try { localStorage.setItem(key, String(val)); } catch { /* private mode: scores just aren't kept */ }
}

// ---------- shared game helpers ----------
/** Arrow keys / WASD move a grid cursor with wrap-around. Returns true when the key was a move. */
export function moveCursor(e, pos, w, h) {
  const k = e.key.length === 1 ? e.key.toLowerCase() : e.key;
  if (k === "ArrowUp" || k === "w") pos.r = (pos.r + h - 1) % h;
  else if (k === "ArrowDown" || k === "s") pos.r = (pos.r + 1) % h;
  else if (k === "ArrowLeft" || k === "a") pos.c = (pos.c + w - 1) % w;
  else if (k === "ArrowRight" || k === "d") pos.c = (pos.c + 1) % w;
  else return false;
  return true;
}

export function endScoreGame(title, score, best, key) {
  if (score > best) {
    best = score;
    save(key, best);
    print("New best score: " + best + "!", "warn");
  }
  print("GAME OVER - " + title + ". Score: " + score + " | Best: " + best, "bad");
  print("Type restart to play again, or quit for the menu.", "dim");
  return best;
}

/** setInterval that is cleared on stop() and skips ticks while the game is paused. */
export function gameTimer() {
  let id = null;
  return {
    start(fn, ms) {
      clearInterval(id);
      id = setInterval(() => {
        if (state.paused) return;
        fn();
        hooks.afterTick();
      }, ms);
    },
    stop() {
      clearInterval(id);
      id = null;
    },
  };
}
