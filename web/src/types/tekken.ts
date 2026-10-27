export type CharacterName =
  | "Alisa"
  | "Asuka"
  | "Azucena"
  | "Bryan"
  | "Claudio"
  | "Devil Jin"
  | "Dragunov"
  | "Eddy"
  | "Feng"
  | "Hwoarang"
  | "Jack-8"
  | "Jin"
  | "Jun"
  | "Kazuya"
  | "King"
  | "Kuma"
  | "Lars"
  | "Lee"
  | "Leo"
  | "Leroy"
  | "Lidia"
  | "Lili"
  | "Law"
  | "Nina"
  | "Panda"
  | "Paul"
  | "Raven"
  | "Reina"
  | "Shaheen"
  | "Steve"
  | "Victor"
  | "Xiaoyu"
  | "Yoshimitsu"
  | "Zafina"
  | "Heihachi"
  | "Armor King"
  | "Clive"
  | "Fahkumram"
  | "Kunimitsu";

export interface Move {
  id: string;
  character: CharacterName;
  name: string;
  input: string;
  target?: string;
  is_low: boolean;
  is_high: boolean;
  is_mid: boolean;
  damage?: string;
  startup?: string;
  startup_num: number | null;
  block?: string;
  block_num: number | null;
  hit?: string;
  hit_num: number | null;
  ch?: string;
  ch_num: number | null;
  is_punishable: boolean;
  is_plus_on_block: boolean;
  is_plus_on_hit: boolean;
  is_launcher: boolean;
  video_file?: string | null;
  video_url?: string | null;
  is_string_video?: boolean;
  video_string_parent?: string | null;
  has_string_extensions?: boolean;
  string_extension_sample?: string | null;
  notes?: string | null;
  _cleanName?: string;
  _cleanInput?: string;
  _cleanId?: string;
  _lowerName?: string;
  _lowerInput?: string;
  hit_tooltip?: string;
  ch_tooltip?: string;
  block_tooltip?: string;
}

export type QuizMode = "punishment" | "frame-trap" | "throw-break";
export type InputFormat = "four-choices" | "full-movelist";
export type MinusBracket = "all-moves" | "safe" | "10" | "11-12" | "13-14" | "15+";
export type StringFilter = "all" | "1-hit" | "2-hits" | "3-hits" | "3+hits";

export type ThrowBreakButton = "1" | "2" | "1+2";
export type ThrowHandVisual = "left" | "right" | "both" | "trick";
export type ThrowDrillType = "direct" | "multistage";

export interface ThrowBreakEvaluation {
  status: "escaped" | "wrong-button";
  userChoice: ThrowBreakButton;
  correctBreak: ThrowBreakButton[];
  handVisual: ThrowHandVisual;
  throwName: string;
  damage: string;
  message: string;
}

export interface PunishEvaluation {
  status: "optimal" | "valid" | "too-slow";
  frameDiff: number; // minus on block - startup
  damageDealt: string;
  message: string;
}

export interface FrameTrapEvaluation {
  status: "counter-hit" | "trade" | "interrupted";
  effectiveStartup: number; // startup - advantage
  frameDiff: number; // 10 - effectiveStartup
  message: string;
}

export type SessionScope = "endless" | "gauntlet";

export interface DrillModifiers {
  sessionScope: SessionScope;
  isSinglePlay: boolean;
  isBlitzMode: boolean;
  isSurvivalMode: boolean;
  isBlindMode: boolean;
}

export interface SessionSummary {
  status: "completed" | "game-over";
  reason?: string;
  totalAnswered: number;
  correctCount: number;
  optimalCount: number;
  accuracy: number;
  bestStreak: number;
}

export interface QuizQuestion {
  id: string;
  mode: QuizMode;
  userCharacter: CharacterName;
  opponentCharacter: CharacterName;
  // Modifiers
  sessionScope?: SessionScope;
  gauntletIndex?: number;
  gauntletTotal?: number;
  isSinglePlay?: boolean;
  isBlitzMode?: boolean;
  isSurvivalMode?: boolean;
  isBlindMode?: boolean;
  maxBlitzTime?: number;
  stringFilter?: StringFilter;
  // For punishment mode:
  opponentMove?: Move;
  minusFrames?: number;
  isOpponentSafe?: boolean;
  minusFilter?: MinusBracket[];
  // For frame-trap mode:
  userLeadMove?: Move;
  condition?: "hit" | "block";
  advantageFrames?: number;
  // For throw-break mode:
  throwMove?: Move;
  validBreaks?: ThrowBreakButton[];
  handVisual?: ThrowHandVisual;
  rawBreakText?: string;
  throwDrillType?: ThrowDrillType;
  chainStage?: number; // 1 = Starter, 2 = Branch / Sambungan, 3 = Finisher
  chainParentName?: string; // e.g. "Dari Arm Breaker"
  chainFollowups?: Move[]; // Followup moves for multi-stage drill
  // Choices for four-choices mode
  choices?: Move[];
  correctMoves: Move[];
  optimalMove?: Move;
}

export interface QuizScore {
  streak: number;
  bestStreak: number;
  totalAnswered: number;
  correctCount: number;
  optimalCount: number;
}
