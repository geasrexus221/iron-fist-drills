import type {
  CharacterName,
  Move,
  QuizQuestion,
  PunishEvaluation,
  FrameTrapEvaluation,
  InputFormat,
  MinusBracket,
  StringFilter,
  ThrowBreakButton,
  ThrowBreakEvaluation,
  ThrowHandVisual,
  ThrowDrillType,
} from '../types/tekken';
import { CHARACTER_DATA } from '../data';

// Helper to shuffle an array
export function shuffleArray<T>(array: T[]): T[] {
  const arr = [...array];
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

/**
 * Counts the number of attack hits in a Tekken move input string.
 * Accurately skips pure directional inputs like 'f', 'd/f', 'qcf', etc.
 */
export function countMoveHits(input: string): number {
  if (!input) return 1;
  const rawParts = input.split(',').map((s) => s.trim()).filter(Boolean);
  const hits: string[] = [];
  let buffer = '';

  for (let i = 0; i < rawParts.length; i++) {
    const part = rawParts[i];
    const isPureDirection = /^(f|b|d|u|df|db|uf|ub|qcf|qcb|ws|fc|ss|wr)$/i.test(part);
    if (isPureDirection && i < rawParts.length - 1) {
      buffer = buffer ? `${buffer},${part}` : part;
    } else {
      if (buffer) {
        hits.push(`${buffer},${part}`);
        buffer = '';
      } else {
        hits.push(part);
      }
    }
  }
  if (buffer) hits.push(buffer);
  return Math.max(1, hits.length);
}

/**
 * Checks if a move is a grab / throw
 */
export function isThrowMove(move: Move): boolean {
  const target = (move.target || '').toLowerCase();
  const inp = (move.input || '').toLowerCase().trim();
  const notes = (move.notes || '').toLowerCase();
  const name = (move.name || '').toLowerCase();

  if (target.includes('th') || target.includes('t(') || target === 't') {
    return true;
  }
  if (
    notes.includes('throw break') ||
    notes.includes('unbreakable') ||
    reIsThrowBreakNote(notes)
  ) {
    return true;
  }
  if (
    inp === '1+3' ||
    inp === '2+4' ||
    inp === 'uf+1+2' ||
    inp === 'df+2+4' ||
    inp === 'qcb+1+3' ||
    inp.includes('f,f,f+2+4') ||
    inp.includes('f,b,db,d,df,f+1') ||
    inp.includes('f,hcf+1') ||
    inp.includes('f,hcf+2') ||
    inp.includes('db,f+2+4')
  ) {
    return true;
  }
  if (name.includes('throw') && !name.includes('break')) {
    return true;
  }
  return false;
}

function reIsThrowBreakNote(notes: string): boolean {
  return /(\b(1|2|1\+2|3\+4)\b\s*(throw\s*)?break|(throw\s*)?break:?\s*(1|2|1\+2|none|unbreakable))/i.test(notes);
}

/**
 * Parses throw break information for a move accurately from notes or signature move data.
 * Fixes the flaw where any move containing "1+3" was blindly treated as "1 and 2".
 */
export function parseThrowBreak(move: Move): {
  validBreaks: ThrowBreakButton[];
  handVisual: ThrowHandVisual;
  rawText: string;
  isUnbreakable: boolean;
} {
  const notes = (move.notes || '').toLowerCase();
  const inp = (move.input || '').toLowerCase().trim();
  const name = (move.name || '').toLowerCase();

  // 1. Unbreakable / Hit-throw transitions
  if (
    notes.includes('unbreakable') ||
    notes.includes('cannot throw break') ||
    notes.includes('no throw break') ||
    /(throw\s*)?break:?\s*none/i.test(notes) ||
    notes.includes('transition to throw on hit')
  ) {
    return { validBreaks: [], handVisual: 'both', rawText: 'Unbreakable', isUnbreakable: true };
  }

  // 2. Iconic Signature/Trick Throws
  // Giant Swing: Both hands extend visually (looks like 1+2), but break is strictly 1!
  if (name.includes('giant swing') || inp.includes('f,b,db,d,df,f+1') || inp === 'f,hcf+1') {
    return {
      validBreaks: ['1'],
      handVisual: 'trick',
      rawText: '1 (Trick: Animasi kedua tangan, tapi lepasnya tekan 1!)',
      isUnbreakable: false,
    };
  }

  // Tijuana Twister: Break is strictly 2
  if (name.includes('tijuana twister') || inp.includes('f,hcf+2')) {
    return {
      validBreaks: ['2'],
      handVisual: 'right',
      rawText: '2 (Tangan kanan)',
      isUnbreakable: false,
    };
  }

  // Tombstone Piledriver: Break is strictly 2
  if (name.includes('tombstone') || inp.includes('db,f+2+4') || inp.includes('db,n,f+2+4')) {
    return {
      validBreaks: ['2'],
      handVisual: 'right',
      rawText: '2 (Tangan kanan)',
      isUnbreakable: false,
    };
  }

  // Shining Wizard / Running Jaguar Bomb / Stonehead / Muscle Buster: Break 1+2
  if (
    name.includes('shining wizard') ||
    name.includes('running jaguar bomb') ||
    name.includes('stonehead') ||
    name.includes('muscle buster') ||
    inp.includes('f,f,f+2+4') ||
    inp.includes('fff+2+4') ||
    inp === 'uf+1+2'
  ) {
    return {
      validBreaks: ['1+2'],
      handVisual: 'both',
      rawText: '1+2 (Kedua tangan)',
      isUnbreakable: false,
    };
  }

  // 3. Extract Throw Break directly from notes text (handling all Wavu Wiki formats)
  // Check 1+2 break: e.g. "* 1+2 throw break.", "* Throw break 1+2", "* Throw break: 1+2", "* 1+2 break"
  if (/(\b1\+2\b\s*(throw\s*)?break|(throw\s*)?break:?\s*1\+2)/i.test(notes)) {
    return {
      validBreaks: ['1+2'],
      handVisual: 'both',
      rawText: '1+2',
      isUnbreakable: false,
    };
  }

  // Check 1 or 2 break (Generic neutral throws):
  // e.g. "* Throw break 1 or 2", "* 1 or 2 throw break", "* 1/2 throw break"
  if (/(\b1\s*(or|\/|,)\s*2\b\s*(throw\s*)?break|(throw\s*)?break:?\s*1\s*(or|\/|,)\s*2)/i.test(notes)) {
    const isLeft = inp === '1+3';
    return {
      validBreaks: ['1', '2'],
      handVisual: isLeft ? 'left' : 'right',
      rawText: isLeft ? '1 atau 2 (Tangan Kiri -> Rekomendasi: 1)' : '1 atau 2 (Tangan Kanan -> Rekomendasi: 2)',
      isUnbreakable: false,
    };
  }

  // Check explicit 1 break: e.g. "* Throw break 1", "* 1 throw break.", "* 1 break"
  // Jin's qcb+1+3 Complicated Wire has "* Throw break 1"
  if (/(\b1\b\s*(throw\s*)?break|(throw\s*)?break:?\s*1\b)/i.test(notes)) {
    return {
      validBreaks: ['1'],
      handVisual: 'left',
      rawText: '1',
      isUnbreakable: false,
    };
  }

  // Check explicit 2 break: e.g. "* Throw break 2", "* 2 throw break.", "* 2 break"
  // Jin's df+2+4 Shun Ren Dan has "* Throw break 2"
  if (/(\b2\b\s*(throw\s*)?break|(throw\s*)?break:?\s*2\b)/i.test(notes)) {
    return {
      validBreaks: ['2'],
      handVisual: 'right',
      rawText: '2',
      isUnbreakable: false,
    };
  }

  // 4. Strict fallbacks based on EXACT input notation (NOT substring includes!)
  // Generic Neutral Left Throw
  if (inp === '1+3') {
    return {
      validBreaks: ['1', '2'],
      handVisual: 'left',
      rawText: '1 atau 2 (Tangan Kiri -> Rekomendasi: 1)',
      isUnbreakable: false,
    };
  }

  // Generic Neutral Right Throw
  if (inp === '2+4') {
    return {
      validBreaks: ['1', '2'],
      handVisual: 'right',
      rawText: '1 atau 2 (Tangan Kanan -> Rekomendasi: 2)',
      isUnbreakable: false,
    };
  }

  // Dual button command throws
  if (inp === 'uf+1+2' || inp.endsWith('+1+2') || inp.endsWith('1+2')) {
    return {
      validBreaks: ['1+2'],
      handVisual: 'both',
      rawText: '1+2',
      isUnbreakable: false,
    };
  }

  // Command throw ending in 1
  if (inp.endsWith('1') || inp.endsWith('+1')) {
    return {
      validBreaks: ['1'],
      handVisual: 'left',
      rawText: '1',
      isUnbreakable: false,
    };
  }

  // Command throw ending in 2
  if (inp.endsWith('2') || inp.endsWith('+2')) {
    return {
      validBreaks: ['2'],
      handVisual: 'right',
      rawText: '2',
      isUnbreakable: false,
    };
  }

  return {
    validBreaks: ['1+2'],
    handVisual: 'both',
    rawText: '1+2',
    isUnbreakable: false,
  };
}

/**
 * Evaluates player's throw break reaction button
 */
export function evaluateThrowBreak(
  throwMove: Move,
  userChoice: ThrowBreakButton
): ThrowBreakEvaluation {
  const { validBreaks, handVisual, rawText } = parseThrowBreak(throwMove);
  const isCorrect = validBreaks.includes(userChoice);

  if (isCorrect) {
    let msg = `PERFECT THROW ESCAPE! Anda berhasil melepas bantingan [${throwMove.name}] (${throwMove.input}) dengan tombol [${userChoice}]!`;
    if (validBreaks.length > 1) {
      msg += ` (Bantingan generic dapat dilepas dengan 1 atau 2; visual tangan ${handVisual === 'left' ? 'kiri' : 'kanan'} menggapai).`;
    }
    return {
      status: 'escaped',
      userChoice,
      correctBreak: validBreaks,
      handVisual,
      throwName: throwMove.name,
      damage: throwMove.damage || '35',
      message: msg,
    };
  } else {
    const needed = validBreaks.join(' atau ') || rawText;
    let visualHint = '';
    if (handVisual === 'trick') {
      visualHint = ' [TRICK MOVE: Gerakan terlihat seperti kedua tangan (1+2), namun tombol lepas aslinya adalah 1!]';
    } else if (handVisual === 'left') {
      visualHint = ' [Tangan Kiri lawan maju -> Tekan 1]';
    } else if (handVisual === 'right') {
      visualHint = ' [Tangan Kanan lawan maju -> Tekan 2]';
    } else {
      visualHint = ' [Kedua Tangan lawan menggapai -> Tekan 1+2]';
    }

    return {
      status: 'wrong-button',
      userChoice,
      correctBreak: validBreaks,
      handVisual,
      throwName: throwMove.name,
      damage: throwMove.damage || '35',
      message: `THROWN / GAGAL LEPAS! Anda menekan [${userChoice}], padahal bantingan ini harus dilepas dengan [${needed}]!${visualHint}`,
    };
  }
}

/**
 * Extracts chain code from move name (e.g. "Arm Breaker (AB1)" -> "AB1")
 * or input signature.
 */
export function findChainCode(m: Move): string | null {
  const match = (m.name || '').match(/\(([A-Z0-9]+)\)$/i);
  if (match) return match[1];
  if (m.input && m.input.startsWith('qcf+1')) return 'PD';
  if (m.input && m.input.startsWith('hFC.1+2')) return 'UT';
  return null;
}

/**
 * Explicit mapping of chain throw links to their direct breakable children.
 * Guarantees that only authentic, video-backed chain continuation moves are linked.
 */
export const CHAIN_FOLLOWUP_MAP: Record<string, string[]> = {
  // King: Arm Breaker tree (CD.1+3)
  'CD.1+3': ['AB1.1,1+2', 'AB1.2,1,1+3', 'AB1.2,4,2+4'],
  'AB1.2,1,1+3': ['AB2c.1,3,4,2,1+2', 'AB2c.2,1,3,1+2'],
  // King: Standing Heel Hold tree (CD.2+4)
  'CD.2+4': ['SHH1.1,2,1+2', 'SHH1.1+2,1,3', 'SHH1.2,1,1+3'],
  // King: Pile Driver tree (qcf+1)
  'qcf+1': ['PD.1+2,1+2', 'PD.1+2,3,4,1+2'],
  // King: Reverse Arm Slam tree (df+1+3)
  'df+1+3': ['RAS2.1_2'],
  'RAS2.1_2': ['RAS4.1', 'RAS4.2'],
  // King: Reverse Special Stretch Bomb tree (df+2+4)
  'df+2+4': ['RSSB2.1_2'],
  'RSSB2.1_2': ['RSSB4.1', 'RSSB4.2'],
  // King: Cobra Clutch tree (JGS.1+3_2+4)
  'JGS.1+3_2+4': ['MMD2.1,1+3/ MMD2.2,2+4'],
  'MMD2.1,1+3/ MMD2.2,2+4': ['MMD3.2,3,1,1+2'],
  // Nina: Crab Hold tree (f+1+3)
  'f+1+3': ['CHD.1', 'CHD.2'],
  'CHD.2': ['HHD.2'],
  // Nina: Backhand Slap tree (f+2+4)
  'f+2+4': ['BHS.2', 'BHS.1+2'],
  // Nina: Betrayer tree (qcb,B+1+3)
  'qcb,B+1+3': ['BTR.2'],
};

/**
 * Recognized True Chain Starters (Tahap 1 Pembuka Murni).
 * Multistage mode MUST ALWAYS start with one of these if character possesses them.
 */
export const TRUE_CHAIN_STARTERS: string[] = [
  'CD.1+3',
  'CD.2+4',
  'qcf+1',
  'df+1+3',
  'df+2+4',
  'JGS.1+3_2+4',
  'f+1+3',
  'f+2+4',
  'qcb,B+1+3',
];

/**
 * Finds direct branch followups for a chain grab move using explicit mapping.
 */
export function findChainFollowups(parentMove: Move, allMoves: Move[]): Move[] {
  const inp = (parentMove.input || '').trim();
  const directChildInputs = CHAIN_FOLLOWUP_MAP[inp];
  if (directChildInputs && directChildInputs.length > 0) {
    const matched = allMoves.filter(
      (m) => directChildInputs.includes((m.input || '').trim()) && !!m.video_url
    );
    if (matched.length > 0) return matched;
  }
  return [];
}

/**
 * Identifies whether a move is a mid/ender branch of a chain throw,
 * what stage it represents, and the name of its parent throw.
 */
export function getChainMetadata(move: Move): {
  isChainStep: boolean;
  chainStage: number;
  chainParentName?: string;
} {
  const inp = move.input || '';
  if (inp.startsWith('AB1.')) return { isChainStep: true, chainStage: 2, chainParentName: 'Arm Breaker' };
  if (inp.startsWith('AB2c.')) return { isChainStep: true, chainStage: 3, chainParentName: 'Chicken Wing Face Lock' };
  if (inp.startsWith('AB2b.')) return { isChainStep: true, chainStage: 3, chainParentName: 'Head Jammer' };
  if (inp.startsWith('SHH1.')) return { isChainStep: true, chainStage: 2, chainParentName: 'Standing Heel Hold' };
  if (inp.startsWith('SHH2c.')) return { isChainStep: true, chainStage: 3, chainParentName: 'Indian Death Lock' };
  if (inp.startsWith('MMD1.')) return { isChainStep: true, chainStage: 2, chainParentName: 'Cobra Clutch' };
  if (inp.startsWith('MMD2.')) return { isChainStep: true, chainStage: 3, chainParentName: 'Cobra Twist' };
  if (inp.startsWith('MMD3.')) return { isChainStep: true, chainStage: 4, chainParentName: 'Reverse DDT' };
  if (inp.startsWith('MMD4.')) return { isChainStep: true, chainStage: 5, chainParentName: 'Reverse Special Stretch Bomb' };
  if (inp.startsWith('MMD5.')) return { isChainStep: true, chainStage: 6, chainParentName: 'Backdrop' };
  if (inp.startsWith('MMD6.')) return { isChainStep: true, chainStage: 7, chainParentName: 'Burning Hammer' };
  if (inp.startsWith('RAS1.')) return { isChainStep: true, chainStage: 2, chainParentName: 'Reverse Arm Slam' };
  if (inp.startsWith('RAS2.')) return { isChainStep: true, chainStage: 3, chainParentName: 'German Suplex' };
  if (inp.startsWith('RAS3.')) return { isChainStep: true, chainStage: 4, chainParentName: 'Power Bomb' };
  if (inp.startsWith('RAS4.')) return { isChainStep: true, chainStage: 5, chainParentName: 'Power Bomb Continuation' };
  if (inp.startsWith('RSSB1.')) return { isChainStep: true, chainStage: 2, chainParentName: 'Reverse Special Stretch Bomb' };
  if (inp.startsWith('RSSB2.')) return { isChainStep: true, chainStage: 3, chainParentName: 'Manhattan Drop' };
  if (inp.startsWith('RSSB3.')) return { isChainStep: true, chainStage: 4, chainParentName: 'Victory Bomb' };
  if (inp.startsWith('RSSB4.')) return { isChainStep: true, chainStage: 5, chainParentName: 'Victory Bomb Continuation' };
  if (inp.startsWith('PD.')) return { isChainStep: true, chainStage: 2, chainParentName: 'Pile Driver' };
  if (inp.startsWith('UT,')) return { isChainStep: true, chainStage: 2, chainParentName: 'Ultimate Tackle' };
  if (inp.startsWith('CHD.')) return { isChainStep: true, chainStage: 2, chainParentName: 'Crab Hold' };
  if (inp.startsWith('HHD.')) return { isChainStep: true, chainStage: 3, chainParentName: 'Heel Hold' };
  if (inp.startsWith('BHS.')) return { isChainStep: true, chainStage: 2, chainParentName: 'Backhand Slap' };
  if (inp.startsWith('TSS.')) return { isChainStep: true, chainStage: 3, chainParentName: 'Stomach Lock' };
  if (inp.startsWith('BTR.')) return { isChainStep: true, chainStage: 2, chainParentName: 'Betrayer' };
  if (inp.startsWith('NTM.')) return { isChainStep: true, chainStage: 3, chainParentName: 'Twisted Nightmare' };
  return { isChainStep: false, chainStage: 1 };
}

/**
 * Returns the count of breakable throws (with video prioritized) for a character.
 */
export function getThrowCountForCharacter(charName: CharacterName): number {
  const allMoves = CHARACTER_DATA[charName] || [];
  const throwsWithVid = allMoves.filter((m) => {
    if (!isThrowMove(m)) return false;
    const parsed = parseThrowBreak(m);
    return !parsed.isUnbreakable && parsed.validBreaks.length > 0 && !!m.video_url;
  });
  if (throwsWithVid.length > 0) return throwsWithVid.length;
  return allMoves.filter((m) => isThrowMove(m)).length;
}

/**
 * Returns the pool of breakable throws for a character.
 */
export function getThrowBreakMovePool(
  oppChar: CharacterName,
  throwDrillType: ThrowDrillType = 'direct'
): Move[] {
  const allMoves = CHARACTER_DATA[oppChar] || CHARACTER_DATA['King'];
  const breakableThrows = allMoves.filter((m) => {
    if (!isThrowMove(m)) return false;
    const parsed = parseThrowBreak(m);
    return !parsed.isUnbreakable && parsed.validBreaks.length > 0;
  });

  const basePool = breakableThrows.length > 0
    ? breakableThrows
    : CHARACTER_DATA['King'].filter((m) => {
        if (!isThrowMove(m)) return false;
        const parsed = parseThrowBreak(m);
        return !parsed.isUnbreakable && parsed.validBreaks.length > 0;
      });

  if (throwDrillType === 'multistage') {
    const chainStarters = basePool.filter((m) => {
      const inp = (m.input || '').trim();
      return TRUE_CHAIN_STARTERS.includes(inp) && findChainFollowups(m, allMoves).length > 0;
    });
    return chainStarters.length > 0 ? chainStarters : basePool;
  }
  return basePool;
}

/**
 * Generates a question for Throw Break Drill Mode.
 * Supports both:
 * - 'direct': Standalone single-step reaction (includes intermediate chain branches)
 * - 'multistage': Sequential chain grab simulation (GUARANTEED to start from True Starter Stage 1)
 */
export function generateThrowBreakQuestion(
  oppChar: CharacterName,
  isBlindMode: boolean = true,
  throwDrillType: ThrowDrillType = 'direct',
  presetMove?: Move,
  modifiers?: Partial<QuizQuestion>
): QuizQuestion {
  const allMoves = CHARACTER_DATA[oppChar] || CHARACTER_DATA['King'];
  const basePool = getThrowBreakMovePool(oppChar, throwDrillType);

  const withVideo = basePool.filter((m) => m.video_url);
  const selectedPool = withVideo.length >= 2 ? withVideo : basePool;

  let throwMove: Move;
  let chainFollowups: Move[] = [];
  let chainStage = 1;
  let chainParentName: string | undefined;

  if (presetMove) {
    throwMove = presetMove;
    const meta = getChainMetadata(throwMove);
    chainStage = meta.chainStage;
    chainParentName = meta.chainParentName;
    chainFollowups = findChainFollowups(throwMove, allMoves);
  } else if (throwDrillType === 'multistage') {
    // In multi-stage mode, ALWAYS filter for True Chain Starters (Tahap 1)
    const chainStarters = selectedPool.filter((m) => {
      const inp = (m.input || '').trim();
      return TRUE_CHAIN_STARTERS.includes(inp) && findChainFollowups(m, allMoves).length > 0;
    });

    if (chainStarters.length > 0) {
      throwMove = chainStarters[Math.floor(Math.random() * chainStarters.length)];
      chainFollowups = findChainFollowups(throwMove, allMoves);
      chainStage = 1;
    } else {
      const nonMidChain = selectedPool.filter((m) => !getChainMetadata(m).isChainStep);
      const poolToUse = nonMidChain.length > 0 ? nonMidChain : selectedPool;
      throwMove = poolToUse[Math.floor(Math.random() * poolToUse.length)];
      chainFollowups = [];
      chainStage = 1;
    }
  } else {
    // In direct mode: any move can be picked (starter, standard throw, or mid/ender chain slice)
    throwMove = selectedPool[Math.floor(Math.random() * selectedPool.length)];
    const meta = getChainMetadata(throwMove);
    chainStage = meta.chainStage;
    chainParentName = meta.chainParentName;
    chainFollowups = findChainFollowups(throwMove, allMoves);
  }

  const { validBreaks, handVisual, rawText } = parseThrowBreak(throwMove);

  return {
    id: `throwbreak_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
    mode: 'throw-break',
    userCharacter: 'Jin',
    opponentCharacter: oppChar,
    isBlindMode,
    throwMove,
    validBreaks,
    handVisual,
    rawBreakText: rawText,
    throwDrillType,
    chainStage,
    chainParentName,
    chainFollowups,
    maxBlitzTime: 4.0 + Math.max(0, chainStage - 1) * 1.0,
    correctMoves: [],
    ...modifiers,
  };
}

/**
 * Evaluates whether a player's move punishes an opponent's move.
 * playerMove can be null if user clicked "Safe on Block (No Punish)".
 */
export function evaluatePunish(opponentMove: Move, playerMove: Move | null): PunishEvaluation {
  const blockNum = opponentMove.block_num ?? -10;
  const isSafe = blockNum >= -9;
  const minus = Math.abs(blockNum);

  // Scenario 1: Opponent move is SAFE ON BLOCK (e.g. -1 to -9, or plus on block)
  if (isSafe) {
    if (playerMove === null) {
      // User correctly recognized that the move is safe on block!
      const blockStr = opponentMove.block || (blockNum > 0 ? `+${blockNum}` : `${blockNum}`);
      return {
        status: 'optimal',
        frameDiff: 0,
        damageDealt: 'Safe Defense',
        message: `PERFECT DEFENSE / EXCELLENT READ! Move lawan safe di ${blockStr} on block. Anda membuat keputusan tepat dengan tidak memaksakan serangan dan menjaga pertahanan tetap aman!`,
      };
    } else {
      // User attacked a safe move -> blocked by opponent!
      const blockStr = opponentMove.block || (blockNum > 0 ? `+${blockNum}` : `${blockNum}`);
      return {
        status: 'too-slow',
        frameDiff: 0,
        damageDealt: '0',
        message: `PUNISH GAGAL (TERTAHAN)! Move lawan safe di ${blockStr} on block. Serangan ${playerMove.input} (i${playerMove.startup_num}) Anda berhasil ditahan (blocked) oleh lawan!`,
      };
    }
  }

  // Scenario 2: Opponent move is PUNISHABLE (<= -10)
  if (playerMove === null) {
    // User clicked "Safe on Block", but the opponent was actually minus and punishable!
    return {
      status: 'too-slow',
      frameDiff: minus,
      damageDealt: '0',
      message: `MISSED PUNISH! Move lawan ternyata minus -${minus} frame di block (dapat di-punish dengan move s/d i${minus}), tetapi Anda memilih Safe on Block!`,
    };
  }

  const startup = playerMove.startup_num;

  if (startup === null) {
    return {
      status: 'valid',
      frameDiff: 0,
      damageDealt: playerMove.damage || 'N/A',
      message: 'Frame data estimates guaranteed hit.',
    };
  }

  // If player move is slower than opponent's recovery minus frames
  if (startup > minus) {
    return {
      status: 'too-slow',
      frameDiff: startup - minus,
      damageDealt: '0',
      message: `BLOCKED! Opponent is -${minus}, but ${playerMove.input} takes i${startup} to hit (${startup - minus}f too slow). Opponent can block or punish!`,
    };
  }

  // Punish is guaranteed!
  const frameDiff = minus - startup;
  const isLauncher = playerMove.is_launcher;

  // If opponent is -15 or worse, launching is optimal
  if (minus >= 15) {
    if (isLauncher) {
      return {
        status: 'optimal',
        frameDiff,
        damageDealt: playerMove.damage || 'Launch Combo',
        message: `PERFECT LAUNCH PUNISH! Opponent was -${minus}. Your ${playerMove.input} (i${startup}) connects cleanly for a full launch combo!`,
      };
    } else if (startup === 10 || startup <= 12) {
      return {
        status: 'valid',
        frameDiff,
        damageDealt: playerMove.damage || '10-25',
        message: `GUARANTEED, BUT SUB-OPTIMAL! Opponent was -${minus}, which is launch punishable! You got guaranteed damage with ${playerMove.input}, but missed a full launch combo!`,
      };
    }
  }

  // For -10 to -14 moves
  if (minus < 15) {
    if (frameDiff <= 1) {
      return {
        status: 'optimal',
        frameDiff,
        damageDealt: playerMove.damage || 'Standard',
        message: `OPTIMAL PUNISH! Opponent is -${minus} and your ${playerMove.input} (i${startup}) maximized the punish window!`,
      };
    }
  }

  return {
    status: 'valid',
    frameDiff,
    damageDealt: playerMove.damage || 'Standard',
    message: `CLEAN PUNISH! Opponent is -${minus}. ${playerMove.input} (i${startup}) hits guaranteed with ${frameDiff} frame(s) to spare.`,
  };
}

/**
 * Evaluates whether player's follow-up move forms a frame trap against an opponent's i10 jab.
 */
export function evaluateFrameTrap(
  leadMove: Move,
  condition: 'hit' | 'block',
  followUpMove: Move
): FrameTrapEvaluation {
  const advantage = condition === 'hit' ? (leadMove.hit_num ?? 0) : (leadMove.block_num ?? 0);
  const startup = followUpMove.startup_num ?? 15;
  const effectiveStartup = startup - advantage;
  const frameDiff = 10 - effectiveStartup;
  const condText = condition === 'hit' ? 'ON HIT' : 'ON BLOCK';

  if (effectiveStartup < 10) {
    return {
      status: 'counter-hit',
      effectiveStartup,
      frameDiff,
      message: `UNINTERRUPTIBLE FRAME TRAP! Dalam situasi ${condText} (+${advantage}f), move ${followUpMove.input} (i${startup}) mendarat di frame efektif ${effectiveStartup}, mengalahkan jab i10 lawan ${frameDiff} frame lebih cepat (Counter Hit guaranteed)!`,
    };
  } else if (effectiveStartup === 10) {
    return {
      status: 'trade',
      effectiveStartup,
      frameDiff: 0,
      message: `TRADE! Dalam situasi ${condText} (+${advantage}f), move ${followUpMove.input} (i${startup}) mendarat di frame efektif 10, sehingga Anda dan jab i10 lawan saling memukul bersamaan.`,
    };
  } else {
    return {
      status: 'interrupted',
      effectiveStartup,
      frameDiff: effectiveStartup - 10,
      message: `TERPOTONG (INTERRUPTED)! Dalam situasi ${condText} (+${advantage}f), move ${followUpMove.input} (i${startup}) baru mendarat di frame efektif ${effectiveStartup}. Jab i10 lawan keluar ${effectiveStartup - 10} frame lebih cepat dan memotong serangan Anda!`,
    };
  }
}

/**
 * Returns the pool of moves for punishment training based on opponent and minus brackets.
 */
export function getPunishmentMovePool(
  oppChar: CharacterName,
  minusFilter: MinusBracket[] = ['all-moves'],
  stringFilter: StringFilter = 'all'
): Move[] {
  const allOpponentMoves = (CHARACTER_DATA[oppChar] || []).filter(
    (m) => m.block_num !== null && !isThrowMove(m)
  );

  const isAllMoves = minusFilter.length === 0 || minusFilter.includes('all-moves');
  let oppMoves: Move[] = [];

  if (isAllMoves) {
    oppMoves = allOpponentMoves;
  } else {
    oppMoves = allOpponentMoves.filter((m) => {
      const b = m.block_num ?? 0;
      return minusFilter.some((bracket) => {
        if (bracket === 'safe') return b >= -9;
        if (bracket === '10') return b === -10;
        if (bracket === '11-12') return b === -11 || b === -12;
        if (bracket === '13-14') return b === -13 || b === -14;
        if (bracket === '15+') return b <= -15;
        return false;
      });
    });
  }

  if (stringFilter && stringFilter !== 'all') {
    const byString = oppMoves.filter((m) => {
      const hits = countMoveHits(m.input);
      if (stringFilter === '1-hit') return hits === 1;
      if (stringFilter === '2-hits') return hits === 2;
      if (stringFilter === '3-hits') return hits === 3;
      if (stringFilter === '3+hits') return hits >= 3;
      return true;
    });
    if (byString.length > 0) {
      oppMoves = byString;
    }
  }

  return oppMoves.length > 0 ? oppMoves : allOpponentMoves;
}

/**
 * Generates a question for Punishment Quiz Mode
 */
export function generatePunishmentQuestion(
  userChar: CharacterName,
  oppChar: CharacterName,
  format: InputFormat,
  minusFilter: MinusBracket[] = ['all-moves'],
  isBlindMode: boolean = true,
  presetMove?: Move,
  modifiers?: Partial<QuizQuestion>,
  stringFilter: StringFilter = 'all'
): QuizQuestion {
  const oppMoves = getPunishmentMovePool(oppChar, minusFilter, stringFilter);

  // Prioritize moves with video if available
  const movesWithVideo = oppMoves.filter((m) => m.video_url);
  const pool = movesWithVideo.length > 3 ? movesWithVideo : oppMoves;
  const oppMove = presetMove || pool[Math.floor(Math.random() * pool.length)];
  const isOpponentSafe = (oppMove.block_num ?? 0) >= -9;
  const minus = Math.abs(oppMove.block_num ?? 10);

  // Calculate dynamic Blitz timer: 4.0s base + 0.5s per extra hit
  const hits = countMoveHits(oppMove.input);
  const maxBlitzTime = 4.0 + Math.max(0, hits - 1) * 0.5;

  // User's moves (exclude throws)
  const userMoves = (CHARACTER_DATA[userChar] || []).filter((m) => m.startup_num !== null && !isThrowMove(m));
  const guaranteedMoves = isOpponentSafe 
    ? [] 
    : userMoves.filter((m) => (m.startup_num ?? 99) <= minus);

  // Find optimal move
  let optimalMove: Move | undefined = undefined;
  if (!isOpponentSafe) {
    optimalMove = guaranteedMoves.find((m) => minus >= 15 && m.is_launcher);
    if (!optimalMove) {
      optimalMove = guaranteedMoves.reduce((best, cur) => {
        if (!best) return cur;
        return (cur.startup_num ?? 0) >= (best.startup_num ?? 0) ? cur : best;
      }, guaranteedMoves[0]);
    }
  }

  let choices: Move[] = [];
  if (format === 'four-choices') {
    const selected: Move[] = [];
    if (optimalMove) selected.push(optimalMove);

    if (!isOpponentSafe) {
      const subOptimal = guaranteedMoves.find(
        (m) => m.id !== optimalMove?.id && (m.startup_num ?? 99) <= 12
      );
      if (subOptimal) selected.push(subOptimal);
    }

    const slowMoves = shuffleArray(
      userMoves.filter((m) => (m.startup_num ?? 0) > minus + 1)
    );
    for (const sm of slowMoves) {
      if (selected.length >= 4) break;
      if (!selected.some((s) => s.id === sm.id)) {
        selected.push(sm);
      }
    }

    for (const um of shuffleArray(userMoves)) {
      if (selected.length >= 4) break;
      if (!selected.some((s) => s.id === um.id)) {
        selected.push(um);
      }
    }

    choices = shuffleArray(selected);
  }

  return {
    id: `punish_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
    mode: 'punishment',
    userCharacter: userChar,
    opponentCharacter: oppChar,
    opponentMove: oppMove,
    minusFrames: minus,
    isOpponentSafe,
    isBlindMode,
    minusFilter,
    stringFilter,
    maxBlitzTime,
    choices,
    correctMoves: guaranteedMoves,
    optimalMove,
    ...modifiers,
  };
}

export function isKnockdownOrAirborne(strVal?: string | null): boolean {
  if (!strVal) return false;
  const s = strVal.toLowerCase();
  return (
    s.includes('knd') ||
    s.includes('launch') ||
    s.includes('tgd') ||
    s.includes('balcony') ||
    s.includes('wall') ||
    /\+\d+[ad]/.test(s)
  );
}

export interface FrameTrapCandidate {
  leadMove: Move;
  condition: 'hit' | 'block';
  advantage: number;
}

/**
 * Returns candidate frame trap moves (plus on block or on hit) for a character.
 */
export function getFrameTrapMovePool(userChar: CharacterName): FrameTrapCandidate[] {
  const userMoves = (CHARACTER_DATA[userChar] || []).filter((m) => !isThrowMove(m));

  const onHitCandidates = userMoves.filter(
    (m) =>
      m.hit_num !== null &&
      m.hit_num >= 2 &&
      m.hit_num <= 9 &&
      !isKnockdownOrAirborne(m.hit)
  );

  const onBlockCandidates = userMoves.filter(
    (m) =>
      m.block_num !== null &&
      m.block_num >= 1 &&
      m.block_num <= 8 &&
      !isKnockdownOrAirborne(m.block)
  );

  const list: FrameTrapCandidate[] = [];
  onBlockCandidates.forEach((m) => list.push({ leadMove: m, condition: 'block', advantage: m.block_num ?? 1 }));
  onHitCandidates.forEach((m) => list.push({ leadMove: m, condition: 'hit', advantage: m.hit_num ?? 4 }));
  return list;
}

/**
 * Generates a question for Frame Advantage / Frame Trap Mode
 */
export function generateFrameTrapQuestion(
  userChar: CharacterName,
  oppChar: CharacterName,
  format: InputFormat,
  isBlindMode: boolean = true,
  presetCandidate?: FrameTrapCandidate,
  modifiers?: Partial<QuizQuestion>
): QuizQuestion {
  const userMoves = (CHARACTER_DATA[userChar] || []).filter((m) => !isThrowMove(m));

  let leadMove: Move;
  let condition: 'hit' | 'block';
  let advantage: number;

  if (presetCandidate) {
    leadMove = presetCandidate.leadMove;
    condition = presetCandidate.condition;
    advantage = presetCandidate.advantage;
  } else {
    const candidates = getFrameTrapMovePool(userChar);
    if (candidates.length > 0) {
      // Prioritize moves with video if available
      const withVid = candidates.filter((c) => c.leadMove.video_url);
      const pool = withVid.length >= 3 ? withVid : candidates;
      const picked = pool[Math.floor(Math.random() * pool.length)];
      leadMove = picked.leadMove;
      condition = picked.condition;
      advantage = picked.advantage;
    } else {
      leadMove = userMoves[0];
      condition = 'hit';
      advantage = leadMove.hit_num ?? 4;
    }
  }

  // Valid follow-up moves: startup - advantage < 10 (beats i10 jab)
  const validFollowUps = userMoves.filter((m) => {
    if (m.startup_num === null) return false;
    return m.startup_num - advantage < 10;
  });

  const optimalFollowUp =
    validFollowUps.find((m) => m.is_launcher) ||
    validFollowUps.find((m) => (m.startup_num ?? 0) - advantage === 9) ||
    validFollowUps[0];

  let choices: Move[] = [];
  if (format === 'four-choices') {
    const selected: Move[] = [];
    if (optimalFollowUp) selected.push(optimalFollowUp);

    // Pick 1 other valid frame trap
    const secondValid = validFollowUps.find((m) => m.id !== optimalFollowUp?.id);
    if (secondValid) selected.push(secondValid);

    // Pick 2 too-slow moves: startup - advantage >= 11 (interrupted by i10 jab)
    const tooSlow = shuffleArray(
      userMoves.filter((m) => {
        if (m.startup_num === null) return false;
        return m.startup_num - advantage >= 11;
      })
    );

    for (const sm of tooSlow) {
      if (selected.length >= 4) break;
      if (!selected.some((s) => s.id === sm.id)) {
        selected.push(sm);
      }
    }

    // Fill remaining if needed
    for (const um of shuffleArray(userMoves)) {
      if (selected.length >= 4) break;
      if (!selected.some((s) => s.id === um.id)) {
        selected.push(um);
      }
    }

    choices = shuffleArray(selected);
  }

  const hits = countMoveHits(leadMove.input);
  const maxBlitzTime = 4.0 + Math.max(0, hits - 1) * 0.5;

  return {
    id: `frametrap_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
    mode: 'frame-trap',
    userCharacter: userChar,
    opponentCharacter: oppChar,
    userLeadMove: leadMove,
    condition,
    advantageFrames: advantage,
    isBlindMode,
    maxBlitzTime,
    choices,
    correctMoves: validFollowUps,
    optimalMove: optimalFollowUp,
    ...modifiers,
  };
}
