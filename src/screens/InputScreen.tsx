import { useMemo, type Dispatch } from "react";
import { ArticleImport, articleImportAvailable } from "../ArticleImport";
import { exampleSources, exampleText } from "../example";
import { countWords } from "../reader";
import { ReadingSettings } from "../ReadingSettings";
import type { Action, ReaderState } from "../state";
import { useScreenFocus } from "./useScreenFocus";

type Props = { state: ReaderState; dispatch: Dispatch<Action> };

export function InputScreen({ state, dispatch }: Props) {
  const heading = useScreenFocus();
  const count = useMemo(() => countWords(state.draft), [state.draft]);
  return (
    <section className="input-screen">
      <div className="eyebrow">DEIN TEMPO. DEIN TEXT.</div>
      <h1 ref={heading} tabIndex={-1}>
        Ein Wort nach
        <br />
        dem anderen.
      </h1>
      <p className="intro">
        Text einfügen, Tempo wählen, loslesen.
        <br />
        Eingefügter Text bleibt in diesem Browser-Tab.
      </p>
      {articleImportAvailable && (
        <ArticleImport
          initialArticle={state.article}
          onRead={(article) => dispatch({ type: "article", article })}
        />
      )}
      <form
        onSubmit={(e) => {
          e.preventDefault();
          dispatch({ type: "load" });
        }}
      >
        <div className="field-heading">
          <label htmlFor="text-input">Was möchtest du lesen?</label>
          <button
            type="button"
            className="text-button"
            onClick={() => dispatch({ type: "draft", text: exampleText })}
          >
            Beispieltext laden
          </button>
        </div>
        <textarea
          id="text-input"
          placeholder="Füge deinen Text hier ein …"
          value={state.draft}
          onChange={(e) => dispatch({ type: "draft", text: e.target.value })}
          spellCheck={false}
        />
        <div className="input-meta">
          <span>
            {count} {count === 1 ? "Wort" : "Wörter"}
          </span>
          <span>Kein Speichern nach Neuladen</span>
        </div>
        <ReadingSettings {...state} dispatch={dispatch} />
        <button type="submit" className="button primary wide" disabled={!count}>
          Zur Leseansicht <span aria-hidden="true">→</span>
        </button>
      </form>
      <details className="explanation example-sources">
        <summary>Quellen zum Beispieltext</summary>
        <p>
          Der Beispieltext fasst Forschung zu RSVP und Lesen zusammen. Er ist
          keine Übersetzung des Referenzvideos. Die Quellen werden nicht als
          Teil des Beispieltexts angezeigt oder vorgelesen.
        </p>
        <ul>
          {exampleSources.map((source) => (
            <li key={source.href}>
              <a href={source.href} target="_blank" rel="noreferrer">
                {source.label}
              </a>
            </li>
          ))}
        </ul>
      </details>
      <details className="explanation">
        <summary>Wie funktioniert dieser Lesemodus?</summary>
        <p>
          Es erscheint immer ein Wort. Der rote Buchstabe bleibt an derselben
          Stelle, damit dein Blick einen festen Anker hat. Du kannst jederzeit
          pausieren oder in die normale Textansicht wechseln. Mehr Tempo
          bedeutet nicht automatisch mehr Verständnis – wähle ein angenehmes
          Tempo.
        </p>
      </details>
    </section>
  );
}
