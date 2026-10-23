# Speed / Reading

Eine rein clientseitige Speedreading-App mit React, TypeScript und Vite. Dunkle Fokusansicht für Desktop und Smartphone. Kein Konto, kein Backend, kein Tracking und kein Upload des Lesetextes.

## Lokal starten

Node.js 24 (siehe `.nvmrc`) und npm:

```sh
npm ci
npm run dev
```

Die lokale Adresse wird im Terminal ausgegeben. Produktionsversion:

```sh
npm run build
npm run preview
```

`dist/` kann auf einem statischen Host unter der Domainwurzel bereitgestellt werden. Es gibt keine serverseitigen Routen. Ein Hosting/Deployment ist nicht Teil dieses PRs.

## Bedienung

- Text einfügen oder den Beispieltext laden. Die kurze Erklärung unter der Texteingabe ist optional aufklappbar.
- Tempo zwischen 100 und 1.200 WPM wählen (Standard: 300). Der Einstieg ist immer pausiert.
- Start/Pause per Button oder Leertaste. In Eingabefeldern und auf nativen Bedienelementen behält die Leertaste ihre normale Bedeutung.
- Jedes Wort erscheint um einen festen roten Ankerbuchstaben. Lange Wörter werden so verkleinert, dass sie nicht abgeschnitten werden.
- Satzzeichen bleiben am Wort. Satzendwörter stehen dreimal so lange; Kommas verlängern die Anzeige nicht. WPM bezeichnet das **Grundtempo**, nicht den tatsächlichen Durchschnitt inklusive Satzendpausen.
- „Textansicht“ pausiert und scrollt zur aktuellen, unterstrichenen Lesestelle. Ein Wort anklicken/antippen, dann „Ab hier lesen“ wählen. Auf dem Desktop geht auch Doppelklick. Der Wiedereinstieg ist pausiert.
- Die Wortauswahl belegt nur einen Tab-Stopp. Pfeil links/rechts wechselt das ausgewählte Wort; Pos1/Ende springt zum ersten/letzten Wort. Tab führt zu „Ab hier lesen“, Umschalt+Tab zurück zur Auswahl.
- „Text beenden“ bleibt oben in beiden Leseansichten sichtbar. Es führt jederzeit zur Texteingabe zurück; Text und Tempo bleiben erhalten und der Text kann ersetzt werden.
- Am Textende bleibt das letzte Wort stehen; „Von vorne“ setzt pausiert zum ersten Wort zurück.
- Ein ausgeblendeter Browser-Tab pausiert die Wiedergabe. Neuladen löscht die Sitzung; es wird weder Local Storage noch ein Service Worker verwendet.

## Regeln und Grenzen

Ankerregel, inklusive Satzzeichen gezählt: 1 Zeichen → erstes, 2–5 → zweites, 6–9 → drittes, 10–13 → viertes, ab 14 → fünftes Zeichen. Unicode-Grapheme werden zusammengehalten; liegt das Ziel auf einem Satzzeichen, wird wenn möglich ein Buchstabe/eine Ziffer verwendet. Diese Regel ist eine vereinbarte Annäherung an die Videoreferenz, nicht deren nachgewiesener Algorithmus.

Satzenden: `.`, `!`, `?`, `…`, auch vor schließenden Anführungszeichen oder Klammern. Eine kleine Liste häufiger Abkürzungen wird ausgenommen; das ist keine vollständige linguistische Satzsegmentierung. Alleinstehende Satzzeichen werden an das vorherige Wort angefügt. Absatzumbrüche bleiben in der Textansicht erhalten.

Die Zeitsteuerung verwendet `performance.now()` und bricht beim Pausieren ausstehende Timer ab. Browser und Bildwiederholrate können die reale Dauer verlängern; es werden keine Wörter übersprungen, um verspätete Frames aufzuholen. Pause/Start und Tempoänderungen geben dem aktuellen Wort eine neue volle Anzeigedauer.

Sehr lange Wörter können auf schmalen Displays klein werden; die normale Textansicht bleibt als Alternative verfügbar. PDF-/Linkimport, Bilder, Konten und dauerhafte Speicherung sind bewusst nicht enthalten. Es wird kein höheres Textverständnis durch höheres Tempo versprochen.

## Prüfungen

```sh
npm test                 # Vitest: Textregeln und Sitzungszustand
npm run typecheck        # TypeScript
npm run build            # Typecheck und Produktions-Bundle
npm run format:check     # Prettier
npx playwright install chromium
npm run test:e2e         # Desktop und Smartphone-Viewport in Chromium
```

Falls Chromium bereits systemweit installiert ist:

```sh
CHROMIUM_PATH=/usr/bin/chromium npm run test:e2e
```

Browsertests prüfen Bedienabläufe, Timing mit kontrollierter Browser-Uhr, Wortauswahl, Textende, Abbruch, lange Wörter, Textdarstellung ohne HTML-Ausführung und Zurücksetzen nach Neuladen. Die Sichtbarkeitsänderung wird synthetisch ausgelöst; sie ersetzt keinen echten Hintergrund-Tab-Test auf allen Betriebssystemen. Smartphone-Tests emulieren Chromium mit Touch, nicht iOS/Safari oder reale Hardware. Screenshots sind unter `test-results/` verfügbar, werden aber nicht versioniert. CI führt Formatierung, Tests, Build und Chromium-Browsertests aus.

## Aufbau

- `src/reader.ts`: Textaufbereitung, Anker, Wortdauer.
- `src/state.ts`: pure Zustandsübergänge der Sitzung.
- `src/usePlayback.ts`: monotone Zeitsteuerung und Timer-Cleanup.
- `src/ReaderWord.tsx`: Ankerposition und Größenanpassung.
- `src/App.tsx`: Eingabe, Lesemodus, Textansicht und Tastaturbedienung.
- `src/NormalText.tsx`: delegierte Wortauswahl mit einer roving Tab-Position und Pfeiltastennavigation.

Die App rendert Nutzereingaben als React-Text, niemals als HTML. Sie lädt keine Fonts, Inhalte oder Analytik von externen Servern nach. Die Infrastruktur des später gewählten Hosts kann unabhängig davon Zugriffslogs erzeugen.
