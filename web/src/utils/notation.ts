import type { Move } from '../types/tekken';

/**
 * Normalizes a Tekken notation string by stripping symbols and common separators.
 * e.g. "d/f+2" -> "df2", "1, 1, 2" -> "112", "f,f+2" -> "ff2", "ws+4" -> "ws4"
 */
export function cleanNotation(str: string): string {
  if (!str) return '';
  return str
    .toLowerCase()
    .replace(/[\/,\+\s\.\-_~\*]/g, '')
    .trim();
}

/**
 * Checks if a move matches the user's search query using Smart Tekken Notation rules.
 * Rules:
 * 1. Empty query matches everything.
 * 2. Matches move name (e.g. "flash", "electric", "scissor").
 * 3. Exact raw input matches (e.g. typing "1,1,2" matches "1,1,2").
 * 4. Cleaned notation matching:
 *    - If query is pure notation (e.g. "11", "112", "df2", "ff2"), prioritize PREFIX match.
 *      i.e. typing "11" matches "1,1" and "1,1,2", but hides moves that don't start with 1 (like "d+1,1" or "f+1,1").
 *    - Typing "df2" matches "d/f+2", "df+2".
 *    - Typing "ff2" matches "f,f+2".
 */
export function matchesMoveQuery(move: Move, rawQuery: string): boolean {
  const query = rawQuery.trim();
  if (!query) return true;

  const qLower = query.toLowerCase();

  // 1. Name match (case-insensitive substring)
  const lowerName = move._lowerName ?? move.name.toLowerCase();
  if (lowerName.includes(qLower)) {
    return true;
  }

  // 2. Exact literal input substring (allows user to type commas or pluses if they wish)
  const lowerInput = move._lowerInput ?? move.input.toLowerCase();
  if (lowerInput.includes(qLower)) {
    return true;
  }

  // 3. Clean notation prefix matching
  const cleanQ = cleanNotation(query);
  if (!cleanQ) return true;

  const cleanInput = move._cleanInput ?? cleanNotation(move.input);

  // If cleanInput starts with cleanQ (e.g. "11" matches "11", "112", "11WAR2")
  if (cleanInput.startsWith(cleanQ)) {
    return true;
  }

  // Also check ID if notation in input is partial
  const cleanId = move._cleanId ?? cleanNotation(move.id.split('-').slice(1).join(''));
  if (cleanId.startsWith(cleanQ)) {
    return true;
  }

  // Handle common directional shorthands
  // E.g. user typed "qcf2", "ws4", "wr3"
  if (cleanQ.startsWith('ws') && cleanInput.startsWith('ws')) {
    return cleanInput.includes(cleanQ);
  }

  return false;
}
