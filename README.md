# Speed / Reading

Speedreading-App mit React, TypeScript und Vite sowie einem kleinen lokalen Node.js-Importdienst. Dunkle Fokusansicht für Desktop und Smartphone. Kein Konto, keine App-Analytik und keine dauerhafte Speicherung. Manuell eingefügter Text bleibt im Browser; beim Linkimport lädt der lokale Dienst die Artikelseite und ihre Bilder.

## Lokal starten

Node.js 24 (siehe `.nvmrc`) und npm:

```sh
npm ci
npm run dev
```

`npm run dev` startet Vite und die Import-API gemeinsam. Die App läuft standardmäßig auf Port 5173, die API auf 4174 (über `API_PORT` änderbar). Öffne nur die App-Adresse, nicht die API. Node.js 24 ist auch zum Ausführen des Importdienstes nötig. Beide Prozesse werden beim Beenden gemeinsam gestoppt.

Gebauter lokaler Stand:

```sh
npm run build
npm run preview
```

`npm run preview` bzw. `npm start` liefert `dist/` und die Import-API gemeinsam auf `http://127.0.0.1:4173` aus (`PORT` änderbar). **Ein rein statischer Host reicht für den Linkimport nicht mehr.** Der Dienst bindet bewusst nur an Loopback und akzeptiert lokale Hosts. Eine öffentliche Bereitstellung ist nicht Teil dieses PRs; dafür wären eine separate Deployment-/Authentifizierungs- und Missbrauchsschutzentscheidung erforderlich.

## Artikel per Link importieren

1. Einen öffentlichen HTTP(S)-Artikellink eingeben und „Artikel laden“ wählen. Queryparameter von Freigabelinks bleiben beim Abruf erhalten. Keine Passwörter oder Anmeldung hinterlegen.
2. Die erkannte Vorschau mit Text, Bildern und Bildunterschriften prüfen. „Artikel übernehmen“ startet pausiert mit dem ersten Leseschritt.
3. Bilder erscheinen an ihrer erkannten Position. Die Wiedergabe hält an; „Weiterlesen“ geht zum nächsten Schritt und setzt bei Text die Wiedergabe fort. Auch aufeinanderfolgende oder abschließende Bilder benötigen die bewusste Fortsetzung.
4. Die Textansicht zeigt Text und Bilder gemeinsam. Wortauswahl und pausierter Wiedereinstieg bleiben erhalten; ein Bild kann ebenfalls als Einstiegsstelle ausgewählt werden.

„Text beenden“ erhält den importierten Artikel innerhalb der Sitzung. Eine Änderung im manuellen Textfeld wechselt beim nächsten Laden zu reinem Text ohne Bilder. Neuladen setzt alles zurück. Fehlgeschlagene/abgebrochene Importe überschreiben den manuellen Entwurf nicht.

### Grenzen und Datenschutz des Imports

- Mozilla Readability erkennt den Hauptinhalt ohne Skriptausführung. Inline-Bilder, relative URLs, `srcset`/Picture- und häufige Lazy-Loading-Attribute werden berücksichtigt; Bildunterschriften werden angezeigt, aber nicht als Fließtext vorgelesen. Navigation und Skripte werden entfernt. Dies ist eine Heuristik: Erkennung, Vollständigkeit und Reihenfolge sind nicht für jede Website garantiert. Hintergrundbilder, Video/Canvas, CSS-Layouts und JavaScript-nachgeladene Inhalte werden nicht rekonstruiert.
- Paywalls, Anmeldungen oder Bot-Sperren werden nicht umgangen. Der bereitgestellte Medium-Freigabelink wurde live mit dem Backend getestet und von Medium weiterhin abgewiesen. Seine erfolgreiche Erkennung ist daher **nicht bestätigt**. Die App bietet dafür einen Hinweis und manuelles Einfügen; ein Freigabelink ist keine Garantie für automatischen Zugriff.
- Der Dienst lädt ausschließlich öffentliche HTTP(S)-Adressen mit Standardports, validiert alle DNS-Ergebnisse und jeden Redirect und pinnt eine geprüfte IP für die Verbindung. Lokale/private/reservierte IPs, URL-Zugangsdaten und fremde Protokolle werden abgewiesen. TLS-Prüfung bleibt aktiviert; keine Browser-Cookies, Referer oder Anmeldedaten werden an die Quelle weitergegeben.
- Abrufgrenzen: 15 Sekunden, höchstens 5 Redirects, 2 MiB HTML bzw. 8 MiB pro Bild (auch nach Dekomprimierung), höchstens 250.000 Textzeichen/3.000 Blöcke/50 Bilder. Es gibt ein lokales Artikel-Ratelimit und höchstens vier gleichzeitige ausgehende Abrufe für Artikel und Bilder zusammen. Gültig signierte Bildanfragen warten bei Auslastung in einer FIFO-Warteschlange (höchstens 50 wartende Anfragen, maximal 60 Sekunden Wartezeit zusätzlich zur Abrufdauer). Abgebrochene Anfragen werden entfernt. Bei voller Warteschlange oder überschrittener Wartezeit kann ein Bild weiterhin fehlschlagen; es gibt keine unbegrenzten automatischen Wiederholungen. Artikelimporte erhalten bei belegten Abrufplätzen weiterhin einen Auslastungshinweis.
- Bilder werden über lokal signierte, eine Stunde gültige URLs abgerufen, nicht direkt im Browser von Drittseiten. JPEG, PNG, WebP, GIF und AVIF sind erlaubt; kein SVG/HTML. Bei nicht erreichbaren oder abgelaufenen Bildern kann trotzdem weitergelesen werden; bei Bedarf den Artikel neu importieren. Ein Serverneustart macht bestehende Bildlinks ungültig.
- Artikel-URLs und deren Freigabeparameter werden nicht protokolliert oder dauerhaft gespeichert. Die Zielwebsite/Bildquelle sieht jedoch den Abruf und die IP des Importdienstes und kann eigene Zugriffslogs führen. Die Browseranzeige enthält den Quellenlink; Bilddaten können kurz im privaten Browsercache liegen. Keine externen KI-/Scraping-Dienste.

