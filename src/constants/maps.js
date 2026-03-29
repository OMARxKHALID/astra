export const STATUS_MAP = {
  connecting: {
    dot: "bg-amber-400 animate-pulse",
    label: "CONNECTING",
    color: "text-amber-400",
  },
  reconnecting: {
    dot: "bg-danger animate-ping",
    label: "RECONNECTING",
    color: "text-danger",
  },
  connected: {
    dot: "bg-jade shadow-[0_0_8px_rgba(16,185,129,0.5)]",
    label: "LIVE",
    color: "text-jade",
  },
};

export const SYNC_MAP = {
  synced: { label: "SYNCED", color: "text-white/40" },
  soft: { label: "ADJUSTING", color: "text-amber-400/60" },
  hard: { label: "SYNCING", color: "text-danger/60" },
};

export const KEYBOARD_ROWS = [
  [
    { k: "Q" },
    { k: "W" },
    { k: "E" },
    { k: "R" },
    { k: "T", active: true },
    { k: "Y" },
    { k: "U" },
    { k: "I" },
    { k: "O" },
    { k: "P" },
  ],
  [
    { k: "A" },
    { k: "S" },
    { k: "D" },
    { k: "F", active: true },
    { k: "G" },
    { k: "H" },
    { k: "J", active: true },
    { k: "K", active: true, highlight: true },
    { k: "L", active: true },
  ],
  [
    { k: "Z" },
    { k: "X" },
    { k: "C" },
    { k: "V" },
    { k: "B" },
    { k: "N" },
    { k: "M", active: true },
    { k: "," },
    { k: "." },
    { k: "?", active: true },
  ],
];

export const GENRE_MAP = {
  28: "Action",
  12: "Adventure",
  16: "Animation",
  35: "Comedy",
  80: "Crime",
  18: "Drama",
  10751: "Family",
  14: "Fantasy",
  27: "Horror",
  9648: "Mystery",
  10749: "Romance",
  878: "Sci-Fi",
  53: "Thriller",
  37: "Western",
  10759: "Action & Adventure",
  10765: "Sci-Fi & Fantasy",
};
