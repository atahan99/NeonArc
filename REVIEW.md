# NeonArc: portfolio review and polish plan

Reviewed 2026-10-19 against `index.html` (1,842 lines), `_headers`, the deploy
allowlist and the live site at neonarc.cybrsmr.xyz (desktop and 375px mobile).
Lenses: ponytail (code), impeccable audit + detector, design-taste v1,
frontend-design, and a security pass.

## The short version

This is a working, fun toy, and the code is cleaner than most single-file projects:
there's a real game interface, the timers are disciplined and user input is
escaped. For a portfolio, though, it currently says "weekend project", not
"engineer I want to hire". There are three reasons:

1. **It looks like a generated page.** It uses the cyan/magenta/purple neon
   palette with a glow on every element. The detector flagged nine glow
   instances plus the scanline stripes. There are five panels, each with a
   different glowing border colour, so nothing stands out. Anyone who has seen
   2025-26 AI demos will recognise the look at once.
2. **The game isn't the hero.** In game mode on desktop the board fills about
   a quarter of the screen, while the left panel holds three lines of text. On
   a phone the empty log takes about 65% of the height, the board is a small
   strip, and **there are no touch controls, so nothing is playable**.
   Recruiters usually open portfolio links on their phones.
3. **The engineering is invisible.** One 1,800-line IIFE in ES5 `var` style,
   with no tests, no lint and no CI. The good design decisions (the registry
   interface, pure-ish game logic) are buried inside one file.

Overall impeccable audit score: **9/20 (Poor)**. Fixing the three items above
moves it to "Good" without adding any dependencies.

---

## 1. Bugs (verified)

| # | Severity | Bug | Where |
|---|----------|-----|-------|
| 1 | P1 | **Browser shortcuts are swallowed.** With an empty prompt in Snake/Tetris/2048/Sudoku, `Cmd+A`, `Cmd+D`, `Cmd+S` and others go to the game with `preventDefault`. Confirmed in the browser: `Cmd+A` was prevented and moved the 2048 tiles. Fix: `if (e.metaKey \|\| e.ctrlKey \|\| e.altKey) return;` at the top of the keydown handler. | `index.html:580` |
| 2 | P1 | **Game keys block commands.** In Snake you can't type `sudoku`, `snake` or `sl` because the `s` is eaten. In Sudoku, `2048` enters a 2. In Tic-Tac-Toe, every number is a move. | `index.html:599-602` |
| 3 | P2 | **Text tools hijack launch names.** In cowsay, typing `snake` makes the cow say "snake" instead of launching. In Hanoi, typing `5` prints "Invalid move". `handleCommand` runs before name lookup. | `index.html:564-569` |
| 4 | P2 | **Dead duplicate functions.** `listGames` and `listTools` are declared twice. The later declarations win through hoisting, so the `list`/`tools` branches of `printCatalog` never run. | `index.html:426-427` vs `507-523` |
| 5 | P2 | **2048 never shows "New best score".** Best is saved on every move, so `endScoreGame` always sees `score === best`. The "2048 reached" message also fires again for every later 2048 tile. | `index.html:1306`, `1308` |
| 6 | P2 | **A corrupted `localStorage` value shows "Best: NaN" forever.** `Number("x")` is NaN, and `score > NaN` is always false. Fix: `return Number(v) \|\| def`. | `index.html:344` |
| 7 | P3 | Hanoi `restart` with no argument forgets the chosen disk count and resets to 3. | `index.html:1093` |
| 8 | P3 | Sudoku stays editable after it's solved and prints "SOLVED" again on every re-completion. | `index.html:1012` |
| 9 | P3 | Minesweeper only protects the first cell, not its neighbours, so you can open on a "1" and have to guess. Modern Minesweeper guarantees an opening. | `index.html:1129` |
| 10 | P3 | Snake drops a second turn pressed within the same 130 ms tick because there's no input queue. Fast corners feel unresponsive. | `index.html:741-751` |
| 11 | P3 | Tetris has no lock delay. Down at the floor locks instantly. There's no next-piece preview or hard drop, and pieces are pure random rather than a 7-bag. | `index.html:905` |

## 2. Security audit

**Verdict: low risk. No exploitable issues found.** It's a static page with
no backend, no auth and no dependencies, which is the safest possible shape.

What's good:
- **No XSS path.** Log output uses `textContent`. The only user text that
  reaches `innerHTML` is in cowsay, lolcat (escaped per character) and Hangman
  (`[a-z]` only, then escaped). The status bar `innerHTML` only contains
  constants.
- **Deploy allowlist works.** `.assetsignore` publishes only `index.html`,
  `_headers` and `favicon.svg`. I probed `/.git/config`, `/wrangler.jsonc` and
  `/README.md` on the live site: all return 404.