## Bedienung

- Die Leseansicht nutzt weniger Leerraum und eine an die gewählte Schriftgröße angepasste Lesefläche. Am Desktop stehen Tempo, Schriftgröße und Satzendpause nebeneinander; auf dem Smartphone sind sie platzsparend angeordnet. Das kleinere Wortfeld schafft mehr Abstand zwischen Aktionen, Einstellungen und Fortschrittsangabe, ohne die Schriftgröße zu reduzieren. Bei üblichen Fenstergrößen bleiben Lesefeld und Steuerung gemeinsam sichtbar. Sehr kleine Fenster, starker Zoom oder lange Bildunterschriften dürfen weiterhin scrollen, statt Inhalte oder Bedienelemente abzuschneiden.

- Text einfügen oder den deutschen Beispieltext „Dein Text. Dein Rhythmus.“ laden. Er erklärt RSVP, die Forschungsgrenzen, inneres Sprechen und sinnvolle Tempowahl ohne Leistungsversprechen. Die fünf Quellenlinks stehen separat unter „Quellen zum Beispieltext“ und werden nicht in den Wortstrom übernommen. Die Eingabe bleibt beim Start leer; Laden des Beispiels ist optional. Die kurze Bedienerklärung ist weiterhin aufklappbar.
- Tempo zwischen 100 und 1.200 WPM wählen (Standard: 300), per Schieberegler oder Zahlenfeld. Das Zahlenfeld übernimmt mit Enter oder beim Verlassen den gerundeten Wert und begrenzt ihn auf den Bereich; eine leere/ungültige Eingabe wird zurückgesetzt. Enter im Zahlenfeld startet die Leseansicht nicht. Der Einstieg ist immer pausiert.
- Start/Pause per Button oder Leertaste. In Eingabefeldern und auf nativen Bedienelementen behält die Leertaste ihre normale Bedeutung.
- Jedes Wort erscheint um einen festen roten Ankerbuchstaben. Lange Wörter werden so verkleinert, dass sie nicht abgeschnitten werden.
- Satzzeichen bleiben am Wort. Die Satzendpause ist wählbar: Aus (1×), Kurz (2×), Normal (3×, Standard) oder Lang (4×). Der Faktor bezeichnet die gesamte Wortdauer, nicht eine zusätzliche Pause; Kommas verlängern die Anzeige nicht. WPM bezeichnet das **Grundtempo**, nicht den tatsächlichen Durchschnitt inklusive Satzendpausen.
- Schriftgröße in vier Stufen wählen: Klein (80 %), Normal (100 %, Standard), Groß (125 %) und Sehr groß (150 %). Sie gilt für das Lesewort und die normale Textansicht. Lange Wörter werden weiterhin passend verkleinert; die Einstellung ist deshalb eine Basisgröße, keine garantierte Mindestgröße.
- Vollbild über den Button oben starten/verlassen, auch in der Texteingabe. Escape bzw. die Browserbedienung beendet Vollbild ebenfalls; der Button folgt dem tatsächlichen Browserzustand. Ohne unterstützte Fullscreen API bleibt der Button deaktiviert und ein Hinweis erscheint. Bei abgelehnter Anfrage bleibt die normale Ansicht benutzbar.
- „Textansicht“ pausiert und scrollt zur aktuellen, unterstrichenen Lesestelle. Ein Wort anklicken/antippen, dann „Ab hier lesen“ wählen. Auf dem Desktop geht auch Doppelklick. Der Wiedereinstieg ist pausiert.
- Die Wortauswahl belegt nur einen Tab-Stopp. Pfeil links/rechts wechselt das ausgewählte Wort; Pos1/Ende springt zum ersten/letzten Wort. Tab führt zu „Ab hier lesen“, Umschalt+Tab zurück zur Auswahl.
- „Text beenden“ bleibt oben in beiden Leseansichten sichtbar. Es führt jederzeit zur Texteingabe zurück; Text, Tempo, Schriftgröße und Satzendpause bleiben innerhalb der Sitzung erhalten und der Text kann ersetzt werden.
- Am Textende bleibt das letzte Wort stehen; „Von vorne“ setzt pausiert zum ersten Wort zurück.
- Ein ausgeblendeter Browser-Tab pausiert die Wiedergabe. Neuladen löscht die Sitzung; es wird weder Local Storage noch ein Service Worker verwendet.

