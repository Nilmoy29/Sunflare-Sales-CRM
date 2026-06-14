"use client";

/**
 * Waits until a DOM element has non-zero layout dimensions (Mapbox init requirement).
 */
export function waitForElementSize(element: HTMLElement): Promise<void> {
  return new Promise((resolve) => {
    const check = () => {
      if (element.offsetWidth > 0 && element.offsetHeight > 0) {
        resolve();
        return;
      }
      requestAnimationFrame(check);
    };
    check();
  });
}
