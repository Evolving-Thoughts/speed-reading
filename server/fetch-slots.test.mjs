import { afterEach, expect, it, vi } from "vitest";
import { createFetchSlots } from "./fetch-slots.mjs";
afterEach(() => vi.useRealTimers());

it("grants queued images FIFO without allowing an article to steal a released slot", async () => {
  const slots = createFetchSlots({ limit: 1 });
  const first = slots.acquire();
  const second = slots.acquireImage();
  const third = slots.acquireImage();
  expect(() => slots.acquire()).toThrow("gleichzeitige");
  first();
  expect(() => slots.acquire()).toThrow("gleichzeitige");
  const releaseSecond = await second;
  releaseSecond();
  const releaseThird = await third;
  releaseThird();
  slots.acquire()();
});
it("bounds the pending queue and retains the shared active limit", async () => {
  const slots = createFetchSlots({ limit: 1, maxPending: 1 });
  const release = slots.acquire();
  const waiting = slots.acquireImage();
  await expect(slots.acquireImage()).rejects.toMatchObject({ status: 429 });
  release();
  (await waiting)();
});
it("removes cancelled waiters and does not consume a slot for an already cancelled request", async () => {
  const slots = createFetchSlots({ limit: 1, maxPending: 1 });
  const release = slots.acquire();
  const controller = new AbortController();
  const cancelled = slots.acquireImage(controller.signal);
  const rejection = expect(cancelled).rejects.toMatchObject({ status: 499 });
  controller.abort();
  await rejection;
  await expect(slots.acquireImage(controller.signal)).rejects.toMatchObject({
    status: 499,
  });
  const next = slots.acquireImage();
  release();
  (await next)();
  slots.acquire()();
});
it("expires queued requests and frees queue capacity", async () => {
  vi.useFakeTimers();
  const slots = createFetchSlots({ limit: 1, maxPending: 1, waitMs: 100 });
  const release = slots.acquire();
  const waiting = slots.acquireImage();
  const rejection = expect(waiting).rejects.toMatchObject({ status: 503 });
  await vi.advanceTimersByTimeAsync(100);
  await rejection;
  const next = slots.acquireImage();
  release();
  (await next)();
  expect(vi.getTimerCount()).toBe(0);
});
it("releasing twice cannot exceed the concurrency budget and granted waiters lose their listeners/timers", async () => {
  vi.useFakeTimers();
  const slots = createFetchSlots({ limit: 1 });
  const release = slots.acquire();
  const controller = new AbortController();
  const remove = vi.spyOn(controller.signal, "removeEventListener");
  const waiting = slots.acquireImage(controller.signal);
  release();
  release();
  const finish = await waiting;
  expect(() => slots.acquire()).toThrow("gleichzeitige");
  expect(vi.getTimerCount()).toBe(0);
  expect(remove).toHaveBeenCalledWith("abort", expect.any(Function));
  controller.abort();
  finish();
  slots.acquire()();
});
