# Speed / Reading

Eine Speedreading-Web-App, die Texte Wort für Wort mit einem festen Ankerbuchstaben anzeigt (RSVP). Dunkle Fokusansicht für Desktop und Smartphone, ohne Konto, ohne Tracking und ohne Upload des Lesetextes.

**Live ausprobieren:** <https://evolving-thoughts.github.io/speed-reading/>

## Funktionen

- Text einfügen oder Beispieltext laden und mit 100 bis 1.200 Wörtern pro Minute lesen
- Fester roter Ankerbuchstabe pro Wort, lange Wörter werden automatisch verkleinert
- Einstellbare Pause am Satzende und vier Schriftgrößen
- Textansicht mit markierter Lesestelle und Wiedereinstieg an einem beliebigen Wort
- Tastaturbedienung (Leertaste, Pfeiltasten) und Vollbildmodus
- Lokal zusätzlich: Artikel per Link importieren, inklusive Bildern und Bildunterschriften

Die öffentliche Version auf GitHub Pages ist rein statisch. Der Linkimport braucht den kleinen Node.js-Importdienst und ist deshalb nur bei lokaler Ausführung verfügbar.

## Tech-Stack

- React 19, TypeScript und Vite
- Node.js-Importdienst mit Mozilla Readability und jsdom (abgesicherter Abruf, signierte Bildlinks)
- Vitest für Unit-Tests, Playwright für Browsertests auf Desktop- und Smartphone-Viewport
- GitHub Actions für Checks und das Deployment auf GitHub Pages

## Lokal starten

Voraussetzung: Node.js 24 (siehe `.nvmrc`) und npm.

```sh
npm ci
npm run dev
```

`npm run dev` startet die App und den Importdienst gemeinsam. Die App läuft unter <http://localhost:5173>.

Produktionsbuild lokal ansehen:

```sh
npm run build
npm run preview
```

## Tests

```sh
npm test               # Unit-Tests (Vitest)
npm run typecheck      # TypeScript
npm run format:check   # Prettier
npx playwright install chromium
npm run test:e2e       # Browsertests (Playwright)
```

## Deployment

Jeder Push auf `main` baut die App mit `npm run build:pages` und veröffentlicht sie über GitHub Actions auf GitHub Pages. Dieser Build setzt den Pfad `/speed-reading/` und blendet den Linkimport aus (siehe `.env.pages`).

## Projektstruktur

- `src/state.ts`: Lesesitzung (reducer und abgeleitete Anzeigewerte)
- `src/screens/`: Eingabe-, Lese- und Textansicht
- `src/`: weitere Module für Leseschritte, Einstellungen, Zeitsteuerung und Linkimport
- `server/`: lokaler Importdienst für Artikel-Links
- `tests/`: Playwright-Browsertests
- `docs/details.md`: ausführliche Beschreibung von Bedienung, Importgrenzen und Datenschutz

## Lizenz

[MIT](LICENSE)
