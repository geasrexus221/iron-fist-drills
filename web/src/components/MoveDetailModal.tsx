import React, { useState, useMemo, useEffect } from 'react';
import { createPortal } from 'react-dom';
import type { CharacterName, Move } from '../types/tekken';
import {
  formatStartup,
  getMoveAttributes,
  detectStanceTransitions,
  getCandidateStancePrefix,
  isPlayerRecoveringCrouch,
  isOpponentGrounded,
  isOpponentForcedCrouch,
  type DetailScenario,
  detectSpecialCrouchHit,
  detectCleanHit,
  hasDistinctCounterHit,
} from '../utils/notation';
import { X, Play, ChevronUp, ChevronDown, Info, ArrowLeft, ChevronLeft, ChevronRight } from 'lucide-react';
import { AttributeGuideModal } from './AttributeGuideModal';
import { OptionGuideModal } from './OptionGuideModal';

export interface MoveDetailModalProps {
  move: Move;
  spreadsheetMoves?: Move[];
  allCharacterMoves: Move[];
  characterName: CharacterName;
  onClose: () => void;
  onSelectMove?: (move: Move) => void;
  favorites?: Set<string>;
  onToggleFavorite?: (id: string) => void;
}

type SortField = 'input' | 'target' | 'startup' | 'block' | 'hit';
type SortDirection = 'asc' | 'desc';

interface SortConfig {
  field: SortField;
  direction: SortDirection;
}

interface ScenarioTabItem {
  id: DetailScenario;
  label: string;
  highlight?: boolean;
}

