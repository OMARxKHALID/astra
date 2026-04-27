// SSR-safe localStorage wrapper — single source of truth for all hooks
export const localStorage = {
  get(k) {
    try {
      return typeof window !== "undefined" ? window.localStorage.getItem(k) : null;
    } catch {
      return null;
    }
  },
  set(k, v) {
    try {
      if (typeof window !== "undefined") window.localStorage.setItem(k, v);
    } catch { /* noop */ }
  },
  remove(k) {
    try {
      if (typeof window !== "undefined") window.localStorage.removeItem(k);
    } catch { /* noop */ }
  },
};

