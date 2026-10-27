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

## Reading controls follow-up

Approved scope: native fullscreen, a four-step base font size, numeric WPM input alongside the slider, and a configurable sentence-end factor. Based on merged `main` at `9e8c1fbfe85b4f88b633bcaa62836f1d1b40b6c3`; changes are isolated to `feat/reading-controls`. No persistence, imports, accounts, deployment or unrelated refactoring was added.

- Fullscreen uses the native document API. State follows `fullscreenchange`, including browser-side exits. The whole document enters fullscreen so both “Text beenden” and an exit button remain available across views. Unsupported browsers see a disabled button and a visible explanation; rejected requests are caught and do not prevent normal reading.
- WPM can be entered exactly (100–1,200, integer steps). Enter or blur commits/clamps the number; blank/non-finite input restores the previous value. Enter does not submit the text form. Slider and number stay synchronized.
- Font size options are 80%, 100% (default), 125%, 150% of the responsive base size. The setting applies to the reading word and normal text; long-word fitting and the fixed 38% anchor remain in place. Very long words can still shrink below the chosen base size.
- Sentence-end duration is selectable as total 1×/2×/3×/4× word duration (default 3×). A tempo or factor change restarts the current word's full timer; font changes do not reset it. Settings survive text replacement/restart within the current tab, not reload.
- Visual QA found that the taller input form could leave mobile readers scrolled into the reading area after loading. A failing mobile browser test reproduced this; non-text view transitions now reset window scrolling to the top. Normal text still scrolls to the current word.

### Executed checks

- Four new state/duration tests were first observed failing, then passed after implementation; final unit suite: **26 passed**.
- Full Chromium suite with a frozen virtual clock for duration assertions: **51 passed, 1 intentionally skipped** (the existing desktop double-click test in mobile emulation).
- New browser checks include number/range synchronization and bounds, font size in both views, settings retention/reset, factors 1/2/4 plus existing default-3 timing, live factor/tempo changes, font-change timer continuity, long-word fit, view-transition scrolling, actual native fullscreen entry/exit, browser-side exit via `exitFullscreen`, and simulated unsupported/rejected API paths.
- TypeScript/production build and formatting passed. Existing tests for touch/keyboard selection, roving tab order, pause/finish/restart, literal text rendering, hidden-tab pause and local-only content remain included.
- Individually inspected desktop/mobile input, default/large reader, enlarged normal text, fullscreen, unsupported/error states and long words, plus a 320px-width header/control check. Exported reader states were additionally rendered with the artifact capture helper; its only clipping diagnostic was the intentionally hidden screen-reader heading. No horizontal page overflow was found in the checked mobile widths.
- Same-agent final review covered all changed/new source and tests against the merged-main baseline: numeric validation/implicit form submission, timer cleanup/dependencies, retained state, fullscreen error/event handling, anchor fitting, sticky exit actions and literal user-text rendering. No unresolved blocker in this scope; this is not an independent audit.

Limits: actual native fullscreen was exercised in headless Chromium (desktop and touch emulation), not real mobile devices or Safari/Firefox. Browser-side exit was tested through the native API, not a native Escape-key dialog. Fullscreen availability on iPhone/iPad and embedded contexts depends on browser policy; the unsupported path is intentional. CI results are separate from these local checks. No merge or public deployment was performed.

## Article-link import and inline images

Approved extension: a small local Node import service plus article preview and images in both reader views. Based on merged `main` at `ca3974fe140c4afe90c9f6b8759a8fda6b8db814`; branch `feat/article-import`. No merge or public deployment performed.

