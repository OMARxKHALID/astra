import { useState, useCallback } from "react";
import { localStorage } from "@/utils/localStorage";
import { LS_KEYS } from "@/constants/config";

export function useBingeWatch(addToast = null) {
  const [enabled, setEnabled] = useState(
    () => localStorage.get(LS_KEYS.bingeWatch) === "1",
  );

  const toggle = useCallback(() => {
    setEnabled((prev) => {
      const next = !prev;
      localStorage.set(LS_KEYS.bingeWatch, next ? "1" : "0");
      if (addToast) {
        addToast(`Binge watch ${next ? "enabled" : "disabled"}`, "info");
      }
      return next;
    });
  }, [addToast]);

  return [enabled, toggle];
}
