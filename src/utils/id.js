export function generateId(length = 8) {
  if (typeof crypto !== "undefined" && crypto.randomUUID) {
    return crypto.randomUUID().slice(0, length);
  }
  return Math.random().toString(36).slice(2, 2 + length);
}

export function generateGuestId() {
  const ts = typeof Date !== "undefined" ? Date.now().toString(36) : "0";
  return `guest-${generateId(11)}-${ts}`;
}
