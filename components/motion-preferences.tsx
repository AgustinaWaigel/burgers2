"use client";

import { useEffect } from "react";

export function MotionPreferences() {
  useEffect(() => {
    const root = document.documentElement;
    const keyboard = () => { root.dataset.input = "keyboard"; };
    const pointer = () => { root.dataset.input = "pointer"; };
    document.addEventListener("keydown", keyboard, true);
    document.addEventListener("pointerdown", pointer, true);
    return () => {
      document.removeEventListener("keydown", keyboard, true);
      document.removeEventListener("pointerdown", pointer, true);
      delete root.dataset.input;
    };
  }, []);
  return null;
}
