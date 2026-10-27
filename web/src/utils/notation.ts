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

/**
 * Formats a move's startup string for display.
 * If a move has multiple hits (e.g. "i13 i8 i12"), Option A displays only the first hit startup (e.g. "i13").
 */
export function formatStartup(startup?: string | null, startupNum?: number | null): string {
  if (startup && startup.trim()) {
    const firstToken = startup.trim().split(/\s+/)[0];
    return firstToken;
  }
  if (startupNum !== undefined && startupNum !== null) {
    return `i${startupNum}`;
  }
  return '-';
}

export interface MoveAttributeBadge {
  code: string;
  label: string;
  colorClass: string;
}

export interface AttributeInfo {
  code: string;
  fullName: string;
  category: string;
  description: string;
  colorClass: string;
}

export const ATTRIBUTE_DIRECTORY: AttributeInfo[] = [
  {
    code: 'PC',
    fullName: 'Power Crush',
    category: 'Move Property',
    description: 'Serangan ber-armor yang menyerap serangan High dan Mid musuh saat startup tanpa terinterupsi.',
    colorClass: 'attr-pc',
  },
  {
    code: 'HOM',
    fullName: 'Homing',
    category: 'Move Property',
    description: 'Serangan dengan pelacakan sudut penuh (full tracking) yang tidak bisa dihindari dengan sidestep maupun sidewalk.',
    colorClass: 'attr-hom',
  },
  {
    code: 'HEAT',
    fullName: 'Heat Engager',
    category: 'Move Property',
    description: 'Gerakan pemicu aktivasi Heat State, serangan pemungkas Heat Smash, atau Heat Dash untuk ekstensi combo.',
    colorClass: 'attr-heat',
  },
  {
    code: 'TOR',
    fullName: 'Tornado',
    category: 'Move Property',
    description: 'Efek putaran tubuh musuh di udara (tailspin) saat juggle untuk perpanjangan kombo atau transisi ke dinding arena.',
    colorClass: 'attr-tor',
  },
  {
    code: 'RHP',
    fullName: 'Recoverable HP',
    category: 'Move Property',
    description: 'Menghasilkan atau mengikis bar darah abu-abu (recoverable health gauge) musuh atau memulihkan darah sendiri.',
    colorClass: 'attr-rhp',
  },
  {
    code: 'FC',
    fullName: 'Force Crouch',
    category: 'Move Property',
    description: 'Serangan yang memaksa lawan berada dalam posisi jongkok setelah terkena hit (+c) atau block (-c). Lawan tidak bisa merespon dengan standing jab i10.',
    colorClass: 'attr-fc',
  },
  {
    code: 'WI',
    fullName: 'Wall Interaction',
    category: 'Move Property',
    description: 'Interaksi komprehensif dinding arena: Wall Splat, Wall Crush, Wall Break, Balcony Break, atau Wall Blast.',
    colorClass: 'attr-wi',
  },
  {
    code: 'FI',
    fullName: 'Floor Interaction',
    category: 'Move Property',
    description: 'Interaksi komprehensif lantai arena: dapat meruntuhkan lantai (Floor Break) atau memicu ledakan lantai (Floor Blast).',
    colorClass: 'attr-fi',
  },
  {
    code: 'TH',
    fullName: 'Throw',
    category: 'Move Property',
    description: 'Serangan bantingan atau lemparan (normal throw, command grab, atau attack throw).',
    colorClass: 'attr-th',
  },
  {
    code: 'CH',
    fullName: 'Counter Hit',
    category: 'Move Property',
    description: 'Memiliki nilai keunggulan frame khusus, efek stun, atau ekstensi combo saat berhasil mendaratkan Counter Hit.',
    colorClass: 'attr-ch',
  },
  {
    code: 'CHP',
    fullName: 'Chip Damage',
    category: 'Move Property',
    description: 'Serangan yang tetap memberikan pengurangan darah (chip damage) meskipun ditahan atau di-block oleh musuh.',
    colorClass: 'attr-chip',
  },
  {
    code: 'JL',
    fullName: 'Jails',
    category: 'Move Property',
    description: 'Rangkaian pukulan yang mengunci musuh dalam blockstun (lawan tidak bisa menunduk, menginterupsi, atau sidestep).',
    colorClass: 'attr-jl',
  },
  {
    code: 'PRY',
    fullName: 'Parry',
    category: 'Move Property',
    description: 'Serangan atau stance yang memiliki pertahanan tangkisan otomatis (sabaki, punch/kick parry, atau attack reversal) saat startup.',
    colorClass: 'attr-pry',
  },
  {
    code: 'HC',
    fullName: 'High Crush',
    category: 'Move Property',
    description: 'Gerakan menunduk yang secara sistematis kebal / luput (evade) dari seluruh serangan berstatus High milik lawan.',
    colorClass: 'attr-hc',
  },
  {
    code: 'LC',
    fullName: 'Low Crush',
    category: 'Move Property',
    description: 'Gerakan melompat yang secara sistematis kebal / luput (evade) dari seluruh serangan berstatus Low milik lawan.',
    colorClass: 'attr-lc',
  },
];

