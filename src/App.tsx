import { useReducer, type CSSProperties } from "react";
import { AppHeader } from "./AppHeader";
import { articleImportAvailable } from "./ArticleImport";
import { InputScreen } from "./screens/InputScreen";
import { ReaderScreen } from "./screens/ReaderScreen";
import { TextScreen } from "./screens/TextScreen";
import { initialState, reducer } from "./state";
import { usePlayback } from "./usePlayback";

const screens = {
  input: InputScreen,
  reader: ReaderScreen,
  text: TextScreen,
};

export default function App() {
  const [state, dispatch] = useReducer(reducer, initialState);
  usePlayback(state, dispatch);
  const Screen = screens[state.view];
  return (
    <div
      className={`app-shell${state.view === "reader" ? " reader-session" : ""}`}
      style={{ "--reading-scale": state.fontScale } as CSSProperties}
    >
      <AppHeader
        brand={
          <a
            className="brand"
            href="#main"
            aria-label="Speed Reading – zum Inhalt"
          >
            speed <span>/</span> reading
          </a>
        }
        note={
          state.view === "input" &&
          articleImportAvailable && (
            <span className="privacy-label">Lokaler Importdienst.</span>
          )
        }
        finish={
          state.view === "input"
            ? undefined
            : {
                label: "Text beenden",
                onClick: () => dispatch({ type: "finish" }),
              }
        }
      />
      <main id="main">
        <Screen state={state} dispatch={dispatch} />
      </main>
      <footer className="app-footer">
        <span>Ein ruhiger Ort für deinen Text.</span>
        <span>Ohne Konto · Ohne Tracking</span>
      </footer>
    </div>
  );
}