- `npm run dev` starts the loopback-only API and Vite together; `npm run build` then `npm start` serves the built app and API locally. Static-file-only hosting no longer provides the import service.
- Readability/jsdom extract an ordered text/image model without executing page scripts. Relative and common lazy/responsive image URLs are resolved. Preview acceptance is explicit; failed/cancelled imports preserve the draft. Manual editing returns to plain text. Images pause playback until “Weiterlesen”, including consecutive/final images and failed image loads. The normal view retains images and exact word/image re-entry.
- Outbound requests allow only public HTTP(S) destinations on standard ports. All DNS answers and every redirect are checked; a validated IP is pinned to the connection. Private/link-local/loopback addresses are rejected. TLS verification remains enabled; browser cookies/authentication/referrer are not forwarded. Image requests require expiring HMAC tokens and use the same destination checks. MIME/byte/decompression/time/concurrency/rate limits bound requests. Built-app responses use a same-origin CSP. This is a local tool, not a hardened public multi-user service.

### Executed checks

- Baseline: 26 unit tests passed before this extension. Parser/model/state cases were observed failing before implementation. Final suite: **42 unit/backend tests passed** across six files. The additional concurrency guard coverage already passed before the final defensive post-body slot-acquisition check; it is not claimed as a reproduced race.
- Backend tests exercise real local HTTP endpoints with a substituted outbound-fetch seam, signed image retrieval, blocked destinations, request limits, cancellation and safe errors. Separate mocked DNS/transport tests cover mixed DNS answers, validated-IP pinning, redirects to private destinations, MIME rejection and decompression limits. Synthetic HTML/image fixtures are not evidence of successful extraction from arbitrary live websites.
- Full Chromium desktop/mobile-emulation suite: **63 passed, 1 intentional mobile double-click skip**. Includes preview/acceptance, ordered image pauses, continued playback, normal-view re-entry, broken images, cancellation/error preservation, editing/reset and a real Vite-proxy-to-backend rejection of an internal URL.
- TypeScript/production build, formatting and `git diff --check` passed. `npm audit --audit-level=moderate` reported zero vulnerabilities at this check. Production startup was separately checked for HTML 200, private-target API rejection and the CSP header.
- Individually inspected desktop/mobile input, preview, normal text, image pause and blocked-import states, plus mobile broken-image fallback. Exported desktop image/mobile preview states were additionally rendered using the artifact capture helper; no horizontal overflow was found. A preview image-count spacing issue found visually was corrected and rerendered/rechecked.
- Same-agent final review covered changed/new source and tests: request validation/SSRF/redirects, connection pinning, parser isolation, literal React rendering, expiring image tokens, import cancellation/races, image timer transitions, retained settings, delegated keyboard selection and dev-server lifecycle. Added a second concurrency-slot check immediately after asynchronous body parsing. No unresolved blocker found in this scope; not an independent security audit.

### Live-source result and limits

The user-supplied Medium article was attempted both normally and with its supplied friend/share link. Automated access was refused (HTTP 403), including through the new backend. Extraction of that specific article and its images is **not verified**. The private access query is not stored in repository files. No paywall or access-control bypass was added; manual text remains available.

Recognition/order are heuristic and must be checked in preview. Script-rendered content, canvas/background images, video, PDFs, login-required pages and unsupported image types are outside this extension. Images expire after one hour or a service restart and may fail because of upstream restrictions; a visible fallback permits continued reading. Real smartphone hardware, Safari/Firefox and screen-reader use were not tested. Local test results do not establish GitHub CI status.

## PR #3 follow-up: approved German example and review comments

Scope/base: follow-up against PR head `c16734436b5dde37e8c34ece8e537da323a911da`, on `feat/article-import`. The repository's HTTPS clone required unavailable credentials, so the local execution snapshot was reconstructed from the previously available source plus the current GitHub PR diff. Every resulting changed-file Git blob hash was checked against the diff's target hash before edits. The unit baseline passed all 42 tests. Unrelated older workspaces were not changed.

