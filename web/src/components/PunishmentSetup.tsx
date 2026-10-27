import React, { useState, useEffect, useCallback } from 'react';
import type { CharacterName, InputFormat, MinusBracket, StringFilter, SessionScope, DrillModifiers, Move } from '../types/tekken';
import { CHARACTERS, CHARACTER_DATA } from '../data';
import { countMoveHits, isThrowMove } from '../utils/engine';
import { CharacterPickerModal } from './CharacterPickerModal';
import { Shield, ArrowLeft, Swords, Filter, RotateCcw, Info, X } from 'lucide-react';

interface PunishmentSetupProps {
  onStart: (
    userChar: CharacterName,
    oppChar: CharacterName,
    format: InputFormat,
    minusFilter: MinusBracket[],
    modifiers: DrillModifiers,
    stringFilter: StringFilter
  ) => void;
  onBack: () => void;
  initialUserChar?: CharacterName;
  initialOppChar?: CharacterName;
  initialFormat?: InputFormat;
  initialMinusFilter?: MinusBracket[];
  initialStringFilter?: StringFilter;
  initialModifiers?: Partial<DrillModifiers>;
}

export const PunishmentSetup: React.FC<PunishmentSetupProps> = ({
  onStart,
  onBack,
  initialUserChar = 'Jin',
  initialOppChar = 'Kazuya',
  initialFormat = 'four-choices',
  initialMinusFilter = ['all-moves'],
  initialStringFilter = 'all',
  initialModifiers,
}) => {
  const [userChar, setUserChar] = useState<CharacterName>(initialUserChar);
  const [oppChar, setOppChar] = useState<CharacterName>(initialOppChar);
  const [format, setFormat] = useState<InputFormat>(initialFormat);
  const [minusFilter, setMinusFilter] = useState<MinusBracket[]>(initialMinusFilter);
  const [stringFilter, setStringFilter] = useState<StringFilter>(initialStringFilter);
  const [sessionScope, setSessionScope] = useState<SessionScope>(initialModifiers?.sessionScope || 'endless');
  const [isSinglePlay, setIsSinglePlay] = useState<boolean>(initialModifiers?.isSinglePlay || false);
  const [isBlitzMode, setIsBlitzMode] = useState<boolean>(initialModifiers?.isBlitzMode || false);
  const [isSurvivalMode, setIsSurvivalMode] = useState<boolean>(initialModifiers?.isSurvivalMode || false);
  const [isBlindMode, setIsBlindMode] = useState<boolean>(initialModifiers?.isBlindMode ?? true);

  const [isPickerOpen, setIsPickerOpen] = useState(false);
  const [pickerRole, setPickerRole] = useState<'p1' | 'p2'>('p1');
  const [infoModal, setInfoModal] = useState<'target-minus' | 'string-type' | 'session-scope' | 'modifiers' | 'format' | null>(null);

  // Real-time opponent moves (exclude throws and unparsed block frame moves)
  const oppAllMoves = (CHARACTER_DATA[oppChar] || []).filter(
    (m) => m.block_num !== null && !isThrowMove(m)
  );

  // Helper to check if a move matches a given minusFilter
  const matchesMinusFilter = useCallback((m: Move, filter: MinusBracket[]): boolean => {
    const isAll = filter.length === 0 || filter.includes('all-moves');
    if (isAll) return true;
    const b = m.block_num ?? 0;
    return filter.some((bracket) => {
      if (bracket === 'safe') return b >= -9;
      if (bracket === '10') return b === -10;
      if (bracket === '11-12') return b === -11 || b === -12;
      if (bracket === '13-14') return b === -13 || b === -14;
      if (bracket === '15+') return b <= -15;
      return false;
    });
  }, []);

  // Moves filtered by currently chosen target minus frames
  const movesForMinus = oppAllMoves.filter((m) => matchesMinusFilter(m, minusFilter));

  // Attack string counts matching the active minus frame filter
  const stringCounts = {
    all: movesForMinus.length,
    '1-hit': movesForMinus.filter((m) => countMoveHits(m.input) === 1).length,
    '2-hits': movesForMinus.filter((m) => countMoveHits(m.input) === 2).length,
    '3-hits': movesForMinus.filter((m) => countMoveHits(m.input) === 3).length,
    '3+hits': movesForMinus.filter((m) => countMoveHits(m.input) >= 3).length,
  };

  // Moves filtered by currently chosen attack string
  const movesForString = oppAllMoves.filter((m) => {
    if (stringFilter === 'all') return true;
    const hits = countMoveHits(m.input);
    if (stringFilter === '1-hit') return hits === 1;
    if (stringFilter === '2-hits') return hits === 2;
    if (stringFilter === '3-hits') return hits === 3;
    if (stringFilter === '3+hits') return hits >= 3;
    return true;
  });

  // Target minus counts matching the active string filter
  const minusTargetCounts = {
    all: movesForString.length,
    minus: movesForString.filter((m) => (m.block_num ?? 0) <= -10).length,
    safe: movesForString.filter((m) => (m.block_num ?? 0) >= -9).length,
    '10': movesForString.filter((m) => m.block_num === -10).length,
    '11-12': movesForString.filter((m) => m.block_num === -11 || m.block_num === -12).length,
    '13-14': movesForString.filter((m) => m.block_num === -13 || m.block_num === -14).length,
    '15+': movesForString.filter((m) => (m.block_num ?? 0) <= -15).length,
  };

  // Auto-fallback: if the active stringFilter has 0 moves under the current minusFilter, reset to 'all'
  useEffect(() => {
    if (stringFilter !== 'all') {
      const moves = oppAllMoves.filter((m) => matchesMinusFilter(m, minusFilter));
      const count = moves.filter((m) => {
        const hits = countMoveHits(m.input);
        if (stringFilter === '1-hit') return hits === 1;
        if (stringFilter === '2-hits') return hits === 2;
        if (stringFilter === '3-hits') return hits === 3;
        if (stringFilter === '3+hits') return hits >= 3;
        return true;
      }).length;
      if (count === 0) {
        setStringFilter('all');
      }
    }
  }, [minusFilter, oppChar, stringFilter, oppAllMoves, matchesMinusFilter]);

  const isAllMoves = minusFilter.length === 0 || minusFilter.includes('all-moves');
  const isMinusActive =
    !isAllMoves &&
    ['10', '11-12', '13-14', '15+'].every((b) => minusFilter.includes(b as MinusBracket));
  const isSafeActive = !isAllMoves && minusFilter.includes('safe');

  const selectAllMoves = () => {
    setMinusFilter(['all-moves']);
  };

  const toggleMinusAll = () => {
    setMinusFilter((prev) => {
      const isAll = prev.length === 0 || prev.includes('all-moves');
      const hasAllMinus = !isAll && ['10', '11-12', '13-14', '15+'].every((b) => prev.includes(b as MinusBracket));
      const hasSafe = prev.includes('safe');
      if (hasAllMinus) {
        return hasSafe ? ['safe'] : ['all-moves'];
      } else {
        const minusTiers: MinusBracket[] = ['10', '11-12', '13-14', '15+'];
        return hasSafe ? [...minusTiers, 'safe'] : minusTiers;
      }
    });
  };

  const toggleBracket = (b: Exclude<MinusBracket, 'all-moves'>) => {
    setMinusFilter((prev) => {
      const isAll = prev.length === 0 || prev.includes('all-moves');
      if (isAll) {
        return [b];
      }
      const clean = prev.filter((item): item is Exclude<MinusBracket, 'all-moves'> => item !== 'all-moves');
      const updated: MinusBracket[] = clean.includes(b)
        ? clean.filter((item) => item !== b)
        : [...clean, b];
      return updated.length === 0 ? ['all-moves'] : updated;
    });
  };

  const handleSelectStringFilter = (newFilter: StringFilter) => {
    setStringFilter(newFilter);

    const targetMoves = oppAllMoves.filter((m) => {
      if (newFilter === 'all') return true;
      const hits = countMoveHits(m.input);
      if (newFilter === '1-hit') return hits === 1;
      if (newFilter === '2-hits') return hits === 2;
      if (newFilter === '3-hits') return hits === 3;
      if (newFilter === '3+hits') return hits >= 3;
      return true;
    });

    const minusCount = targetMoves.filter((m) => (m.block_num ?? 0) <= -10).length;
    const safeCount = targetMoves.filter((m) => (m.block_num ?? 0) >= -9).length;

    // Check if current minusFilter matches any moves in targetMoves
    const hasMatchesInCurrentMinus = targetMoves.some((m) => matchesMinusFilter(m, minusFilter));

    if (!hasMatchesInCurrentMinus) {
      if (minusCount === 0 && safeCount > 0) {
        setMinusFilter(['safe']);
      } else if (safeCount === 0 && minusCount > 0) {
        setMinusFilter(['10', '11-12', '13-14', '15+']);
      } else {
        setMinusFilter(['all-moves']);
      }
    } else {
      // Smart auto-switching:
      // If selected string moves only have safe moves (0 minus), auto-switch minus filter to safe
      if (minusCount === 0 && safeCount > 0) {
        setMinusFilter(['safe']);
      } else if (safeCount === 0 && minusCount > 0 && isSafeActive) {
        setMinusFilter(['10', '11-12', '13-14', '15+']);
      }
    }
  };

  const handleSelectOpponent = (char: CharacterName) => {
    setOppChar(char);
    const newOppMoves = (CHARACTER_DATA[char] || []).filter(
      (m) => m.block_num !== null && !isThrowMove(m)
    );
    const hasMovesForCurrentString = newOppMoves.some((m) => {
      if (stringFilter === 'all') return true;
      const hits = countMoveHits(m.input);
      if (stringFilter === '1-hit') return hits === 1;
      if (stringFilter === '2-hits') return hits === 2;
      if (stringFilter === '3-hits') return hits === 3;
      if (stringFilter === '3+hits') return hits >= 3;
      return true;
    });
    if (!hasMovesForCurrentString) {
      setStringFilter('all');
    }
  };

  const p1Data = CHARACTERS.find((c) => c.name === userChar);
  const p2Data = CHARACTERS.find((c) => c.name === oppChar);
  const p2PunishCount = CHARACTER_DATA[oppChar]?.filter((m) => m.is_punishable).length || 0;

  return (
    <div className="setup-container animate-slide-up">
      {/* Top Navigation */}
      <div className="setup-nav">
        <button className="btn-back" onClick={onBack}>
          <ArrowLeft size={16} />
          <span>Kembali ke Menu Utama</span>
        </button>
        <span className="setup-mode-tag tag-crimson">
          <Shield size={14} /> Punishment Training
        </span>
      </div>

      <div className="setup-header">
        <h1 className="setup-title">SETUP PUNISHMENT DRILL</h1>
      </div>

      {/* 2 Fighter Pickers (P1 and P2) */}
      <div className="matchup-selection-grid">
        {/* P1 Card */}
        <div
          className="fighter-interactive-card card-p1-glow"
          onClick={() => {
            setPickerRole('p1');
            setIsPickerOpen(true);
          }}
        >
          <div className="card-top-header">
            <span className="fighter-role role-p1">P1: ANDA</span>
            <span className="change-hint-btn">
              <RotateCcw size={12} />
              <span>Ganti</span>
            </span>
          </div>

          <div className="card-character-body">
            <div className="char-hero-info">
              <h2 className="char-hero-name" style={{ color: p1Data?.color }}>
                {userChar}
              </h2>
            </div>
          </div>
        </div>

        {/* P2 Card */}
        <div
          className="fighter-interactive-card card-p2-glow"
          onClick={() => {
            setPickerRole('p2');
            setIsPickerOpen(true);
          }}
        >
          <div className="card-top-header">
            <span className="fighter-role role-p2">P2: LAWAN</span>
            <span className="change-hint-btn">
              <RotateCcw size={12} />
              <span>Ganti</span>
            </span>
          </div>

          <div className="card-character-body">
            <div className="char-hero-info">
              <h2 className="char-hero-name" style={{ color: p2Data?.color }}>
                {oppChar}
              </h2>
              <span className="char-hero-meta text-crimson">
                {p2PunishCount} punishable
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Character Picker Popup Modal */}
      <CharacterPickerModal
        isOpen={isPickerOpen}
        onClose={() => setIsPickerOpen(false)}
        role={pickerRole}
        title={pickerRole === 'p1' ? 'PILIH KARAKTER ANDA' : 'PILIH KARAKTER LAWAN'}
        selectedChar={pickerRole === 'p1' ? userChar : oppChar}
        onSelectCharacter={(char) => {
          if (pickerRole === 'p1') setUserChar(char);
          else handleSelectOpponent(char);
        }}
      />

      {/* Filter Target Minus Frame Lawan */}
      <div className="setup-card">
        <div className="section-header-row">
          <div className="f-title-group">
            <Filter size={15} className="text-cyan" />
            <span className="setup-section-title">TARGET MINUS FRAME LAWAN</span>
          </div>
          <button
            type="button"
            className="btn-info-circle"
            onClick={() => setInfoModal('target-minus')}
            title="Penjelasan Target Minus Frame"
          >
            <Info size={14} />
          </button>
        </div>

        <div className="bracket-chips-container">
          {/* Row 1: Quick Presets (Semua Move, Minus, Safe) */}
          <div className="bracket-presets-row">
            <button
              type="button"
              className={`bracket-chip chip-gold ${isAllMoves ? 'active-bracket-gold' : ''} ${minusTargetCounts.all === 0 ? 'chip-disabled' : ''}`}
              onClick={selectAllMoves}
              disabled={minusTargetCounts.all === 0}
            >
              {isAllMoves ? '✓ ' : ''}Semua ({minusTargetCounts.all})
            </button>

            <button
              type="button"
              className={`bracket-chip ${isMinusActive ? 'active-bracket' : ''} ${minusTargetCounts.minus === 0 ? 'chip-disabled' : ''}`}
              onClick={toggleMinusAll}
              disabled={minusTargetCounts.minus === 0}
            >
              {isMinusActive ? '✓ ' : ''}Minus ({minusTargetCounts.minus})
            </button>

            <button
              type="button"
              className={`bracket-chip chip-safe ${isSafeActive ? 'active-bracket-safe' : ''} ${minusTargetCounts.safe === 0 ? 'chip-disabled' : ''}`}
              onClick={() => toggleBracket('safe')}
              disabled={minusTargetCounts.safe === 0}
            >
              {isSafeActive ? '✓ ' : ''}Safe ({minusTargetCounts.safe})
            </button>
          </div>

          {/* Row 2: Specific Frame Brackets */}
          <div className="bracket-tiers-row">
            <button
              type="button"
              className={`bracket-chip ${!isAllMoves && minusFilter.includes('10') ? 'active-bracket' : ''} ${minusTargetCounts['10'] === 0 ? 'chip-disabled' : ''}`}
              onClick={() => toggleBracket('10')}
              disabled={minusTargetCounts['10'] === 0}
            >
              {!isAllMoves && minusFilter.includes('10') ? '✓ ' : ''}-10f ({minusTargetCounts['10']})
            </button>

            <button
              type="button"
              className={`bracket-chip ${!isAllMoves && minusFilter.includes('11-12') ? 'active-bracket' : ''} ${minusTargetCounts['11-12'] === 0 ? 'chip-disabled' : ''}`}
              onClick={() => toggleBracket('11-12')}
              disabled={minusTargetCounts['11-12'] === 0}
            >
              {!isAllMoves && minusFilter.includes('11-12') ? '✓ ' : ''}-11 ~ -12f ({minusTargetCounts['11-12']})
            </button>

            <button
              type="button"
              className={`bracket-chip ${!isAllMoves && minusFilter.includes('13-14') ? 'active-bracket' : ''} ${minusTargetCounts['13-14'] === 0 ? 'chip-disabled' : ''}`}
              onClick={() => toggleBracket('13-14')}
              disabled={minusTargetCounts['13-14'] === 0}
            >
              {!isAllMoves && minusFilter.includes('13-14') ? '✓ ' : ''}-13 ~ -14f ({minusTargetCounts['13-14']})
            </button>

            <button
              type="button"
              className={`bracket-chip chip-launcher ${!isAllMoves && minusFilter.includes('15+') ? 'active-bracket-launcher' : ''} ${minusTargetCounts['15+'] === 0 ? 'chip-disabled' : ''}`}
              onClick={() => toggleBracket('15+')}
              disabled={minusTargetCounts['15+'] === 0}
            >
              {!isAllMoves && minusFilter.includes('15+') ? '✓ ' : ''}-15+ ({minusTargetCounts['15+']})
            </button>
          </div>
        </div>
      </div>

      {/* Filter Tipe Rangkaian Serangan */}
      <div className="setup-card">
        <div className="section-header-row">
          <div className="f-title-group">
            <Swords size={15} className="text-gold" />
            <span className="setup-section-title">TIPE RANGKAIAN SERANGAN</span>
          </div>
          <button
            type="button"
            className="btn-info-circle"
            onClick={() => setInfoModal('string-type')}
            title="Penjelasan Tipe Rangkaian Serangan"
          >
            <Info size={14} />
          </button>
        </div>

        <div className="string-chips-container">
          <div className="string-row-top">
            <button
              type="button"
              className={`bracket-chip chip-gold ${stringFilter === 'all' ? 'active-bracket-gold' : ''} ${stringCounts.all === 0 ? 'chip-disabled' : ''}`}
              onClick={() => handleSelectStringFilter('all')}
              disabled={stringCounts.all === 0}
            >
              {stringFilter === 'all' ? '✓ ' : ''}Semua ({stringCounts.all})
            </button>

            <button
              type="button"
              className={`bracket-chip ${stringFilter === '1-hit' ? 'active-bracket' : ''} ${stringCounts['1-hit'] === 0 ? 'chip-disabled' : ''}`}
              onClick={() => handleSelectStringFilter('1-hit')}
              disabled={stringCounts['1-hit'] === 0}
            >
              {stringFilter === '1-hit' ? '✓ ' : ''}1-Hit ({stringCounts['1-hit']})
            </button>

            <button
              type="button"
              className={`bracket-chip ${stringFilter === '2-hits' ? 'active-bracket' : ''} ${stringCounts['2-hits'] === 0 ? 'chip-disabled' : ''}`}
              onClick={() => handleSelectStringFilter('2-hits')}
              disabled={stringCounts['2-hits'] === 0}
            >
              {stringFilter === '2-hits' ? '✓ ' : ''}2-Hits ({stringCounts['2-hits']})
            </button>
          </div>

          <div className="string-row-bottom">
            <button
              type="button"
              className={`bracket-chip ${stringFilter === '3-hits' ? 'active-bracket' : ''} ${stringCounts['3-hits'] === 0 ? 'chip-disabled' : ''}`}
              onClick={() => handleSelectStringFilter('3-hits')}
              disabled={stringCounts['3-hits'] === 0}
            >
              {stringFilter === '3-hits' ? '✓ ' : ''}3-Hits ({stringCounts['3-hits']})
            </button>

            <button
              type="button"
              className={`bracket-chip chip-purple ${stringFilter === '3+hits' ? 'active-bracket-purple' : ''} ${stringCounts['3+hits'] === 0 ? 'chip-disabled' : ''}`}
              onClick={() => handleSelectStringFilter('3+hits')}
              disabled={stringCounts['3+hits'] === 0}
            >
              {stringFilter === '3+hits' ? '✓ ' : ''}3+ Hits ({stringCounts['3+hits']})
            </button>
          </div>
        </div>
      </div>

      {/* Session Scope (Endless Mode vs Gauntlet Mode) */}
      <div className="setup-card">
        <div className="section-header-row">
          <span className="setup-section-title">TIPE SESI LATIHAN</span>
          <button
            type="button"
            className="btn-info-circle"
            onClick={() => setInfoModal('session-scope')}
            title="Penjelasan Tipe Sesi Latihan"
          >
            <Info size={14} />
          </button>
        </div>
        <div className="session-scope-row">
          <button
            type="button"
            className={`scope-chip ${sessionScope === 'endless' ? 'active-scope' : ''}`}
            onClick={() => setSessionScope('endless')}
          >
            {sessionScope === 'endless' ? '✓ ' : ''}Endless Mode
          </button>

          <button
            type="button"
            className={`scope-chip ${sessionScope === 'gauntlet' ? 'active-scope active-scope-gold' : ''}`}
            onClick={() => setSessionScope('gauntlet')}
          >
            {sessionScope === 'gauntlet' ? '✓ ' : ''}Gauntlet Mode
          </button>
        </div>
      </div>

      {/* Challenge Modifiers */}
      <div className="setup-card">
        <div className="section-header-row">
          <span className="setup-section-title">TANTANGAN &amp; MODIFIER</span>
          <button
            type="button"
            className="btn-info-circle"
            onClick={() => setInfoModal('modifiers')}
            title="Penjelasan Tantangan & Modifier"
          >
            <Info size={14} />
          </button>
        </div>
        <div className="modifier-grid">
          <button
            type="button"
            className={`modifier-chip ${isBlindMode ? 'active-modifier active-modifier-purple' : ''}`}
            onClick={() => setIsBlindMode(!isBlindMode)}
          >
            {isBlindMode ? '✓ ' : ''}Blind
          </button>

          <button
            type="button"
            className={`modifier-chip ${isSinglePlay ? 'active-modifier' : ''}`}
            onClick={() => setIsSinglePlay(!isSinglePlay)}
          >
            {isSinglePlay ? '✓ ' : ''}Once
          </button>

          <button
            type="button"
            className={`modifier-chip ${isBlitzMode ? 'active-modifier' : ''}`}
            onClick={() => setIsBlitzMode(!isBlitzMode)}
          >
            {isBlitzMode ? '✓ ' : ''}Blitz
          </button>

          <button
            type="button"
            className={`modifier-chip ${isSurvivalMode ? 'active-modifier active-modifier-crimson' : ''}`}
            onClick={() => setIsSurvivalMode(!isSurvivalMode)}
          >
            {isSurvivalMode ? '✓ ' : ''}Survival
          </button>
        </div>
      </div>

      {/* Input Format Option */}
      <div className="setup-card">
        <div className="section-header-row">
          <span className="setup-section-title">FORMAT PILIHAN INPUT</span>
          <button
            type="button"
            className="btn-info-circle"
            onClick={() => setInfoModal('format')}
            title="Penjelasan Format Pilihan Input"
          >
            <Info size={14} />
          </button>
        </div>
        <div className="format-options-row">
          <button
            type="button"
            className={`format-chip ${format === 'four-choices' ? 'active-format' : ''}`}
            onClick={() => setFormat('four-choices')}
          >
            {format === 'four-choices' ? '✓ ' : ''}Tombol Generik
          </button>

          <button
            type="button"
            className={`format-chip ${format === 'full-movelist' ? 'active-format active-format-gold' : ''}`}
            onClick={() => setFormat('full-movelist')}
          >
            {format === 'full-movelist' ? '✓ ' : ''}Custom Move
          </button>
        </div>
      </div>

      {/* Info Popup Modal */}
      {infoModal && (
        <div className="info-modal-overlay animate-fade-in" onClick={() => setInfoModal(null)}>
          <div className="info-modal-card animate-slide-up" onClick={(e) => e.stopPropagation()}>
            <div className="info-modal-header">
              <div className="info-modal-title-wrap">
                <Info size={16} className="text-cyan" />
                <h3 className="info-modal-title">
                  {infoModal === 'target-minus' && 'Target Minus Frame Lawan'}
                  {infoModal === 'string-type' && 'Tipe Rangkaian Serangan'}
                  {infoModal === 'session-scope' && 'Tipe Sesi Latihan'}
                  {infoModal === 'modifiers' && 'Tantangan & Modifier'}
                  {infoModal === 'format' && 'Format Pilihan Input'}
                </h3>
              </div>
              <button
                type="button"
                className="btn-info-modal-close"
                onClick={() => setInfoModal(null)}
              >
                <X size={16} />
              </button>
            </div>

            <div className="info-modal-content">
              {infoModal === 'target-minus' && (
                <div className="info-desc-list">
                  <div className="info-desc-item">
                    <span className="info-item-label text-gold">Semua</span>
                    <span className="info-item-text">Menguji seluruh variasi gerakan lawan yang ada di data frame.</span>
                  </div>
                  <div className="info-desc-item">
                    <span className="info-item-label text-cyan">Minus</span>
                    <span className="info-item-text">Hanya gerakan yang minus di block (-10f s/d -15+ frame) dan dapat di-punish.</span>
                  </div>
                  <div className="info-desc-item">
                    <span className="info-item-label text-green">Safe</span>
                    <span className="info-item-text">Gerakan lawan yang aman di block untuk melatih disiplin pertahanan tanpa memaksakan punish.</span>
                  </div>
                  <div className="info-desc-item">
                    <span className="info-item-label text-purple">-10f s/d -15+</span>
                    <span className="info-item-text">Mengisolasi latihan pada rentang frame minus tertentu.</span>
                  </div>
                </div>
              )}

              {infoModal === 'string-type' && (
                <div className="info-desc-list">
                  <div className="info-desc-item">
                    <span className="info-item-label text-gold">Semua</span>
                    <span className="info-item-text">Menampilkan semua variasi gerakan lawan tanpa memfilter panjang hit serangan.</span>
                  </div>
                  <div className="info-desc-item">
                    <span className="info-item-label text-cyan">1-Hit</span>
                    <span className="info-item-text">Gerakan serangan tunggal (1 pukulan/tendangan independen seperti jab, d/f+1, hopkick).</span>
                  </div>
                  <div className="info-desc-item">
                    <span className="info-item-label text-cyan">2-Hits</span>
                    <span className="info-item-text">Rangkaian serangan string yang terdiri dari 2 pukulan berurutan (misal 1,2 atau d/f+1,2).</span>
                  </div>
                  <div className="info-desc-item">
                    <span className="info-item-label text-cyan">3-Hits</span>
                    <span className="info-item-text">Rangkaian serangan string yang terdiri dari 3 pukulan berurutan (misal 1,1,2 atau 2,1,4).</span>
                  </div>
                  <div className="info-desc-item">
                    <span className="info-item-label text-purple">3+ Hits</span>
                    <span className="info-item-text">Rangkaian string panjang dengan 3 hit atau lebih (misal 10-hit combo atau string multi-hit).</span>
                  </div>
                </div>
              )}

              {infoModal === 'session-scope' && (
                <div className="info-desc-list">
                  <div className="info-desc-item">
                    <span className="info-item-label text-cyan">Endless Mode</span>
                    <span className="info-item-text">Latihan tanpa henti. Gerakan lawan diacak terus-menerus tanpa batas untuk membangun refleks berkelanjutan.</span>
                  </div>
                  <div className="info-desc-item">
                    <span className="info-item-label text-gold">Gauntlet Mode</span>
                    <span className="info-item-text">Setiap gerakan hasil filter diuji tepat 1 kali tanpa pengulangan. Selesai setelah semua gerakan tuntas, disertai ringkasan statistik sesi.</span>
                  </div>
                </div>
              )}

              {infoModal === 'modifiers' && (
                <div className="info-desc-list">
                  <div className="info-desc-item">
                    <span className="info-item-label text-cyan">Once</span>
                    <span className="info-item-text">Video gerakan lawan hanya diputar 1 kali lalu membeku (freeze) di frame terakhir sampai Anda menjawab.</span>
                  </div>
                  <div className="info-desc-item">
                    <span className="info-item-label text-gold">Blitz</span>
                    <span className="info-item-text">Batas waktu dinamis mulai dari 4 detik saat video mulai berputar. Setiap tambahan hit string menambah +0.5 detik (+1.0 detik tiap stage grab chain). Respon salah jika waktu habis.</span>
                  </div>
                  <div className="info-desc-item">
                    <span className="info-item-label text-crimson">Survival</span>
                    <span className="info-item-text">Diberikan 3 HP (nyawa). Respon salah atau waktu habis akan mengurangi 1 HP. Sesi Game Over jika HP habis.</span>
                  </div>
                  <div className="info-desc-item">
                    <span className="info-item-label text-purple">Blind</span>
                    <span className="info-item-text">Menyembunyikan informasi data frame lawan sebelum Anda menjawab untuk melatih membaca visual gerakan murni.</span>
                  </div>
                </div>
              )}

              {infoModal === 'format' && (
                <div className="info-desc-list">
                  <div className="info-desc-item">
                    <span className="info-item-label text-gold">Custom Move</span>
                    <span className="info-item-text">Memilih jawaban punish secara spesifik dari movelist lengkap karakter Anda.</span>
                  </div>
                  <div className="info-desc-item">
                    <span className="info-item-label text-cyan">Tombol Generik</span>
                    <span className="info-item-text">Pilihan cepat tombol frame (i10, i11, i12, i13, i14, i15+) tanpa perlu memilih nama move tertentu.</span>
                  </div>
                </div>
              )}
            </div>

            <button
              type="button"
              className="btn-info-modal-dismiss"
              onClick={() => setInfoModal(null)}
            >
              Tutup
            </button>
          </div>
        </div>
      )}

      {/* Start Button */}
      <div className="setup-action-row">
        <button
          className="btn-start-drill"
          onClick={() =>
            onStart(
              userChar,
              oppChar,
              format,
              minusFilter,
              {
                sessionScope,
                isSinglePlay,
                isBlitzMode,
                isSurvivalMode,
                isBlindMode,
              },
              stringFilter
            )
          }
        >
          <span>MULAI LATIHAN ({userChar} vs {oppChar})</span>
          <Swords size={20} />
        </button>
      </div>

      <style>{`
        .setup-container {
          max-width: 900px;
          margin: 0 auto;
          display: flex;
          flex-direction: column;
          gap: 18px;
        }
        .setup-nav {
          display: flex;
          justify-content: space-between;
          align-items: center;
        }
        .btn-back {
          display: flex;
          align-items: center;
          gap: 6px;
          color: var(--text-secondary);
          font-weight: 700;
          font-size: 0.85rem;
          padding: 6px 12px;
          border-radius: var(--radius-sm);
          background: #131622;
          border: 1px solid rgba(255, 255, 255, 0.08);
          transition: all 0.2s;
        }
        .btn-back:hover {
          color: #fff;
          background: rgba(255, 255, 255, 0.1);
        }
        .setup-mode-tag {
          display: flex;
          align-items: center;
          gap: 6px;
          font-size: 0.75rem;
          font-weight: 800;
          padding: 4px 12px;
          border-radius: var(--radius-full);
          text-transform: uppercase;
        }
        .tag-crimson {
          background: rgba(255, 30, 86, 0.15);
          color: var(--devil-crimson);
          border: 1px solid rgba(255, 30, 86, 0.3);
        }
        .setup-header {
          text-align: left;
        }
        .setup-title {
          font-family: var(--font-display);
          font-size: 2rem;
          font-weight: 900;
          letter-spacing: 0.06em;
          color: #fff;
          margin: 0;
        }
        .setup-desc {
          color: var(--text-secondary);
          font-size: 0.92rem;
          margin-top: 4px;
        }
        .matchup-selection-grid {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 16px;
        }
        .setup-card {
          background: #131622;
          border: 1px solid rgba(255, 255, 255, 0.08);
          border-radius: var(--radius-md);
          padding: 18px;
          display: flex;
          flex-direction: column;
          gap: 12px;
        }
        .card-header-bar {
          display: flex;
          justify-content: space-between;
          align-items: center;
          border-bottom: 1px solid rgba(255, 255, 255, 0.06);
          padding-bottom: 8px;
        }
        .fighter-role {
          font-size: 0.75rem;
          font-weight: 800;
          letter-spacing: 0.08em;
        }
        .role-p1 {
          color: var(--electric-cyan);
        }
        .role-p2 {
          color: var(--devil-crimson);
        }
        .fighter-interactive-card {
          background: #131622;
          border: 1px solid rgba(255, 255, 255, 0.08);
          border-radius: var(--radius-md);
          padding: 12px 16px;
          display: flex;
          flex-direction: column;
          gap: 8px;
          cursor: pointer;
          transition: all 0.2s cubic-bezier(0.16, 1, 0.3, 1);
        }
        .fighter-interactive-card:hover {
          transform: translateY(-2px);
          background: rgba(255, 255, 255, 0.03);
        }
        .card-p1-glow:hover {
          border-color: var(--electric-cyan);
          box-shadow: 0 4px 25px rgba(0, 229, 255, 0.15);
        }
        .card-p2-glow:hover {
          border-color: var(--devil-crimson);
          box-shadow: 0 4px 25px rgba(255, 30, 86, 0.15);
        }
        .card-top-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          border-bottom: 1px solid rgba(255, 255, 255, 0.06);
          padding-bottom: 6px;
        }
        .change-hint-btn {
          display: flex;
          align-items: center;
          gap: 4px;
          font-size: 0.72rem;
          color: var(--text-muted);
          background: rgba(255, 255, 255, 0.05);
          padding: 2px 8px;
          border-radius: var(--radius-full);
          transition: all 0.2s;
        }
        .fighter-interactive-card:hover .change-hint-btn {
          color: #fff;
          background: rgba(255, 255, 255, 0.12);
        }
        .card-character-body {
          display: flex;
          align-items: center;
        }
        .char-hero-info {
          display: flex;
          flex-direction: column;
          gap: 2px;
        }
        .char-hero-name {
          font-family: var(--font-display);
          font-size: 1.35rem;
          font-weight: 800;
          margin: 0;
          line-height: 1.1;
        }
        .char-hero-meta {
          font-size: 0.72rem;
        }
        .setup-card {
          background: #131622;
          border: 1px solid rgba(255, 255, 255, 0.08);
          border-radius: var(--radius-md);
          padding: 14px 16px;
          display: flex;
          flex-direction: column;
          gap: 10px;
        }

        @media (max-width: 768px) {
          .setup-container {
            gap: 8px;
            padding: 0 4px;
          }
          .setup-title {
            font-size: 1.15rem;
          }
          .setup-card {
            padding: 9px 12px;
            gap: 7px;
          }
          .setup-section-title {
            font-size: 0.68rem;
          }
          .fighter-interactive-card {
            padding: 8px 10px;
            gap: 4px;
          }
          .char-hero-name {
            font-size: 1.05rem;
          }
          .char-hero-meta {
            font-size: 0.65rem;
          }
          .matchup-selection-grid {
            grid-template-columns: 1fr 1fr;
            gap: 8px;
          }
          .format-options-row {
            grid-template-columns: 1fr 1fr;
            gap: 8px;
          }
          .format-chip,
          .scope-chip,
          .modifier-chip {
            padding: 8px 8px;
            font-size: 0.74rem;
            min-height: 36px;
          }
          .btn-start-drill {
            padding: 11px;
            font-size: 0.9rem;
          }
          .session-scope-row {
            grid-template-columns: 1fr 1fr;
            gap: 8px;
          }
          .modifier-grid {
            grid-template-columns: repeat(4, 1fr);
            gap: 6px;
          }
        }
        .is-android .setup-title {
          font-size: 1.05rem !important;
        }
        .is-android .setup-section-title {
          font-size: 0.68rem !important;
        }
        .is-android .char-hero-name {
          font-size: 1.02rem !important;
        }
        .is-android .scope-chip,
        .is-android .modifier-chip,
        .is-android .format-chip,
        .is-android .bracket-chip {
          font-size: 0.72rem !important;
          padding: 7px 8px !important;
          min-height: 34px !important;
        }
        .is-android .btn-start-drill {
          font-size: 0.88rem !important;
          padding: 10px 14px !important;
        }
        .section-header-row {
          display: flex;
          justify-content: space-between;
          align-items: center;
          gap: 8px;
        }
        .btn-info-circle {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          width: 22px;
          height: 22px;
          border-radius: 50%;
          background: rgba(255, 255, 255, 0.05);
          border: 1px solid rgba(255, 255, 255, 0.12);
          color: var(--text-muted);
          cursor: pointer;
          transition: all 0.15s ease;
          flex-shrink: 0;
        }
        .btn-info-circle:hover {
          color: var(--electric-cyan);
          border-color: var(--electric-cyan);
          background: rgba(0, 229, 255, 0.12);
        }
        .session-scope-row {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 10px;
        }
        .modifier-grid {
          display: grid;
          grid-template-columns: repeat(4, 1fr);
          gap: 8px;
        }
        .format-options-row {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 10px;
        }
        .scope-chip,
        .modifier-chip,
        .format-chip {
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 10px 14px;
          background: #0d0f18;
          border: 1.5px solid rgba(255, 255, 255, 0.08);
          border-radius: var(--radius-sm);
          color: var(--text-secondary);
          font-size: 0.82rem;
          font-weight: 800;
          cursor: pointer;
          transition: all 0.15s ease-in-out;
          text-align: center;
          user-select: none;
          min-height: 40px;
        }
        .scope-chip:hover,
        .modifier-chip:hover,
        .format-chip:hover {
          background: rgba(255, 255, 255, 0.06);
          border-color: rgba(255, 255, 255, 0.22);
          color: #fff;
        }
        .active-scope,
        .active-modifier,
        .active-format {
          background: rgba(0, 229, 255, 0.14) !important;
          border-color: var(--electric-cyan) !important;
          color: var(--electric-cyan) !important;
          box-shadow: 0 0 14px rgba(0, 229, 255, 0.25);
        }
        .active-scope-gold,
        .active-format-gold {
          background: rgba(255, 183, 3, 0.14) !important;
          border-color: var(--heihachi-gold) !important;
          color: var(--heihachi-gold) !important;
          box-shadow: 0 0 14px rgba(255, 183, 3, 0.25);
        }
        .active-modifier-crimson {
          background: rgba(255, 30, 86, 0.14) !important;
          border-color: var(--devil-crimson) !important;
          color: var(--devil-crimson) !important;
          box-shadow: 0 0 14px rgba(255, 30, 86, 0.25);
        }
        .active-modifier-purple {
          background: rgba(179, 136, 255, 0.14) !important;
          border-color: #b388ff !important;
          color: #b388ff !important;
          box-shadow: 0 0 14px rgba(179, 136, 255, 0.25);
        }

        /* Info Modal Styles */
        .info-modal-overlay {
          position: fixed;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          background: rgba(0, 0, 0, 0.8);
          backdrop-filter: blur(6px);
          display: flex;
          align-items: center;
          justify-content: center;
          z-index: 10000;
          padding: 16px;
        }
        .info-modal-card {
          background: #111422;
          border: 1px solid rgba(255, 255, 255, 0.12);
          border-radius: var(--radius-md);
          max-width: 440px;
          width: 100%;
          padding: 20px;
          display: flex;
          flex-direction: column;
          gap: 14px;
          box-shadow: 0 12px 40px rgba(0, 0, 0, 0.75);
        }
        .info-modal-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          border-bottom: 1px solid rgba(255, 255, 255, 0.08);
          padding-bottom: 10px;
        }
        .info-modal-title-wrap {
          display: flex;
          align-items: center;
          gap: 8px;
        }
        .info-modal-title {
          margin: 0;
          font-size: 0.98rem;
          font-weight: 800;
          color: #fff;
          letter-spacing: 0.03em;
        }
        .btn-info-modal-close {
          background: transparent;
          border: none;
          color: var(--text-muted);
          cursor: pointer;
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 4px;
          border-radius: 4px;
          transition: color 0.15s;
        }
        .btn-info-modal-close:hover {
          color: #fff;
        }
        .info-desc-list {
          display: flex;
          flex-direction: column;
          gap: 8px;
        }
        .info-desc-item {
          display: flex;
          flex-direction: column;
          gap: 2px;
          background: rgba(255, 255, 255, 0.03);
          padding: 8px 12px;
          border-radius: var(--radius-sm);
          border: 1px solid rgba(255, 255, 255, 0.05);
        }
        .info-item-label {
          font-size: 0.8rem;
          font-weight: 800;
        }
        .info-item-text {
          font-size: 0.72rem;
          color: var(--text-secondary);
          line-height: 1.35;
        }
        .btn-info-modal-dismiss {
          background: rgba(255, 255, 255, 0.08);
          border: 1px solid rgba(255, 255, 255, 0.15);
          color: #fff;
          font-size: 0.8rem;
          font-weight: 800;
          padding: 8px 16px;
          border-radius: var(--radius-sm);
          cursor: pointer;
          align-self: flex-end;
          transition: all 0.15s;
        }
        .btn-info-modal-dismiss:hover {
          background: rgba(255, 255, 255, 0.15);
        }
        .text-purple {
          color: #b388ff;
        }
        .text-cyan {
          color: var(--electric-cyan);
        }
        .text-crimson {
          color: var(--devil-crimson);
        }
        .text-gold {
          color: var(--heihachi-gold);
        }
        .filter-header-row {
          display: flex;
          justify-content: space-between;
          align-items: center;
          flex-wrap: wrap;
          gap: 8px;
        }
        .f-title-group {
          display: flex;
          align-items: center;
          gap: 6px;
        }
        .setup-section-title {
          font-size: 0.75rem;
          font-weight: 800;
          letter-spacing: 0.08em;
          color: var(--text-muted);
        }
        .hint-pill {
          font-size: 0.7rem;
          color: var(--text-muted);
          background: rgba(255, 255, 255, 0.05);
          padding: 2px 8px;
          border-radius: var(--radius-full);
        }
        .bracket-chips-container {
          display: flex;
          flex-direction: column;
          gap: 6px;
        }
        .bracket-presets-row {
          display: grid;
          grid-template-columns: repeat(3, 1fr);
          gap: 6px;
        }
        .bracket-tiers-row {
          display: grid;
          grid-template-columns: repeat(4, 1fr);
          gap: 6px;
        }
        .bracket-chip {
          padding: 7px 6px;
          border-radius: var(--radius-sm);
          background: #0d0f18;
          border: 1.5px solid rgba(255, 255, 255, 0.08);
          color: var(--text-secondary);
          font-size: 0.78rem;
          font-weight: 700;
          cursor: pointer;
          transition: all 0.15s ease-in-out;
          display: flex;
          align-items: center;
          justify-content: center;
          white-space: nowrap;
          text-align: center;
          min-height: 34px;
        }
        .bracket-chip:hover {
          color: #fff;
          background: rgba(255, 255, 255, 0.08);
        }
        .bracket-chip.active-bracket {
          background: rgba(0, 229, 255, 0.15);
          border-color: var(--electric-cyan);
          color: var(--electric-cyan);
        }
        .bracket-chip.chip-safe.active-bracket-safe {
          background: rgba(0, 240, 118, 0.15);
          border-color: var(--success-green);
          color: var(--success-green);
        }
        .bracket-chip.chip-gold.active-bracket-gold {
          background: rgba(255, 215, 0, 0.15);
          border-color: #ffd700;
          color: #ffd700;
        }
        .bracket-chip.chip-launcher.active-bracket-launcher {
          background: rgba(255, 30, 86, 0.15);
          border-color: var(--devil-crimson);
          color: var(--devil-crimson);
        }
        .bracket-chip.chip-purple.active-bracket-purple {
          background: rgba(179, 136, 255, 0.15);
          border-color: #b388ff;
          color: #b388ff;
        }
        .chip-disabled {
          opacity: 0.32 !important;
          cursor: not-allowed !important;
          pointer-events: none !important;
          filter: grayscale(0.6);
          border-color: rgba(255, 255, 255, 0.04) !important;
          background: rgba(255, 255, 255, 0.02) !important;
          color: var(--text-muted) !important;
        }
        .string-chips-container {
          display: flex;
          flex-direction: column;
          gap: 6px;
        }
        .string-row-top {
          display: grid;
          grid-template-columns: repeat(3, 1fr);
          gap: 6px;
        }
        .string-row-bottom {
          display: grid;
          grid-template-columns: repeat(2, 1fr);
          gap: 6px;
        }
        @media (max-width: 480px) {
          .string-chips-container {
            gap: 5px;
          }
          .string-row-top {
            gap: 5px;
          }
          .string-row-bottom {
            gap: 5px;
          }
        }
        @media (max-width: 480px) {
          .bracket-chip {
            padding: 6px 3px;
            font-size: 0.72rem;
            min-height: 32px;
          }
          .bracket-presets-row {
            gap: 5px;
          }
          .bracket-tiers-row {
            gap: 5px;
          }
        }
        .toggle-row {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 16px;
        }
        .toggle-info {
          display: flex;
          flex-direction: column;
          gap: 4px;
        }
        .toggle-sub {
          font-size: 0.78rem;
          color: var(--text-muted);
        }
        .switch-toggle-btn {
          display: flex;
          align-items: center;
          gap: 8px;
          padding: 6px 14px;
          border-radius: var(--radius-full);
          font-size: 0.8rem;
          font-weight: 800;
          cursor: pointer;
          transition: all 0.2s;
        }
        .switch-on {
          background: rgba(0, 229, 255, 0.15);
          border: 1px solid var(--electric-cyan);
          color: var(--electric-cyan);
        }
        .switch-off {
          background: rgba(255, 255, 255, 0.05);
          border: 1px solid rgba(255, 255, 255, 0.1);
          color: var(--text-muted);
        }
        .switch-knob {
          width: 10px;
          height: 10px;
          border-radius: 50%;
          background: currentColor;
        }
        .format-options-row {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 12px;
        }
        .format-card {
          display: flex;
          align-items: flex-start;
          gap: 12px;
          padding: 14px;
          background: #0d0f18;
          border: 1px solid rgba(255, 255, 255, 0.08);
          border-radius: var(--radius-sm);
          text-align: left;
          cursor: pointer;
          transition: all 0.2s;
        }
        .format-card:hover {
          background: rgba(255, 255, 255, 0.05);
        }
        .format-card.active-format {
          border-color: var(--electric-cyan);
          background: rgba(0, 229, 255, 0.08);
        }
        .format-card.active-format-gold {
          border-color: var(--heihachi-gold);
          background: rgba(255, 183, 3, 0.08);
        }
        .f-text {
          display: flex;
          flex-direction: column;
          gap: 2px;
        }
        .f-title {
          font-weight: 700;
          font-size: 0.9rem;
          color: #fff;
        }
        .f-sub {
          font-size: 0.74rem;
          color: var(--text-muted);
        }
        .setup-action-row {
          display: flex;
          justify-content: center;
          margin-top: 8px;
        }
        .btn-start-drill {
          width: 100%;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 10px;
          background: linear-gradient(135deg, #00e5ff 0%, #0088ff 100%);
          color: #000;
          font-weight: 900;
          font-size: 1.05rem;
          padding: 16px;
          border-radius: var(--radius-full);
          letter-spacing: 0.05em;
          transition: transform 0.15s, opacity 0.15s;
        }
        .btn-start-drill:hover {
          transform: scale(1.01);
          opacity: 0.95;
        }
      `}</style>
    </div>
  );
};
