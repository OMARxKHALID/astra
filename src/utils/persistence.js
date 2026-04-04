import { ls } from "./localStorage";
import { LS_KEYS } from "@/constants/config";

export const persistence = {
  getWatched: () => {
    try {
      return JSON.parse(ls.get(LS_KEYS.watched) || "[]");
    } catch {
      return [];
    }
  },
  
  getFavorites: () => {
    try {
      return JSON.parse(ls.get(LS_KEYS.favorites) || "[]");
    } catch {
      return [];
    }
  },
  
  markAsWatched: (item, type) => {
    if (!item?.id) return [];
    try {
      let watched = persistence.getWatched();
      const itemType = type || item.type || "movie";
      watched = watched.filter(w => !(w.id === item.id && w.type === itemType));
      watched.unshift({
        id: item.id,
        type: itemType,
        title: item.title,
        poster: item.poster,
        rating: item.rating,
        year: item.year
      });
      if (watched.length > 30) watched.pop();
      ls.set(LS_KEYS.watched, JSON.stringify(watched));
      return watched;
    } catch {
      return [];
    }
  },

  toggleFavorite: (item, type) => {
    if (!item?.id) return false;
    try {
      let favs = persistence.getFavorites();
      const itemType = type || item.type || "movie";
      const isFav = favs.some(f => f.id === item.id && f.type === itemType);
      
      if (isFav) {
        favs = favs.filter(f => !(f.id === item.id && f.type === itemType));
      } else {
        favs.unshift({
          id: item.id,
          type: itemType,
          title: item.title,
          poster: item.poster,
          rating: item.rating,
          year: item.year
        });
      }
      ls.set(LS_KEYS.favorites, JSON.stringify(favs));
      return !isFav;
    } catch {
      return false;
    }
  },

  isFavorite: (id, type) => {
    return persistence.getFavorites().some(f => f.id === id && f.type === type);
  }
};
