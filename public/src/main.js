// The shell: boot, command parsing, input modes, status bar, splitter, themes.
import { print, clearLog, setScreen, resetFit, fitScreen, hooks, state, esc } from "./term.js";
import { initTouch } from "./touch.js";
import snake from "./games/snake.js";
import tetris from "./games/tetris.js";
import sudoku from "./games/sudoku.js";
import hanoi from "./games/hanoi.js";
import minesweeper from "./games/minesweeper.js";
import g2048 from "./games/2048.js";
import hangman from "./games/hangman.js";
import tictactoe from "./games/tictactoe.js";
import cmatrix from "./tools/cmatrix.js";
import cowsay from "./tools/cowsay.js";
import pipes from "./tools/pipes.js";
import lolcat from "./tools/lolcat.js";
import sl from "./tools/sl.js";

const $ = (id) => document.getElementById(id);
const appEl = $("app"), terminalEl = $("terminal"), viewportEl = $("viewport"), inputEl = $("cmd");
const statusEl = $("status"), srEl = $("sr-status"), splitterEl = $("splitter"), touchEl = $("touch");
const themeBtn = $("themebtn"), mainEl = document.querySelector("main");

// ---------- registry ----------
// Menu numbers follow these lists, so adding a game is one import plus one entry here.
const PROGRAMS = { snake, tetris, sudoku, hanoi, minesweeper, 2048: g2048, hangman, tictactoe, cmatrix, cowsay, pipes, lolcat, sl };
const GAME_IDS = ["snake", "tetris", "sudoku", "hanoi", "minesweeper", "2048", "hangman", "tictactoe"];
const TOOL_IDS = ["cmatrix", "cowsay", "pipes", "lolcat", "sl"];
const NAMES = [...GAME_IDS, ...TOOL_IDS];
const ALIASES = {
  "tower of hanoi": "hanoi", mines: "minesweeper",
  "tic-tac-toe": "tictactoe", "tic tac toe": "tictactoe", ttt: "tictactoe", xo: "tictactoe", noughts: "tictactoe",
  matrix: "cmatrix", cow: "cowsay", rainbow: "lolcat", train: "sl", steam: "sl", locomotive: "sl",
};
const NAME_TO_ID = { ...ALIASES };
NAMES.forEach((id, i) => { NAME_TO_ID[id] = id; NAME_TO_ID[String(i + 1)] = id; });

const THEMES = ["neon", "phosphor", "amber"];
const COMMANDS = ["help", "about", "clear", "list", "tools", "theme", "menu", "quit", "exit", "restart", "play"];

const shell = { game: null }; // the running game or tool, null in the menu

// ---------- input modes ----------
// A game with handleKey owns the keyboard. "/" or Esc (or any letter the game doesn't use)
// opens the prompt and pauses the game; Enter or Esc gives the keys back. Games without
// handleKey (Hangman, Hanoi, cowsay, lolcat) are played by typing, so the prompt stays open.
let commandMode = false;
const keyGame = () => (shell.game && shell.game.handleKey ? shell.game : null);

function setCommandMode(on) {
  commandMode = on;
  state.paused = on && !!keyGame();
  appEl.classList.toggle("paused", state.paused);
  if (!on) inputEl.value = "";
  inputEl.placeholder = !keyGame() ? (shell.game ? "type here, or quit" : "type a number, a name or help")
    : on ? "type a command, Esc to go back"
    : touchMode ? "tap here to type a command" : "keys play the game, / for commands";
  updateStatus();
}

// Touch users get no auto-focus (it would pop the on-screen keyboard over the board),
// except while typing is the way to play.
let touchMode = matchMedia("(pointer: coarse)").matches;
document.addEventListener("pointerdown", (e) => { touchMode = e.pointerType === "touch"; }, true);
function focusInput() {
  if (touchMode && keyGame() && !commandMode) return;
  if (touchMode && !shell.game) return;
  inputEl.focus();
}

// ---------- status ----------
function updateStatus() {
  const g = shell.game;
  if (!g) {
    statusEl.innerHTML = "MODE: <b>MENU</b> | COMMANDS: help, list, theme, play &lt;name&gt;";
    return;
  }
  const info = g.statusText ? g.statusText() : "";
  const mode = state.paused ? "PAUSED" : g.kind === "tool" ? "TOOL" : "GAME";
  statusEl.innerHTML = `MODE: <b>${mode}</b> | ACTIVE: <b>${esc(g.name)}</b>${info ? " | " + esc(info) : ""}` +
    (keyGame() ? (state.paused ? " | Esc = resume" : " | / = commands") : " | COMMANDS: restart, quit");
  const spoken = info ? `${g.name}. ${info.replace(/\|/g, ",")}` : "";
  if (srEl.textContent !== spoken) srEl.textContent = spoken; // screen readers hear score changes only
}
hooks.afterTick = updateStatus;