- Replaced the short synthetic demo with the user-approved German text “Dein Text. Dein Rhythmus.” in `src/example.ts`, preserving its wording and paragraph structure without inline citation/Markdown artifacts. The example remains opt-in via “Beispieltext laden”; initial/reloaded input remains empty, and returning from the reader preserves the loaded draft. No locale switch or automatic translation was introduced.
- Reused the existing React/form/settings flow and native `details` element. Five research-source links are available separately under “Quellen zum Beispieltext”, not tokenized into the reading stream. The sources explain the basis, not a translation of the video. New links have at least 44px-high targets. No new dependency, network fetch, persistence or architecture change was needed.
- Correctness finding (medium), `discussion_r4377765911`: a completed article ending in an image still showed an impossible “Weiterlesen” hint. `App` now passes completion state to `ArticleImage`; only an unfinished reading image shows the continuation hint. The last image/caption, completed status and restart action remain visible. Playback/state transitions are unchanged.
- Accessibility finding (low), `discussion_r4377765996`: the decorative external-link arrow polluted the accessible name. Wrapped it in `aria-hidden="true"`; the link's accessible name is now exactly “Quelle öffnen”.
- Test-first: observed all three targeted desktop tests fail for the intended missing example, stale final-image hint and exposed arrow before production changes. An earlier run with an incorrect Chromium path failed at environment startup and is not counted as a behavioral reproduction. Updated the existing visual-reference test to select the unique “Serial” token in the new example; quoted punctuation remains intentionally attached to words.
- Final checks: `npm test` **42 passed**; `npm run build` (including TypeScript) passed; full Chromium desktop/mobile-emulation suite **67 passed, 1 intentional existing skip**. Formatting and whitespace-diff checks passed. Desktop/mobile expanded source lists and final-image completion were individually inspected; no horizontal overflow in the checked views. Image QA uses the existing synthetic chart fixture, not a live article.
- Same-agent second-pass review covered the full follow-up against the captured PR baseline, including the intended new example module, source URLs, callers/default props, completed/error image paths, literal rendering, existing input/reset behavior and tests. No further correctness/security or project-convention blocker found in this bounded follow-up. This is not an independent audit or real screen-reader test.
- The overall PR review's recommendation for final human security review of the new network-facing import service remains applicable; these UI/content fixes do not satisfy or replace it. Existing Medium/real-device/Safari/Firefox limits still apply. No merge or public deployment performed; local test outcomes do not establish CI status.

## PR #3 follow-up: compact reading layout

Scope/base: current `feat/article-import` source at `46c445e8d1d8abdda8e63ede3adab4e685c5448f`. User requested less scrolling, including smartphones. Only reader-scoped presentation, a shorter sentence-duration hint, documentation and layout tests changed; no playback, import-service, dependency or persistence changes.

- Reader header, margins, metadata and controls use less vertical space. The word viewport responds to viewport height. Desktop settings share a row; mobile speed slider and numeric input share space above the two preference selectors. Buttons, selects, numeric input and slider retain at least 44px height. Input and full-text layouts retain their existing styling (apart from the shared shorter hint).
- Image pauses also use a height-aware image limit, without cropping or changing aspect ratio. Caption, continuation hint and controls remain in normal flow. No overflow hiding or fixed-height clipping was introduced; small windows, zoom and long captions may scroll, with the sticky exit action retained.
- Test-first: four viewport-fit assertions reproduced vertical overflow before the CSS changes; the short-landscape fallback passed already. An earlier incorrect exact-label selector timed out and is not counted as behavioral reproduction. Added image-pause checks with a synthetic 200×600 PNG. Increasing mobile image size initially caused an 11px overflow at 375×667; the final limit was adjusted and visually rechecked.
- Final checks: **42 unit/backend tests passed**, TypeScript/production build passed; full Chromium desktop/mobile-emulation suite **81 passed, 1 intentional existing mobile double-click skip**. Formatting and whitespace checks passed. Four viewport-fit cases (1440×900, 1366×768, 390×844, 375×667) exercise the largest font setting, visible actions/preferences/session information, 44px control heights, vertical word fit and no horizontal overflow. Two image-pause cases (1366×768 and 375×667) verify captions and controls fit. A 667×375 case verifies scrolling can still reach controls with the exit action visible.
- Individually inspected word-reader captures at the four viewport sizes above and 320×568, plus desktop/mobile portrait-image pauses. At 320×568 the word reader needs about 3px of vertical scrolling; no claim of universal no-scroll behavior. Final image-pause document heights matched the 768px/667px viewports. These are synthetic fixtures, not live-source extraction tests.
- Same-agent second-pass review compared the changed files against the captured baseline: reader-only class scope, existing responsive rules, native control sizes, anchor/word fit, normal-flow fallback, image aspect ratio and untouched playback logic. No unresolved blocker found in this bounded layout change; not an independent audit. Real mobile browser chrome, device hardware, Safari/Firefox, actual browser zoom and screen readers were not tested. Existing import-service security-review and Medium limitations remain. No merge or deployment performed; local checks do not establish CI status.

