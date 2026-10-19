# NeonArc

A terminal-style arcade that runs in the browser. Eight small games and five
retro Unix toys (`cmatrix`, `cowsay`, `pipes`, `lolcat`, `sl`), driven by a
command prompt. Everything lives in one HTML file with no framework, no build
step and no runtime dependencies.

**[Play it at neonarc.cybrsmr.xyz](https://neonarc.cybrsmr.xyz)**

![NeonArc main menu](screenshots/neonarc-menu.png)

## Why it exists

I wanted to see how far plain DOM text could go as a game renderer. There is no
`<canvas>`, no images and no web fonts: every board is monospace text inside a
`<pre>`, colored with `<span>`s. The single-file rule was a deliberate
constraint. You can save `index.html`, open it from disk and it works.

## What's inside

| # | Name | Type | Notes |
|---|------|------|-------|
| 1 | Snake | real-time | 24x15 board, best score saved |
| 2 | Tetris | real-time | rotation with simple wall kicks, levels speed up every 10 lines |
| 3 | Sudoku | puzzle | one fixed puzzle, live duplicate highlighting |
| 4 | Tower of Hanoi | puzzle | 3 to 7 disks (`restart 5`), moves typed as `1 3` |
| 5 | Minesweeper | puzzle | 8x8, 10 mines, flood fill, first reveal is never a mine |
| 6 | 2048 | puzzle | best score saved |
| 7 | Hangman | word | 20-word list, 6 misses |
| 8 | Tic-Tac-Toe | two-player | hot-seat, running score across rounds |
| 9 | cmatrix | toy | falling code rain |
| 10 | cowsay | toy | type a line and the cow says it |
| 11 | pipes | toy | the pipes screensaver |
| 12 | lolcat | toy | animated rainbow text |
| 13 | sl | toy | a steam locomotive crosses the screen |

## Using it

Type a number, a name or a command at the `>` prompt.

```
help            list commands
list            games and tools with descriptions
tools           tools only
play <name>     launch by name, e.g. play tetris
restart [n]     restart the current game (Hanoi takes a disk count)
quit, menu      back to the menu
clear           clear the terminal log
about           about NeonArc
```

Names have aliases: `mines`, `ttt`, `matrix`, `cow`, `train` and a few more.

Controls are printed when each game starts:

- **Snake, Tetris, 2048:** arrow keys or WASD. In Tetris, Up/W/Space rotates and Down/S soft-drops.
- **Sudoku, Minesweeper, Tic-Tac-Toe:** arrows or WASD move the cursor. Digits fill Sudoku cells or place a Tic-Tac-Toe mark; Enter/Space reveals and F flags in Minesweeper.
- **Hanoi:** type `from to`, e.g. `1 3`.
- **Hangman, cowsay, lolcat:** type text and press Enter.

Single-key game controls are only captured while the prompt is empty, so you
can still type commands mid-game.

## Run it locally

```bash
git clone https://github.com/atahan99/NeonArc.git
cd NeonArc
open index.html
```

On Linux use `xdg-open index.html`, or double-click the file. No server is needed.

## How it works

The script is a small shell plus two registries, `GAMES` and `TOOLS`. The shell
owns the boot sequence, the terminal log, command parsing, keyboard routing,
the status bar and the draggable splitter. Each game is a self-contained object
with the same shape:

```js
{
  name, description,
  kind,                 // "tool" for the Unix toys
  start(), restart(arg),
  stop(),               // only when a timer must be cleared
  handleKey(event),     // optional: real-time or cursor input
  handleCommand(text),  // optional: typed input (Hanoi moves, Hangman letters)
  statusText()          // optional: live status bar text
}
```

Menu numbers come from the order of `MENU_ORDER` and `TOOL_ORDER`, so adding a
game means writing one object and adding its key to a list.

Rendering is string building: each frame produces the full board as text,
wraps colored cells in `<span>`s and writes it to the `<pre>` in one
assignment. Real-time games and animated toys share a small `setInterval`
wrapper (`gameTimer()`) that is cleared on `stop()`, so leaving a game never
leaves a timer running.

Best scores for Snake, Tetris and 2048 are kept in `localStorage` under
`neonarc.<game>.best`. Nothing else is stored.

### Security notes

- Log output uses `textContent`. The only user text that reaches `innerHTML`
  (cowsay, lolcat, Hangman) is HTML-escaped first.
- The hosted site sends a Content-Security-Policy, `X-Frame-Options: DENY`,
  `nosniff`, a strict referrer policy and a Permissions-Policy that turns off
  sensors, camera, microphone and payments. See [`_headers`](_headers).
- The deploy uses an allowlist, so only `index.html`, `_headers` and the
  favicon are published. The repo, README and screenshots are not served.

## Hosting and privacy

The live site is served as static assets on Cloudflare. The hosted copy loads
Cloudflare Web Analytics, which is cookieless and counts page views. The copy
you open from disk loads nothing from the network.

## Known limitations

- Keyboard only. There are no touch controls yet, so the games are not playable on a phone.
- The game boards are not exposed to screen readers. With `prefers-reduced-motion` on, the CRT flicker, cursor blink and lolcat colour cycling stop, but the animated toys you launch still move.
- Sudoku has a single built-in puzzle.

## License

[MIT](LICENSE) © atahan99
