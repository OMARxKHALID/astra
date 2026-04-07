// SSR-safe localStorage wrapper — single source of truth for all hooks
export const ls = {
  get(k) {
    try {
      return typeof window !== "undefined" ? localStorage.getItem(k) : null;
    } catch {
      return null;
    }
  },
  set(k, v) {
    try {
      if (typeof window !== "undefined") localStorage.setItem(k, v);
    } catch { /* noop */ }
  },
  remove(k) {
    try {
      if (typeof window !== "undefined") localStorage.removeItem(k);
    } catch { /* noop */ }
  },
};