## PR #3 follow-up: rebalance word area and control spacing

Base: `0db8d6d8b9f39a6c711b483b15f96d59e8310b7a` on `feat/article-import`. User screenshot feedback: the word area remained disproportionately tall while controls felt cramped.

- Word viewport height now follows the selected font scale and the existing maximum font/line-height (88px desktop or 56px mobile, ×1.3 line-height), plus 64px desktop/40px mobile guide space. At maximum scale it is about 236px/149px high rather than up to 400px/260px. Actual word font sizing and long-word fitting are unchanged; the field does not jump between short and long words at the same scale.
- Added reader-state presentation classes to scope more generous action/settings spacing to word reading. Desktop gaps above settings and session information are 24px/16px; mobile 16px/12px. Preference labels and controls also have more separation. Image-pause sizing and spacing remain unchanged, as do the input/full-text views, playback, backend and dependencies.
- Test-first: four new viewport cases failed on excessive word-area height before production changes. They now check all four font scales, the expected unshrunk size for a short word, bounded whitespace around its line box, minimum field room, larger settings/session gaps and no page scrolling. Existing tests retain large-font word fit, 44px controls, image pauses and small-landscape reachability.
- Final local checks: **42 unit/backend tests passed; 89 Chromium browser tests passed, 1 intentional existing mobile double-click skip**. TypeScript/production build, formatting and whitespace-diff checks passed. These local results do not establish CI status.
- Individually inspected largest-font word-reader captures at 1440×900, 1366×768, 390×844, 375×667 and 320×568. The first four fit the viewport without scrolling or horizontal overflow. At 320×568 the extra spacing deliberately allows about 58px of vertical scrolling rather than compressing or clipping controls. Synthetic portrait-image pause measurements remained 768px/667px document height at 1366×768/375×667; image behavior was not redesigned.
- Same-agent final diff review: reader-only scope, CSS specificity/responsive overrides, constant alignment with ReaderWord, control sizes and normal-flow scrolling, unchanged font fitting/timers. No unresolved blocker in this layout-only follow-up; not an independent audit. Real device browser chrome, Safari/Firefox, screen readers and actual browser zoom remain untested. No merge or deployment performed.

## PR #3 follow-up: queue concurrent image fetches

Base: `6345dde3ef1bc02de3e814d53e129380ef541202`. Addresses review `discussion_r4378772299`: more than four simultaneous image requests received 429 and the client permanently rendered its broken-image fallback.

