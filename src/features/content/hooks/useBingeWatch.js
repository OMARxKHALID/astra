import { useState, useCallback } from "react";
import { ls } from "@/utils/localStorage";
import { LS_KEYS } from "@/constants/config";

export function useBingeWatch(addToast = null) {
  const [enabled, setEnabled] = useState(
    () => ls.get(LS_KEYS.bingeWatch) === "1",
  );

  const toggle = useCallback(() => {
    setEnabled((prev) => {
      const next = !prev;
      ls.set(LS_KEYS.bingeWatch, next ? "1" : "0");
      if (addToast) {
        addToast(`Binge watch ${next ? "enabled" : "disabled"}`, "info");
      }
      return next;
    });
  }, [addToast]);

  return [enabled, toggle];
}