// ---------- menu ----------
const pad = (n) => `[${n}]`.padEnd(4);

function makeLink(el, id) {
  el.classList.add("link");
  el.setAttribute("role", "button");
  el.tabIndex = 0;
  el.addEventListener("click", () => submitCommand(id));
  el.addEventListener("keydown", (e) => {
    if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      submitCommand(id);
    }
  });
}

/** mode: "menu" (numbered list), "list" (games and tools with descriptions), "tools". */
function printCatalog(mode) {
  const entry = (id, n, cls) => {
    const p = PROGRAMS[id], line = pad(n) + " " + p.name;
    makeLink(print(mode === "menu" ? line : `  ${line} - ${p.description}`, cls), id);
  };
  if (mode !== "tools") {
    if (mode === "menu") { print(""); print("NEONARC", "hi"); print(""); print("Choose a game:"); print(""); }
    else print("Games:", "hi");
    GAME_IDS.forEach((id, i) => entry(id, i + 1, "fg"));
    print("");
  }
  print("Linux tools:", "alt");
  if (mode === "menu") print("");
  TOOL_IDS.forEach((id, i) => entry(id, GAME_IDS.length + i + 1, "soft"));
  if (mode === "menu") {
    print("");
    print("Type a number or a name (or click one), or help.", "dim");
    print("");
  }
}

// ---------- launching ----------
function launch(id) {
  const g = PROGRAMS[id];
  if (shell.game && shell.game !== g && shell.game.stop) shell.game.stop();
  shell.game = g;
  appEl.classList.add("game");
  appEl.classList.remove("logopen");
  terminalEl.style.flexBasis = ""; // back to the default log width on each launch
  resetFit();
  buildTouchControls(g);
  clearLog();
  setCommandMode(false);
  history.replaceState(null, "", "#" + id); // the address bar is now a link to this game
  print(`Launching ${g.name}...`, "hi");
  g.start();
  fitScreen(); // again now that the log lines exist (they shrink the board area on mobile)
  updateStatus();
  focusInput();
}

function quitToMenu() {
  if (!shell.game) return print("No active game. You are already in the menu.", "dim");
  if (shell.game.stop) shell.game.stop();
  shell.game = null;
  history.replaceState(null, "", location.pathname);
  appEl.classList.remove("game");
  setScreen("");
  clearLog();
  setCommandMode(false);
  printCatalog("menu");
  focusInput();
}

// ---------- themes ----------
function setTheme(name) {
  document.documentElement.dataset.theme = name;
  showTheme(name);
  try { localStorage.setItem("neonarc.theme", name); } catch { /* not saved in private mode */ }
}
function showTheme(name) {
  themeBtn.textContent = name;
  themeBtn.setAttribute("aria-label", "Colour theme: " + name);
}
const currentTheme = () => (THEMES.includes(document.documentElement.dataset.theme) ? document.documentElement.dataset.theme : "neon");

themeBtn.addEventListener("click", () => {
  const next = THEMES[(THEMES.indexOf(currentTheme()) + 1) % THEMES.length];
  setTheme(next);
  print(`Theme: ${next}. Type theme to see them all.`, "dim");
});

// ---------- commands ----------
const HELP_TEXT = [
  "Available commands:",
  "  help              show this help",
  "  list              show all games and tools",
  "  tools             show the Linux tools",
  "  play <name>       launch a game or tool (e.g. play cmatrix)",
  "  restart [n]       restart the current game (Hanoi takes a disk count)",
  "  quit, menu        back to the menu",
  "  theme [name]      colour theme: " + THEMES.join(", "),
  "  clear             clear the terminal output",
  "  about             about NEONARC",
  "",
  "Quick launch: type a number 1-13 or a name.",
  "In Snake, Tetris and the other key games the keys play the game:",
  "press / to type a command and Esc to go back.",
].join("\n");

const ABOUT_TEXT = [
  "NEONARC // cyberpunk terminal arcade",
  "Eight classic mini-games and five retro Unix toys, drawn as",
  "plain text in the browser. No canvas, no images, no framework.",
  "Best scores and your theme are saved on this device only.",
].join("\n");

