"use client";

import { useEffect, useState } from "react";

export function ServiceWorkerRegistration() {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  // A service worker registered from a prior production/preview run on the same origin
  // can intercept Next dev requests and serve stale or empty CSS — unregister in dev.
  useEffect(() => {
    if (typeof window === "undefined" || process.env.NODE_ENV !== "development") return;
    if (!("serviceWorker" in navigator)) return;
    void navigator.serviceWorker.getRegistrations().then((regs) =>
      Promise.all(regs.map((r) => r.unregister()))
    );
  }, []);

  useEffect(() => {
    if (
      !mounted ||
      typeof window === "undefined" ||
      !("serviceWorker" in navigator) ||
      process.env.NODE_ENV === "development"
    ) {
      return;
    }

    navigator.serviceWorker
      .register("/sw.js")
      .then((registration) => {
        registration.addEventListener("updatefound", () => {
          const newWorker = registration.installing;
          if (!newWorker) return;

          newWorker.addEventListener("statechange", () => {
            if (
              newWorker.state === "installed" &&
              navigator.serviceWorker.controller
            ) {
              newWorker.postMessage({ type: "SKIP_WAITING" });
            }
          });
        });
      })
      .catch(() => {});
  }, [mounted]);

  return null;
}

export default ServiceWorkerRegistration;