/**
 * Extracts clean frame value from raw string by removing wiki markdown links (e.g. "[[Page#Anchor|+15a]]" -> "+15a").
 */
export function extractCleanFrame(rawStr?: string | null): string {
  if (!rawStr) return '';
  return rawStr
    .replace(/\[\[[^|\]]*\|([^\]]+)\]\]/g, '$1')
    .replace(/\[\[([^\]]+)\]\]/g, '$1')
    .trim();
}

/**
 * Extracts Tekken 8 move properties based on Wavu Wiki data.
 * Note: Launcher and Knockdown badges are intentionally excluded because launch/knockdown status
 * is represented directly and accurately by numeric frame advantage (+39a, KND, etc.).
 */
export function getMoveAttributes(move: Move): MoveAttributeBadge[] {
  const badges: MoveAttributeBadge[] = [];
  const lowerInput = move.input.toLowerCase();
  const lowerNotes = (move.notes || '').toLowerCase();
  const lowerHit = (move.hit || '').toLowerCase();
  const cleanHit = extractCleanFrame(lowerHit);
  const lowerBlock = (move.block || '').toLowerCase();
  const cleanBlock = extractCleanFrame(lowerBlock);
  const lowerTarget = (move.target || '').toLowerCase();

  // 1. Power Crush (PC)
  if (lowerNotes.includes('power crush') || lowerNotes.includes('power-crush')) {
    badges.push({ code: 'PC', label: 'Power Crush (Serangan ber-armor menyerap pukulan)', colorClass: 'attr-pc' });
  }

  // 2. Homing (HOM)
  if (lowerNotes.includes('homing')) {
    badges.push({ code: 'HOM', label: 'Homing (Serangan melacak musuh yang sidestep)', colorClass: 'attr-hom' });
  }

  // 3. Heat Engager (HEAT)
  if (
    lowerNotes.includes('heat engager') ||
    lowerNotes.includes('heat dash') ||
    lowerNotes.includes('heat smash') ||
    lowerNotes.includes('heat burst')
  ) {
    badges.push({ code: 'HEAT', label: 'Heat Engager (Mengaktifkan mode Heat)', colorClass: 'attr-heat' });
  }

  // 4. Tornado (TOR)
  if (lowerNotes.includes('tornado') || lowerNotes.includes('sat') || lowerNotes.includes('tailspin')) {
    badges.push({ code: 'TOR', label: 'Tornado (Putaran combo perpanjangan juggle)', colorClass: 'attr-tor' });
  }

  // 5. Recoverable HP (RHP)
  if (
    lowerNotes.includes('recoverable-gauge') ||
    lowerNotes.includes('recoverable health') ||
    lowerNotes.includes('recoverable hp') ||
    lowerNotes.includes('restores recoverable health')
  ) {
    badges.push({ code: 'RHP', label: 'Recoverable HP (Berinteraksi dengan bar darah abu-abu)', colorClass: 'attr-rhp' });
  }

  // 6. Force Crouch (FC)
  const isCrouchHit =
    /\d+c(?:g)?(?:\b|~|\s|\]|\)|$)/i.test(cleanHit) ||
    cleanHit.endsWith('c') ||
    cleanHit.includes('crouch');

  const isCrouchBlock =
    /\d+c(?:g)?(?:\b|~|\s|\]|\)|$)/i.test(cleanBlock) ||
    cleanBlock.endsWith('c') ||
    cleanBlock.includes('crouch');

  const isCrouchNotes =
    lowerNotes.includes('opponent recovers crouching') ||
    lowerNotes.includes('recovers crouching') ||
    lowerNotes.includes('recovers crouched') ||
    lowerNotes.includes('forces the opponent to crouch') ||
    lowerNotes.includes('forces crouch');

  if (isCrouchHit || isCrouchBlock || isCrouchNotes) {
    badges.push({ code: 'FC', label: 'Force Crouch (Memaksa lawan dalam posisi jongkok)', colorClass: 'attr-fc' });
  }

  // 7. Wall Interaction (WI)
  const isWallInteraction =
    lowerNotes.includes('wall splat') ||
    lowerNotes.includes('wall-splat') ||
    lowerNotes.includes('wallsplat') ||
    lowerNotes.includes('wall crush') ||
    lowerNotes.includes('wall-crush') ||
    lowerNotes.includes('wall bounce') ||
    lowerNotes.includes('balcony-break') ||
    lowerNotes.includes('balcony break') ||
    lowerNotes.includes('wall-break') ||
    lowerNotes.includes('wall break') ||
    lowerNotes.includes('wall blast') ||
    lowerNotes.includes('wall-blast') ||
    cleanHit.includes('wall');

  if (isWallInteraction) {
    badges.push({ code: 'WI', label: 'Wall Interaction (Interaksi Tembok / Panggung)', colorClass: 'attr-wi' });
  }

  // 8. Floor Interaction (FI)
  const isFloorInteraction =
    lowerNotes.includes('floor-break') ||
    lowerNotes.includes('floor break') ||
    lowerNotes.includes('floorbreak') ||
    lowerNotes.includes('floor-blast') ||
    lowerNotes.includes('floor blast') ||
    lowerNotes.includes('floorblast');

  if (isFloorInteraction) {
    badges.push({ code: 'FI', label: 'Floor Interaction (Interaksi Lantai / Panggung)', colorClass: 'attr-fi' });
  }

  // 9. Throw (TH)
  const isThrow =
    lowerTarget.includes('th') ||
    lowerNotes.includes('throw on hit') ||
    lowerNotes.includes('attack throw') ||
    lowerNotes.includes('command grab') ||
    lowerNotes.includes('throw break');
  if (isThrow) {
    badges.push({ code: 'TH', label: 'Throw (Bantingan / Lemparan)', colorClass: 'attr-th' });
  }

  // 10. Counter Hit (CH)
  if (move.ch && move.ch.trim() !== '' && move.ch.trim() !== '-') {
    badges.push({ code: 'CH', label: `Counter Hit (${move.ch})`, colorClass: 'attr-ch' });
  }

  // 11. Chip Damage (CHP)
  if (lowerNotes.includes('chip') || lowerNotes.includes('chip damage')) {
    badges.push({ code: 'CHP', label: 'Chip Damage (Mengikis darah saat di-block)', colorClass: 'attr-chip' });
  }

  // 12. Jails (JL)
  const hasJailWord = lowerNotes.includes('jail');
  if (hasJailWord) {
    const isExplicitNotJail =
      lowerNotes.includes('does not jail') ||
      lowerNotes.includes("doesn't jail") ||
      lowerNotes.includes('not jail');
    const isDuckable =
      lowerNotes.includes('duckable') ||
      lowerNotes.includes('can be ducked');
    const isInputsOnly =
      lowerNotes.includes('jails attack inputs') &&
      !lowerNotes.includes('jail from 1st block') &&
      !lowerNotes.includes('jail from 2nd block');
    const isBlockJail =
      lowerNotes.includes('jail from 1st block') ||
      lowerNotes.includes('jails from 1st block') ||
      lowerNotes.includes('jail from 2nd block') ||
      lowerNotes.includes('jails from 2nd block') ||
      lowerNotes.includes('jail from 3rd block') ||
      lowerNotes.includes('jail from 1st attack') ||
      lowerNotes.includes('jail from 2nd attack') ||
      lowerNotes.includes('jails on block') ||
      lowerNotes.includes('jailing') ||
      lowerNotes.includes('* jails') ||
      lowerNotes.includes('\njails');

    if (!isExplicitNotJail && !isDuckable && !isInputsOnly && isBlockJail) {
      badges.push({ code: 'JL', label: 'Jails (Lawan terkunci penuh dalam blockstun)', colorClass: 'attr-jl' });
    }
  }

  // 13. Parry (PRY)
  if (lowerNotes.includes('parry') || lowerNotes.includes('sabaki') || lowerNotes.includes('reversal')) {
    const isNotActualParry =
      lowerNotes.includes('reversal-break') ||
      lowerNotes.includes('unparryable') ||
      lowerNotes.includes('cannot be parried') ||
      lowerNotes.includes("can't be parried") ||
      lowerNotes.includes('parryable');

    const isActualParry =
      lowerNotes.includes('sabaki') ||
      lowerNotes.includes('parries') ||
      lowerNotes.includes('power parry') ||
      lowerNotes.includes('punch parry') ||
      lowerNotes.includes('kick parry') ||
      lowerNotes.includes('low parry') ||
      lowerNotes.includes('parry window') ||
      lowerNotes.includes('parry frames') ||
      lowerNotes.includes('successful parry');

    if (isActualParry && !isNotActualParry) {
      badges.push({ code: 'PRY', label: 'Parry (Tangkisan otomatis / Sabaki saat startup)', colorClass: 'attr-pry' });
    }
  }

  // 14. High Crush (HC)
  const isDuckableByOpponent =
    lowerNotes.includes('duckable') ||
    lowerNotes.includes('can be ducked') ||
    lowerNotes.includes('if ducked') ||
    lowerNotes.includes('is ducked') ||
    lowerNotes.includes('cannot duck') ||
    lowerNotes.includes("can't duck");

  const hasHighCrushKeyword =
    lowerNotes.includes('high crush') ||
    lowerNotes.includes('tech crouch') ||
    lowerNotes.includes('crouch status') ||
    lowerNotes.includes('crouching status') ||
    lowerNotes.includes('crouch state') ||
    lowerNotes.includes('crouches') ||
    lowerNotes.includes('evades high') ||
    lowerNotes.includes('evade high') ||
    lowerNotes.includes('ducks under');

  const isHighCrushInput = lowerInput.startsWith('ws') || lowerInput.startsWith('fc');

  if ((isHighCrushInput || hasHighCrushKeyword) && !isDuckableByOpponent) {
    badges.push({ code: 'HC', label: 'High Crush (Menunduk di bawah serangan High)', colorClass: 'attr-hc' });
  }

  // 15. Low Crush (LC)
  if (
    lowerInput.startsWith('uf+') ||
    lowerInput.startsWith('u+') ||
    lowerInput.startsWith('ub+') ||
    lowerInput.startsWith('uf,') ||
    lowerInput.startsWith('u,') ||
    lowerNotes.includes('low crush') ||
    lowerNotes.includes('tech jump') ||
    lowerNotes.includes('jump status') ||
    lowerNotes.includes('jumping status') ||
    lowerNotes.includes('jump state') ||
    lowerNotes.includes('evades low') ||
    lowerNotes.includes('evade low')
  ) {
    badges.push({ code: 'LC', label: 'Low Crush (Melompat di atas serangan Low)', colorClass: 'attr-lc' });
  }

  return badges;
}

