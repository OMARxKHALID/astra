"use client";

import { useEffect } from "react";

export function useUrlSync({ 
  effectiveVideoUrl, 
  videoState, 
  pathname, 
  searchParams, 
  router 
}) {
  useEffect(() => {
    if (!effectiveVideoUrl || !pathname) return;
    
    const currentParams = new URLSearchParams(searchParams.toString());
    const isMovieOrYouTube = !videoState.isActiveTv || effectiveVideoUrl.includes("youtube");
    
    if (isMovieOrYouTube) {
      if (currentParams.has("tmdb")) {
        const newParams = new URLSearchParams();
        newParams.set("url", effectiveVideoUrl);
        router.replace(`${pathname}?${newParams.toString()}`, { scroll: false });
      }
    } else if (currentParams.has("url") && !currentParams.has("tmdb")) {
      const newParams = new URLSearchParams();
      newParams.set("url", effectiveVideoUrl);
      newParams.set("tmdb", videoState.id);
      newParams.set("type", "tv");
      newParams.set("s", videoState.s);
      newParams.set("e", videoState.e);
      router.replace(`${pathname}?${newParams.toString()}`, { scroll: false });
    }
  }, [effectiveVideoUrl, videoState, pathname, searchParams, router]);
}
