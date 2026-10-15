"use client";

import { useEffect, useRef, type ReactNode } from "react";

/** Reveal promotional content once, without hiding it before hydration. */
export function StorefrontMotion({ children }: { children: ReactNode }) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const hero = ref.current?.querySelector<HTMLElement>(".hero-grid");
    const burger = hero?.querySelector<HTMLElement>(".burger-stage .pixel-burger");
    if (!hero || !burger) return;
    const enabled = window.matchMedia("(hover: hover) and (pointer: fine) and (prefers-reduced-motion: no-preference)");
    // Spring: mass 1, stiffness 100, damping 10. Preserve velocity on reversal.
    const position = [0, 0];
    const velocity = [0, 0];
    const target = [0, 0];
    let frame = 0;
    let previous = 0;
    const reset = () => {
      cancelAnimationFrame(frame);
      frame = 0;
      position.fill(0);
      velocity.fill(0);
      target.fill(0);
      burger.style.removeProperty("translate");
      burger.style.removeProperty("rotate");
    };
    const tick = (now: number) => {
      const elapsed = Math.min((now - previous) / 1000, 0.032);
      previous = now;
      // Small integration steps keep the spring stable on slower displays.
      const steps = Math.max(1, Math.ceil(elapsed / 0.008));
      const dt = elapsed / steps;
      for (let step = 0; step < steps; step++) {
        for (let axis = 0; axis < 2; axis++) {
          velocity[axis] += ((target[axis] - position[axis]) * 100 - velocity[axis] * 10) * dt;
          position[axis] += velocity[axis] * dt;
        }
      }
      // Independent transforms preserve the existing entrance animation.
      burger.style.translate = `${position[0]}px ${position[1]}px`;
      burger.style.rotate = `${position[0] / 8}deg`;
      const settled = position.every((value, axis) => Math.abs(target[axis] - value) < 0.01 && Math.abs(velocity[axis]) < 0.01);
      if (settled) {
        frame = 0;
        burger.style.translate = `${target[0]}px ${target[1]}px`;
        burger.style.rotate = `${target[0] / 8}deg`;
      } else frame = requestAnimationFrame(tick);
    };
    const start = () => {
      if (frame) return;
      previous = performance.now();
      frame = requestAnimationFrame(tick);
    };
    const move = (event: PointerEvent) => {
      if (!enabled.matches || event.pointerType !== "mouse") return;
      const bounds = hero.getBoundingClientRect();
      if (!bounds.width || !bounds.height) return;
      target[0] = Math.max(-1, Math.min(1, (event.clientX - bounds.left) / bounds.width * 2 - 1)) * 24;
      target[1] = Math.max(-1, Math.min(1, (event.clientY - bounds.top) / bounds.height * 2 - 1)) * 16;
      start();
    };
    const leave = () => {
      target.fill(0);
      if (enabled.matches) start();
      else reset();
    };
    hero.addEventListener("pointermove", move, { passive: true });
    hero.addEventListener("pointerleave", leave);
    enabled.addEventListener("change", reset);
    window.addEventListener("blur", reset);
    window.addEventListener("scroll", reset, { passive: true });
    document.addEventListener("visibilitychange", reset);
    document.addEventListener("keydown", reset, true);
    return () => {
      reset();
      hero.removeEventListener("pointermove", move);
      hero.removeEventListener("pointerleave", leave);
      enabled.removeEventListener("change", reset);
      window.removeEventListener("blur", reset);
      window.removeEventListener("scroll", reset);
      document.removeEventListener("visibilitychange", reset);
      document.removeEventListener("keydown", reset, true);
    };
  }, []);

  useEffect(() => {
    const root = ref.current;
    if (!root || !("IntersectionObserver" in window)) return;
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)");
    const animations = new Set<Animation>();
    const cancel = () => {
      animations.forEach((animation) => animation.cancel());
      animations.clear();
    };
    const onKey = () => cancel();
    const observer = new IntersectionObserver((entries) => {
      for (const entry of entries) {
        if (!entry.isIntersecting) continue;
        observer.unobserve(entry.target);
        if (reduced.matches || document.documentElement.dataset.input === "keyboard") continue;
        const targets = entry.target.querySelectorAll("h2, .steps p");
        targets.forEach((target, index) => {
          const animation = target.animate(
            [{ opacity: 0, transform: "translateY(12px)" }, { opacity: 1, transform: "translateY(0)" }],
            { duration: 450, delay: index * 60, easing: getComputedStyle(root).getPropertyValue("--ease-out").trim(), fill: "backwards" },
          );
          animations.add(animation);
          animation.onfinish = () => animations.delete(animation);
        });
      }
    }, { threshold: 0.15 });
    root.querySelectorAll(".how-section").forEach((section) => observer.observe(section));
    reduced.addEventListener("change", cancel);
    document.addEventListener("keydown", onKey, true);
    return () => {
      observer.disconnect();
      cancel();
      reduced.removeEventListener("change", cancel);
      document.removeEventListener("keydown", onKey, true);
    };
  }, []);

  return <div ref={ref} className="storefront-motion">{children}</div>;
}
