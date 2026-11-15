import { useEffect, useState } from "react";

// Tiny hash router: #/ , #/device/<id> , #/partners. A few extra hashes just scroll the home page.
export function parseHash(hash) {
  const parts = hash.replace(/^#/, "").split("/").filter(Boolean);
  if (parts[0] === "device" && parts[1]) {
    try {
      return { name: "device", id: decodeURIComponent(parts.slice(1).join("/")) };
    } catch {
      return { name: "device", id: parts.slice(1).join("/") };
    }
  }
  if (parts[0] === "partners") return { name: "partners" };
  if (parts[0] === "demo") return { name: "demo" };
  if (["how", "check", "sample", "faq"].includes(parts[0])) return { name: "home", target: parts[0] };
  return { name: "home" };
}

export const deviceHref = (id) => `#/device/${encodeURIComponent(id)}`;

export function useRoute() {
  const [route, setRoute] = useState(() => parseHash(window.location.hash));
  useEffect(() => {
    const onChange = () => setRoute(parseHash(window.location.hash));
    window.addEventListener("hashchange", onChange);
    return () => window.removeEventListener("hashchange", onChange);
  }, []);
  return route;
}

// QR codes and old links look like /?productId=SN-1001 (or /?id=SN-1001). Returns a clean ID, or null if it is unusable.
export function idFromQuery(search) {
  const params = new URLSearchParams(search);
  const raw = (params.get("productId") ?? params.get("id") ?? "").trim();
  // 1 to 64 characters and no control characters, so a pasted link cannot smuggle odd text into the page.
  return /^[^\u0000-\u001f\u007f]{1,64}$/.test(raw) ? raw : null;
}
