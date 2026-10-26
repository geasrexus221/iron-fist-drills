import type { CharacterName } from '../types/tekken';

export type FavoritesMap = Record<CharacterName, string[]>;

export const DEFAULT_FAVORITES: FavoritesMap = {
  Alisa: [],
  Asuka: [],
  Azucena: [],
  Bryan: [],
  Claudio: [],
  'Devil Jin': [],
  Eddy: [],
  Feng: [],
  Hwoarang: [],
  'Jack-8': [],
  Jin: [],
  Jun: [],
  Kazuya: [],
  King: [],
  Kuma: [],
  Lars: [],
  Lee: [],
  Leo: [],
  Leroy: [],
  Lidia: [],
  Lili: [],
  Law: [],
  Nina: [],
  Panda: [],
  Paul: [],
  Raven: [],
  Reina: [],
  Shaheen: [],
  Steve: [],
  Victor: [],
  Xiaoyu: [],
  Yoshimitsu: [],
  Zafina: [],
  Heihachi: [],
  'Armor King': [],
};

const STORAGE_KEY = 't8_favorites_backup';

/**
 * Loads favorites from /api/favorites (physical file: data/favorites.json),
 * with localStorage fallback.
 */
export async function loadFavorites(): Promise<FavoritesMap> {
  try {
    const res = await fetch('/api/favorites');
    if (res.ok) {
      const data = await res.json();
      const merged: FavoritesMap = { ...DEFAULT_FAVORITES, ...data };
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(merged));
      } catch {
        // ignore localStorage quota error
      }
      return merged;
    }
  } catch (err) {
    console.warn('API favorites fetch failed, falling back to localStorage', err);
  }

  try {
    const cached = localStorage.getItem(STORAGE_KEY);
    if (cached) {
      return { ...DEFAULT_FAVORITES, ...JSON.parse(cached) };
    }
  } catch {
    // ignore
  }

  return { ...DEFAULT_FAVORITES };
}

/**
 * Saves favorites to /api/favorites (writes to data/favorites.json)
 * and updates localStorage backup.
 */
export async function saveFavorites(data: FavoritesMap): Promise<boolean> {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
  } catch {
    // ignore
  }

  try {
    const res = await fetch('/api/favorites', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data, null, 2),
    });
    return res.ok;
  } catch (err) {
    console.warn('API favorites save failed', err);
    return false;
  }
}

/**
 * Triggers a browser download of the favorites as a .json file.
 */
export function exportFavoritesToFile(data: FavoritesMap) {
  const jsonStr = JSON.stringify(data, null, 2);
  const blob = new Blob([jsonStr], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `tekken8_favorites_${new Date().toISOString().slice(0, 10)}.json`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

/**
 * Reads an uploaded JSON file and parses it into FavoritesMap.
 */
export function importFavoritesFromFile(file: File): Promise<FavoritesMap> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const text = e.target?.result as string;
        const parsed = JSON.parse(text);
        const validated: FavoritesMap = { ...DEFAULT_FAVORITES, ...parsed };
        resolve(validated);
      } catch (err) {
        reject(new Error('Format file JSON tidak valid.'));
      }
    };
    reader.onerror = () => reject(new Error('Gagal membaca file.'));
    reader.readAsText(file);
  });
}
