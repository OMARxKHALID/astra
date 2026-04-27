export const STRICT_VIDEO_EXTENSIONS = /\.(mp4|webm|ogg|mkv|mov|avi)(\?|$)/i;
export const KNOWN_VIDEO_EXTENSIONS = /\.(mp4|webm|ogg|m4v|mov|mkv|avi|ts)(\?|$)/i;

export function videoValidation(raw) {
  if (!raw || typeof raw !== "string") return false;
  try {
    const url = new URL(raw.trim());
    return STRICT_VIDEO_EXTENSIONS.test(url.pathname.toLowerCase());
  } catch {
    return false;
  }
}