- Introduced a small shared fetch-slot helper: at most four active outbound fetches across article and image endpoints, unchanged from the original budget. Article work still fails fast when all slots are occupied; valid signed image requests join a FIFO queue instead. The global pre-routing busy check was removed so images can reach token validation and queueing; article slot acquisition remains immediately after asynchronous bounded body parsing and URL validation. Host/origin checks, article rate/body limits, signed tokens, DNS/IP/redirect validation and outbound byte/MIME/time limits remain unchanged.
- The queue is bounded to 50 waiting image requests and 60 seconds waiting time per request. Overflow still returns 429; waiting expiry returns 503. Queue cancellation removes the entry and its timer/listener. Slot release is idempotent and hands availability directly to the next waiter, preventing article requests from stealing queued slots. A disconnected request is checked again after acquiring a slot before starting its fetch; every active fetch releases its slot in `finally`, including failures. No client retries, new dependencies or UI changes.
- Test-first: the initial nine-request backend regression reproduced the reported 429 failures before implementation. The final version uses nine distinct signed image URLs and real HTTP requests against the app with a controlled outbound-fetch seam: all nine return 200, peak outbound concurrency stays four, and competing article work receives 429. Additional backend tests prove failed image fetches release slots and disconnected queued images are not fetched while later requests complete. Helper tests cover FIFO/slot reservation, queue capacity, already-aborted/pending cancellation, wait timeout, timer/listener cleanup and double-release safety. Only the initial burst test is claimed as a pre-implementation reproduction.
- Final local checks: **50 unit/backend tests passed** across seven files; **89 Chromium browser tests passed, 1 intentional existing mobile double-click skip**; TypeScript/production build, formatting and whitespace-diff checks passed. Browser tests exercise existing image/reader behavior; the concurrency regression itself uses real local HTTP plus synthetic HTML/image responses, not a live website.
- Same-agent final review compared all changes against the saved baseline: shared budget, authentication before queue admission, bounded queue lifetime/capacity, aborted/disconnected waiters, failure cleanup, FIFO handoff and unchanged network validation. No unresolved blocker in this bounded correction; not an independent security audit. Very slow/unreachable image sources, expired tokens, queue overflow or timeout can still show the existing image-error fallback. Prior Medium, real-device and public-deployment limitations remain. No merge or deployment performed; local checks do not establish GitHub CI status.

## PR #3 follow-up: vertically center the reader group

Base: `17fcdf2a0bb858a3a2d51524b2169474bd6c941c`. User approved the smaller word field but found the entire reading UI too top-heavy.

- Reader-only `main` uses a column flex layout; the existing reading section shares positive free space using automatic block margins. The complete word/image area, status/progress and controls are centered as one group between the sticky header and footer. Word-field dimensions, font sizing and internal control spacing are unchanged. No fixed offsets, viewport-height duplication, negative translation or additional overflow hiding were introduced. In short windows the automatic margins resolve to zero and normal document scrolling remains available. Input and full-text views are unaffected.
- Test-first: four new word-reader centering cases and two strengthened image-pause cases failed on unequal top/bottom space before production CSS changed. Word cases cover all four font scales at 1440×900, 1366×768, 390×844 and 375×667, compare outer gaps within 2px and retain no-scroll assertions. They also verify word-field vertical position/height stays stable while playback advances. Existing largest-font fit, native control size, image visibility and short-landscape reachability checks remain.
- Final local checks: **50 unit/backend tests passed; 97 Chromium browser tests passed, 1 intentional existing mobile double-click skip**; TypeScript/production build, formatting and whitespace-diff checks passed. Local outcomes do not establish CI status.
- Individually inspected maximum-font word states at the four sizes above plus 320×568, a default-font desktop state and both synthetic portrait-image pauses. The four usual word sizes and both image cases fit without page scrolling or horizontal overflow. At 320×568 the reader remains naturally scrollable (626px document height for a 568px viewport); content is not negatively centered above the reachable document. The earlier word-area proportions and image sizes remain intact.
- Same-agent final review of the small CSS change and new assertions checked reader-only scope, available-height behavior, normal-flow fallback, unchanged word/anchor sizing and unaffected backend. No unresolved blocker in this bounded presentation change; not an independent audit. Real hardware/browser chrome, Safari/Firefox, screen readers and actual browser zoom remain untested. No merge or deployment performed.
