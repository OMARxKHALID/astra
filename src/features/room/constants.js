import {
  Crown as CrownIcon,
  Film as FilmIcon,
  Unlock as UnlockIcon,
  Lock as LockIcon,
  Captions as CcIcon,
  Shield as ShieldIcon,
  SkipForward as SeekIcon,
} from "lucide-react";

export const SYSTEM_TAGS = {
  HOST: "[HOST]",
  VIDEO: "[VIDEO]",
  SUBS: "[SUBS]",
  LOCK: "[LOCK]",
  UNLOCK: "[UNLOCK]",
  STRICT_ON: "[STRICT_ON]",
  STRICT_OFF: "[STRICT_OFF]",
  STRICT: "[STRICT]",
  SEEK: "[SEEK]",
};

export const SYSTEM_ICONS = {
  [SYSTEM_TAGS.HOST]: { Icon: CrownIcon, color: "text-amber-500", toastType: "info" },
  [SYSTEM_TAGS.VIDEO]: { Icon: FilmIcon, color: "text-jade", toastType: "success" },
  [SYSTEM_TAGS.SUBS]: { Icon: CcIcon, color: "text-jade", toastType: "success" },
  [SYSTEM_TAGS.LOCK]: { Icon: LockIcon, color: "text-amber-400", toastType: "info" },
  [SYSTEM_TAGS.UNLOCK]: { Icon: UnlockIcon, color: "text-jade", toastType: "success" },
  [SYSTEM_TAGS.STRICT_ON]: { Icon: ShieldIcon, color: "text-jade", toastType: "success" },
  [SYSTEM_TAGS.STRICT_OFF]: { Icon: ShieldIcon, color: "text-white/40", toastType: "info" },
  [SYSTEM_TAGS.STRICT]: { Icon: ShieldIcon, color: "text-danger", toastType: "error" },
  [SYSTEM_TAGS.SEEK]: { Icon: SeekIcon, color: "text-amber-400", toastType: "info" },
};
