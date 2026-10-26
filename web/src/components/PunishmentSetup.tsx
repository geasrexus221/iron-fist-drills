import React, { useState } from 'react';
import type { CharacterName, InputFormat, MinusBracket } from '../types/tekken';
import { CHARACTERS, CHARACTER_DATA } from '../data';
import { CharacterPickerModal } from './CharacterPickerModal';
import { Shield, ArrowLeft, Swords, Sparkles, Filter, RotateCcw } from 'lucide-react';

interface PunishmentSetupProps {
  onStart: (
    userChar: CharacterName,
    oppChar: CharacterName,
    format: InputFormat,
    minusFilter: MinusBracket[],
    isBlindMode: boolean
  ) => void;
  onBack: () => void;
  initialUserChar?: CharacterName;
  initialOppChar?: CharacterName;
  initialFormat?: InputFormat;
  initialMinusFilter?: MinusBracket[];
  initialBlindMode?: boolean;
}

export const PunishmentSetup: React.FC<PunishmentSetupProps> = ({
  onStart,
  onBack,
  initialUserChar = 'Jin',
  initialOppChar = 'Kazuya',
  initialFormat = 'full-movelist',
  initialMinusFilter = ['all-moves'],
  initialBlindMode = true,
}) => {
  const [userChar, setUserChar] = useState<CharacterName>(initialUserChar);
  const [oppChar, setOppChar] = useState<CharacterName>(initialOppChar);
  const [format, setFormat] = useState<InputFormat>(initialFormat);
  const [minusFilter, setMinusFilter] = useState<MinusBracket[]>(initialMinusFilter);
  const [isBlindMode, setIsBlindMode] = useState<boolean>(initialBlindMode);

  const [isPickerOpen, setIsPickerOpen] = useState(false);
  const [pickerRole, setPickerRole] = useState<'p1' | 'p2'>('p1');

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
          else setOppChar(char);
        }}
      />

      {/* Filter Target Minus Frame Lawan */}
      <div className="setup-card">
        <div className="filter-header-row">
          <div className="f-title-group">
            <Filter size={15} className="text-cyan" />
            <span className="setup-section-title">TARGET MINUS FRAME LAWAN</span>
          </div>
        </div>

        <div className="bracket-chips-container">
          {/* Row 1: Quick Presets (Semua Move, Minus, Safe) */}
          <div className="bracket-presets-row">
            <button
              type="button"
              className={`bracket-chip chip-gold ${isAllMoves ? 'active-bracket-gold' : ''}`}
              onClick={selectAllMoves}
            >
              {isAllMoves ? '✓ ' : ''}Semua Move
            </button>

            <button
              type="button"
              className={`bracket-chip ${isMinusActive ? 'active-bracket' : ''}`}
              onClick={toggleMinusAll}
            >
              {isMinusActive ? '✓ ' : ''}Minus
            </button>

            <button
              type="button"
              className={`bracket-chip chip-safe ${isSafeActive ? 'active-bracket-safe' : ''}`}
              onClick={() => toggleBracket('safe')}
            >
              {isSafeActive ? '✓ ' : ''}Safe
            </button>
          </div>

          {/* Row 2: Specific Frame Brackets */}
          <div className="bracket-tiers-row">
            <button
              type="button"
              className={`bracket-chip ${!isAllMoves && minusFilter.includes('10') ? 'active-bracket' : ''}`}
              onClick={() => toggleBracket('10')}
            >
              {!isAllMoves && minusFilter.includes('10') ? '✓ ' : ''}-10f
            </button>

            <button
              type="button"
              className={`bracket-chip ${!isAllMoves && minusFilter.includes('11-12') ? 'active-bracket' : ''}`}
              onClick={() => toggleBracket('11-12')}
            >
              {!isAllMoves && minusFilter.includes('11-12') ? '✓ ' : ''}-11 ~ -12f
            </button>

            <button
              type="button"
              className={`bracket-chip ${!isAllMoves && minusFilter.includes('13-14') ? 'active-bracket' : ''}`}
              onClick={() => toggleBracket('13-14')}
            >
              {!isAllMoves && minusFilter.includes('13-14') ? '✓ ' : ''}-13 ~ -14f
            </button>

            <button
              type="button"
              className={`bracket-chip chip-launcher ${!isAllMoves && minusFilter.includes('15+') ? 'active-bracket-launcher' : ''}`}
              onClick={() => toggleBracket('15+')}
            >
              {!isAllMoves && minusFilter.includes('15+') ? '✓ ' : ''}-15+
            </button>
          </div>
        </div>
      </div>

      {/* Blind Mode Setting */}
      <div className="setup-card">
        <div className="toggle-row">
          <div className="toggle-info">
            <span className="setup-section-title">BLIND MODE (TUTUP ANGKA FRAME)</span>
          </div>
          <button
            type="button"
            className={`switch-toggle-btn ${isBlindMode ? 'switch-on' : 'switch-off'}`}
            onClick={() => setIsBlindMode(!isBlindMode)}
          >
            <span className="switch-knob" />
            <span className="switch-text">{isBlindMode ? 'AKTIF' : 'NONAKTIF'}</span>
          </button>
        </div>
      </div>

      {/* Input Format Option */}
      <div className="setup-card">
        <span className="setup-section-title">FORMAT PILIHAN INPUT</span>
        <div className="format-options-row">
          <button
            type="button"
            className={`format-card ${format === 'full-movelist' ? 'active-format active-format-gold' : ''}`}
            onClick={() => setFormat('full-movelist')}
          >
            <Swords size={18} className="text-gold" />
            <div className="f-text">
              <span className="f-title">Full Movelist Selector</span>
            </div>
          </button>

          <button
            type="button"
            className={`format-card ${format === 'four-choices' ? 'active-format' : ''}`}
            onClick={() => setFormat('four-choices')}
          >
            <Sparkles size={18} className="text-cyan" />
            <div className="f-text">
              <span className="f-title">Tombol Frame Generik (i10 - i15+)</span>
            </div>
          </button>
        </div>
      </div>

      {/* Start Button */}
      <div className="setup-action-row">
        <button
          className="btn-start-drill"
          onClick={() => onStart(userChar, oppChar, format, minusFilter, isBlindMode)}
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
            gap: 10px;
            padding: 0 4px;
          }
          .setup-title {
            font-size: 1.3rem;
          }
          .setup-card {
            padding: 10px 12px;
            gap: 8px;
          }
          .fighter-interactive-card {
            padding: 10px 12px;
            gap: 6px;
          }
          .char-hero-name {
            font-size: 1.1rem;
          }
          .matchup-selection-grid {
            grid-template-columns: 1fr 1fr;
            gap: 8px;
          }
          .format-options-row {
            grid-template-columns: 1fr 1fr;
            gap: 8px;
          }
          .format-card {
            padding: 10px;
            gap: 8px;
          }
          .btn-start-drill {
            padding: 12px;
            font-size: 0.95rem;
          }
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