## Regeln und Grenzen

Ankerregel, inklusive Satzzeichen gezählt: 1 Zeichen → erstes, 2–5 → zweites, 6–9 → drittes, 10–13 → viertes, ab 14 → fünftes Zeichen. Unicode-Grapheme werden zusammengehalten; liegt das Ziel auf einem Satzzeichen, wird wenn möglich ein Buchstabe/eine Ziffer verwendet. Diese Regel ist eine vereinbarte Annäherung an die Videoreferenz, nicht deren nachgewiesener Algorithmus.

Satzenden: `.`, `!`, `?`, `…`, auch vor schließenden Anführungszeichen oder Klammern. Eine kleine Liste häufiger Abkürzungen wird ausgenommen; das ist keine vollständige linguistische Satzsegmentierung. Alleinstehende Satzzeichen werden an das vorherige Wort angefügt. Absatzumbrüche bleiben in der Textansicht erhalten.

Die Zeitsteuerung verwendet `performance.now()` und bricht beim Pausieren ausstehende Timer ab. Browser und Bildwiederholrate können die reale Dauer verlängern; es werden keine Wörter übersprungen, um verspätete Frames aufzuholen. Pause/Start, Tempo- und Satzendpausenänderungen geben dem aktuellen Wort eine neue volle Anzeigedauer. Schriftgrößenänderungen setzen den Timer nicht zurück.

Sehr lange Wörter können auf schmalen Displays klein werden; die normale Textansicht bleibt als Alternative verfügbar. PDF-Import, Konten und dauerhafte Speicherung sind bewusst nicht enthalten. Artikel-Links und Inline-Bilder sind wie oben beschrieben unterstützt. Es wird kein höheres Textverständnis durch höheres Tempo versprochen.

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

Browsertests prüfen zusätzlich Zahlenfeld/Schieberegler-Synchronisierung, Schriftgröße und Sitzungseinstellungen, konfigurierbare Satzenddauer, native Vollbildwechsel inklusive browserseitigem Verlassen sowie fehlende/abgelehnte Fullscreen API.

Browsertests prüfen Bedienabläufe, Timing mit kontrollierter Browser-Uhr, Wortauswahl, Textende, Abbruch, lange Wörter, Textdarstellung ohne HTML-Ausführung und Zurücksetzen nach Neuladen. Die Sichtbarkeitsänderung wird synthetisch ausgelöst; sie ersetzt keinen echten Hintergrund-Tab-Test auf allen Betriebssystemen. Smartphone-Tests emulieren Chromium mit Touch, nicht iOS/Safari oder reale Hardware. Screenshots sind unter `test-results/` verfügbar, werden aber nicht versioniert. CI führt Formatierung, Tests, Build und Chromium-Browsertests aus.

## Aufbau

- `server/`: Artikelparser, abgesicherter HTTP-Abruf, signierte Bildlinks und lokale API/static server.
- `scripts/dev.mjs`: gemeinsamer Start und Stopp von Vite/API.
- `src/ArticleImport.tsx`, `src/ArticleImage.tsx`, `src/article.ts`: Vorschau, Bildschritte und API-Datenvalidierung.
- `src/reader.ts`: Textaufbereitung, Anker, Wortdauer.
- `src/state.ts`: pure Zustandsübergänge der Sitzung.
- `src/usePlayback.ts`: monotone Zeitsteuerung und Timer-Cleanup.
- `src/ReaderWord.tsx`: Ankerposition und Größenanpassung.
- `src/ReadingSettings.tsx`: Tempoeingabe, Basis-Schriftgröße und Satzendpause.
- `src/useFullscreen.ts`: native Fullscreen API mit Statusabgleich und Fehlerhinweis.
- `src/App.tsx`: Eingabe, Lesemodus, Textansicht und Tastaturbedienung.
- `src/NormalText.tsx`: delegierte Wortauswahl mit einer roving Tab-Position und Pfeiltastennavigation.

Die App rendert Nutzereingaben als React-Text, niemals als HTML. Sie lädt keine externen Fonts oder Analytik. Externe Artikel und Bilder werden nur beim ausdrücklich ausgelösten Linkimport über den lokalen Importdienst geladen. Die Infrastruktur des später gewählten Hosts kann unabhängig davon Zugriffslogs erzeugen.
