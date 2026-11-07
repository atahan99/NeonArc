import { print, setScreen, span, moveCursor } from "../term.js";

export const PUZZLE = [
  5, 3, 0, 0, 7, 0, 0, 0, 0,
  6, 0, 0, 1, 9, 5, 0, 0, 0,
  0, 9, 8, 0, 0, 0, 0, 6, 0,
  8, 0, 0, 0, 6, 0, 0, 0, 3,
  4, 0, 0, 8, 0, 3, 0, 0, 1,
  7, 0, 0, 0, 2, 0, 0, 0, 6,
  0, 6, 0, 0, 0, 0, 2, 8, 0,
  0, 0, 0, 4, 1, 9, 0, 0, 5,
  0, 0, 0, 0, 8, 0, 0, 7, 9,
];
const BORDER = "+---------+---------+---------+";

/** Does the value at (r, c) repeat in its row, column or 3x3 box? */
export function conflict(board, r, c) {
  const v = board[r * 9 + c];
  if (!v) return false;
  for (let i = 0; i < 9; i++) {
    if (i !== c && board[r * 9 + i] === v) return true;
    if (i !== r && board[i * 9 + c] === v) return true;
  }
  const br = r - (r % 3), bc = c - (c % 3);
  for (let rr = br; rr < br + 3; rr++)
    for (let cc = bc; cc < bc + 3; cc++)
      if ((rr !== r || cc !== c) && board[rr * 9 + cc] === v) return true;
  return false;
}

export const isSolved = (board) => board.every((v, i) => v && !conflict(board, (i / 9) | 0, i % 9));

function shuffled(a, rnd) {
  a = a.slice();
  for (let i = a.length - 1; i > 0; i--) {
    const j = (rnd() * (i + 1)) | 0;
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

/**
 * A new puzzle with the same solution structure: digits relabelled, bands and the rows inside
 * them shuffled (same for columns), and maybe transposed. Every step keeps a valid sudoku valid.
 */
export function variant(p, rnd = Math.random) {
  const digits = shuffled([1, 2, 3, 4, 5, 6, 7, 8, 9], rnd);
  const order = () => shuffled([0, 1, 2], rnd).flatMap((b) => shuffled([0, 1, 2], rnd).map((i) => b * 3 + i));
  const rows = order(), cols = order(), flip = rnd() < 0.5;
  const out = new Array(81);
  for (let r = 0; r < 9; r++)
    for (let c = 0; c < 9; c++) {
      const v = p[rows[r] * 9 + cols[c]];
      out[flip ? c * 9 + r : r * 9 + c] = v ? digits[v - 1] : 0;
    }
  return out;
}

let board, given, cursor, message, solved;

function reset() {
  board = variant(PUZZLE);
  given = board.map((v) => v !== 0);
  cursor = { r: 0, c: 0 };
  message = "";
  solved = false;
}

function render() {
  let out = "";
  for (let r = 0; r < 9; r++) {
    if (r % 3 === 0) out += BORDER + "\n";
    let line = "|";
    for (let c = 0; c < 9; c++) {
      const v = board[r * 9 + c];
      const inner = v === 0 ? span(".", "dim")
        : span(v, conflict(board, r, c) ? "bad" : given[r * 9 + c] ? "hi" : "warn");
      line += r === cursor.r && c === cursor.c ? "[" + inner + "]" : " " + inner + " ";
      if (c % 3 === 2) line += "|";
    }
    out += line + "\n";
  }
  out += BORDER + "\n";
  out += `\nCursor: R${cursor.r + 1} C${cursor.c + 1}\n`;
  out += `[x] cursor   ${span("clue", "hi")}   ${span("entry", "warn")}   ${span("dup", "bad")}\n`;
  if (message) out += "\n" + message + "\n";
  setScreen(out);
}

export default {
  name: "Sudoku",
  description: "Fill the 9x9 grid.",
  start() {
    reset();
    render();
    print("SUDOKU // fill every row, column and 3x3 box with 1-9.", "hi");
    print("Controls: Arrows/WASD or tap = move | 1-9 = enter | 0/Backspace = clear | / = type a command", "dim");
  },
  restart() {
    reset();
    render();
    print("New Sudoku loaded.", "alt");
  },
  handleKey(e) {
    if (moveCursor(e, cursor, 9, 9)) {
      message = "";
      render();
      return true;
    }
    const digit = /^[1-9]$/.test(e.key) ? Number(e.key)
      : e.key === "0" || e.key === "Backspace" || e.key === "Delete" ? 0 : null;
    if (digit === null) return false;
    const i = cursor.r * 9 + cursor.c;
    if (solved) message = "Already solved. Type restart for a new puzzle.";
    else if (given[i]) message = "That cell is a fixed clue.";
    else {
      board[i] = digit;
      message = conflict(board, cursor.r, cursor.c) ? "Duplicate in row/column/box." : "";
      if (isSolved(board)) {
        solved = true;
        message = ">> SOLVED <<";
        print("SOLVED! Sudoku complete. Nice work.", "warn");
      }
    }
    render();
    return true;
  },
  // text line/column -> cell: borders every 4th line, "|" every 10th column
  cellAt(line, col) {
    const b = Math.floor((col - 1) / 10), w = (col - 1) % 10;
    if (line < 1 || line > 11 || line % 4 === 0 || col < 1 || col > 29 || w === 9) return null;
    return { r: line - Math.floor(line / 4) - 1, c: b * 3 + Math.floor(w / 3) };
  },
  cursorAt: () => cursor,
  touch: { tap: "", keys: [..."123456789"].map((d) => [d, d]).concat([["clear", "0"]]) },
  statusText: () => (solved ? "SOLVED" : `R${cursor.r + 1} C${cursor.c + 1}`),
};