/**
 * Known Tekken 8 character named stances mapping (lowercase name -> uppercase stance code).
 */
export const STANCE_NAME_MAP: Record<string, string> = {
  fujin: 'FUJ',
  raijin: 'RAI',
  warrior: 'WAR',
  sentai: 'SEN',
  sen: 'SEN',
  unsoku: 'UNS',
  'wind god step': 'WGS',
  wgs: 'WGS',
  wrath: 'WRA',
  zanshin: 'ZEN',
  zen: 'ZEN',
  flicker: 'FLK',
  peekaboo: 'PKB',
  pkb: 'PKB',
  ducking: 'DCK',
  albatross: 'ALB',
  sway: 'SWY',
  mantis: 'MNT',
  scarecrow: 'SCR',
  tarantula: 'TRT',
  kincho: 'KIN',
  dragonfly: 'DGF',
  indian: 'IND',
  flea: 'FLE',
  nss: 'NSS',
  'dew glide': 'DEW',
  rabbit: 'RAB',
  'hunting bear': 'HBS',
  destructor: 'DES',
  hypnotist: 'HYP',
  'rain dance': 'RDS',
  'art of phoenix': 'AOP',
  aop: 'AOP',
  shadow: 'SND',
  'left flamingo': 'LFF',
  'right flamingo': 'RFF',
  lff: 'LFF',
  rff: 'RFF',
  'left foot forward': 'LFF',
  'right foot forward': 'RFF',
  gen: 'UNS',
  kou: 'UNS',
  gou: 'UNS',
};

