import { createRoot } from "react-dom/client";
import appCss from "../src/styles.css?inline";
import { extractArticle, type Extraction } from "./extract";
import { Overlay, type Settings } from "./Overlay";
import overlayCss from "./overlay.css?inline";

/**
 * Injected into the current tab each time the user asks for the reader. The
 * first run installs a controller in the extension's isolated world; later
 * runs find it and toggle the reader instead of stacking a second one.
 */
const HOST_ID = "speed-reading-extension";
const CONTROLLER = "__speedReadingExtension";
const SETTINGS_KEY = "settings";

/** Inside the shadow tree the dialog is what :root is for the web app. */
const css =
  appCss
    .replace(/:root:fullscreen\b/g, ".sr-never")
    .replace(/:root\b/g, ".sr-dialog") + overlayCss;

const FAILURES: Record<Extract<Extraction, { ok: false }>["reason"], string> = {
  empty:
    "Auf dieser Seite wurde kein Lesetext gefunden. Markiere den gewünschten Text und versuche es erneut.",
  "too-long":
    "Der Text ist zu lang (maximal 250.000 Zeichen). Markiere einen Abschnitt und versuche es erneut.",
};

/** Events that must not reach the page's own shortcuts and click handlers. */
const CONTAINED_EVENTS = [
  "keydown",
  "keyup",
  "keypress",
  "click",
  "dblclick",
  "mousedown",
  "mouseup",
  "pointerdown",
  "pointerup",
  "touchstart",
  "touchend",
  "wheel",
  "contextmenu",
  "input",
  "change",
];

const storage = () =>
  typeof chrome !== "undefined" ? chrome.storage?.local : undefined;

async function loadSettings(): Promise<Partial<Settings>> {
  try {
    const stored = (await storage()?.get(SETTINGS_KEY))?.[SETTINGS_KEY];
    return stored && typeof stored === "object" ? stored : {};
  } catch {
    return {}; // Storage is a convenience; the reader works with its defaults.
  }
}
function saveSettings(settings: Settings) {
  try {
    void storage()
      ?.set({ [SETTINGS_KEY]: settings })
      ?.catch(() => {});
  } catch {
    // The extension was reloaded while this page stayed open.
  }
}

/** A host the page's styles cannot reach, with the reader's styles inside. */
function createHost(id: string) {
  const host = document.createElement("div");
  host.id = id;
  // CSSOM instead of a style attribute: allowed under any page CSP.
  host.style.setProperty("all", "initial", "important");
  host.style.setProperty("display", "block", "important");
  const shadow = host.attachShadow({ mode: "open" });
  try {
    const sheet = new CSSStyleSheet();
    sheet.replaceSync(css);
    shadow.adoptedStyleSheets = [sheet];
  } catch {
    const style = document.createElement("style");
    style.textContent = css;
    shadow.append(style);
  }
  for (const type of CONTAINED_EVENTS)
    host.addEventListener(type, (event) => event.stopPropagation());
  return { host, shadow };
}

let toastTimer: ReturnType<typeof setTimeout> | undefined;
function showToast(message: string) {
  const id = `${HOST_ID}-toast`;
  document.getElementById(id)?.remove();
  clearTimeout(toastTimer);
  const { host, shadow } = createHost(id);
  const toast = document.createElement("div");
  toast.className = "sr-toast";
  toast.setAttribute("role", "status");
  toast.textContent = message;
  shadow.append(toast);
  host.style.setProperty("position", "fixed", "important");
  host.style.setProperty("z-index", "2147483647", "important");
  document.documentElement.append(host);
  toastTimer = setTimeout(() => host.remove(), 6000);
}

function openReader(
  result: Extract<Extraction, { ok: true }>,
  settings: Partial<Settings>,
  onClosed: () => void,
) {
  const { host, shadow } = createHost(HOST_ID);
  // A modal dialog sits in the browser's top layer above every page element,
  // keeps focus inside and makes the page behind it inert.
  const dialog = document.createElement("dialog");
  dialog.className = "sr-dialog";
  dialog.setAttribute("aria-label", "Speed Reading");
  dialog.setAttribute("data-scroll-root", "");
  const mount = document.createElement("div");
  dialog.append(mount);
  shadow.append(dialog);
  document.documentElement.append(host);
  const root = createRoot(mount);

  const page = document.documentElement;
  const pageOverflow = {
    value: page.style.getPropertyValue("overflow"),
    priority: page.style.getPropertyPriority("overflow"),
  };
  page.style.setProperty("overflow", "hidden", "important");
  const fullscreenBefore = document.fullscreenElement;

  let closed = false;
  const close = () => {
    if (closed) return;
    closed = true;
    document.removeEventListener("fullscreenchange", raiseAboveFullscreen);
    root.unmount();
    if (dialog.open) dialog.close();
    host.remove();
    if (pageOverflow.value)
      page.style.setProperty(
        "overflow",
        pageOverflow.value,
        pageOverflow.priority,
      );
    else page.style.removeProperty("overflow");
    // Leave a fullscreen the reader started; one the page started is the page's.
    if (document.fullscreenElement && !fullscreenBefore)
      void document.exitFullscreen().catch(() => {});
    onClosed();
  };

  // A page element entering fullscreen is stacked above the open dialog;
  // showing the dialog again puts it back on top.
  function raiseAboveFullscreen() {
    if (!document.fullscreenElement || !dialog.open) return;
    const focused = shadow.activeElement;
    const scrollTop = dialog.scrollTop;
    dialog.close();
    dialog.showModal();
    dialog.scrollTop = scrollTop;
    if (focused instanceof HTMLElement) focused.focus({ preventScroll: true });
  }
  document.addEventListener("fullscreenchange", raiseAboveFullscreen);

  dialog.addEventListener("cancel", (event) => {
    event.preventDefault(); // Escape: leave through close() so the page is restored.
    close();
  });
  dialog.addEventListener("close", () => {
    if (!dialog.open) close();
  });

  dialog.showModal();
  root.render(
    <Overlay
      article={result.article}
      source={result.source}
      settings={settings}
      onSettings={saveSettings}
      onClose={close}
    />,
  );
  return { close };
}

function createController() {
  let reader: { close: () => void } | null = null;
  let opening = false;
  return {
    async toggle() {
      if (opening) return;
      if (reader) {
        reader.close();
        return;
      }
      opening = true;
      try {
        const result = extractArticle(document, {
          ignore: `#${HOST_ID},#${HOST_ID}-toast`,
        });
        if (!result.ok) {
          showToast(FAILURES[result.reason]);
          return;
        }
        document.getElementById(`${HOST_ID}-toast`)?.remove();
        const settings = await loadSettings();
        reader = openReader(result, settings, () => {
          reader = null;
        });
      } finally {
        opening = false;
      }
    },
  };
}

type Controller = ReturnType<typeof createController>;
const scope = globalThis as typeof globalThis & { [CONTROLLER]?: Controller };
scope[CONTROLLER] ??= createController();
void scope[CONTROLLER].toggle();