function submitCommand(raw) {
  const cmd = raw.trim();
  if (!cmd) return;
  print("> " + raw, "soft");

  const lower = cmd.toLowerCase();
  const [head, ...rest] = lower.split(/\s+/);
  const arg = rest.join(" ");

  switch (head) {
    case "help": return print(HELP_TEXT);
    case "about": return print(ABOUT_TEXT, "soft");
    case "clear": return clearLog();
    case "list": return printCatalog("list");
    case "tools": return printCatalog("tools");
    case "menu": case "quit": case "exit": return quitToMenu();
    case "theme":
      if (!arg) return print(`Themes: ${THEMES.join(", ")} (now: ${currentTheme()}). Try: theme amber`, "dim");
      if (!THEMES.includes(arg)) return print(`No theme called "${arg}". Pick one of: ${THEMES.join(", ")}.`, "bad");
      setTheme(arg);
      return print(`Theme: ${arg}.`, "dim");
    case "restart":
      if (!shell.game) return print("No active game to restart. Pick one from the menu.", "dim");
      shell.game.restart(arg);
      return updateStatus();
    case "play":
      if (!arg) return print("Usage: play <name>. Try: play snake or play cmatrix", "warn");
      return NAME_TO_ID[arg] ? launch(NAME_TO_ID[arg]) : print("Game not found. Type list to see available games.", "bad");
  }

  // a launch name or number wins over game text, so "snake" typed in cowsay launches Snake
  if (NAME_TO_ID[lower]) return launch(NAME_TO_ID[lower]);
  if (shell.game && shell.game.handleCommand && shell.game.handleCommand(cmd) === true) return updateStatus();
  print("Unknown command. Type help for available commands.", "bad");
}

// ---------- keyboard ----------
const cmdHistory = [];
let histPos = 0;

/** Tab completion over commands and names (after "play ", names only). */
function complete() {
  const m = inputEl.value.match(/^(\s*(?:play\s+)?)(\S*)$/i);
  if (!m) return;
  const word = m[2].toLowerCase();
  const hits = (m[1] ? NAMES : COMMANDS.concat(NAMES)).filter((w) => w.startsWith(word));
  if (!hits.length) return;
  const common = hits.reduce((a, b) => {
    let i = 0;
    while (i < a.length && a[i] === b[i]) i++;
    return a.slice(0, i);
  });
  if (hits.length > 1 && common === word) print(hits.join("  "), "dim");
  inputEl.value = m[1] + common + (hits.length === 1 ? " " : "");
}

document.addEventListener("keydown", (e) => {
  if (e.metaKey || e.ctrlKey || e.altKey) return; // leave browser and OS shortcuts alone
  const t = e.target;
  if (t === splitterEl) return;
  if (t !== inputEl && t.closest("button, a, .link") && (e.key === "Enter" || e.key === " ")) return;

  const g = keyGame();
  if (g && !commandMode) {
    if (e.key === "/" || e.key === "Escape") {
      e.preventDefault();
      setCommandMode(true);
      inputEl.focus();
    } else if (g.handleKey(e) === true) {
      e.preventDefault();
      updateStatus();
    } else if (e.key.length === 1 && e.key.trim()) {
      // a letter the game doesn't use starts a command, so "quit" and "restart" just work
      e.preventDefault();
      setCommandMode(true);
      inputEl.value = e.key;
      inputEl.focus();
    }
    return;
  }

  if (t !== inputEl) {
    if (e.key.length === 1 && !touchMode) inputEl.focus(); // the key lands in the prompt
    return;
  }
  if (e.key === "Escape") {
    e.preventDefault();
    if (g) setCommandMode(false);
    else inputEl.value = "";
  } else if (e.key === "ArrowUp" || e.key === "ArrowDown") {
    if (!cmdHistory.length) return;
    e.preventDefault();
    histPos = Math.max(0, Math.min(cmdHistory.length, histPos + (e.key === "ArrowUp" ? -1 : 1)));
    inputEl.value = cmdHistory[histPos] || "";
  } else if (e.key === "Tab" && inputEl.value.trim()) {
    e.preventDefault();
    complete();
  } else if (e.key === "Enter") {
    e.preventDefault();
    const val = inputEl.value;
    if (val.trim() && val !== cmdHistory.at(-1)) cmdHistory.push(val);
    histPos = cmdHistory.length;
    if (g) setCommandMode(false); // hand the keys back before the command runs
    inputEl.value = "";
    submitCommand(val);
  }
});

// Clicking or tapping the prompt means "I want to type", even mid-game. So does text that arrives
// without key events (paste, dictation, phone keyboards that send "Unidentified").
const wantsToType = () => { if (keyGame() && !commandMode) setCommandMode(true); };
inputEl.addEventListener("pointerdown", wantsToType);
inputEl.addEventListener("input", wantsToType);
viewportEl.addEventListener("pointerdown", () => { if (commandMode && keyGame()) setCommandMode(false); });

// Keep the prompt focused for keyboard play, but never steal a text selection.
document.addEventListener("click", (e) => {
  if (touchMode || !getSelection().isCollapsed || e.target.closest("a, button, input, .splitter")) return;
  focusInput();
});
window.addEventListener("focus", focusInput);
window.addEventListener("resize", fitScreen);

