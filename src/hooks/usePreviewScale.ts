import { useEffect, useState } from "react";

/** Computes a CSS scale so a 21cm-wide print sheet fits the available width on mobile. */
export function usePreviewScale() {
  const [scale, setScale] = useState(1);

  useEffect(() => {
    const compute = () => {
      // 1cm ≈ 37.8px at 96dpi. Sheet width = 21cm + small breathing room.
      const sheetPx = 21 * 37.8;
      const available = Math.min(window.innerWidth - 24, 900);
      if (window.innerWidth >= 900) {
        setScale(1);
      } else {
        setScale(Math.max(0.32, Math.min(1, available / sheetPx)));
      }
    };
    compute();
    window.addEventListener("resize", compute);
    window.addEventListener("orientationchange", compute);
    return () => {
      window.removeEventListener("resize", compute);
      window.removeEventListener("orientationchange", compute);
    };
  }, []);

  return scale;
}
