"use client";

import { useEffect } from "react";
import type { Map as MapboxMap } from "mapbox-gl";

/**
 * Keeps a Mapbox map sized correctly when its container changes (mobile layout, rotation).
 */
export function useMapboxResize(
  mapRef: React.RefObject<MapboxMap | null>,
  containerRef: React.RefObject<HTMLElement | null>,
  ready: boolean,
) {
  useEffect(() => {
    if (!ready) {
      return;
    }

    const map = mapRef.current;
    const container = containerRef.current;
    if (!map || !container) {
      return;
    }

    const resize = () => {
      try {
        map.resize();
      } catch {
        // Map may be tearing down.
      }
    };

    resize();

    const observer = new ResizeObserver(() => {
      resize();
    });
    observer.observe(container);

    window.addEventListener("orientationchange", resize);
    window.addEventListener("resize", resize);

    return () => {
      observer.disconnect();
      window.removeEventListener("orientationchange", resize);
      window.removeEventListener("resize", resize);
    };
  }, [mapRef, containerRef, ready]);
}
