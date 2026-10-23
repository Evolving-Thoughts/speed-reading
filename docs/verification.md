# Implementation verification

## Scope and baseline

First text-only version agreed in the project discussion: focus UI, red fixed anchor, 100–1,200 WPM, sentence-end factor 3, start/pause, normal text view with exact-word restart, desktop double-click, touch selection, always-visible end action, completion/restart, local-only in-memory data and pause on hidden tab. PDF/URL import and image handling are deferred.

The remote repository was empty. A README-only bootstrap was created on `main`, commit `c406a88726d2a28b7880c67c22e2857d71b6ea29`. All application changes are on `feat/focus-reader`. Local review included every intended new file and the README change against that bootstrap; no existing application or unrelated work was present.

## Executed locally

- `npm test`: 15 passed.
- `npm run build`: strict TypeScript check and production bundle passed.
- `npm run format:check`: passed.
- `CHROMIUM_PATH=$(command -v chromium) npm run test:e2e`: 21 passed, 1 intentionally skipped (desktop double-click case in the mobile project).
- `npm audit --audit-level=moderate`: no reported vulnerabilities at implementation time. This is a registry check, not a guarantee of security.
- Visually inspected desktop/mobile input, reader, text selection, completion and long-word screenshots, plus empty and expanded-explanation mobile states. Initial timing/status locator ambiguity was corrected by naming the playback status explicitly; final browser suite passes.

Initial missing text-preparation, anchor-selection and session-transition behavior was exercised through failing tests before its implementation. Additional browser/regression checks were added afterward; not every check was a separate red–green cycle.

## Same-agent review

Requirements/correctness: reviewed text processing, shared word indexes, pause/timer cleanup, exact restart, completion, input retention and desktop/touch event paths. Unicode normalization uses consistent offsets; graphemes remain intact. No unresolved blockers in the reviewed scope.

Security: user content is rendered as React text, not injected HTML; there is no app API, authentication, persistence or external content fetch. Browser checks cover literal markup rendering, no external content requests and reset on reload. No credentials are part of the changes.

Maintainability: logic/state, timing and presentation have separate focused modules. Strict TypeScript, formatting, unit tests and browser checks are configured. There were no pre-existing project conventions or baseline tests. This is a second pass by the implementing agent, not an independent audit.

## Limits

- Chromium desktop and touch emulation only; no real mobile device, Safari/WebKit or Firefox verification.
- Controlled browser clock verifies the intended duration behavior, not hardware-level timing precision. Hidden-tab event is simulated.
- Very long tokens can become small on narrow screens; use the normal text view when needed.
- Sentence detection is heuristic with a short abbreviation list.
- CI is configured but its GitHub execution result is not represented by these local checks.
- No public deployment or merge performed.

## PR review follow-up: input word count

Addressed review comment `discussion_r4357812333` against PR head `13ae8aabcab605690b61bfb6f1bbda7b1655a7f1`:

- The input count uses `countWords`, a lightweight pass over non-whitespace tokens without word objects, normalization, anchor calculation or grapheme segmentation. Standalone punctuation uses the same predicate as full tokenization so the count matches reading steps.
- `useMemo` caches the count by draft. An unchanged draft is not counted again when speed or another UI state changes. Editing still requires a linear count, but no longer performs full text preparation.
- Added literal expected-count cases for whitespace, standalone punctuation, Unicode/combining characters and a 10,000-word draft; added desktop/mobile coverage for editing, speed changes and agreement with the loaded session length.
- The full regression run exposed a pre-existing timing-test race: the installed browser clock still advanced between interactions. Timing tests now explicitly pause the virtual clock before playback and advance it only with `runFor`. Production playback behavior was not changed to satisfy the test.
- Final checks: 22 unit tests passed; 23 Chromium browser tests passed with the same 1 intentional mobile double-click skip; build/typecheck and formatting passed.
- Same-agent second-pass review of this follow-up found no unresolved correctness/security/regression blockers. This was not a measured input-latency benchmark; no particular speedup factor is claimed. Original browser/hardware limits above still apply.

## PR review follow-up: word-selection tab stops

Addressed the previously missed, non-blocking issue in review `pullrequestreview-5626463706`, based on head `e3bbb252868d24ddf9574e260fe3d45682828645`.

- Extracted a memoized `NormalText` component. Click, double-click and keyboard handling are delegated to the text container, with no per-word event-handler closures.
- Exactly one word has `tabIndex=0`; all other word buttons have `tabIndex=-1`. Clicking/tapping a word moves the active tab stop. Native button semantics and Enter/Space activation remain available.
- Left/right arrows move selection/focus, Home/End select the first/last word, and navigation stops at the boundaries. The focused word scrolls into view. Tab reaches “Ab hier lesen” directly; Shift+Tab returns to the selected word. Short screen-reader instructions describe this navigation.
- Reproduced both the unbounded tab order and missing keyboard navigation in failing browser tests before implementing the change. New desktop/mobile tests check a 2,000-word text, one tab stop after selection, arrows, boundaries, Home/End, forward/backward tabbing and paused restart. Existing click/touch/double-click and current-position scrolling cases remain covered.
- Final full suite: 22 unit tests passed, 27 browser tests passed, 1 intentionally skipped mobile double-click test; build/typecheck and formatting passed. The two keyboard navigation cases were additionally rerun and their focus screenshots inspected for desktop/mobile.
- Same-agent second-pass review covered event target containment, numeric selector construction, selected/current word separation and focus retention; no unresolved blocker in this scope.
- Deliberate limit: the full text still uses O(words) DOM nodes. This change bounds word tab stops and delegates event handling; it is not virtualization and makes no constant-memory or measured render-speed guarantee. Virtualization and real screen-reader/device testing remain future work.
