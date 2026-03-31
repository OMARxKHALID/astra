import { useCallback, useRef } from "react";

export function useAmbilight(settings) {
  const rootAmbiRef = useRef(null);
  const bentoVideoRef = useRef(null);

  const handleAmbiColors = useCallback(
    (colors) => {
      const overlay = rootAmbiRef.current;
      if (overlay) {
        if (colors && settings.ambilightEnabled) {
          overlay.style.opacity = "1";
          overlay.style.background = `radial-gradient(ellipse 100% 100% at 50% 0%, rgba(${colors.r},${colors.g},${colors.b},0.4) 0%, transparent 100%)`;
        } else {
          overlay.style.opacity = "0";
        }
      }
      const section = bentoVideoRef.current;
      if (section) {
        section.style.boxShadow =
          colors && settings.ambilightEnabled
            ? `0 0 100px 30px rgba(${colors.r},${colors.g},${colors.b},0.35), inset 0 1px 0 rgba(255,255,255,0.055)`
            : "";
      }
    },
    [settings.ambilightEnabled]
  );

  return { rootAmbiRef, bentoVideoRef, handleAmbiColors };
}
