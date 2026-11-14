import { useEffect, useId, useState } from "react";
import { deviceHref } from "../router.js";

// Sends the visitor to the report page. The hero hides the label visually (the placeholder carries the meaning).
export default function SearchBox({ initial = "", inputId, hiddenLabel = false, helper, button = "Check device" }) {
  const autoId = useId();
  const id = inputId || autoId;
  const [value, setValue] = useState(initial);
  useEffect(() => setValue(initial), [initial]);

  function submit(e) {
    e.preventDefault();
    const v = value.trim();
    if (v) window.location.hash = deviceHref(v);
  }

  return (
    <form className="search" onSubmit={submit} role="search">
      <label htmlFor={id} className={hiddenLabel ? "sr-only" : "label"}>Device ID</label>
      <div className="search-row">
        <input id={id} className={`input id-input ${value ? "has-value" : ""}`} value={value} onChange={(e) => setValue(e.target.value)} placeholder="Device ID, e.g. SN-1001" autoComplete="off" spellCheck="false" />
        <button className="btn" disabled={!value.trim()}>{button}</button>
      </div>
      {helper && <p className="helper">{helper}</p>}
    </form>
  );
}
