// City typeahead: debounced, cached search with keyboard navigation.
// Stays a free-text field (so any value still works), but offers real city
// suggestions as you type and writes a clean "City, ST" label on select.
//
// Search is driven by the user TYPING (onChange of the input), not by the
// `value` prop — so a pre-filled location on load, or selecting an item, never
// triggers a spurious fetch or opens the dropdown on its own.
import { useEffect, useRef, useState } from "react";
import { BORDER, PRIMARY_SOFT, SURFACE, TEXT, TEXT_2, TEXT_3 } from "./theme.js";
import { searchCities } from "./geo.js";

export default function LocationAutocomplete({ value, onChange, placeholder }) {
  const [open, setOpen] = useState(false);
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const [noMatch, setNoMatch] = useState(false);
  const [hi, setHi] = useState(-1);

  const box = useRef(null);
  const timer = useRef(null);
  const ctrl = useRef(null);

  // Cancel any in-flight debounce/request on unmount.
  useEffect(
    () => () => {
      clearTimeout(timer.current);
      ctrl.current?.abort();
    },
    []
  );

  // Close when clicking outside.
  useEffect(() => {
    const onDoc = (e) => {
      if (box.current && !box.current.contains(e.target)) setOpen(false);
    };
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, []);

  // Run a debounced, abortable search. Called only from the typing handler.
  const runSearch = (raw) => {
    clearTimeout(timer.current);
    ctrl.current?.abort();
    const q = raw.trim();
    if (q.length < 2) {
      setResults([]);
      setNoMatch(false);
      setLoading(false);
      setOpen(false);
      return;
    }
    setLoading(true);
    setOpen(true);
    timer.current = setTimeout(async () => {
      const ac = new AbortController();
      ctrl.current = ac;
      try {
        const r = await searchCities(q, ac.signal);
        if (ac.signal.aborted) return;
        setResults(r);
        setNoMatch(r.length === 0);
        setHi(-1);
        setOpen(true);
      } catch (e) {
        if (e.name !== "AbortError") {
          setResults([]);
          setNoMatch(false);
          setOpen(false);
        }
      } finally {
        if (!ac.signal.aborted) setLoading(false);
      }
    }, 250);
  };

  const onType = (e) => {
    const v = e.target.value;
    onChange(v);
    runSearch(v);
  };

  const select = (r) => {
    clearTimeout(timer.current);
    ctrl.current?.abort();
    onChange(r.label);
    setResults([]);
    setNoMatch(false);
    setOpen(false);
    setHi(-1);
  };

  const onKey = (e) => {
    if (!open) return;
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setHi((h) => Math.min(h + 1, results.length - 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setHi((h) => Math.max(h - 1, 0));
    } else if (e.key === "Enter") {
      if (hi >= 0 && results[hi]) {
        e.preventDefault();
        select(results[hi]);
      }
    } else if (e.key === "Escape") {
      setOpen(false);
    }
  };

  const showDrop = open && (loading || results.length > 0 || noMatch);

  return (
    <div ref={box} style={{ position: "relative", flex: 1, minWidth: 0 }}>
      <input
        value={value}
        placeholder={placeholder}
        onChange={onType}
        onKeyDown={onKey}
        onFocus={() => results.length > 0 && setOpen(true)}
        style={{
          width: "100%",
          font: "inherit",
          fontSize: 13.5,
          color: TEXT,
          background: "transparent",
          border: "none",
          outline: "none",
          padding: "6px 0",
        }}
      />
      {showDrop && (
        <div
          style={{
            position: "absolute",
            top: "calc(100% + 6px)",
            left: -8,
            right: -8,
            zIndex: 30,
            background: SURFACE,
            border: `1px solid ${BORDER}`,
            borderRadius: 9,
            boxShadow: "0 12px 32px rgba(16,24,40,0.16)",
            overflow: "hidden",
            maxHeight: 280,
            overflowY: "auto",
          }}
        >
          {loading && results.length === 0 && <Note>Searching…</Note>}
          {!loading && noMatch && <Note>No matching cities</Note>}
          {results.map((r, i) => (
            <button
              key={r.id}
              onMouseEnter={() => setHi(i)}
              onMouseDown={(e) => {
                e.preventDefault(); // keep focus; fire before blur
                select(r);
              }}
              style={{
                display: "flex",
                alignItems: "center",
                gap: 10,
                width: "100%",
                textAlign: "left",
                border: "none",
                cursor: "pointer",
                padding: "9px 12px",
                fontFamily: "inherit",
                fontSize: 13.5,
                color: TEXT,
                background: i === hi ? PRIMARY_SOFT : "transparent",
              }}
            >
              <Dot />
              <span style={{ fontWeight: 500 }}>{r.name}</span>
              {r.state && <span style={{ color: TEXT_3, fontSize: 12 }}>{r.state}</span>}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

const Note = ({ children }) => (
  <div style={{ padding: "10px 12px", fontSize: 12.5, color: TEXT_3 }}>{children}</div>
);

const Dot = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke={TEXT_2} strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0 }}>
    <path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z" />
    <circle cx="12" cy="10" r="2.6" />
  </svg>
);
