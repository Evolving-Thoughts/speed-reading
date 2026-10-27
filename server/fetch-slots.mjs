import { ImportError } from "./extract.mjs";

// One shared outbound budget. Only authenticated image requests may wait.
export function createFetchSlots({
  limit = 4,
  maxPending = 50,
  waitMs = 60000,
} = {}) {
  let active = 0;
  const pending = [];
  const busy = () =>
    new ImportError("Zu viele gleichzeitige Abrufe. Bitte kurz warten.", 429);
  const aborted = () =>
    new ImportError("Der Bildabruf wurde abgebrochen.", 499);
  const take = () => {
    active++;
    let released = false;
    return () => {
      if (released) return;
      released = true;
      active--;
      const next = pending.shift();
      if (next) {
        next.cleanup();
        next.resolve(take());
      }
    };
  };
  return {
    acquire() {
      if (active >= limit) throw busy();
      return take();
    },
    acquireImage(signal) {
      if (signal?.aborted) return Promise.reject(aborted());
      if (active < limit) return Promise.resolve(take());
      if (pending.length >= maxPending) return Promise.reject(busy());
      return new Promise((resolve, reject) => {
        let timer;
        const cancel = (error) => {
          const index = pending.indexOf(entry);
          if (index < 0) return;
          pending.splice(index, 1);
          entry.cleanup();
          reject(error);
        };
        const onAbort = () => cancel(aborted());
        const entry = {
          resolve,
          cleanup() {
            clearTimeout(timer);
            signal?.removeEventListener("abort", onAbort);
          },
        };
        pending.push(entry);
        signal?.addEventListener("abort", onAbort, { once: true });
        timer = setTimeout(
          () =>
            cancel(
              new ImportError(
                "Der Bildabruf wartet zu lange. Bitte später erneut versuchen.",
                503,
              ),
            ),
          waitMs,
        );
        timer.unref?.();
      });
    },
  };
}
