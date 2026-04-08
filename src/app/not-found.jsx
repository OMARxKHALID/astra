import Link from "next/link";
import { SearchX } from "lucide-react";

export const metadata = {
  title: "404 - Page Not Found",
};

export default function NotFound() {
  return (
    <div className="flex flex-col items-center justify-center min-h-[70vh] gap-4 p-6 animate-[fadeIn_0.5s_ease-out]">
      <div className="relative mb-4">
        <SearchX className="w-16 h-16 text-white/10" strokeWidth={1} />
        <div className="absolute inset-0 bg-amber-500/10 blur-2xl rounded-full" />
      </div>
      <h2 className="text-xl font-mono uppercase tracking-wider text-white/60 text-center">
        404 - Not Found
      </h2>
      <p className="text-sm text-white/40 text-center max-w-sm leading-relaxed mb-6">
        The page you are looking for does not exist, has been moved, or is temporarily unavailable.
      </p>
      <Link href="/" className="btn-primary">
        Return Home
      </Link>
    </div>
  );
}
