"use client";

import { useEffect, useRef } from "react";

/** Native dialog focus/inert behavior, with interruptible CSS entry and exit. */
export function useDialogLifecycle(onClose: () => void) {
  const ref = useRef<HTMLDialogElement>(null);
  const closeRef = useRef<(instant?: boolean) => void>(() => {});
  const callback = useRef(onClose);
  useEffect(() => { callback.current = onClose; }, [onClose]);
  useEffect(() => {
    const dialog = ref.current;
    if (!dialog) return;
    const previousFocus = document.activeElement;
    const previousOverflow = document.body.style.overflow;
    let active = true;
    let closing = false;
    let finished = false;
    const busy = () => Boolean(dialog.querySelector('form[aria-busy="true"]'));
    const finish = () => { if (active && !finished) { finished = true; callback.current(); } };
    const close = (instant = document.documentElement.dataset.input === "keyboard") => {
      if (busy() || !active) return;
      if (instant) { finish(); return; }
      if (closing) return;
      closing = true;
      dialog.dataset.closing = "true";
      // Flush the new state so getAnimations includes the exit transitions.
      void getComputedStyle(dialog).opacity;
      const animations = dialog.getAnimations({ subtree: true });
      void Promise.allSettled(animations.map(animation => animation.finished)).then(finish);
    };
    closeRef.current = close;
    const onKey = (event: KeyboardEvent) => {
      if (event.key !== "Escape") return;
      // Handle Escape before the native close watcher, including repeated presses while saving.
      event.preventDefault(); event.stopPropagation(); close(true);
    };
    const onCancel = (event: Event) => { event.preventDefault(); close(true); };
    const onNativeClose = () => { if (busy() && active) dialog.setAttribute("open", ""); else finish(); };
    dialog.addEventListener("keydown", onKey, true);
    dialog.addEventListener("cancel", onCancel);
    dialog.addEventListener("close", onNativeClose);
    dialog.dataset.instant = String(document.documentElement.dataset.input === "keyboard");
    delete dialog.dataset.closing;
    dialog.setAttribute("open", "");
    dialog.querySelector<HTMLElement>("[data-dialog-heading]")?.focus({ preventScroll: true });
    document.body.style.overflow = "hidden";
    return () => {
      active = false;
      dialog.removeEventListener("keydown", onKey, true);
      dialog.removeEventListener("cancel", onCancel);
      dialog.removeEventListener("close", onNativeClose);
      dialog.removeAttribute("open");
      document.body.style.overflow = previousOverflow;
      if (previousFocus instanceof HTMLElement && previousFocus.isConnected) previousFocus.focus({ preventScroll: true });
    };
  }, []);
  return { ref, requestClose: () => closeRef.current() };
}