const NON_STANCE_CODES = new Set(['CROUCH', 'CROUCHING', 'FC', 'STANDING', 'HIT', 'BLOCK', 'CH', 'WHIFF']);

export interface StanceTransition {
  stance: string;
  trigger: string | null;
  isOptional: boolean;
}

/**
 * Detects all stance transitions a move can enter, along with required input trigger and whether it's optional.
 * E.g. Heihachi f+4 -> [{ stance: 'FUJ', trigger: 'D', isOptional: true }]
 */
export function detectStanceTransitions(move: Move): StanceTransition[] {
  const notes = move.notes || '';
  const transitions: StanceTransition[] = [];
  if (!notes) return transitions;

  const lines = notes.split('\n');
  // Match patterns like: "Enter FUJ r27 with D", "Transition to SEN r18 with F", "Cancel to r55 BT with b"
  const regex = /(?:transition to|enter|cancel to|into)\s+(?:r\d+\s+)?([A-Za-z0-9_]{2,6})\b(?:[^\n*]*?with\s+([A-Za-z0-9\+_\/]+))?/gi;

  for (const line of lines) {
    let match: RegExpExecArray | null;
    const lineRegex = new RegExp(regex.source, 'gi');
    while ((match = lineRegex.exec(line)) !== null) {
      const stance = match[1].toUpperCase();
      if (!NON_STANCE_CODES.has(stance)) {
        const trigger = match[2] ? match[2].trim() : null;
        // If there's an explicit trigger (e.g. "with D", "with F"), or if line mentions "cancel", it's optional
        // It's mandatory only if it explicitly says "automatically" or has no trigger and no cancel keyword
        const lineLower = line.toLowerCase();
        const isOptional = !!trigger || lineLower.includes('cancel') || !lineLower.includes('automatically');

        if (!transitions.some((t) => t.stance === stance)) {
          transitions.push({
            stance,
            trigger,
            isOptional,
          });
        }
      }
    }
  }

  // Also check if move name matches known stance (e.g. Heihachi d+1+2 named "Fujin")
  const lowerName = (move.name || '').toLowerCase();
  for (const [key, code] of Object.entries(STANCE_NAME_MAP)) {
    if (lowerName === key && !transitions.some((t) => t.stance === code)) {
      transitions.push({
        stance: code,
        trigger: null,
        isOptional: false,
      });
    }
  }

  return transitions;
}

