// Single source of truth for the Quarterbyte brand mark.
//
// Usage:
//   <Logo size={28} />            -> square donut "Q" mark
//   <Logo wordmark height={26} /> -> the mark + "Quarterbyte" lockup
//
// The mark is the transparent PNG in /public; the wordmark lockup pairs it with
// the word rendered in the UI's own font so it reads cleanly on the light theme.
// To change the art, replace public/quarterbyte_icon.png (keep it transparent).
import { TEXT } from "./theme.js";

// The real logo art (transparent PNGs). The square donut "Q" mark is used
// everywhere; the wordmark lockup pairs that mark with the word "Quarterbyte"
// rendered in the UI's own font/color so it reads cleanly on the light theme.
// (The provided wordmark PNG had white text on navy, which disappears on a light
// background, so we compose the lockup from the transparent mark + live text.)
const MARK_SRC = "/quarterbyte_icon.png"; // transparent square mark (~400x412)

export default function Logo({ wordmark = false, size = 28, height, alt = "Quarterbyte" }) {
  // Wordmark lockup: mark + word, sized by height.
  if (wordmark) {
    const h = height ?? 26;
    return (
      <span style={{ display: "inline-flex", alignItems: "center", gap: 9 }}>
        <Mark size={Math.round(h * 1.12)} />
        <span style={{ fontSize: Math.round(h * 0.72), fontWeight: 700, color: TEXT, letterSpacing: -0.3 }}>
          Quarterbyte
        </span>
      </span>
    );
  }
  // Square mark on its own.
  return <Mark size={size} />;
}

function Mark({ size = 28 }) {
  return (
    <img
      src={MARK_SRC}
      alt="Quarterbyte"
      width={size}
      height={size}
      style={{ display: "block", flexShrink: 0, objectFit: "contain" }}
    />
  );
}
