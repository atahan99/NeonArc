import { test } from "node:test";
import assert from "node:assert/strict";

import { freeCell, queueTurn, W, H } from "../public/src/games/snake.js";
import { rotateCW, rotate, collide, clearLines, bag, emptyBoard, SHAPES, COLS } from "../public/src/games/tetris.js";
import { PUZZLE, conflict, isSolved, variant } from "../public/src/games/sudoku.js";
import { moveError } from "../public/src/games/hanoi.js";
import { placeMines, countAdjacent, flood, SIZE, MINES } from "../public/src/games/minesweeper.js";
import { slide, move, canMove } from "../public/src/games/2048.js";
import { winLine } from "../public/src/games/tictactoe.js";
import { masked } from "../public/src/games/hangman.js";
import { wrap } from "../public/src/tools/cowsay.js";

// A tiny seeded generator, so "random" tests are repeatable.
function seeded(seed) {
  return () => ((seed = (seed * 1103515245 + 12345) % 2 ** 31) / 2 ** 31);
}

test("2048: slide merges each pair once, toward the front", () => {
  assert.deepEqual(slide([2, 2, 2, 2]), { row: [4, 4, 0, 0], gained: 8 });
  assert.deepEqual(slide([4, 0, 4, 8]), { row: [8, 8, 0, 0], gained: 8 });
  assert.deepEqual(slide([2, 4, 8, 16]), { row: [2, 4, 8, 16], gained: 0 });
});

test("2048: move works in all four directions and reports no-op moves", () => {
  const g = [2, 0, 0, 2, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0];
  assert.deepEqual(move(g, "left").grid.slice(0, 4), [4, 0, 0, 0]);
  assert.deepEqual(move(g, "right").grid.slice(0, 4), [0, 0, 0, 4]);
  assert.equal(move(g, "down").grid[12], 2);
  assert.equal(move(g, "up").moved, false);
});

test("2048: canMove is false only on a full board with no equal neighbours", () => {
  const stuck = [2, 4, 2, 4, 4, 2, 4, 2, 2, 4, 2, 4, 4, 2, 4, 2];
  assert.equal(canMove(stuck), false);
  assert.equal(canMove([...stuck.slice(0, 15), 0]), true);
  assert.equal(canMove([2, 2, ...stuck.slice(2)]), true);
});

test("tetris: four rotations return the original shape", () => {
  for (const m of Object.values(SHAPES)) assert.deepEqual(rotateCW(rotateCW(rotateCW(rotateCW(m)))), m);
  assert.deepEqual(rotateCW([[1, 1, 1, 1]]), [[1], [1], [1], [1]]);
});

test("tetris: collide catches walls, floor and placed blocks", () => {
  const board = emptyBoard();
  assert.equal(collide(board, SHAPES.O, -1, 0), true);
  assert.equal(collide(board, SHAPES.O, COLS - 1, 0), true);
  assert.equal(collide(board, SHAPES.O, 0, board.length - 1), true);
  board[5][4] = "T";
  assert.equal(collide(board, SHAPES.O, 4, 4), true);
  assert.equal(collide(board, SHAPES.O, 0, 4), false);
});

test("tetris: rotation kicks off the wall instead of failing", () => {
  const board = emptyBoard();
  const r = rotate(board, { m: [[1], [1], [1], [1]], x: COLS - 1, y: 0 }); // vertical I against the right wall
  assert.ok(r);
  assert.equal(collide(board, r.m, r.x, 0), false);
});

test("tetris: clearLines drops full rows and keeps the board size", () => {
  const board = emptyBoard();
  board[17].fill("I");
  board[16].fill("I");
  board[15][0] = "T";
  assert.equal(clearLines(board), 2);
  assert.equal(board.length, 18);
  assert.equal(board[17][0], "T");
  assert.ok(board[0].every((v) => v === 0));
});

test("tetris: a 7-bag holds every piece exactly once", () => {
  const b = bag(seeded(7));
  assert.deepEqual([...b].sort(), Object.keys(SHAPES).sort());
});

test("snake: freeCell never lands on the snake and returns null on a full board", () => {
  const body = [{ x: 0, y: 0 }, { x: 1, y: 0 }];
  const rnd = seeded(1);
  for (let i = 0; i < 100; i++) {
    const c = freeCell(body, rnd);
    assert.ok(!body.some((s) => s.x === c.x && s.y === c.y));
  }
  const full = [];
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) full.push({ x, y });
  assert.equal(freeCell(full), null);
});