/**
 * Detects if a move explicitly transitions or enters a specific stance.
 * Returns the uppercase stance code (e.g. 'FUJ', 'SEN', 'WRA', 'MNT', 'BT') or null if neutral.
 */
export function detectStanceTransition(move: Move): string | null {
  const transitions = detectStanceTransitions(move);
  return transitions.length > 0 ? transitions[0].stance : null;
}

/**
 * Extracts stance prefix from candidate move input.
 * Supports dot syntax (e.g. "FUJ.1" -> "FUJ", "SEN.1+2" -> "SEN", "FC.df+2" -> "FC", "BT.4" -> "BT")
 * and shorthand prefixes (e.g. "ws4" -> "WS", "fc+1" -> "FC", "ss+2" -> "SS", "bt+2" -> "BT").
 */
export function getCandidateStancePrefix(input: string): string | null {
  if (!input) return null;
  const trimmed = input.trim();

  // Dot syntax: "FUJ.1", "SEN.1+2", "MNT.1", "FC.df+2", "SS.1+2", "BT.4", "H.2+3", "R.df+1+2", "OTG.d+4"
  const dotMatch = trimmed.match(/^([A-Za-z0-9_]{1,6})\./);
  if (dotMatch) {
    return dotMatch[1].toUpperCase();
  }

  // While Standing without dot: "ws1", "ws+4", "ws 4"
  if (/^ws[\+\d\s]/i.test(trimmed)) {
    return 'WS';
  }

  // Full Crouch without dot: "fc+1", "fc 1"
  if (/^fc[\+\s]/i.test(trimmed)) {
    return 'FC';
  }

  // Side Step without dot: "ss+1", "ss 1"
  if (/^ss[\+\s]/i.test(trimmed)) {
    return 'SS';
  }

  // Back Turned without dot: "bt+1", "bt 1"
  if (/^bt[\+\s]/i.test(trimmed)) {
    return 'BT';
  }

  return null;
}

