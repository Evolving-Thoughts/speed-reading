import { useEffect, useState } from "react";

/** The browser, including Escape/browser UI exits, is the fullscreen source of truth. */
export function useFullscreen() {
  const supported = Boolean(
    document.fullscreenEnabled && document.documentElement.requestFullscreen,
  );
  const [active, setActive] = useState(Boolean(document.fullscreenElement));
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  useEffect(() => {
    const changed = () => {
      setActive(Boolean(document.fullscreenElement));
      setError("");
    };
    document.addEventListener("fullscreenchange", changed);
    return () => document.removeEventListener("fullscreenchange", changed);
  }, []);
  const toggle = async () => {
    if (!supported || busy) return;
    setBusy(true);
    setError("");
    try {
      if (document.fullscreenElement) await document.exitFullscreen();
      else await document.documentElement.requestFullscreen();
    } catch {
      setError(
        "Vollbild konnte nicht umgeschaltet werden. Du kannst normal weiterlesen.",
      );
    } finally {
      setBusy(false);
    }
  };
  return { supported, active, error, busy, toggle };
}
