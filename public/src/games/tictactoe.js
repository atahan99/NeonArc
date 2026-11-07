import { print, setScreen, span } from "../term.js";

const LINES = [[0, 1, 2], [3, 4, 5], [6, 7, 8], [0, 3, 6], [1, 4, 7], [2, 5, 8], [0, 4, 8], [2, 4, 6]];

/** The three winning cells, or null. */
export const winLine = (board) => LINES.find(([a, b, c]) => board[a] && board[a] === board[b] && board[b] === board[c]) || null;

const COLOR = { X: "hi", O: "alt" };
let board, current, starter, over, winner, line, cursor, scores;

function reset() {
  board = new Array(9).fill(null);
  current = starter;
  over = false;
  winner = line = null;
  cursor = 4;
}

const tally = () => `(X ${scores.X} - O ${scores.O}, draws ${scores.draws})`;

function place(i) {
  if (over) return print("Round over. Type restart for a new round or quit.", "dim");
  if (board[i]) return print(`Square ${i + 1} is already taken.`, "warn");
  board[i] = current;
  line = winLine(board);
  if (line) {
    over = true;
    winner = current;
    scores[current]++;
    print(`Player ${current} wins! ${tally()}`, "warn");
  } else if (board.every(Boolean)) {
    over = true;
    winner = "draw";
    scores.draws++;
    print(`It's a draw. ${tally()}`, "alt");
  } else {
    current = current === "X" ? "O" : "X";
  }
  render();
}

function cellStr(i) {
  const v = board[i];
  const glyph = v ? span(v, line && line.includes(i) ? "fg" : COLOR[v]) : span(i + 1, "dim");
  return i === cursor && !over ? "[" + glyph + "]" : " " + glyph + " ";
}

function render() {
  let out = "";
  for (let r = 0; r < 3; r++) {
    out += [0, 1, 2].map((c) => cellStr(r * 3 + c)).join("|") + "\n";
    if (r < 2) out += "---+---+---\n";
  }
  out += "\n";
  if (!over) out += `  Turn: ${span(current, COLOR[current])}\n`;
  else out += winner === "draw" ? "  Draw game.\n" : `  Player ${span(winner, COLOR[winner])} wins!\n`;
  out += `\nScore   ${span("X", "hi")} ${scores.X}   ${span("O", "alt")} ${scores.O}   draws ${scores.draws}\n`;
  setScreen(out);
}

export default {
  name: "Tic-Tac-Toe",
  description: "Two-player X and O.",
  start() {
    scores = { X: 0, O: 0, draws: 0 };
    starter = "X";
    reset();
    render();
    print("TIC-TAC-TOE // two players, X and O take turns. The starter alternates each round.", "hi");
    print("Controls: Arrows/WASD = move | 1-9 = place | Enter/Space or tap = place | / = type a command", "dim");
  },
  restart() {
    starter = starter === "X" ? "O" : "X";
    reset();
    render();
    print(`New round. Player ${starter} starts.`, "alt");
  },
  handleKey(e) {
    const k = e.key.length === 1 ? e.key.toLowerCase() : e.key;
    if (/^[1-9]$/.test(k)) cursor = Number(k) - 1;
    if (/^[1-9]$/.test(k) || k === "Enter" || k === " ") {
      place(cursor); // renders
      return true;
    }
    if (k === "ArrowUp" || k === "w") cursor = (cursor + 6) % 9;
    else if (k === "ArrowDown" || k === "s") cursor = (cursor + 3) % 9;
    else if (k === "ArrowLeft" || k === "a") cursor = cursor % 3 === 0 ? cursor + 2 : cursor - 1;
    else if (k === "ArrowRight" || k === "d") cursor = cursor % 3 === 2 ? cursor - 2 : cursor + 1;
    else return false;
    render();
    return true;
  },
  cellAt: (line, col) => (line < 5 && col < 11 ? { r: Math.floor(line / 2), c: Math.floor(col / 4) } : null),
  cursorAt: () => ({ r: (cursor / 3) | 0, c: cursor % 3 }),
  touch: { tap: "Enter" },
  statusText() {
    const s = `X ${scores.X} O ${scores.O}`;
    if (!over) return `TURN: ${current} | ${s}`;
    return winner === "draw" ? `DRAW | ${s}` : `WINNER: ${winner} | ${s}`;
  },
};