- **No secrets in git history.** The only "token" is the Cloudflare Web
  Analytics beacon token, which is public by design.
- **Good headers:** CSP, `frame-ancestors 'none'`, nosniff, Referrer-Policy,
  Permissions-Policy, and HSTS (added by Cloudflare).

What to harden:

| Severity | Finding | Fix |
|----------|---------|-----|
| Medium | **`script-src 'unsafe-inline'` makes the CSP mostly decorative against XSS.** It's needed today only because the script is inline. | Move the JS into `app.js`, then use `script-src 'self' https://static.cloudflareinsights.com`. If you want to stay single-file, use a `'sha256-…'` hash instead. That needs a script to recompute it on every edit, so it's more fragile. |
| Low | `style-src 'unsafe-inline'` is forced by `neonSpan()` writing `style="color:…"` on every cell. | Replace inline colours with classes (`.t-I`, `.n-3`, …). That also fixes theming (section 4) and reduces DOM weight. |
| Low | `neonSpan(ch, …)` inserts `ch` as raw HTML, and callers have to remember to escape. That's safe today but easy to break in a future edit. `escHTML` also doesn't escape quotes. | Escape inside `neonSpan`, or build nodes instead of strings. |
| Low | `/_headers` is publicly downloadable (200 OK). It's harmless (the CSP is visible in response headers anyway) but sloppy. | Check whether Cloudflare still applies it when it's excluded from assets. If not, leave it. |
| Info | README said "no CDNs, no dependencies", but the hosted page loads a third-party script with no SRI. That's an honesty issue, not a vulnerability. | Fixed in the new README, which discloses the analytics. |
| Info | No `Cross-Origin-Opener-Policy`. | Add `Cross-Origin-Opener-Policy: same-origin` to `_headers`. |
| Info | `wrangler.jsonc` is gitignored but contains no secrets, only the route. | Commit it, so the deploy is reproducible from the repo. |

## 3. Design critique (frontend-design, taste, impeccable)

Note on lenses: design-taste v1 assumes React/Tailwind, so its stack rules
don't apply here. Its anti-slop rules (no neon glows, no "AI purple", one
accent) do apply. Impeccable's rule is that the brief wins: if neon cyberpunk
is the look you want, keep it, but commit to it and restrain it.

- **Palette.** You use five accents (cyan, magenta, purple, green, amber) plus
  red, all at full saturation and all glowing. Every border is a different
  colour, so there's no hierarchy. *Direction:* pick one real reference and
  copy it closely. For example, a VT220 green or amber phosphor (P1/P3) with a
  single accent reserved for "your attention here": the cursor, danger and wins.
  Spend the glow on the game board only. That's the one bold element; keep
  everything else quiet.
- **Too many boxes.** The header, log, viewport, input and status bar are five
  rounded, glowing cards. A real terminal is one surface. Merge them into a
  single frame with hairline dividers. Also, square corners are what terminals
  actually have.
- **Layout.** The game should own the viewport. On desktop, give the board
  roughly two thirds of the width and scale its font to fit (compute from
  board columns and rows, not `1.6vw`). Make the log a narrow side column. On
  mobile, put the board first, a collapsible one- or two-line log below it, and
  touch controls under that.
- **Empty first screen.** The menu is a text list in a half-empty box. Run an
  attract mode in the viewport while on the menu, such as a Snake that plays
  itself or a slow cmatrix, so the first second of a visit shows motion and
  craft.
- **Discoverability.** Nothing is clickable. Developers will type; everyone
  else bounces. Make menu entries clickable (keep typing as the primary path),
  and add Up-arrow history and Tab completion. Up-arrow history is the first
  thing anyone tries in a terminal.
- **Duplicate info.** Score and Best appear both on the board and in the status
  bar. Keep it in one place.
- **Typography.** The system mono with letter-spaced, glowing brand text has no
  identity. Self-host one characterful mono so CSP stays `'self'` (for example
  JetBrains Mono, IBM Plex Mono, or a VGA/pixel face for the board only). Drop
  the 6px tracking.
- **Copy.** "Calibrating neon grid…", "Cyberdeck online", "jack in" are
  stock cyberpunk lines. Either write something specific (real-looking
  `dmesg`-style boot lines are fun) or cut the boot sequence to under a
  second. Let any keypress skip it.

## 4. Technical audit (impeccable)

