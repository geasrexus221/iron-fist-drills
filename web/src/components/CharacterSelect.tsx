import React, { useState, useMemo } from 'react';
import type { CharacterName, InputFormat, QuizMode, MinusBracket } from '../types/tekken';
import { CHARACTERS, CHARACTER_DATA } from '../data';
import { Swords, Shield, Zap, Sparkles, CheckCircle2, Filter, Search, X } from 'lucide-react';

interface CharacterSelectProps {
  onStartBattle: (
    userChar: CharacterName,
    oppChar: CharacterName,
    format: InputFormat,
    mode: QuizMode,
    minusFilter: MinusBracket[]
  ) => void;
  initialUserChar?: CharacterName;
  initialOppChar?: CharacterName;
  initialMode?: QuizMode;
  initialFormat?: InputFormat;
  initialMinusFilter?: MinusBracket[];
}

export const CharacterSelect: React.FC<CharacterSelectProps> = ({
  onStartBattle,
  initialUserChar = 'Jin',
  initialOppChar = 'Kazuya',
  initialMode = 'punishment',
  initialFormat = 'four-choices',
  initialMinusFilter = ['all-moves'],
}) => {
  const [userChar, setUserChar] = useState<CharacterName>(initialUserChar);
  const [oppChar, setOppChar] = useState<CharacterName>(initialOppChar);
  const [selectedFormat, setSelectedFormat] = useState<InputFormat>(initialFormat);
  const [selectedMode, setSelectedMode] = useState<QuizMode>(initialMode);
  const [minusFilter, setMinusFilter] = useState<MinusBracket[]>(initialMinusFilter);
  const [pickingFor, setPickingFor] = useState<'p1' | 'p2'>('p1');
  const [charSearch, setCharSearch] = useState('');

  const filteredRoster = useMemo(() => {
    if (!charSearch.trim()) return CHARACTERS;
    const q = charSearch.toLowerCase().trim();
    return CHARACTERS.filter(
      (c) =>
        c.name.toLowerCase().includes(q) ||
        c.style.toLowerCase().includes(q) ||
        c.title.toLowerCase().includes(q)
    );
  }, [charSearch]);

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

  const handleSelectChar = (name: CharacterName) => {
    if (pickingFor === 'p1') {
      setUserChar(name);
      setPickingFor('p2');
    } else {
      setOppChar(name);
    }
  };

  return (
    <div className="char-select-container animate-slide-up">
      <div className="char-select-header">
        <h1 className="select-title">SELECT YOUR FIGHTERS</h1>
        <p className="select-desc">
          Pilih petarung yang ingin Anda latih dan tentukan lawan untuk menguji refleks *punishment* & *frame trap*.
        </p>
      </div>

      {/* Versus Preview Bar */}
      <div className="versus-card glass-panel">
        <div 
          className={`fighter-slot p1-slot ${pickingFor === 'p1' ? 'slot-active' : ''}`}
          onClick={() => setPickingFor('p1')}
        >
          <div className="slot-badge">PLAYER 1 (ANDA)</div>
          <div className="slot-name" style={{ color: CHARACTERS.find((c) => c.name === userChar)?.color }}>
            {userChar}
          </div>
          {pickingFor === 'p1' && <span className="picking-indicator">Memilih P1...</span>}
        </div>

        <div className="vs-divider">
          <div className="vs-circle">
            <Swords size={28} className="vs-sword" />
          </div>
          <span className="vs-text">VS</span>
        </div>

        <div 
          className={`fighter-slot p2-slot ${pickingFor === 'p2' ? 'slot-active' : ''}`}
          onClick={() => setPickingFor('p2')}
        >
          <div className="slot-badge slot-badge-p2">PLAYER 2 (LAWAN)</div>
          <div className="slot-name" style={{ color: CHARACTERS.find((c) => c.name === oppChar)?.color }}>
            {oppChar}
          </div>
          {pickingFor === 'p2' && <span className="picking-indicator">Memilih P2...</span>}
        </div>
      </div>

      {/* Active Selection Cue & Search Bar */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 10, margin: '14px 0 8px 0' }}>
        <div className="selection-prompt" style={{ margin: 0 }}>
          <span>Menentukan: </span>
          <strong style={{ color: pickingFor === 'p1' ? 'var(--electric-cyan)' : 'var(--devil-crimson)' }}>
            {pickingFor === 'p1' ? 'Player 1 (Karakter Anda)' : 'Player 2 (Lawan Latihan)'}
          </strong>
        </div>

        <div style={{ position: 'relative', width: '260px' }}>
          <Search size={14} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
          <input
            type="text"
            className="search-field"
            placeholder="Cari karakter (cth: Yoshimitsu)..."
            value={charSearch}
            onChange={(e) => setCharSearch(e.target.value)}
            style={{ padding: '6px 30px 6px 34px', height: '34px', fontSize: '0.84rem' }}
          />
          {charSearch && (
            <button
              type="button"
              onClick={() => setCharSearch('')}
              style={{ position: 'absolute', right: 10, top: '50%', transform: 'translateY(-50%)', background: 'transparent', border: 'none', color: 'var(--text-muted)', cursor: 'pointer' }}
            >
              <X size={13} />
            </button>
          )}
        </div>
      </div>

      {/* Fighter Cards Grid */}
      <div className="roster-grid">
        {filteredRoster.map((char) => {
          const moveCount = CHARACTER_DATA[char.name]?.length || 0;
          const punishCount = CHARACTER_DATA[char.name]?.filter((m) => m.is_punishable).length || 0;
          const isP1 = userChar === char.name;
          const isP2 = oppChar === char.name;

          return (
            <div
              key={char.name}
              id={`card-char-${char.name.toLowerCase()}`}
              className={`roster-card glass-panel ${isP1 ? 'is-p1' : ''} ${isP2 ? 'is-p2' : ''}`}
              onClick={() => handleSelectChar(char.name)}
              style={{
                borderColor: isP1 ? 'var(--electric-cyan)' : isP2 ? 'var(--devil-crimson)' : 'var(--border-subtle)',
              }}
            >
              <div className="card-top">
                <div className="card-tags">
                  {isP1 && <span className="badge badge-cyan"><CheckCircle2 size={12} /> P1</span>}
                  {isP2 && <span className="badge badge-crimson"><CheckCircle2 size={12} /> P2</span>}
                </div>
              </div>

              <div className="card-info">
                <h3 className="card-name" style={{ color: char.color }}>{char.name}</h3>
              </div>

              <div className="card-stats">
                <div className="c-stat">
                  <span className="c-val">{moveCount}</span>
                  <span className="c-lbl">Moves</span>
                </div>
                <div className="c-stat">
                  <span className="c-val text-crimson">{punishCount}</span>
                  <span className="c-lbl">Punishable</span>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Settings: Mode & Format Options */}
      <div className="config-section glass-panel">
        <div className="config-group">
          <label className="config-label">MODE LATIHAN</label>
          <div className="config-options">
            <button
              id="btn-mode-punish"
              className={`config-btn ${selectedMode === 'punishment' ? 'active-btn' : ''}`}
              onClick={() => setSelectedMode('punishment')}
            >
              <Shield size={18} />
              <div>
                <div className="c-btn-title">Punishment Quiz</div>
                <div className="c-btn-desc">Lawan move minus &rarr; Latih blok punish i10 - i15+</div>
              </div>
            </button>

            <button
              id="btn-mode-frametrap"
              className={`config-btn ${selectedMode === 'frame-trap' ? 'active-btn active-crimson' : ''}`}
              onClick={() => setSelectedMode('frame-trap')}
            >
              <Zap size={18} />
              <div>
                <div className="c-btn-title">Frame Trap Quiz</div>
                <div className="c-btn-desc">Move plus frame &rarr; Follow-up tak terinterupsi jab i10</div>
              </div>
            </button>
          </div>
        </div>

        {selectedMode === 'punishment' && (
          <div className="config-group animate-slide-up">
            <div className="config-label-row">
              <label className="config-label">
                <Filter size={14} style={{ display: 'inline', marginRight: 4 }} />
                TARGET BRACKET MINUS FRAME LAWAN
              </label>
              <span className="bracket-hint-pill">Bisa pilih lebih dari 1 bracket</span>
            </div>
            <div className="bracket-chips-container">
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
        )}

        <div className="config-group">
          <label className="config-label">FORMAT PILIHAN INPUT</label>
          <div className="config-options">
            <button
              id="btn-format-choices"
              className={`config-btn ${selectedFormat === 'four-choices' ? 'active-btn' : ''}`}
              onClick={() => setSelectedFormat('four-choices')}
            >
              <Sparkles size={18} />
              <div>
                <div className="c-btn-title">Tombol Frame Generik (i10 s/d i15+)</div>
                <div className="c-btn-desc">Pilihan frame i10, i11, i12, i13, i15, i15&gt; &mdash; Praktis untuk hafalan frame</div>
              </div>
            </button>

            <button
              id="btn-format-movelist"
              className={`config-btn ${selectedFormat === 'full-movelist' ? 'active-btn active-gold' : ''}`}
              onClick={() => setSelectedFormat('full-movelist')}
            >
              <Swords size={18} />
              <div>
                <div className="c-btn-title">Full Movelist Selector (Mastery)</div>
                <div className="c-btn-desc">Cari dan pilih dari seluruh daftar move karakter Anda</div>
              </div>
            </button>
          </div>
        </div>
      </div>

      {/* Start Button */}
      <div className="action-row">
        <button
          id="btn-start-battle"
          className="btn-start pulse-cyan"
          onClick={() => onStartBattle(userChar, oppChar, selectedFormat, selectedMode, minusFilter)}
        >
          <span>MULAI LATIHAN ({userChar} vs {oppChar})</span>
          <Swords size={20} />
        </button>
      </div>

      <style>{`
        .char-select-container {
          display: flex;
          flex-direction: column;
          gap: 20px;
          max-width: 960px;
          margin: 0 auto;
        }
        .char-select-header {
          text-align: center;
        }
        .select-title {
          font-family: var(--font-display);
          font-size: 2.2rem;
          font-weight: 800;
          letter-spacing: 0.08em;
          background: linear-gradient(135deg, #fff, #00e5ff);
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
        }
        .select-desc {
          color: var(--text-secondary);
          font-size: 0.95rem;
          margin-top: 4px;
        }
        .versus-card {
          display: grid;
          grid-template-columns: 1fr auto 1fr;
          align-items: center;
          padding: 24px;
          border-radius: var(--radius-lg);
          gap: 20px;
        }
        .fighter-slot {
          display: flex;
          flex-direction: column;
          align-items: center;
          padding: 16px;
          border-radius: var(--radius-md);
          background: rgba(0, 0, 0, 0.3);
          border: 1px solid var(--border-subtle);
          cursor: pointer;
          transition: all 0.25s;
        }
        .fighter-slot:hover {
          background: rgba(255, 255, 255, 0.03);
        }
        .slot-active {
          border-color: var(--electric-cyan);
          box-shadow: 0 0 20px rgba(0, 229, 255, 0.25);
        }
        .p2-slot.slot-active {
          border-color: var(--devil-crimson);
          box-shadow: 0 0 20px rgba(255, 30, 86, 0.25);
        }
        .slot-badge {
          font-size: 0.7rem;
          font-weight: 800;
          color: var(--electric-cyan);
          letter-spacing: 0.1em;
          margin-bottom: 6px;
        }
        .slot-badge-p2 {
          color: var(--devil-crimson);
        }
        .slot-avatar {
          font-size: 2.5rem;
          margin: 4px 0;
        }
        .slot-name {
          font-family: var(--font-display);
          font-size: 1.6rem;
          font-weight: 800;
        }
        .slot-sub {
          font-size: 0.75rem;
          color: var(--text-muted);
        }
        .picking-indicator {
          margin-top: 8px;
          font-size: 0.7rem;
          font-weight: 700;
          color: #fff;
          background: rgba(255, 255, 255, 0.15);
          padding: 2px 8px;
          border-radius: var(--radius-full);
          animation: pulseGlow 1.5s infinite;
        }
        .vs-divider {
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 4px;
        }
        .vs-circle {
          width: 52px;
          height: 52px;
          border-radius: 50%;
          background: linear-gradient(135deg, rgba(0, 229, 255, 0.2), rgba(255, 30, 86, 0.2));
          border: 1px solid var(--border-subtle);
          display: flex;
          align-items: center;
          justify-content: center;
        }
        .vs-sword {
          color: #fff;
        }
        .vs-text {
          font-family: var(--font-display);
          font-size: 1.1rem;
          font-weight: 900;
          color: var(--text-muted);
          letter-spacing: 0.1em;
        }
        .selection-prompt {
          text-align: center;
          font-size: 0.9rem;
          color: var(--text-secondary);
        }
        .roster-grid {
          display: grid;
          grid-template-columns: repeat(4, 1fr);
          gap: 14px;
        }
        .roster-card {
          padding: 16px;
          display: flex;
          flex-direction: column;
          gap: 12px;
          cursor: pointer;
          transition: all 0.2s cubic-bezier(0.16, 1, 0.3, 1);
        }
        .roster-card:hover {
          transform: translateY(-4px);
          border-color: rgba(255, 255, 255, 0.3) !important;
        }
        .card-top {
          display: flex;
          align-items: center;
          justify-content: space-between;
        }
        .card-avatar {
          font-size: 2rem;
        }
        .card-tags {
          display: flex;
          gap: 4px;
        }
        .card-name {
          font-family: var(--font-display);
          font-size: 1.4rem;
          font-weight: 800;
        }
        .card-title {
          display: block;
          font-size: 0.75rem;
          color: var(--text-secondary);
        }
        .card-style {
          display: block;
          font-size: 0.7rem;
          color: var(--text-muted);
          margin-top: 2px;
        }
        .card-stats {
          display: flex;
          justify-content: space-between;
          border-top: 1px solid var(--border-subtle);
          padding-top: 10px;
          margin-top: auto;
        }
        .c-stat {
          display: flex;
          flex-direction: column;
        }
        .c-val {
          font-family: var(--font-display);
          font-size: 1.1rem;
          font-weight: 700;
        }
        .c-lbl {
          font-size: 0.65rem;
          color: var(--text-muted);
          text-transform: uppercase;
        }
        .text-crimson {
          color: var(--devil-crimson);
        }
        .config-section {
          padding: 20px;
          display: flex;
          flex-direction: column;
          gap: 20px;
        }
        .config-group {
          display: flex;
          flex-direction: column;
          gap: 10px;
        }
        .config-label-row {
          display: flex;
          align-items: center;
          justify-content: space-between;
          flex-wrap: wrap;
          gap: 6px;
        }
        .bracket-hint-pill {
          font-size: 0.7rem;
          color: var(--text-muted);
          background: rgba(255, 255, 255, 0.05);
          padding: 2px 8px;
          border-radius: var(--radius-full);
        }
        .config-label {
          font-size: 0.75rem;
          font-weight: 800;
          letter-spacing: 0.1em;
          color: var(--text-muted);
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
          background: rgba(0, 0, 0, 0.4);
          border: 1px solid var(--border-subtle);
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
          box-shadow: 0 0 15px rgba(0, 229, 255, 0.25);
        }
        .bracket-chip.chip-gold.active-bracket-gold {
          background: rgba(255, 215, 0, 0.15);
          border-color: #ffd700;
          color: #ffd700;
          box-shadow: 0 0 15px rgba(255, 215, 0, 0.25);
        }
        .bracket-chip.chip-safe.active-bracket-safe {
          background: rgba(0, 240, 118, 0.15);
          border-color: var(--success-green);
          color: var(--success-green);
          box-shadow: 0 0 15px rgba(0, 240, 118, 0.25);
        }
        .bracket-chip.active-bracket-launcher {
          background: rgba(255, 30, 86, 0.15);
          border-color: var(--devil-crimson);
          color: var(--devil-crimson);
          box-shadow: 0 0 15px rgba(255, 30, 86, 0.25);
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
        .config-options {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 12px;
        }
        .config-btn {
          display: flex;
          align-items: flex-start;
          gap: 12px;
          padding: 14px;
          border-radius: var(--radius-md);
          background: rgba(0, 0, 0, 0.4);
          border: 1px solid var(--border-subtle);
          color: var(--text-secondary);
          text-align: left;
          transition: all 0.2s;
        }
        .config-btn:hover {
          background: rgba(255, 255, 255, 0.05);
          color: #fff;
        }
        .config-btn.active-btn {
          background: rgba(0, 229, 255, 0.1);
          border-color: var(--electric-cyan);
          color: #fff;
          box-shadow: 0 0 15px rgba(0, 229, 255, 0.2);
        }
        .config-btn.active-crimson {
          background: rgba(255, 30, 86, 0.1);
          border-color: var(--devil-crimson);
          color: #fff;
          box-shadow: 0 0 15px rgba(255, 30, 86, 0.2);
        }
        .config-btn.active-gold {
          background: rgba(255, 183, 3, 0.1);
          border-color: var(--heihachi-gold);
          color: #fff;
          box-shadow: 0 0 15px rgba(255, 183, 3, 0.2);
        }
        .c-btn-title {
          font-weight: 700;
          font-size: 0.95rem;
        }
        .c-btn-desc {
          font-size: 0.78rem;
          color: var(--text-muted);
          margin-top: 3px;
        }
        .action-row {
          display: flex;
          justify-content: center;
          margin-top: 10px;
        }
        .btn-start {
          display: flex;
          align-items: center;
          gap: 12px;
          background: linear-gradient(135deg, #00e5ff 0%, #0088ff 100%);
          color: #000;
          font-weight: 800;
          font-size: 1.1rem;
          padding: 16px 36px;
          border-radius: var(--radius-full);
          letter-spacing: 0.05em;
          transition: all 0.2s;
        }
        .btn-start:hover {
          transform: scale(1.03);
          box-shadow: 0 0 30px rgba(0, 229, 255, 0.5);
        }

        @media (max-width: 768px) {
          .roster-grid {
            grid-template-columns: repeat(2, 1fr);
          }
          .versus-card {
            grid-template-columns: 1fr;
            gap: 14px;
            padding: 16px;
          }
          .vs-divider {
            flex-direction: row;
            justify-content: center;
          }
          .config-options {
            grid-template-columns: 1fr;
          }
          .btn-start {
            width: 100%;
            justify-content: center;
          }
        }
      `}</style>
    </div>
  );
};
