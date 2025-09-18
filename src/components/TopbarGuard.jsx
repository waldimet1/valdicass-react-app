import React, { useLayoutEffect, useRef, useState } from "react";

/**
 * TopbarGuard
 * Wrap your sticky header in this. It:
 *  - Measures the header height with ResizeObserver
 *  - Sets the CSS var --topbar-h on :root
 *  - Renders a spacer of the same height right after the header
 * So your content never hides under the sticky bar—even when the bar's height changes.
 */
export default function TopbarGuard({ children }) {
  const wrapRef = useRef(null);
  const [h, setH] = useState(0);

  useLayoutEffect(() => {
    const el = wrapRef.current?.firstElementChild;
    if (!el) return;

    const apply = () => {
      const height = el.offsetHeight || 0;
      setH(height);
      // Make anchors and anything relying on the CSS var correct globally
      document.documentElement.style.setProperty("--topbar-h", `${height}px`);
    };

    apply();

    let ro;
    if ("ResizeObserver" in window) {
      ro = new ResizeObserver(apply);
      ro.observe(el);
    } else {
      // Fallback: listen to window resizes
      window.addEventListener("resize", apply);
    }

    return () => {
      ro?.disconnect?.();
      window.removeEventListener("resize", apply);
    };
  }, []);

  return (
    <>
      <div ref={wrapRef}>{children}</div>
      {/* spacer keeps the content below the sticky header */}
      <div aria-hidden="true" style={{ height: h }} />
    </>
  );
}

