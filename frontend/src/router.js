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
