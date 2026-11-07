import { print, setScreen, span, load, endScoreGame, gameTimer } from "../term.js";

export const COLS = 10, ROWS = 18;
export const SHAPES = {
  I: [[1, 1, 1, 1]],
  O: [[1, 1], [1, 1]],
  T: [[1, 1, 1], [0, 1, 0]],
  S: [[0, 1, 1], [1, 1, 0]],
  Z: [[1, 1, 0], [0, 1, 1]],
  J: [[1, 0, 0], [1, 1, 1]],
  L: [[0, 0, 1], [1, 1, 1]],
};
const COLOR = { I: "hi", O: "warn", T: "soft", S: "lime", Z: "bad", J: "blue", L: "orange" };
const POINTS = [0, 100, 300, 500, 800];
const KICKS = [0, -1, 1, -2, 2, -3]; // -3: a vertical I against the right wall needs it to lie flat
const BEST_KEY = "neonarc.tetris.best";
const ACTIONS = {
  ArrowLeft: "left", a: "left", ArrowRight: "right", d: "right", ArrowDown: "down", s: "down",
  Enter: "drop", ArrowUp: "rotate", w: "rotate", " ": "rotate",
};

export const emptyBoard = () => Array.from({ length: ROWS }, () => new Array(COLS).fill(0));

export const rotateCW = (m) => m[0].map((_, c) => m.map((row) => row[c]).reverse());

export function collide(board, m, px, py) {
  return m.some((row, r) => row.some((v, c) => {
    if (!v) return false;
    const x = px + c, y = py + r;
    return x < 0 || x >= COLS || y >= ROWS || (y >= 0 && !!board[y][x]);
  }));
}

/** Removes full rows in place, adds empty rows on top, returns how many were cleared. */
export function clearLines(board) {
  const kept = board.filter((row) => !row.every(Boolean));
  const cleared = board.length - kept.length;
  board.splice(0, board.length, ...Array.from({ length: cleared }, () => new Array(COLS).fill(0)), ...kept);
  return cleared;
}

/** The 7-bag randomizer: each run of seven pieces holds every shape once. */
export function bag(rnd = Math.random) {
  const keys = Object.keys(SHAPES);
  for (let i = keys.length - 1; i > 0; i--) {
    const j = (rnd() * (i + 1)) | 0;
    [keys[i], keys[j]] = [keys[j], keys[i]];
  }
  return keys;
}

/** Rotate with simple wall kicks: the new { m, x }, or null when every kick collides. */
export function rotate(board, piece) {
  const m = rotateCW(piece.m);
  for (const k of KICKS) if (!collide(board, m, piece.x + k, piece.y)) return { m, x: piece.x + k };
  return null;
}

let board, cur, upcoming, score, lines, level, best, over, grounded;
const tick = gameTimer();

function spawn() {
  if (upcoming.length < 2) upcoming.push(...bag());
  const key = upcoming.shift();
  const m = SHAPES[key];
  cur = { key, m, x: Math.floor((COLS - m[0].length) / 2), y: 0 };
  grounded = false;
  if (collide(board, cur.m, cur.x, cur.y)) end();
}

function lock() {
  cur.m.forEach((row, r) => row.forEach((v, c) => {
    if (v && cur.y + r >= 0) board[cur.y + r][cur.x + c] = cur.key;
  }));
  const cleared = clearLines(board);
  if (cleared) {
    score += POINTS[cleared] * level;
    lines += cleared;
    const next = Math.floor(lines / 10) + 1;
    if (next !== level) { level = next; setSpeed(); }
  }
  spawn();
}

function fall() {
  if (over) return;
  if (!collide(board, cur.m, cur.x, cur.y + 1)) { cur.y++; grounded = false; }
  else if (grounded) lock();
  else grounded = true; // lock delay: one tick to slide or rotate after landing
  render();
}

function setSpeed() {
  tick.start(fall, Math.max(120, 620 - (level - 1) * 60));
}

function end() {
  over = true;
  tick.stop();
  best = endScoreGame("Tetris", score, best, BEST_KEY);
}

function reset() {
  board = emptyBoard();
  upcoming = [];
  score = 0; lines = 0; level = 1; over = false;
  best = load(BEST_KEY, 0);
  spawn();
}

function render() {
  const grid = board.map((row) => row.slice());
  if (!over) cur.m.forEach((row, r) => row.forEach((v, c) => { if (v && cur.y + r >= 0) grid[cur.y + r][cur.x + c] = cur.key; }));
  const cell = (k) => (k ? span("[]", COLOR[k]) : " .");
  const next = upcoming[0];
  const preview = SHAPES[next].map((row) => row.map((v) => (v ? span("[]", COLOR[next]) : "  ")).join(""));
  const side = ["NEXT", preview[0], preview[1] || "", "", "SCORE " + score, "LEVEL " + level, "LINES " + lines, "BEST  " + Math.max(best, score)];
  if (over) side.push("", span("GAME OVER", "bad"));
  const edge = "+" + "--".repeat(COLS) + "+";
  let out = edge + "\n";
  grid.forEach((row, r) => { out += "|" + row.map(cell).join("") + "|  " + (side[r] || "") + "\n"; });
  setScreen(out + edge + "\n");
}

function begin() {
  reset();
  render();
  setSpeed();
}

export default {
  name: "Tetris",
  description: "Stack and clear neon blocks.",
  start() {
    begin();
    print("TETRIS // clear full rows. Don't stack to the top.", "hi");
    print("Controls: Left/Right or A/D = move | Down/S = soft drop | Enter = hard drop | Up/W/Space = rotate", "dim");
    print("Touch: swipe = move / soft drop, tap = rotate", "dim");
  },
  stop() { tick.stop(); },
  restart() {
    tick.stop();
    begin();
    print("Tetris restarted.", "alt");
  },
  handleKey(e) {
    const act = ACTIONS[e.key.length === 1 ? e.key.toLowerCase() : e.key];
    if (!act || over) return false;
    if (act === "left" || act === "right") {
      const dx = act === "left" ? -1 : 1;
      if (!collide(board, cur.m, cur.x + dx, cur.y)) cur.x += dx;
    } else if (act === "down") {
      if (!collide(board, cur.m, cur.x, cur.y + 1)) cur.y++;
    } else if (act === "drop") {
      while (!collide(board, cur.m, cur.x, cur.y + 1)) cur.y++;
      lock();
    } else {
      const r = rotate(board, cur);
      if (r) { cur.m = r.m; cur.x = r.x; }
    }
    render();
    return true;
  },
  touch: { swipe: "drag", tap: "ArrowUp", keys: [["rotate", "ArrowUp"], ["drop", "Enter"]] },
  statusText: () => `SCORE: ${score} | LVL: ${level} | BEST: ${Math.max(best, score)}`,
};