// ---------- splitter (drag or arrow keys) ----------
const MIN_PANEL = 220;
function setLogWidth(px) {
  const total = mainEl.getBoundingClientRect().width;
  const w = Math.max(MIN_PANEL, Math.min(total - MIN_PANEL, px));
  terminalEl.style.flexBasis = w + "px";
  splitterEl.setAttribute("aria-valuenow", String(Math.round((w / total) * 100)));
  fitScreen();
}
let dragging = false;
splitterEl.addEventListener("pointerdown", (e) => {
  dragging = true;
  splitterEl.classList.add("dragging");
  try { splitterEl.setPointerCapture(e.pointerId); } catch { /* pointer already gone */ }
  e.preventDefault();
});
splitterEl.addEventListener("pointermove", (e) => {
  if (dragging) setLogWidth(e.clientX - mainEl.getBoundingClientRect().left);
});
function endDrag() {
  if (!dragging) return;
  dragging = false;
  splitterEl.classList.remove("dragging");
  focusInput();
}
splitterEl.addEventListener("pointerup", endDrag);
splitterEl.addEventListener("pointercancel", endDrag);
splitterEl.addEventListener("keydown", (e) => {
  if (e.key !== "ArrowLeft" && e.key !== "ArrowRight") return;
  e.preventDefault();
  setLogWidth(terminalEl.getBoundingClientRect().width + (e.key === "ArrowLeft" ? -24 : 24));
});

// ---------- touch ----------
function press(g, key) {
  g.handleKey({ key });
  updateStatus();
}
initTouch(viewportEl, () => (shell.game && shell.game.touch ? shell.game : null), press);

function buildTouchControls(g) {
  touchEl.replaceChildren();
  const keys = ((g.touch && g.touch.keys) || []).concat([["restart", "restart"], ["quit", "quit"], ["log", "log"]]);
  for (const [label, key] of keys) {
    const b = document.createElement("button");
    b.type = "button";
    b.textContent = label;
    if (key === "log") {
      b.className = "logbtn";
      b.setAttribute("aria-expanded", "false");
    }
    b.addEventListener("click", () => {
      if (key === "log") {
        b.setAttribute("aria-expanded", String(appEl.classList.toggle("logopen")));
        terminalEl.scrollTop = terminalEl.scrollHeight;
        fitScreen();
      } else if (key === "restart" || key === "quit") {
        submitCommand(key);
      } else {
        press(g, key);
      }
    });
    touchEl.append(b);
  }
}

// ---------- analytics ----------
// Only the hosted site counts page views (cookieless Cloudflare Web Analytics). Local runs load nothing.
if (location.hostname === "neonarc.cybrsmr.xyz") {
  const s = document.createElement("script");
  s.defer = true;
  s.src = "https://static.cloudflareinsights.com/beacon.min.js";
  s.dataset.cfBeacon = JSON.stringify({ token: "ba4e7d36921e4d43a56de5256b515e54" });
  document.head.append(s);
}

/** neonarc.cybrsmr.xyz/#tetris opens Tetris. launch() rewrites the hash with replaceState, which fires no event. */
function openFromHash() {
  const id = NAME_TO_ID[decodeURIComponent(location.hash.slice(1)).toLowerCase()];
  if (id && PROGRAMS[id] !== shell.game) launch(id);
}

// ---------- boot ----------
const BOOT_LINES = [
  ["Initializing Neonarc...", "hi"],
  ["Loading terminal shell...", "soft"],
  ["Calibrating neon grid...", "alt"],
  ["Cyberdeck online.", "fg"],
];

function boot() {
  showTheme(currentTheme());
  setCommandMode(false);
  let i = 0, timer = null;
  function next() {
    if (i < BOOT_LINES.length) {
      print(...BOOT_LINES[i++]);
      timer = setTimeout(next, 420);
      return;
    }
    document.removeEventListener("keydown", skip, true);
    document.removeEventListener("pointerdown", skip, true);
    printCatalog("menu");
    focusInput();
    openFromHash();
    window.addEventListener("hashchange", openFromHash);
  }
  // any key or tap prints the rest of the boot lines at once
  function skip(e) {
    if (e.type === "keydown") {
      if (e.metaKey || e.ctrlKey || e.altKey) return;
      e.preventDefault();
      e.stopPropagation();
    }
    clearTimeout(timer);
    while (i < BOOT_LINES.length) print(...BOOT_LINES[i++]);
    next();
  }
  document.addEventListener("keydown", skip, true);
  document.addEventListener("pointerdown", skip, true);
  next();
}

focusInput();
boot();