/**
 * Checks whether the player recovers in crouch (posture check).
 */
export function isPlayerRecoveringCrouch(move: Move): boolean {
  const notes = (move.notes || '').toLowerCase();
  // Filter out opponent crouch statements
  const cleaned = notes.replace(/opponent\s+recovers\s+crouch(?:ing|ed)?/g, '');
  if (
    cleaned.includes('recovers in crouch') ||
    cleaned.includes('recovers crouched') ||
    cleaned.includes('recovers crouching') ||
    cleaned.includes('enter fc') ||
    cleaned.includes('transition to fc')
  ) {
    return true;
  }
  return false;
}

export type DetailScenario = 'hit' | 'ch' | 'crouch' | 'clean' | 'block';

export interface SpecialCrouchHitInfo {
  frame: string;
  frameNum: number;
  isGuaranteed: boolean;
  notes: string;
}

export function detectSpecialCrouchHit(move: Move): SpecialCrouchHitInfo | null {
  if (!move.notes) return null;
  const cleanNotes = move.notes
    .replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"')
    .replace(/<[^>]+>/g, ' ')
    .replace(/\[\[[^|\]]*\|([^\]]+)\]\]/g, '$1')
    .replace(/\[\[([^\]]+)\]\]/g, '$1')
    .replace(/\s+/g, ' ');

  // Look for crouch hit frame differences
  // e.g. "+15c against a crouching opponent", "+13c on crouching hit", "+12c on crouching opponent", "+18d on crouching opponent"
  const crouchRegex1 = /([+-]?\d+[a-z]?)\s*(?:on hit|on crouch hit)?\s*(?:against|vs|on)\s*(?:a\s*)?crouch(?:ing)?(?:\s*opp(?:onent)?)?/i;
  const crouchRegex2 = /(?:against|vs|on)\s*(?:a\s*)?crouch(?:ing)?(?:\s*opp(?:onent)?)?\s*[:,]?\s*([+-]?\d+[a-z]?)/i;

  const match = cleanNotes.match(crouchRegex1) || cleanNotes.match(crouchRegex2);
  if (!match) return null;

  const frameStr = match[1];
  const numMatch = frameStr.match(/([+-]?\d+)/);
  if (!numMatch) return null;

  const frameNum = parseInt(numMatch[1], 10);
  const normalHitNum = move.hit_num ?? (move.hit ? parseInt(move.hit.match(/([+-]?\d+)/)?.[1] || '0', 10) : 0);

  const isDown = frameStr.includes('d') || frameStr.includes('a') || /knockdown|spike|fdfa|fdft|fufa/i.test(cleanNotes);
  if (frameNum === normalHitNum && !isDown) {
    return null;
  }

  // In Tekken, crouch staggers of +12c or higher (like Heihachi f+4, Reina f+4, Feng uf+1)
  // mean the opponent cannot block up to that frame, making followups guaranteed!
  const isGuaranteed = frameNum >= 12 || /guaranteed|mini-combo|mini combo/i.test(cleanNotes);

  return {
    frame: frameStr,
    frameNum,
    isGuaranteed,
    notes: cleanNotes.trim(),
  };
}

