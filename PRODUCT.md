# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Users

Anyone who wants to try a different way of reading, in German and English. They arrive curious rather than committed: they bring a text of their own or an article they are already looking at, and want to find out what reading word by word feels like at a pace they choose.

Confirmed by the owner on 2026-11-11. No narrower segment (students, professionals) has been chosen.

## Product Purpose

Speed / Reading shows a text one word at a time around a fixed anchor letter (RSVP), so a reader can try this way of reading on their own texts without setting anything up.

It is meant to be a public product, not a personal tool or a portfolio piece. Success means people outside the project find it, try it and keep using it.

Open decisions:

- How the product reaches people (for example a browser extension store listing) is not decided.
- No success metric is defined. The product deliberately collects no usage data, so any metric has to work without tracking.

## Positioning

The text never leaves the reader's browser: no account, no tracking, no upload. The reader pastes a text, or reads the article on the page they are on through the browser extension, and nothing is sent anywhere.

The product makes no promise that a higher pace improves comprehension. It offers a way of reading to try, with the pace under the reader's control.

## Operating Context

- **Web app:** paste a text or load the example, read it in a dark focus view on desktop or phone. Public static build on GitHub Pages (<https://evolving-thoughts.github.io/speed-reading/>).
- **Browser extension (Chromium, Manifest V3):** opens the same reader on top of the current web page, for the page's article or the marked text, including the article's images. Built from this repository into `dist-extension/`; not published in a store.
- **Local link import:** a small Node.js service fetches an article by URL. It only runs locally and is absent from the public build.
- Reading sessions start paused. The reader controls pace (100 to 1,200 words per minute), font size and the pause at sentence ends, can switch to the full text and resume from any word, and can go fullscreen.

## Capabilities and Constraints

- Words appear around a fixed red anchor letter; long words shrink to fit. Images pause the reading until the reader continues; captions are shown, not read.
- Keyboard operation throughout: Space for start and pause, arrow keys in the text view, Escape closes the extension reader.
- Text is rendered as text, never as HTML. No external fonts, no analytics, no service worker, no persistent storage in the web app. The extension stores only pace, font size and sentence pause locally.
- The extension has no standing access to websites; it reads a page only when started there (`activeTab`).
- Terminology in the interface: Leseansicht, Textansicht, Bildpause, Lesetempo (WPM), Satzendpause, Ankerbuchstabe.
- **Languages:** the interface is German only today. English is part of the intended audience but not built. Open decision: how English is added. Sentence detection, the abbreviation list and grapheme segmentation are currently tuned for German.

## Brand Commitments

- Name: Speed / Reading, written `speed / reading` in the interface, with the slash in a muted tone.
- Icon: `public/favicon.svg`, a red anchor bar between two guide lines on a dark tile.
- Confirmed commitments: no account, no tracking, no upload; no performance promises.
- Voice observed in the existing copy, not separately confirmed: calm, informal German ("du"), short factual sentences. Examples: "Ein ruhiger Ort für deinen Text.", "Ohne Konto · Ohne Tracking".

## Evidence on Hand

- Screenshot of the reader: `docs/screenshot.png`.
- Example text with five research sources on RSVP and its limits: `src/example.ts`.
- Behaviour, limits and privacy in detail: `docs/details.md`.
- Live web app at the GitHub Pages address above.

Not available, and not to be invented: testimonials, user numbers, reading-speed or comprehension benchmarks, press, pricing, a store listing.

## Product Principles

1. **The text stays with the reader.** Nothing the reader reads is uploaded, tracked or tied to an account.
2. **An invitation, not a promise.** The product lets people try a way of reading. It does not claim that faster means better understood.
3. **The reader sets the pace.** Sessions start paused, and stopping, slowing down, rereading and resuming elsewhere are always one step away.
4. **Nothing stands between curiosity and the first word.** No sign-up and no setup before reading starts.
5. **Usable by everyone.** Keyboard, screen reader and contrast requirements are part of every feature, not a later pass.

## Accessibility & Inclusion

WCAG 2.2 AA is binding (confirmed by the owner on 2026-11-11).

Already in place and to be kept: full keyboard operation with visible focus, touch targets of at least 44 px, status and progress exposed to assistive technology, a reduced-motion rule, and a full-text view as an alternative to the word-by-word display.
