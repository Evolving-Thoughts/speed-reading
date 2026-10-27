import { articleImportAvailable } from "./ArticleImport";
import { useFullscreen } from "./useFullscreen";

type Props = { view: "input" | "reader" | "text"; onFinish: () => void };

const UNSUPPORTED = "Vollbild wird in diesem Browser nicht unterstützt.";

export function AppHeader({ view, onFinish }: Props) {
  const fullscreen = useFullscreen();
  const label = fullscreen.active ? "Vollbild verlassen" : "Vollbild starten";
  const notice = fullscreen.supported ? fullscreen.error : UNSUPPORTED;
  return (
    <header className="app-header">
      <div className="header-main">
        <a
          className="brand"
          href="#main"
          aria-label="Speed Reading – zum Inhalt"
        >
          speed <span>/</span> reading
        </a>
        <div className="header-actions">
          {view === "input" && articleImportAvailable && (
            <span className="privacy-label">Lokaler Importdienst.</span>
          )}
          <button
            className="button fullscreen-button"
            disabled={!fullscreen.supported || fullscreen.busy}
            aria-label={label}
            aria-pressed={fullscreen.active}
            title={fullscreen.supported ? label : UNSUPPORTED}
            onClick={() => void fullscreen.toggle()}
          >
            <svg
              width="20"
              height="20"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.5"
              aria-hidden="true"
            >
              <path
                d={
                  fullscreen.active
                    ? "M4 9h5V4M20 9h-5V4M4 15h5v5M20 15h-5v5"
                    : "M9 4H4v5M15 4h5v5M4 15v5h5M20 15v5h-5"
                }
              />
            </svg>
            <span className="fullscreen-label">
              {fullscreen.active ? "Vollbild verlassen" : "Vollbild"}
            </span>
          </button>
          {view !== "input" && (
            <button className="button end-button" onClick={onFinish}>
              Text beenden
            </button>
          )}
        </div>
      </div>
      {notice && (
        <p className="header-notice" role="status" aria-label="Vollbildhinweis">
          {notice}
        </p>
      )}
    </header>
  );
}