export interface CleanHitInfo {
  frame: string;
  frameNum: number;
  isLauncher: boolean;
  notes: string;
}

export function detectCleanHit(move: Move): CleanHitInfo | null {
  if (!move.notes) return null;
  const cleanNotes = move.notes
    .replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"')
    .replace(/<[^>]+>/g, ' ')
    .replace(/\[\[[^|\]]*\|([^\]]+)\]\]/g, '$1')
    .replace(/\[\[([^\]]+)\]\]/g, '$1')
    .replace(/\s+/g, ' ');

  // Look for clean hit frame
  // e.g. "Clean hit +17a and 20 damage", "clean hit +10a", "+12a on clean hit", "clean hit effect (+71a"
  const cleanRegex1 = /clean\s*hit[^\d+-]*([+-]?\d+[a-z]?)/i;
  const cleanRegex2 = /([+-]?\d+[a-z]?)\s*(?:on\s*)?clean\s*hit/i;

  const match = cleanNotes.match(cleanRegex1) || cleanNotes.match(cleanRegex2);
  if (!match) return null;

  const frameStr = match[1];
  const numMatch = frameStr.match(/([+-]?\d+)/);
  if (!numMatch) return null;

  const frameNum = parseInt(numMatch[1], 10);
  const isLauncher = frameStr.includes('a') || /launch/i.test(cleanNotes);

  return {
    frame: frameStr,
    frameNum,
    isLauncher,
    notes: cleanNotes.trim(),
  };
}

export function hasDistinctCounterHit(move: Move): boolean {
  if (!move.ch || !move.ch.trim()) return false;
  const chStr = move.ch.trim().toLowerCase();
  const hitStr = (move.hit || '').trim().toLowerCase();
  if (chStr === hitStr) return false;
  return true;
}

/**
 * Checks if the opponent is knocked down or on the floor (grounded state).
 * In this state, attacks with High ('h') target will whiff completely.
 * NOTE: Moves with 'Spike' property only spike airborne juggle targets, so Spike in notes
 * does NOT imply regular grounded state unless the hit frame actually ends in 'd' or 'knd'.
 */
