"use client";

import { useEffect } from "react";

export function PWARegister() {
  useEffect(() => {
    if (typeof window !== "undefined" && "serviceWorker" in navigator) {
      navigator.serviceWorker
        .register("/sw.js")
        .then(() => {
          console.log("[PWA] Service Worker registered");
        })
        .catch((err) => {
          console.warn("[PWA] SW registration failed:", err);
        });
    }
  }, []);

  return null;
}