test("snake: turns queue up to two ahead, reversals are ignored", () => {
  const right = { x: 1, y: 0 }, up = { x: 0, y: -1 }, left = { x: -1, y: 0 }, down = { x: 0, y: 1 };
  assert.deepEqual(queueTurn([], right, left), []); // straight back
  assert.deepEqual(queueTurn([], right, up), [up]);
  assert.deepEqual(queueTurn([up], right, left), [up, left]); // fast corner: up then left
  assert.deepEqual(queueTurn([up, left], right, down), [up, left]); // queue is full
});

const SOLUTION = [..."534678912672195348198342567859761423426853791713924856961537284287419635345286179"].map(Number);

test("sudoku: the built-in puzzle agrees with its solution", () => {
  assert.equal(isSolved(SOLUTION), true);
  assert.ok(PUZZLE.every((v, i) => v === 0 || v === SOLUTION[i]));
});

test("sudoku: conflict spots row, column and box duplicates", () => {
  const b = new Array(81).fill(0);
  b[0] = 5; b[8] = 5;
  assert.equal(conflict(b, 0, 0), true); // row
  b[8] = 0; b[72] = 5;
  assert.equal(conflict(b, 0, 0), true); // column
  b[72] = 0; b[20] = 5;
  assert.equal(conflict(b, 0, 0), true); // box
  b[20] = 0;
  assert.equal(conflict(b, 0, 0), false);
});

test("sudoku: every variant of a solved grid is still solved", () => {
  const rnd = seeded(42);
  for (let i = 0; i < 50; i++) assert.equal(isSolved(variant(SOLUTION, rnd)), true);
  const v = variant(PUZZLE, rnd);
  assert.equal(v.filter(Boolean).length, PUZZLE.filter(Boolean).length); // same number of clues
});

test("hanoi: moveError allows legal moves and names illegal ones", () => {
  const towers = [[3, 2], [1], []];
  assert.equal(moveError(towers, 0, 2), null);
  assert.match(moveError(towers, 0, 1), /smaller disk 1/);
  assert.match(moveError(towers, 2, 0), /empty/);
  assert.match(moveError(towers, 1, 1), /same/);
});

test("minesweeper: the first click and its neighbours are never mines", () => {
  const rnd = seeded(3);
  for (const [r, c] of [[0, 0], [3, 4], [7, 7]]) {
    const mine = placeMines(r, c, rnd);
    assert.equal(mine.filter(Boolean).length, MINES);
    for (let dr = -1; dr <= 1; dr++)
      for (let dc = -1; dc <= 1; dc++) {
        const rr = r + dr, cc = c + dc;
        if (rr >= 0 && rr < SIZE && cc >= 0 && cc < SIZE) assert.equal(mine[rr * SIZE + cc], false);
      }
    assert.equal(countAdjacent(mine)[r * SIZE + c], 0); // so the first click always opens an area
  }
});

test("minesweeper: flood stops at numbers and flags", () => {
  const mine = new Array(SIZE * SIZE).fill(false);
  mine[SIZE * SIZE - 1] = true; // one mine in the bottom-right corner
  const field = { mine, adj: countAdjacent(mine), revealed: new Array(SIZE * SIZE).fill(false), flagged: new Array(SIZE * SIZE).fill(false) };
  field.flagged[0] = true;
  const opened = flood(3, 3, field);
  assert.equal(opened, SIZE * SIZE - 2); // everything but the mine and the flagged cell
  assert.equal(field.revealed[SIZE * SIZE - 1], false);
  assert.equal(field.revealed[0], false);
});

test("tic-tac-toe: winLine finds rows, columns and diagonals", () => {
  assert.deepEqual(winLine(["X", "X", "X", null, null, null, null, null, null]), [0, 1, 2]);
  assert.deepEqual(winLine(["O", null, null, null, "O", null, null, null, "O"]), [0, 4, 8]);
  assert.equal(winLine(["X", "O", "X", "X", "O", "O", "O", "X", "X"]), null);
});

test("hangman: masked shows guessed letters only", () => {
  assert.equal(masked("neon", new Set(["n"])), "n _ _ n");
});

test("cowsay: wrap keeps lines within the width", () => {
  assert.deepEqual(wrap("the quick brown fox", 9), ["the quick", "brown fox"]);
  assert.deepEqual(wrap("   ", 10), [""]);
  assert.deepEqual(wrap("supercalifragilistic", 5), ["supercalifragilistic"]);
});
