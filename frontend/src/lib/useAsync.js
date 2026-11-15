import { useEffect, useState } from "react";

// Loads one part of a report on its own, so a failure in one part never hides the others.
// Returns { state: "loading" | "ready" | "error", data, retry }. Raw errors go to the footer's technical details.
// With { keep: true }, the previous result stays on screen while a reload runs (no flicker between demo steps).
export function useAsync(loader, deps, onTech, { keep = false } = {}) {
  const [result, setResult] = useState({ state: "loading" });
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    let live = true;
    setResult((r) => (keep && r.state === "ready" ? r : { state: "loading" }));
    loader()
      .then((data) => live && setResult({ state: "ready", data }))
      .catch((err) => {
        if (!live) return;
        onTech?.({ lastError: err.shortMessage || err.message });
        setResult({ state: "error" });
      });
    return () => { live = false; };
  }, [...deps, attempt]);

  return { ...result, retry: () => setAttempt((n) => n + 1) };
}