| # | Dimension | Score | Key finding |
|---|-----------|-------|-------------|
| 1 | Accessibility | 1 | There's no `prefers-reduced-motion` handling for CRT flicker, the blinking cursor, cmatrix, pipes or lolcat. Game state is invisible to screen readers, and `aria-live` on the log announces whole menus at once. The splitter has no `role="separator"` and no keyboard support. The `#5a6b7a` hidden-cell grey is about 3.6:1 contrast, below the AA minimum. |
| 2 | Performance | 3 | Fine on desktop. Each tick rebuilds `innerHTML` with hundreds of spans, each with a `text-shadow` (cmatrix is about 680 spans at 11 fps). That costs battery on phones. Classes plus one shared shadow would help. |
| 3 | Theming | 2 | Tokens exist in `:root`, but JS hard-codes about 40 hex values that duplicate them. |
| 4 | Responsive | 1 | It stacks at 720px, but there's no touch input and the layout proportions are wrong (see above). |
| 5 | Integrity | 2 | Glow everywhere (detector), dead duplicate code, and a README that didn't match the deploy. |
| | **Total** | **9/20** | **Poor: needs a major pass** |

Also missing for a shareable link: `<meta name="description">`, Open Graph and
Twitter image tags (the link preview is blank on LinkedIn and Slack),
`theme-color`, and the favicon, which is still uncommitted and 404s live.

## 5. Code, as a hiring manager reads it

What's good, and what to point at in interviews: the uniform game interface,
the `gameTimer` wrapper that guarantees cleanup, the escaping discipline, and
having zero dependencies on purpose.

What hurts:
- **One 1,800-line file in ES5** (`var`, IIFE). Today that reads as dated. The
  "single file" story is clever, but it hides your structure.
- **No tests.** 2048 slide/merge, Tetris rotation and collision, Minesweeper
  flood fill, Sudoku conflicts and Hanoi rules are pure functions waiting to be
  tested.
- **Logic and rendering are mixed** inside each game closure, which makes
  those tests awkward to write.

Recommended structure, still with zero dependencies and no build:

```
index.html
src/shell.js            boot, log, parser, key routing
src/render.js           text grid -> DOM, colour classes
src/games/tetris.js     export const tetris = { … }   (logic exported separately)
src/games/…
test/*.test.js          node --test, no packages
.github/workflows/ci.yml   node --test on push
```

Trade-off: ES modules don't load over `file://`, so "double-click to open"
becomes `python3 -m http.server`. The live site is the main entry point
anyway, so this is worth it. If the single-file property matters to you,
keep it as a *release artifact* and drop the source form.

## 6. The plan, in order

Each phase is shippable on its own. Rough effort is for one person.

### Phase 0: stop the bleeding (half a day)
- [x] Bugs 1, 4, 5, 6, 7 (each is a one- to three-line fix)
- [x] `prefers-reduced-motion`: flicker, blink and lolcat cycling stop (launched toys still animate)
- [x] Meta description, OG image (`og.png`, 1200x630), `theme-color`
- [ ] Commit `favicon.svg`, `og.png` and `wrangler.jsonc` (`og.png` is already allowed in `.assetsignore`), then deploy
- [x] README rewrite (done in this pass)

### Phase 1: make it playable by anyone (2-3 days)
- [ ] Touch: swipe for Snake, 2048 and Tetris; tap cells for Sudoku, Minesweeper and Tic-Tac-Toe; on-screen buttons for rotate and drop
- [ ] Game-first layout: board scales to fit, log becomes a side or bottom strip
- [ ] Clickable menu, Up-arrow history, Tab completion, any key skips boot
- [ ] Fix bugs 2 and 3 with one rule: while a game is running, a line that matches a launch name or number goes to the shell, not the game

### Phase 2: own the look (2 days)
- [ ] Choose one direction (phosphor terminal, or full arcade cabinet) and write it down in a DESIGN.md
- [ ] One surface, one accent, glow on the board only
- [ ] Colour classes instead of inline styles. This also removes `style-src 'unsafe-inline'`
- [ ] Self-hosted font
- [ ] Attract mode on the menu
- [ ] Retake screenshots and record a 10-second GIF for the README

### Phase 3: show the engineering (2 days)
- [ ] Split into ES modules, separate logic from rendering
- [ ] `node --test` suite for the five rule engines; CI badge
- [ ] Move the script out of the page and drop `script-src 'unsafe-inline'`
- [ ] Add a Lighthouse score and a short "decisions" section to the README

### Phase 4: one signature feature (pick ONE)
- **Real pipes:** `cowsay hello | lolcat`, `man tetris`, `ls`, `cat about.txt`.
  It fits the theme, nobody else has it, and it shows you can write a parser.
  *Recommended.*
- **Unbeatable Tic-Tac-Toe** (minimax) plus a Minesweeper solver hint. These
  are short and show algorithms.
- **Daily seeded puzzle** (Sudoku generator plus shareable result string).

### Cut or skip
- Thirteen items is breadth. Depth reads better. If time is short, polish 4
  games well (Tetris, 2048, Minesweeper, Snake) and keep the toys as easter
  eggs reached by typing.
- Skip online leaderboards. They bring a backend, abuse and auth, so the
  security surface outweighs the portfolio value.
