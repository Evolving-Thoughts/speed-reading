import { useReducer, type CSSProperties } from "react";
import { AppHeader } from "./AppHeader";
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
        view={state.view}
        onFinish={() => dispatch({ type: "finish" })}
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
