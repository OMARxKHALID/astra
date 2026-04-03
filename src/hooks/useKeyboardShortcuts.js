import { useEffect, useCallback } from "react";

export function useKeyboardShortcuts(shortcuts = {}, deps = []) {
  const handleKey = useCallback(
    (e) => {
      const handler = shortcuts[e.key];
      if (handler) {
        e.preventDefault();
        handler(e);
      }
    },
    [shortcuts],
  );

  useEffect(() => {
    document.addEventListener("keydown", handleKey);
    return () => document.removeEventListener("keydown", handleKey);
  }, [handleKey, ...deps]);
}
