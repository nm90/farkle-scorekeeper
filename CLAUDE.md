# Six Bones — Farkle scorekeeper

A **single static file**: `index.html`. No build step, no dependencies, no network calls, no
external assets. Open it in a browser and it runs. Keep it that way — any new feature must ship
inside this one file (SVG inline, sounds synthesized, styles in the `<style>` block).

The app wears one of four **dressings** (themes), switched from the toolbar or with <kbd>T</kbd>.
A dressing is a whole world, not a palette — it changes colors, type, geometry, texture, motion,
the dice art, the sound of the cues, and every word of flavor copy:

| id | world | round | dice | banking | players |
| --- | --- | --- | --- | --- | --- |
| `saloon` (default) | candlelit back room; brass, oxblood, parchment | hand | bones | cashing in | gamblers |
| `neon` | arcade cabinet at 3am; mono, scanlines, glow | cycle | cubes | uploading | runners |
| `broadsheet` | morning paper; letterpress on newsprint, no glow | edition | dice | filing | correspondents |
| `bubblegum` | plastic toy in the sun; rounded, chunky, bouncing | round | cubes | scooping | players |

The High Stakes variant is renamed too: the gamble is *the leavings* / *greed protocol* / *the
scoop* / *leftovers*, and its pot is *the pot* / *the cache* / *the fund* / *the candy jar*. Each
lexicon carries a `dice(n)` helper for its own singular and plural.

New copy goes in the lexicon of **every** dressing, in that dressing's register — but never at the
cost of clarity about the actual score. Numbers stay numbers everywhere.

## Layout of `index.html`

| Lines (approx) | What |
| --- | --- |
| `<style>` ~9–470 | Base CSS. Ordered by region, with `/* ---------- name ---------- */` banners. |
| `<style>` ~473–865 | The three non-default dressings, one `/* ===== DRESSING n ===== */` block each. |
| `<header class="masthead">` | Title, tagline, and `#potLine` (target score, rewritten at render). |
| `<nav class="toolbar">` | `#dressing` swatches + Rules / Undo / Sound / High Stakes / New Game. `#undoBtn`, `#stakesToggle` and `#newBtn` are hidden until a game exists. |
| `<section id="setup">` | Roster builder + pot/buy-in selects. Visible when `state === null`. |
| `<section id="game">` | `#crownSlot` (winner banner) + `.board` — a 2-col grid: turn panel left, ledger + log right. Collapses to 1 col under 880px. |
| `<dialog id="rulesDlg">` | Scoring table and key bindings. Update this whenever scoring changes. |
| `<script>` ~1007–1970 | The whole app, one IIFE, banner-separated sections (see below). |

CSS conventions: **everything a dressing can change is a token on `:root`** — colors, radii
(`--r-sm`/`--r-md`), fonts (`--serif`/`--display`), the body backdrop (`--body-bg`), the texture
overlay (`--grain*`), the room light (`--glow*`), and the dice colors (`--die-*`, `--pip`). Never
hardcode a hex in a new rule; add a token and give every dressing a value for it. Tints are mixed
from rgb triplets (`rgba(var(--brass-rgb),.16)`) so they re-color with the theme — a literal
`rgba(212,165,58,…)` would stay gold in the neon dressing. Panels get their double-rule border from
`.panel::before`, so a new panel just needs `class="panel"`.

A dressing block re-points tokens first, then adds only the rules that carry its vibe (scanlines,
letterpress shadows, bouncy easing). Keep that split: if a change can be a token, make it one.

## Script sections

Each is introduced by a `/* ===== name ===== */` banner.