export function isOpponentGrounded(move: Move, scenario: DetailScenario): boolean {
  if (scenario === 'hit') {
    const cleanHit = extractCleanFrame((move.hit || '').toLowerCase());
    const lowerNotes = (move.notes || '').toLowerCase();
    return (
      /\d+d(?:\b|~|\s|\]|\)|$)/i.test(cleanHit) ||
      cleanHit.includes('knd') ||
      cleanHit.includes('fufa') ||
      cleanHit.includes('fdfa') ||
      cleanHit.includes('fdft') ||
      cleanHit.includes('knockdown') ||
      (!move.hit && lowerNotes.includes('knockdown'))
    );
  } else if (scenario === 'ch') {
    const cleanCh = extractCleanFrame((move.ch || move.hit || '').toLowerCase());
    const lowerNotes = (move.notes || '').toLowerCase();
    return (
      /\d+d(?:\b|~|\s|\]|\)|$)/i.test(cleanCh) ||
      cleanCh.includes('knd') ||
      cleanCh.includes('fufa') ||
      cleanCh.includes('fdfa') ||
      cleanCh.includes('fdft') ||
      cleanCh.includes('knockdown') ||
      lowerNotes.includes('knockdown on ch')
    );
  } else if (scenario === 'crouch') {
    const sp = detectSpecialCrouchHit(move);
    if (sp) {
      return sp.frame.includes('d') || /knockdown|fdfa|fdft|fufa/i.test(sp.notes);
    }
    return false;
  } else if (scenario === 'clean') {
    const cl = detectCleanHit(move);
    if (cl) {
      return cl.frame.includes('d');
    }
    return false;
  } else {
    const cleanBlock = extractCleanFrame((move.block || '').toLowerCase());
    return /\d+d(?:\b|~|\s|\]|\)|$)/i.test(cleanBlock) || cleanBlock.includes('knd');
  }
}

/**
 * Checks if the opponent is forced into crouching status (+c, -c, Force Crouch).
 * When true, opponent's fastest response is i11 (ws+4), giving an extra +1 frame advantage.
 */
export function isOpponentForcedCrouch(move: Move, scenario: DetailScenario): boolean {
  const lowerNotes = (move.notes || '').toLowerCase();

  if (scenario === 'crouch') {
    return true; // Opponent is already crouching
  }

  if (scenario === 'hit') {
    const cleanHit = extractCleanFrame((move.hit || '').toLowerCase());
    const isCrouchHit =
      /\d+c(?:g)?(?:\b|~|\s|\]|\)|$)/i.test(cleanHit) ||
      cleanHit.endsWith('c') ||
      cleanHit.includes('crouch');
    const isCrouchNotes =
      lowerNotes.includes('opponent recovers crouching') ||
      lowerNotes.includes('forces the opponent to crouch') ||
      lowerNotes.includes('forces crouch');
    return isCrouchHit || isCrouchNotes;
  } else if (scenario === 'ch') {
    const cleanCh = extractCleanFrame((move.ch || move.hit || '').toLowerCase());
    const isCrouchCh =
      /\d+c(?:g)?(?:\b|~|\s|\]|\)|$)/i.test(cleanCh) ||
      cleanCh.endsWith('c') ||
      cleanCh.includes('crouch');
    return isCrouchCh || lowerNotes.includes('forces crouch on ch');
  } else if (scenario === 'clean') {
    const cl = detectCleanHit(move);
    return !!(cl && cl.frame.includes('c'));
  } else {
    const cleanBlock = extractCleanFrame((move.block || '').toLowerCase());
    const isCrouchBlock =
      /\d+c(?:g)?(?:\b|~|\s|\]|\)|$)/i.test(cleanBlock) ||
      cleanBlock.endsWith('c') ||
      cleanBlock.includes('crouch');
    const isCrouchNotes =
      lowerNotes.includes('opponent recovers crouching on block');
    return isCrouchBlock || isCrouchNotes;
  }
}