export const MoveDetailModal: React.FC<MoveDetailModalProps> = ({
  move: initialMove,
  spreadsheetMoves,
  allCharacterMoves,
  characterName,
  onClose,
  onSelectMove,
}) => {
  // Current active move inside the detail modal
  const [currentMove, setCurrentMove] = useState<Move>(initialMove);

  // Navigation history to allow going back to previously inspected moves
  const [history, setHistory] = useState<Move[]>([]);

  // Sibling options when navigating inside a follow-up option move
  const [optionSiblings, setOptionSiblings] = useState<Move[]>([]);

  // Sync state if initialMove prop changes
  useEffect(() => {
    setCurrentMove(initialMove);
    setHistory([]);
    setOptionSiblings([]);
  }, [initialMove.id]);

  const handleSelectNewMove = (newMove: Move) => {
    // If navigating from root into first level follow-up, capture current sorted moves as siblings
    if (history.length === 0) {
      setOptionSiblings(sortedMoves);
    }
    setHistory((prev) => [...prev, currentMove]);
    setCurrentMove(newMove);
    setActiveVideoMove(newMove);
    setScenario('hit');
    setStanceFilter('all');
    onSelectMove?.(newMove);
  };

  const handleGoBack = () => {
    if (history.length === 0) return;
    const prevMove = history[history.length - 1];
    setHistory((prev) => prev.slice(0, prev.length - 1));
    if (history.length <= 1) {
      setOptionSiblings([]);
    }
    setCurrentMove(prevMove);
    setActiveVideoMove(prevMove);
    setScenario('hit');
    setStanceFilter('all');
    onSelectMove?.(prevMove);
  };

  // Scenario state: 'hit' (default), 'ch', 'crouch', 'clean', or 'block'
  const [scenario, setScenario] = useState<DetailScenario>('hit');

  // Move attributes
  const currentMoveAttrs = useMemo(() => getMoveAttributes(currentMove), [currentMove]);

  // Special scenario detections
  const distinctCH = useMemo(() => hasDistinctCounterHit(currentMove), [currentMove]);
  const specialCrouch = useMemo(() => detectSpecialCrouchHit(currentMove), [currentMove]);
  const specialClean = useMemo(() => detectCleanHit(currentMove), [currentMove]);

  // Dynamic scenario tabs
  const scenarioTabs = useMemo<ScenarioTabItem[]>(() => {
    const tabs: ScenarioTabItem[] = [
      { id: 'hit', label: `On Hit (${currentMove.hit || 'N/A'})` },
    ];

    if (specialCrouch) {
      tabs.push({
        id: 'crouch',
        label: `On Crouch (${specialCrouch.frame})`,
        highlight: specialCrouch.isGuaranteed,
      });
    }

    if (specialClean) {
      tabs.push({
        id: 'clean',
        label: `Clean Hit (${specialClean.frame})`,
      });
    }

    if (distinctCH) {
      tabs.push({
        id: 'ch',
        label: `On CH (${currentMove.ch})`,
      });
    }

    tabs.push({
      id: 'block',
      label: `On Block (${currentMove.block || 'N/A'})`,
    });

    return tabs;
  }, [currentMove, distinctCH, specialCrouch, specialClean]);

  // Attribute guide popup modal state
  const [isAttrGuideOpen, setIsAttrGuideOpen] = useState(false);

  // Option move guide popup modal state
  const [isOptionGuideOpen, setIsOptionGuideOpen] = useState(false);

  // Currently playing video move in the top player (defaults to the inspected move)
  const [activeVideoMove, setActiveVideoMove] = useState<Move>(currentMove);

  // Sorting state for the 3-column table
  const [sortConfig, setSortConfig] = useState<SortConfig | null>({ field: 'startup', direction: 'asc' });

  // Update active video when currentMove changes
  useEffect(() => {
    setActiveVideoMove(currentMove);
    setScenario('hit');
    setSortConfig({ field: 'startup', direction: 'asc' });
    setStanceFilter('all');
  }, [currentMove.id]);


  // Parse numeric frame advantage from string or number field
  const parseNum = (valStr?: string | null, valNum?: number | null): number | null => {
    if (valNum !== null && valNum !== undefined) return valNum;
    if (!valStr) return null;
    const match = valStr.match(/([+-]?\d+)/);
    return match ? parseInt(match[1], 10) : null;
  };

  const hitAdvantage = parseNum(currentMove.hit, currentMove.hit_num);
  const blockAdvantage = parseNum(currentMove.block, currentMove.block_num);
  const chAdvantage = parseNum(currentMove.ch, currentMove.ch_num) ?? hitAdvantage;

  const currentAdvantage = useMemo(() => {
    if (scenario === 'hit') return hitAdvantage;
    if (scenario === 'block') return blockAdvantage;
    if (scenario === 'ch') return chAdvantage;
    if (scenario === 'crouch') return specialCrouch?.frameNum ?? hitAdvantage;
    if (scenario === 'clean') return specialClean?.frameNum ?? hitAdvantage;
    return hitAdvantage;
  }, [scenario, hitAdvantage, blockAdvantage, chAdvantage, specialCrouch, specialClean]);

  // Sub-filter for stance when transition is optional: 'all' | 'stance'
  const [stanceFilter, setStanceFilter] = useState<'all' | 'stance'>('all');

  // Situational state checks
  const transitions = useMemo(() => detectStanceTransitions(currentMove), [currentMove]);
  const hasMandatoryStance = useMemo(() => transitions.some((t) => !t.isOptional), [transitions]);
  const accessibleStanceCodes = useMemo(() => new Set(transitions.map((t) => t.stance)), [transitions]);

  const isPlayerCrouch = useMemo(() => isPlayerRecoveringCrouch(currentMove), [currentMove]);
  const isGrounded = useMemo(() => isOpponentGrounded(currentMove, scenario), [currentMove, scenario]);
  const isForcedCrouch = useMemo(() => isOpponentForcedCrouch(currentMove, scenario), [currentMove, scenario]);

  // Opponent fastest response:
  // If opponent is forced into crouch (FC), fastest response is i11 (ws+4)
  // Otherwise, fastest response is i10 standing jab
  const opponentFastest = isForcedCrouch ? 11 : 10;
  const opponentArrival = currentAdvantage !== null ? currentAdvantage + opponentFastest : null;

  // Filter valid moves for the selected scenario
  const validMoves = useMemo(() => {
    // If no advantage data, or in severe disadvantage (< 10), no follow-up beats opponent's response
    if (currentAdvantage === null || opponentArrival === null || opponentArrival < 10) {
      return [];
    }

    return allCharacterMoves.filter((m) => {
      // 1. Exclude self
      if (m.id === currentMove.id) return false;
      if (!m.startup_num) return false;

      // 2. Check startup window
      if (m.startup_num < 10 || m.startup_num > opponentArrival) return false;

      // 3. Stance & Posture Filtering
      const candStance = getCandidateStancePrefix(m.input);

      // 3A. Special system prefixes:
      // Heat moves ("H.") require active heat state
      if (candStance === 'H') return false;
      // Rage Art ("R.") is an emergency mechanic, not standard frame trap
      if (candStance === 'R') return false;
      // OTG moves ("OTG.") require opponent to be grounded
      if (candStance === 'OTG') {
        if (!isGrounded) return false;
      }

      // 3B. Named Character Stances (FUJ, ZEN, WRA, SEN, FLK, MNT, etc.):
      const isNamedStance =
        candStance !== null &&
        candStance !== 'WS' &&
        candStance !== 'FC' &&
        candStance !== 'SS' &&
        candStance !== 'BT' &&
        candStance !== 'H' &&
        candStance !== 'R' &&
        candStance !== 'OTG';

      if (isNamedStance) {
        // Candidate move requires a named stance.
        // It can ONLY be executed if the current move has a transition to this stance!
        if (!accessibleStanceCodes.has(candStance)) return false;
      }

      // 3C. Back-Turned & Side-Step
      if (candStance === 'BT' && !accessibleStanceCodes.has('BT')) return false;
      if (candStance === 'SS' && !accessibleStanceCodes.has('SS')) return false;

      // 3D. Posture: Standing vs Crouching
      if (!isPlayerCrouch) {
        // Player is STANDING:
        // Exclude While Standing ("ws") and Full Crouch ("fc") moves
        if (candStance === 'WS' || candStance === 'FC') return false;
        // If the current move forces a MANDATORY stance, player cannot perform normal standing moves
        if (hasMandatoryStance && candStance === null) return false;
      } else {
        // Player is CROUCHING:
        // While Standing and Full Crouch are allowed!
        // Neutral moves without prefix must be crouch-accessible (e.g. d+, db+, df+)
        if (candStance === null) {
          const isDownInput = /^(?:d[\+\/,]|db|df)/i.test(m.input);
          if (!isDownInput) return false;
        }
      }

      // 4. Opponent Posture Filtering (Crouching, Force Crouch, or Grounded):
      // Serangan High 100% whiff jika lawan sedang menunduk (crouch/Force Crouch) atau terjatuh di lantai (grounded).
      // Hanya serangan Mid, Low, dan Special Mid yang dapat mengenai lawan.
      const isOpponentDuckingOrDown = isGrounded || scenario === 'crouch' || isForcedCrouch;
      if (isOpponentDuckingOrDown) {
        const targetLower = (m.target || '').toLowerCase();
        const firstTarget = targetLower.split(/[,/]/)[0].trim();
        if (firstTarget === 'h' || firstTarget === 'high') {
          return false;
        }
      }

      return true;
    });
  }, [allCharacterMoves, currentMove.id, currentAdvantage, opponentArrival, accessibleStanceCodes, hasMandatoryStance, isPlayerCrouch, isGrounded, scenario, isForcedCrouch]);

  const stanceMovesCount = useMemo(() => {
    return validMoves.filter((m) => {
      const p = getCandidateStancePrefix(m.input);
      return p !== null && accessibleStanceCodes.has(p);
    }).length;
  }, [validMoves, accessibleStanceCodes]);

  const filteredMoves = useMemo(() => {
    if (stanceFilter === 'stance') {
      return validMoves.filter((m) => {
        const p = getCandidateStancePrefix(m.input);
        return p !== null && accessibleStanceCodes.has(p);
      });
    }
    return validMoves;
  }, [validMoves, stanceFilter, accessibleStanceCodes]);

  // Sort filtered moves
  const sortedMoves = useMemo(() => {
    if (!sortConfig) return filteredMoves;
    const { field, direction } = sortConfig;
    const factor = direction === 'asc' ? 1 : -1;

    return [...filteredMoves].sort((a, b) => {
      if (field === 'input') {
        return factor * a.input.localeCompare(b.input, undefined, { numeric: true, sensitivity: 'base' });
      }
      if (field === 'target') {
        return factor * (a.target || '').localeCompare(b.target || '', undefined, { sensitivity: 'base' });
      }
      if (field === 'startup') {
        if (a.startup_num === null && b.startup_num === null) return 0;
        if (a.startup_num === null) return 1;
        if (b.startup_num === null) return -1;
        return factor * (a.startup_num - b.startup_num);
      }
      if (field === 'block') {
        if (a.block_num === null && b.block_num === null) return 0;
        if (a.block_num === null) return 1;
        if (b.block_num === null) return -1;
        return factor * (a.block_num - b.block_num);
      }
      if (field === 'hit') {
        if (a.hit_num === null && b.hit_num === null) return 0;
        if (a.hit_num === null) return 1;
        if (b.hit_num === null) return -1;
        return factor * (a.hit_num - b.hit_num);
      }
      return 0;
    });
  }, [filteredMoves, sortConfig]);

  const handleSort = (field: SortField) => {
    setSortConfig((prev) => {
      if (!prev || prev.field !== field) {
        return { field, direction: 'asc' };
      }
      if (prev.direction === 'asc') {
        return { field, direction: 'desc' };
      }
      return null;
    });
  };

  const renderSortIndicator = (field: SortField) => {
    if (!sortConfig || sortConfig.field !== field) return null;
    return (
      <span className="th-sort-icon-wrap">
        {sortConfig.direction === 'asc' ? <ChevronUp size={13} /> : <ChevronDown size={13} />}
      </span>
    );
  };

  // Contextual Next / Prev Navigation
  const isFollowUpMode = history.length > 0 && optionSiblings.length > 0;
  const effectiveSpreadsheetMoves = useMemo(() => {
    return spreadsheetMoves && spreadsheetMoves.length > 0 ? spreadsheetMoves : allCharacterMoves;
  }, [spreadsheetMoves, allCharacterMoves]);

  const activeNavList = isFollowUpMode ? optionSiblings : effectiveSpreadsheetMoves;
  const currentNavIndex = useMemo(() => {
    return activeNavList.findIndex((m) => m.id === currentMove.id);
  }, [activeNavList, currentMove.id]);

  const hasPrev = currentNavIndex > 0;
  const hasNext = currentNavIndex >= 0 && currentNavIndex < activeNavList.length - 1;

  const goToPrev = () => {
    if (!hasPrev) return;
    const targetMove = activeNavList[currentNavIndex - 1];
    if (!isFollowUpMode) {
      setHistory([]);
      setOptionSiblings([]);
    }
    setCurrentMove(targetMove);
    setActiveVideoMove(targetMove);
    setScenario('hit');
    setStanceFilter('all');
    onSelectMove?.(targetMove);
  };

  const goToNext = () => {
    if (!hasNext) return;
    const targetMove = activeNavList[currentNavIndex + 1];
    if (!isFollowUpMode) {
      setHistory([]);
      setOptionSiblings([]);
    }
    setCurrentMove(targetMove);
    setActiveVideoMove(targetMove);
    setScenario('hit');
    setStanceFilter('all');
    onSelectMove?.(targetMove);
  };

  // Keyboard navigation: Escape to close, ArrowLeft for Prev, ArrowRight for Next
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (isAttrGuideOpen || isOptionGuideOpen) return;
      if (['INPUT', 'TEXTAREA'].includes((e.target as HTMLElement)?.tagName)) return;

      if (e.key === 'Escape') {
        onClose();
      } else if (e.key === 'ArrowLeft') {
        e.preventDefault();
        goToPrev();
      } else if (e.key === 'ArrowRight') {
        e.preventDefault();
        goToNext();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onClose, hasPrev, hasNext, currentNavIndex, activeNavList, isFollowUpMode, isAttrGuideOpen, isOptionGuideOpen]);

  const activeVideoUrl = activeVideoMove?.video_url;

  return createPortal(
    <div className="modal-backdrop" onClick={onClose}>
      <div className="integrated-sheet-card animate-slide-up" onClick={(e) => e.stopPropagation()}>
        {/* Header: Move Name (Input) and Close Button */}
        <div className="sheet-modal-header">
          <div className="sheet-title-group">
            {history.length > 0 && (
              <button
                type="button"
                className="btn-history-back"
                onClick={handleGoBack}
                title="Kembali ke gerakan sebelumnya"
              >
                <ArrowLeft size={16} />
              </button>
            )}
            <span className="sheet-char-tag">{characterName}</span>
            <span className="sheet-move-title">
              {currentMove.name} <span className="sheet-move-input-highlight">({currentMove.input})</span>
            </span>
          </div>
          <button type="button" className="btn-close-modal" onClick={onClose} title="Tutup">
            <X size={18} />
          </button>
        </div>

        {/* Video Player */}
        <div className="sheet-video-container">
          {activeVideoUrl ? (
            <video
              key={activeVideoUrl}
              src={activeVideoUrl}
              autoPlay
              loop
              muted
              controls
              playsInline
              className="sheet-video-player"
            />
          ) : (
            <div className="sheet-video-placeholder">
              <span>Video tidak tersedia untuk gerakan ini</span>
            </div>
          )}
          {activeVideoMove.id !== currentMove.id && (
            <div className="playing-move-overlay-badge">
              <span>Memutar: {activeVideoMove.name} ({activeVideoMove.input})</span>
            </div>
          )}
        </div>

        {/* Move Attributes (Stat Strip) */}
        <div className="sheet-stat-strip">
          <div className="sheet-stat-box">
            <span className="stat-label">STARTUP</span>
            <span className="stat-value text-cyan">{formatStartup(currentMove.startup, currentMove.startup_num)}</span>
          </div>
          <div className="sheet-stat-box">
            <span className="stat-label">BLOCK</span>
            <span className={`stat-value ${(currentMove.block_num ?? 0) < 0 ? 'text-crimson' : 'text-cyan'}`}>
              {currentMove.block || 'N/A'}
            </span>
          </div>
          <div className="sheet-stat-box sheet-stat-box-hit">
            <span className="stat-label">HIT</span>
            <div className="stat-value text-green stat-hit-multi">
              <span>{currentMove.hit || 'N/A'}</span>
              {specialCrouch && (
                <>
                  <span className="stat-separator"> | </span>
                  <span className="stat-sub-val" title="On Crouch Hit">
                    {specialCrouch.frame} <span className="stat-tag-suffix">(cr)</span>
                  </span>
                </>
              )}
              {distinctCH && currentMove.ch && (
                <>
                  <span className="stat-separator"> | </span>
                  <span className="stat-sub-val text-ch-gold" title="Counter Hit">
                    {currentMove.ch} <span className="stat-tag-suffix">(ch)</span>
                  </span>
                </>
              )}
            </div>
          </div>
          <div className="sheet-stat-box">
            <span className="stat-label">TARGET</span>
            <span className="stat-value text-gold">{currentMove.target || '-'}</span>
          </div>
          <div className="sheet-stat-box sheet-stat-box-attr">
            <div className="stat-label-wrap">
              <span className="stat-label">ATRIBUT</span>
              <button
                type="button"
                className="btn-attr-info-trigger"
                onClick={() => setIsAttrGuideOpen(true)}
                title="Lihat penjelasan & kepanjangan lengkap seluruh atribut"
              >
                <Info size={11} />
              </button>
            </div>
            <div className="stat-value-attr">
              {currentMoveAttrs.length > 0 ? (
                <div className="sheet-attr-badges-inline">
                  {currentMoveAttrs.map((b) => (
                    <span key={b.code} className={`attr-badge ${b.colorClass}`} title={b.label}>
                      {b.code}
                    </span>
                  ))}
                </div>
              ) : (
                <span className="no-attr">-</span>
              )}
            </div>
          </div>
        </div>

        {/* Option Move Table Section */}
        <div className="sheet-table-section">
          {/* Option Move Title Row: Title (Left) and (i) Info Button (Right) */}
          <div className="sheet-section-title-row">
            <span className="sheet-section-title">OPTION MOVE ({sortedMoves.length})</span>
            <button
              type="button"
              className="btn-option-guide-trigger"
              onClick={() => setIsOptionGuideOpen(true)}
              title="Penjelasan & Panduan Option Move"
            >
              <Info size={12} />
            </button>
          </div>

          {/* Dynamic Scenario Tabs: On Hit, Vs Crouch, Clean Hit, On CH, On Block */}
          <div className="sheet-scenario-row">
            {scenarioTabs.map((t) => (
              <button
                key={t.id}
                type="button"
                className={`sheet-scenario-tab ${scenario === t.id ? 'tab-active' : ''} ${t.highlight ? 'tab-highlight' : ''}`}
                onClick={() => {
                  setScenario(t.id);
                  setStanceFilter('all');
                }}
              >
                <span>{t.label}</span>
              </button>
            ))}
          </div>

          {/* Compact 1-Row Subfilter & Context Indicator */}
          {(transitions.length > 0 || isForcedCrouch || isGrounded) && (
            <div className="sheet-compact-context-row">
              {transitions.length > 0 && !hasMandatoryStance && stanceMovesCount > 0 && (
                <div className="sheet-stance-subfilter-group">
                  <button
                    type="button"
                    className={`stance-subfilter-btn ${stanceFilter === 'all' ? 'active' : ''}`}
                    onClick={() => setStanceFilter('all')}
                  >
                    Semua ({validMoves.length})
                  </button>
                  <button
                    type="button"
                    className={`stance-subfilter-btn ${stanceFilter === 'stance' ? 'active' : ''}`}
                    onClick={() => setStanceFilter('stance')}
                  >
                    {transitions[0].stance} {transitions[0].trigger ? `(${transitions[0].trigger})` : ''} ({stanceMovesCount})
                  </button>
                </div>
              )}

              {/* Minimalist Micro Badges for Status (Singkatan 1 kata) */}
              <div className="sheet-micro-badges-group">
                {isForcedCrouch && (
                  <span className="micro-badge micro-badge-fc" title="Lawan dalam posisi jongkok (Force Crouch), respon tercepat ws+4 i11">
                    FC
                  </span>
                )}
                {isGrounded && (
                  <span className="micro-badge micro-badge-grounded" title="Lawan jatuh di lantai (Grounded) - Serangan High otomatis dikecualikan">
                    Grounded
                  </span>
                )}
              </div>
            </div>
          )}

          <div className="option-table-wrapper">
            {sortedMoves.length === 0 ? (
              <div className="option-empty-box">
                {scenario === 'block' && (currentMove.block_num ?? 0) < 0 ? (
                  <span>
                    Gerakan ini minus di block ({currentMove.block || 'N/A'}). Anda berada dalam situasi disadvantage, tidak ada serangan yang mendahului jab lawan.
                  </span>
                ) : (
                  <span>Tidak ada opsi gerakan yang mendahului serangan lawan pada skenario ini.</span>
                )}
              </div>
            ) : (
              <table className="option-moves-table">
                <thead>
                  <tr>
                    <th
                      className={`th-sortable th-input ${sortConfig?.field === 'input' ? 'th-active-sort' : ''}`}
                      onClick={() => handleSort('input')}
                      title="Sortir berdasarkan Input"
                    >
                      <div className="th-header-inner">
                        <span>INPUT</span>
                        {renderSortIndicator('input')}
                      </div>
                    </th>
                    <th
                      className={`th-sortable th-target ${sortConfig?.field === 'target' ? 'th-active-sort' : ''}`}
                      onClick={() => handleSort('target')}
                      title="Sortir berdasarkan Target Serangan"
                    >
                      <div className="th-header-inner th-header-center">
                        <span>TARGET</span>
                        {renderSortIndicator('target')}
                      </div>
                    </th>
                    <th
                      className={`th-sortable th-startup ${sortConfig?.field === 'startup' ? 'th-active-sort' : ''}`}
                      onClick={() => handleSort('startup')}
                      title="Sortir berdasarkan Kecepatan Startup"
                    >
                      <div className="th-header-inner th-header-center">
                        <span>STARTUP</span>
                        {renderSortIndicator('startup')}
                      </div>
                    </th>
                    <th
                      className={`th-sortable th-block ${sortConfig?.field === 'block' ? 'th-active-sort' : ''}`}
                      onClick={() => handleSort('block')}
                      title="Sortir berdasarkan Frame Block"
                    >
                      <div className="th-header-inner th-header-center">
                        <span>BLOCK</span>
                        {renderSortIndicator('block')}
                      </div>
                    </th>
                    <th
                      className={`th-sortable th-hit ${sortConfig?.field === 'hit' ? 'th-active-sort' : ''}`}
                      onClick={() => handleSort('hit')}
                      title="Sortir berdasarkan Frame Hit"
                    >
                      <div className="th-header-inner th-header-center">
                        <span>HIT</span>
                        {renderSortIndicator('hit')}
                      </div>
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {sortedMoves.map((m) => {
                    const targetClass = m.target?.toLowerCase().includes('sm')
                      ? 'target-sm'
                      : m.target?.toLowerCase().includes('l')
                      ? 'target-l'
                      : m.target?.toLowerCase().includes('m')
                      ? 'target-m'
                      : 'target-h';

                    const blockNum = m.block_num;
                    const isPunishable = blockNum !== null && blockNum !== undefined && blockNum <= -10;
                    const isPlus = blockNum !== null && blockNum !== undefined && blockNum > 0;

                    return (
                      <tr
                        key={m.id}
                        className="option-row"
                        onClick={() => handleSelectNewMove(m)}
                        title={`Buka detail dan opsi gerakan ${m.name} (${m.input})`}
                      >
                        <td className="td-input">
                          <div className="input-cell-content">
                            <span className="input-badge">{m.input}</span>
                            {(() => {
                              const p = getCandidateStancePrefix(m.input);
                              if (p && accessibleStanceCodes.has(p)) {
                                const tr = transitions.find((t) => t.stance === p);
                                return (
                                  <span
                                    className="row-stance-chip"
                                    title={`Jurus dari stance ${p}${tr?.trigger ? ` (input: ${tr.trigger})` : ''}`}
                                  >
                                    {p}{tr?.trigger ? ` (${tr.trigger})` : ''}
                                  </span>
                                );
                              }
                              return null;
                            })()}
                            {m.video_url && <Play size={10} className="row-play-hint" />}
                          </div>
                        </td>
                        <td className="td-target">
                          {m.target ? <span className={targetClass}>{m.target}</span> : <span className="text-muted">-</span>}
                        </td>
                        <td className="td-startup">
                          <span className="text-cyan font-bold">{formatStartup(m.startup, m.startup_num)}</span>
                        </td>
                        <td className="td-block">
                          <span className={isPunishable ? 'text-crimson font-bold' : isPlus ? 'text-cyan font-bold' : 'text-neutral'}>
                            {m.block || '-'}
                          </span>
                        </td>
                        <td className="td-hit">
                          <span className="text-green font-bold">
                            {m.hit || '-'}
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            )}
          </div>
        </div>

        {/* Bottom Sticky Footer Navigation Bar */}
        <div className="sheet-modal-footer">
          <button
            type="button"
            className="btn-sheet-nav btn-sheet-nav-prev"
            onClick={goToPrev}
            disabled={!hasPrev}
            title="Gerakan sebelumnya (Panah Kiri)"
          >
            <ChevronLeft size={13} />
            <span className="nav-btn-text">Prev</span>
          </button>

          <div className="sheet-nav-status">
            <span className="sheet-nav-label">
              {isFollowUpMode ? 'Opsi Follow-up' : 'Spreadsheet'}
            </span>
            <span className="sheet-nav-counter">
              {currentNavIndex >= 0 ? currentNavIndex + 1 : 1} / {activeNavList.length}
            </span>
          </div>

          <button
            type="button"
            className="btn-sheet-nav btn-sheet-nav-next"
            onClick={goToNext}
            disabled={!hasNext}
            title="Gerakan berikutnya (Panah Kanan)"
          >
            <span className="nav-btn-text">Next</span>
            <ChevronRight size={13} />
          </button>
        </div>
      </div>

      {/* Attribute Definitions & Guide Modal */}
      {isAttrGuideOpen && (
        <AttributeGuideModal
          isOpen={isAttrGuideOpen}
          onClose={() => setIsAttrGuideOpen(false)}
        />
      )}

      {/* Option Move Guide Modal */}
      {isOptionGuideOpen && (
        <OptionGuideModal
          isOpen={isOptionGuideOpen}
          onClose={() => setIsOptionGuideOpen(false)}
        />
      )}
    </div>,
    document.body
  );
};
