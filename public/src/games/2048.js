import { print, setScreen, span, center, load, save, endScoreGame } from "../term.js";

export const N = 4;
const BEST_KEY = "neonarc.2048.best";

/** Slide one row toward index 0, merging equal pairs once. */
export function slide(row) {
  const a = row.filter(Boolean);
  let gained = 0;
  for (let i = 0; i < a.length - 1; i++) {
    if (a[i] === a[i + 1]) {
      a[i] *= 2;
      gained += a[i];
      a.splice(i + 1, 1);
    }
  }
  while (a.length < N) a.push(0);
  return { row: a, gained };
}

// grid index of the i-th cell of line k, read in the direction the tiles slide
const CELL = {
  left: (k, i) => k * N + i,
  right: (k, i) => k * N + N - 1 - i,
  up: (k, i) => i * N + k,
  down: (k, i) => (N - 1 - i) * N + k,
};

export function move(grid, dir) {
  const next = grid.slice();
  let gained = 0;
  for (let k = 0; k < N; k++) {
    const cells = Array.from({ length: N }, (_, i) => CELL[dir](k, i));
    const res = slide(cells.map((i) => grid[i]));
    cells.forEach((g, i) => { next[g] = res.row[i]; });
    gained += res.gained;
  }
  return { grid: next, gained, moved: next.some((v, i) => v !== grid[i]) };
}

export function canMove(grid) {
  if (grid.includes(0)) return true;
  return grid.some((v, i) => (i % N < N - 1 && grid[i + 1] === v) || (i + N < grid.length && grid[i + N] === v));
}

// best = record at round start, so endScoreGame can spot a new best; the board shows max(score, best)
let grid, score, best, over, announced;

function addTile() {
  const empty = grid.flatMap((v, i) => (v ? [] : [i]));
  if (empty.length) grid[empty[(Math.random() * empty.length) | 0]] = Math.random() < 0.9 ? 2 : 4;
}

function reset() {
  grid = new Array(N * N).fill(0);
  score = 0;
  over = announced = false;
  best = load(BEST_KEY, 0);
  addTile();
  addTile();
}

function shift(dir) {
  if (over) return;
  const res = move(grid, dir);
  if (!res.moved) return;
  grid = res.grid;
  score += res.gained;
  addTile();
  if (score > best) save(BEST_KEY, score); // saved mid-round in case the tab closes
  render();
  if (!announced && grid.includes(2048)) {
    announced = true;
    print("2048 tile reached! You can keep going.", "warn");
  }
  if (!canMove(grid)) {
    over = true;
    best = endScoreGame("2048", score, best, BEST_KEY);
    render();
  }
}

const COLOR = { 2: "hi", 4: "fg", 8: "warn", 16: "orange", 32: "bad", 64: "alt", 128: "soft", 256: "blue", 512: "lime", 1024: "white", 2048: "warn" };
const CW = 6;

function cellHTML(v) {
  if (!v) return center(".", CW);
  const s = String(v), left = Math.floor((CW - s.length) / 2);
  return " ".repeat(left) + span(s, COLOR[v] || "alt") + " ".repeat(CW - s.length - left);
}

function render() {
  const sep = "+" + ("-".repeat(CW) + "+").repeat(N);
  let out = sep + "\n";
  for (let r = 0; r < N; r++)
    out += "|" + grid.slice(r * N, r * N + N).map((v) => cellHTML(v) + "|").join("") + "\n" + sep + "\n";
  out += `\nScore: ${score}   Best: ${Math.max(score, best)}\n`;
  if (over) out += "\n  >> GAME OVER <<\n";
  setScreen(out);
}

const KEYS = { ArrowLeft: "left", a: "left", ArrowRight: "right", d: "right", ArrowUp: "up", w: "up", ArrowDown: "down", s: "down" };

export default {
  name: "2048",
  description: "Merge tiles to reach 2048.",
  start() {
    reset();
    render();
    print("2048 // combine matching tiles. Reach the 2048 tile.", "hi");
    print("Controls: Arrows/WASD or swipe = move tiles | / = type a command", "dim");
  },
  restart() {
    reset();
    render();
    print("2048 restarted.", "alt");
  },
  handleKey(e) {
    const dir = KEYS[e.key.length === 1 ? e.key.toLowerCase() : e.key];
    if (!dir) return false;
    shift(dir);
    return true;
  },
  touch: { swipe: "once" },
  statusText: () => `SCORE: ${score} | BEST: ${Math.max(score, best)}`,
};
