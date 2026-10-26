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