- **dice art** — `PIPS` (pip coordinates per face), `PIP_ART` (one pip-drawing function per
  dressing: `round`/`block`/`ink`/`candy`), and `dieSVG(face, cls)`, which returns an inline SVG
  string. Every die on the page comes from this one function. Colors come from CSS classes
  (`.die-face`, `.die-inner`, `.pip`, `.pip-hi`, and the gradient's `.die-stop-a/b`) — only *shape*
  lives in the JS. Gradient ids are uniquified with `dieUid`; don't reintroduce shared ids.
- **scoring** — `setValue(face, k)` and `scoreCounts(counts)`. This is the only place rules live.
- **sound** — lazy `AudioContext`, `tone()`/`sweep()` primitives, and the `SFX` map
  (`pick, drop, keep, hot, bank, bust, win`). Respects the `muted` flag. Add new cues to `SFX`.
  Every cue is filtered through `voice()`, the current dressing's `{wave, tune, gain, dur}` — so a
  cue written once rings soft in the saloon, buzzes in neon, clacks dry in broadsheet and chimes in
  bubblegum. Pass a `type` to `tone()` as the saloon default; a dressing's `wave` overrides it.
- **state** — `freshState()`, `save()`/`load()` (localStorage key `sixbones.v1`, all access wrapped
  in try/catch because file:// and sandboxed frames can throw), `snapshot()`/`undo()`.
- **helpers** — `$`, `num` (thousands separators), `esc` (**always** escape player names — they go
  into `innerHTML`), `padTotal`, `stamp`, `quake`, `addLog`.
- **dressings** — the `DRESSINGS` array (id, name, `pips`, `rx`, `voice`, `lex`), `dressing(id)`,
  `applyTheme(id, quiet)`, `applyLexicon()`, and the swatch/`T` handlers. See "Dressings" below.
- **setup screen** — roster add/remove, `#startBtn` builds the state.
- **game rendering** — `renderAll()` fans out to `renderTurn / renderPad / renderReading /
  renderLedger / renderLog / renderCrown`.
- **turn actions** — pad clicks, `commitPad()`, and the Keep / Cash In / Farkle handlers,
  plus `nextPlayer()` and `finish()`.
- **toolbar**, **keyboard**, **boot**.

## State

```js
state = {
  players: [{ id, name, score, onBoard }],
  cur,        // index of the player whose turn it is
  round,      // "hand" number, increments when play wraps to seat 0
  turn,       // points set aside this turn, not yet banked
  diceLeft,   // live dice, 1..6; resets to 6 on hot dice
  target,     // pot, e.g. 10000
  threshold,  // buy-in required for a player's first bank
  highStakes, // is this table playing the High Stakes variant?
  carry,      // dice the last gambler left on the table, 0 if none
  pot,        // progressive pot: fed by cash-ins, killed by a farkle or a passed gamble
  stakes,     // false | "armed" | "won" — the gamble, this turn only
  won,        // pot collected this turn, so it can't feed the pot again
  hot,        // the last commit cleared the table (so nothing is left behind)
  threw,      // this gambler has actually rolled something the app saw
  finalIdx,   // seat that crossed the pot; null until then
  over, winner,
  log: [{ r, k, t }]   // newest first; k is "bank" | "bust" | "note", t is HTML
}
```

Three things live **outside** `state`:

- `pad` — `[_,n1,n2,n3,n4,n5,n6]`, the dice being set aside from the current roll. Not part of a
  turn's committed score until `commitPad()` runs.
- `roster` — setup-screen names, kept after a game ends so a rematch starts pre-filled.
- `theme` — the active dressing id, and `L`, the merged lexicon for it. Deliberately outside
  `state` and outside the undo stack: changing costume is not a game move, and Undo must not
  put the old one back.

The localStorage blob is `{s: state, r: roster, m: muted, t: theme}`.

`undoStack` holds `JSON.stringify({s: state, p: pad})` snapshots, capped at 60. **Call
`snapshot()` before any mutation** so Undo stays honest. If a handler snapshots and then bails out
without changing anything, it must `undoStack.pop()` — see the buy-in rejection path in the Cash In
handler.

Persistence and rendering are manual: every mutating handler ends with `renderAll(); save();`.
There is no reactive layer, and adding one would be a bigger change than most features need.

## Dressings

`DRESSINGS` is an array of four worlds:

```js
{ id, name,
  pips,   // key into PIP_ART — how this world cuts a pip
  rx,     // die corner radius; the inner rule uses rx - 4
  voice,  // { wave, tune, gain, dur } — applied to every SFX cue
  lex }   // every user-visible string, see below
```

`applyTheme(id, quiet)` sets `data-theme` on `<html>` (all CSS hangs off that), rebuilds `L`,
redraws the masthead dice, runs `applyLexicon()`, then `renderAll()`. Pass `quiet` at boot to skip
the veil wipe and the cue. It does **not** save — callers do, matching the rest of the app.

The lexicon: saloon's `lex` is the base, and `mergeLex()` shallow-merges another dressing over it,
so a new key only has to be added to saloon to have a working (if saloon-flavored) fallback
everywhere. **Add it to all four anyway** — a saloon phrase leaking into the newspaper is the whole
bug class this design exists to prevent.

Two ways a string reaches the page:

- **Static markup** carries `data-lex="key"`; `applyLexicon()` walks `[data-lex]` and sets
  `innerHTML` (so entities and `<b>` work — the values are ours, never user input).
- **Rendered markup** reads `L.key` at render time. Interpolated ones are functions:
  `L.logBank(name, amt, total)`, `L.hand(n)`, `L.needsOpen(n)`. Escape names with `esc()` *before*
  handing them to a lexicon function — the functions build HTML.

Log entries store the text they were written with, so a game switched mid-play keeps its old lines
in the old voice. That is intentional: the log is a record, not a view.

## Scoring (`scoreCounts`)

Takes a length-7 count array, returns `{score, parts, dead, total}` where `parts` is
`[{label, pts}]` for the reading panel and `dead` lists face values that score nothing (the UI
refuses to set those aside).

It computes a per-face greedy best — for each face, the best of "no set" / 3 / 4 / 5 / 6 of a kind
plus leftover 1s and 5s as singles — then, only when all six dice are selected, checks the
whole-hand specials (straight, two triplets, three pairs, four+pair) and takes the special **only
if it beats** the greedy result. That ordering matters: three 1s + three 5s must score 2500 as two
triplets, not 1500.

House rules as implemented: 1 = 100, 5 = 50, three 1s = 1000, three of a kind = face × 100,
four = 1000, five = 2000, six = 3000, three pairs = 1500, four+pair = 1500, two triplets = 2500,
straight = 1500. If you change any of these, change `setValue`/`scoreCounts`, the `<dialog>` rules
table, and the tests together.

The High Stakes payout is **not** part of `scoreCounts` — it is a pot, not a dice combination, so it
never touches the reading panel's arithmetic. There is deliberately no bonus constant: the payout is
whatever the table has put in since the last farkle. See "High Stakes".

## High Stakes (optional variant)

Turned on per game from the setup panel (`#stakesSel` → `state.highStakes`); off by default, and a
game saved before the option existed simply reads as off. It can also be picked up or put down
**mid-game** — see "The mid-game toggle" below.

The rule: you may open your turn with the dice the last player left on the table instead of a fresh
six. Score with **any** of them on that first roll and you collect `state.pot` — a progressive pot,
not a fixed bonus.

**The pot economy.** `state.pot` is the running total of dice points banked since the pot last died.
Every cash-in feeds it, and **two things kill it, both for the whole table**:

1. **A farkle** (`bustBtn` → `logPotDead`).
2. **A passed gamble** (`passStakes()` → `logPotPassed`) — a player who is offered the leavings and
   scores off a fresh six instead. Refusing the gamble costs everyone the pot.

So the pot is fragile by design: it only survives a turn where the previous player left dice *and*
this player took them. It is worth most when the table is running hot, and worth nothing right after
a farkle — which is also the most common way dice end up on the table. That tension is the point of
the variant, not an oversight.

- **Winning does not spend the pot.** `payStakes()` copies the pot into `state.turn` and leaves
  `state.pot` standing, so the next gambler can win the same money again and the pot keeps growing
  until someone farkles. This is the single easiest thing to get wrong — do not add `state.pot = 0`
  to `payStakes()`.
- **A won pot never feeds itself back in.** `state.won` records what the gamble paid this turn and
  is subtracted from the cash-in (`state.pot += amt - state.won`), so only dice points grow the pot.
  Without that, banking a won pot would count the same money twice.
- **Worked example** (the one this behaviour was specified against): A banks 1,100 and leaves one
  bone, so the pot is 1,100. B takes the gamble, rolls a 1, and holds 100 + 1,100 = 1,200 — with the
  pot still reading 1,100. Hot dice bring six back; B sets aside another 1 and cashes 1,300, leaving
  five bones. The pot is now 1,100 + B's 200 of dice points = **1,300**.
- **An empty pot still resolves the gamble.** `payStakes()` returns 0, marks `stakes` as `"won"`, and
  logs and stamps nothing — the banner says the pot was empty. Don't add a floor or a seed; paying
  nothing after a farkle is the chosen design.
- **A short buy-in is not a farkle** and does not kill the pot. Nothing was banked, so it simply
  doesn't grow. (Careful when testing this: if that player was *offered* leavings, their first commit
  passes on the gamble and kills the pot before the buy-in is ever checked. Isolate the case with a
  previous turn that ended on hot dice, so nothing was on offer.)
- **A pass only counts when there was something to pass on.** `passStakes()` is called from
  `commitPad` and the manual-add path only when `state.carry > 0`. A bare table (hot dice) leaves the
  player no decision, so their fresh six is not a refusal and the pot survives.
- **The decline is implicit and irreversible at commit.** Setting dice into the pad doesn't pass —
  clearing the pad reopens the offer — but the first commit does, so the offer banner carries a
  `L.stakesOrElse` warning in `.warn` red whenever there is a pot to lose.
- **Winnings are at risk** like the rest of the turn: they go into `state.turn`, so a later farkle
  takes them back — and kills the pot they came from as well.

- **What gets left.** `leftBehind()` answers it at each turn-ending path: `state.diceLeft`, except
  0 when `state.hot` (all six were set aside — the table is bare and the next player starts fresh)
  or when `!state.threw`. A farkle sets `carry = state.diceLeft` directly: those dice were rolled
  and scored nothing, so they are all still sitting there. A farkle on six is therefore a free shot
  at the bonus for the next player — that is the rule as written, not a bug.
- **The offer.** `offerOpen()` gates it: rule on, `carry > 0`, no gamble taken yet, and the turn
  untouched (`turn === 0 && padTotal() === 0`). It is never modal — ignoring it and setting a die
  aside starts an ordinary fresh-six turn, and `commitPad` zeroes `carry` so it cannot come back.
- **Taking it** (`takeStakes()`, the banner button or <kbd>G</kbd>) sets `diceLeft = carry` and arms
  `stakes`. `commitPad` pays out through `payStakes()` on the first successful commit.
- **`renderStakes()`** paints four states into `#stakesSlot` — offer / armed / won / idle — each
  carrying the live pot readout, because a progressive pot you can't watch grow isn't worth gambling
  on. The box always shows `state.pot`, never the amount won: after a collection the label switches
  to `potStandsLab` ("Still standing") so it's obvious the money is still on the table. A pot of 0
  adds the `empty` class, which greys the whole banner so a dead offer reads as a dead offer. `renderRules()` reveals the `#stakesRow` scoring row and appends `L.stakesNote` to the
  dialog — only while a game is actually playing the variant.
- **Per-dressing pot names**: the pot / the cache / the fund / the candy jar (`potLab`,
  `potStandsLab`, `potIdle`, `stakesOrElse`, `logPotDead`, `logPotPassed`, and friends). The idle line doubles as the rule's inline explanation, so
  keep it accurate in all four when the economy changes.

### The mid-game toggle

`#stakesToggle` in the toolbar (or <kbd>H</kbd>) flips `state.highStakes` through `toggleStakes()`,
so a table can take the variant up or drop it without abandoning the game. It is a house rule, not a
game move: it applies from that moment forward and nothing already scored is revisited. It *is*
snapshotted, so Undo puts the rule back — unlike the dressing, which deliberately isn't.

- **Both edges reset the pot to 0.** `state.pot` is fed by `bankBtn` unconditionally, so it has been
  quietly accruing even in a game that never played the variant — but no farkle ever killed it there,
  so that figure was never a pot anyone played for. Enabling starts from nothing rather than handing
  the next player a windfall; disabling clears it because the money has nowhere to go. `logStakesOn` /
  `logStakesOff(amt)` record both, and `logStakesOff` drops its money clause when the pot was empty.
- **An offer can open the instant you enable it.** `state.carry` is maintained by every turn-ending
  path whether or not the variant is on, so the dice really are on the table and `offerOpen()` is
  telling the truth. The pot is 0 at that moment, so the first player offered risks nothing by
  passing — which is why enabling can't spring a trap.
- **Locked while a gamble is armed.** `renderStakesToggle()` disables the button (with `stakesLocked`
  as its `title`) and `toggleStakes()` bails on `state.stakes === "armed"`. Those dice were rolled
  short on the promise of a pot; the app keeps promises it has already made. Every other state is
  fair game, including a resolved `"won"` turn — that money is already folded into `state.turn`.
- **Per-dressing copy**: `stakesToggle(on)` (the latch label, built like `sound(on)`), `stakesLocked`,
  `logStakesOn`, `logStakesOff(amt)` — plus <kbd>H</kbd> in every `keysNote`.
- The latch is lit via `.btn.ghost[aria-pressed="true"]`, a token-only rule, so it re-colors per
  dressing with no per-dressing CSS.

## Turn flow

Set aside scoring dice → **Keep & Reroll** (`commitPad`) adds to `state.turn` and subtracts from
`diceLeft`; when `diceLeft` hits 0 it resets to 6 and fires the hot-dice cue. **Cash In** folds in
any valid pending pad selection first, then checks the buy-in: a player not yet `onBoard` banking
less than `threshold` loses the turn instead. Crossing `target` sets `finalIdx`, and `nextPlayer()`
ends the game when play returns to that seat — highest score wins, not necessarily the trigger.
**Farkle** wipes `turn` and the pad. Every turn-ending path also records what it leaves on the
table for the next player (`state.carry`) — see "High Stakes" — and `nextPlayer()` clears the
per-turn flags `stakes`/`hot`/`threw`.

## Gotchas

- **Log kind classes are prefixed `k-`** (`k-bank`, `k-bust`, `k-note`). The unprefixed `.note`
  class already belongs to the rules dialog's body text; using it in the log silently restyled
  those rows. Prefix any new kind too.
- `renderPad()` calls `scoreCounts(pad)` once and reuses it for all six faces — don't move that
  call back inside the loop.
- The three handlers that edit the pad (add, minus, clear) render through `renderPadArea()`, not
  `renderPad()` alone. The stakes banner depends on `padTotal()` — an offer closes as soon as dice
  are set aside and reopens when the pad is cleared — so skipping it leaves a live "Take the Gamble"
  button on screen that `offerOpen()` will refuse.
- Keyboard handlers bail out when focus is in an input or the dialog is open. New shortcuts go in
  the same `switch`, and must be added to `keysNote` in **all four** lexicons — the key list in the
  rules dialog is per-dressing copy, not static markup.
- `T` (cycle dressing) is handled *before* the `!state || state.over` bail-out, so you can change
  costume from the setup screen and after the game ends.
- Log entry text (`e.t`) is inserted as HTML so it can carry `<b>` — escape any interpolated
  name with `esc()`.
- Anything that regenerates dice must run through `dieSVG` again when the dressing changes;
  `applyTheme` redraws the masthead explicitly because nothing else owns it.
- The "Add by hand" path deliberately does **not** set `state.threw`. A hand-entered score says
  nothing about how many dice are still on the table, so a turn scored only that way leaves nothing
  behind rather than a guess. It does pay an armed High Stakes bonus — it is still a score.

## Testing

There is no test runner in the repo; tests are a throwaway harness spliced into a copy of the page
and run under headless Chrome. The recipe (used to validate the current build: 38 assertions
covering all four dressings, a full turn cycle and a mid-game costume change, plus 31 more for the
High Stakes variant — the offer, hot dice leaving a bare table, undo, singular/plural — and 43 more
for the progressive pot: accrual across players, collection, the won pot not refilling itself, a
farkle killing it, an empty pot paying nothing, the short-buy-in exemption, and per-dressing naming;
plus a 19-assertion walkthrough of the worked example above, including the same pot being won twice;
plus 28 for passing on the gamble — the pot dying on the first commit, surviving an uncommitted pad,
surviving a bare table, undo, and the per-dressing warning; plus 67 for the mid-game toggle — the
silent accrual not becoming the pot, both log lines, undo, the offer opening on real leavings, the
latch refusing clicks and <kbd>H</kbd> mid-gamble, <kbd>H</kbd> ignored in a field, hidden on the
setup screen and after the game ends, and all four voices):

```bash
python3 -m http.server 8731 &                      # serve the project
# harness.html = a <pre id="TESTOUT"> plus a script that dispatches real click events
node -e 'const f=require("fs");f.writeFileSync("/tmp/test.html",
  f.readFileSync("index.html","utf8").replace("</body>", f.readFileSync("harness.html","utf8")+"</body>"))'
google-chrome --headless --disable-gpu --virtual-time-budget=4000 --dump-dom http://127.0.0.1:8731/test.html
# then read the #TESTOUT block out of the dumped DOM
```

`scoreCounts` can also be tested on its own — slice the text between `var SINGLE` and the `sound`
banner out of `index.html` and `eval` it in Node.

A harness can drive the picker directly:
`document.querySelector('[data-set="neon"]').dispatchEvent(new MouseEvent("click",{bubbles:true}))`.
Remove any lingering `.veil`/`.stamp` overlays before screenshotting.

Screenshots for visual checks — take one per dressing; a change that only looks right in the saloon
is not done:
`google-chrome --headless --disable-gpu --hide-scrollbars --window-size=1280,1180 --screenshot=out.png <url>`
(check 420px wide too — the board collapses at 880 and the dice pad goes 3-across at 520).

Note: `file://` URLs are blocked by the Chrome extension tooling, so always serve over
`http://127.0.0.1` when driving the page.
