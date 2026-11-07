import { print, setScreen, esc } from "../term.js";

export const WORDS = [
  "neon", "cyber", "matrix", "pixel", "vector", "glitch", "arcade", "circuit", "android", "hacker",
  "laser", "plasma", "quantum", "network", "protocol", "synth", "cascade", "phantom", "reactor", "binary",
  "kernel", "daemon", "socket", "buffer", "cipher", "packet", "router", "server", "compiler", "terminal",
  "console", "cursor", "monitor", "hologram", "robotics", "satellite", "voltage", "firewall", "joystick", "cartridge",
  "keyboard", "chrome", "static", "signal", "spectrum", "orbital", "transistor", "algorithm", "mainframe", "overclock",
];
const MAX_WRONG = 6;
const STAGES = [
  "  +---+\n      |\n      |\n      |\n     ===",
  "  +---+\n  O   |\n      |\n      |\n     ===",
  "  +---+\n  O   |\n  |   |\n      |\n     ===",
  "  +---+\n  O   |\n /|   |\n      |\n     ===",
  "  +---+\n  O   |\n /|\\  |\n      |\n     ===",
  "  +---+\n  O   |\n /|\\  |\n /    |\n     ===",
  "  +---+\n  O   |\n /|\\  |\n / \\  |\n     ===",
];

export const masked = (word, guessed) => [...word].map((ch) => (guessed.has(ch) ? ch : "_")).join(" ");

let word, guessed, wrong, over, win;

function reset() {
  word = WORDS[(Math.random() * WORDS.length) | 0];
  guessed = new Set();
  wrong = [];
  over = win = false;
}

function guess(letter) {
  if (over) return print("Round over. Type restart for a new word or quit.", "dim");
  if (guessed.has(letter) || wrong.includes(letter)) return print(`Already guessed '${letter}'.`, "warn");
  if (word.includes(letter)) {
    guessed.add(letter);
    if ([...word].every((ch) => guessed.has(ch))) {
      win = over = true;
      print(`YOU WIN! The word was "${word}".`, "warn");
    }
  } else {
    wrong.push(letter);
    if (wrong.length >= MAX_WRONG) {
      over = true;
      print(`GAME OVER. The word was "${word}".`, "bad");
    }
  }
  render();
}

function render() {
  let out = STAGES[wrong.length] + "\n\n";
  out += `Word:  ${masked(word, guessed)}\n\n`;
  out += `Wrong: ${wrong.length ? wrong.join(" ") : "-"}\n`;
  out += `Tries left: ${MAX_WRONG - wrong.length}\n`;
  out += "\nType a letter, then press Enter.\n";
  if (win) out += "\n  >> YOU WIN <<\n";
  else if (over) out += "\n  >> GAME OVER <<\n";
  setScreen(esc(out));
}

export default {
  name: "Hangman",
  description: "Guess the hidden word.",
  start() {
    reset();
    render();
    print("HANGMAN // guess the word one letter at a time. 6 misses allowed.", "hi");
    print("Controls: type a letter then Enter | restart = new word | quit", "dim");
  },
  restart() {
    reset();
    render();
    print("New word loaded.", "alt");
  },
  handleCommand(cmd) {
    cmd = cmd.trim().toLowerCase();
    if (!/^[a-z]$/.test(cmd)) return false;
    guess(cmd);
    return true;
  },
  statusText: () => `TRIES: ${MAX_WRONG - wrong.length}/${MAX_WRONG}`,
};
