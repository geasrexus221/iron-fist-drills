import React, { useState } from 'react';
import type { CharacterName, ThrowDrillType } from '../types/tekken';
import { CHARACTERS } from '../data';
import { CharacterPickerModal } from './CharacterPickerModal';
import { ArrowLeft, RotateCcw, ShieldAlert, Sparkles } from 'lucide-react';

interface ThrowBreakSetupProps {
  onStart: (oppChar: CharacterName, isBlindMode: boolean, throwDrillType: ThrowDrillType) => void;
  onBack: () => void;
  initialOppChar?: CharacterName;
  initialBlindMode?: boolean;
  initialDrillType?: ThrowDrillType;
}

export const ThrowBreakSetup: React.FC<ThrowBreakSetupProps> = ({
  onStart,
  onBack,
  initialOppChar = 'King',
  initialBlindMode = true,
  initialDrillType = 'direct',
}) => {
  const [oppChar, setOppChar] = useState<CharacterName>(initialOppChar);
  const [isBlindMode, setIsBlindMode] = useState<boolean>(initialBlindMode);
  const [throwDrillType, setThrowDrillType] = useState<ThrowDrillType>(initialDrillType);
  const [isPickerOpen, setIsPickerOpen] = useState(false);

  const charData = CHARACTERS.find((c) => c.name === oppChar);

  return (
    <div className="setup-container animate-slide-up">
      {/* Top Navigation */}
      <div className="setup-nav">
        <button className="btn-back" onClick={onBack}>
          <ArrowLeft size={16} />
          <span>Kembali ke Menu Utama</span>
        </button>
        <span className="setup-mode-tag tag-amber">
          <ShieldAlert size={14} /> Throw Break Drill
        </span>
      </div>

      <div className="setup-header">
        <h1 className="setup-title">SETUP THROW BREAK DRILL</h1>
      </div>

      {/* Opponent Grappler Card (P2) */}
      <div className="single-fighter-section">
        <div
          className="fighter-interactive-card card-p2-glow"
          onClick={() => setIsPickerOpen(true)}
        >
          <div className="card-top-header">
            <span className="fighter-role role-p2">P2: LAWAN / GRAPPLER</span>
            <span className="change-hint-btn">
              <RotateCcw size={12} />
              <span>Ganti Grappler</span>
            </span>
          </div>

          <div className="card-character-body">
            <div className="char-hero-info">
              <h2 className="char-hero-name" style={{ color: charData?.color }}>
                {oppChar}
              </h2>
            </div>
          </div>
        </div>
      </div>

      {/* Character Picker Popup Modal */}
      <CharacterPickerModal
        isOpen={isPickerOpen}
        onClose={() => setIsPickerOpen(false)}
        role="p2"
        pickerType="throws"
        title="PILIH KARAKTER LAWAN (GRAPPLER)"
        selectedChar={oppChar}
        onSelectCharacter={(char) => setOppChar(char)}
      />

      {/* Drill Mode Selection (Direct vs Multi-Stage Chain) */}
      <div className="setup-card">
        <span className="setup-section-title">TIPE LATIHAN BANTINGAN</span>
        <div className="drill-mode-grid">
          <button
            type="button"
            className={`drill-mode-btn ${throwDrillType === 'direct' ? 'selected' : ''}`}
            onClick={() => setThrowDrillType('direct')}
          >
            <span className="drill-btn-title">POTONGAN MANDIRI</span>
            <span className="drill-btn-sub">Latihan per-tahap (termasuk sambungan)</span>
          </button>
          <button
            type="button"
            className={`drill-mode-btn ${throwDrillType === 'multistage' ? 'selected' : ''}`}
            onClick={() => setThrowDrillType('multistage')}
          >
            <span className="drill-btn-title">RANTAI BERTAHAP</span>
            <span className="drill-btn-sub">Simulasi match (lanjut jika gagal lepas)</span>
          </button>
        </div>
      </div>

      {/* Blind Mode Setting */}
      <div className="setup-card">
        <div className="toggle-row">
          <div className="toggle-info">
            <span className="setup-section-title">BLIND MODE (TUTUP NAMA MOVE)</span>
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

      {/* Start Button */}
      <button
        id="btn-start-throwbreak"
        className="btn-start-session"
        onClick={() => onStart(oppChar, isBlindMode, throwDrillType)}
      >
        <Sparkles size={18} />
        <span>MULAI THROW BREAK DRILL</span>
      </button>

      <style>{`
        .setup-container {
          max-width: 700px;
          margin: 0 auto;
          display: flex;
          flex-direction: column;
          gap: 14px;
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
          background: #131622;
          border: 1px solid rgba(255, 255, 255, 0.08);
          color: var(--text-secondary);
          padding: 6px 12px;
          border-radius: var(--radius-sm);
          font-size: 0.85rem;
          font-weight: 700;
          cursor: pointer;
          transition: all 0.2s;
        }
        .btn-back:hover {
          background: rgba(255, 255, 255, 0.1);
          color: #fff;
        }
        .setup-mode-tag {
          display: flex;
          align-items: center;
          gap: 6px;
          font-size: 0.75rem;
          font-weight: 800;
          letter-spacing: 0.05em;
          text-transform: uppercase;
          padding: 4px 12px;
          border-radius: var(--radius-full);
        }
        .tag-amber {
          background: rgba(255, 170, 0, 0.12);
          border: 1px solid rgba(255, 170, 0, 0.3);
          color: #ffaa00;
        }
        .setup-header {
          text-align: left;
        }
        .setup-title {
          font-family: var(--font-display);
          font-size: 1.8rem;
          font-weight: 900;
          letter-spacing: 0.05em;
          color: #fff;
          margin: 0;
        }
        .single-fighter-section {
          display: flex;
          flex-direction: column;
          gap: 10px;
        }
        .fighter-interactive-card {
          background: #131622;
          border: 1px solid rgba(255, 255, 255, 0.08);
          border-radius: var(--radius-md);
          padding: 12px 16px;
          cursor: pointer;
          transition: all 0.2s cubic-bezier(0.16, 1, 0.3, 1);
          display: flex;
          flex-direction: column;
          gap: 8px;
        }
        .fighter-interactive-card:hover {
          transform: translateY(-2px);
          background: rgba(255, 255, 255, 0.03);
        }
        .card-p2-glow:hover {
          border-color: #ffaa00;
          box-shadow: 0 4px 20px rgba(255, 170, 0, 0.2);
        }
        .card-top-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          border-bottom: 1px solid rgba(255, 255, 255, 0.06);
          padding-bottom: 6px;
        }
        .fighter-role {
          font-size: 0.72rem;
          font-weight: 800;
          letter-spacing: 0.08em;
          text-transform: uppercase;
        }
        .role-p2 {
          color: #ffaa00;
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
          font-size: 1.4rem;
          font-weight: 800;
          letter-spacing: 0.02em;
          line-height: 1.1;
          margin: 0;
        }
        .setup-card {
          background: #131622;
          border: 1px solid rgba(255, 255, 255, 0.08);
          border-radius: var(--radius-md);
          padding: 12px 16px;
        }
        .setup-section-title {
          font-size: 0.85rem;
          font-weight: 800;
          letter-spacing: 0.05em;
          color: #fff;
        }
        .drill-mode-grid {
          display: grid;
          grid-template-columns: repeat(2, 1fr);
          gap: 10px;
          margin-top: 8px;
        }
        .drill-mode-btn {
          background: #181b2a;
          border: 1px solid rgba(255, 255, 255, 0.08);
          border-radius: var(--radius-sm);
          padding: 10px 12px;
          text-align: left;
          cursor: pointer;
          transition: all 0.2s;
          display: flex;
          flex-direction: column;
          gap: 3px;
        }
        .drill-mode-btn:hover {
          background: rgba(255, 255, 255, 0.05);
        }
        .drill-mode-btn.selected {
          border-color: #ffaa00;
          background: rgba(255, 170, 0, 0.1);
        }
        .drill-btn-title {
          font-family: var(--font-display);
          font-weight: 800;
          font-size: 0.88rem;
          color: #fff;
          letter-spacing: 0.03em;
        }
        .drill-mode-btn.selected .drill-btn-title {
          color: #ffaa00;
        }
        .drill-btn-sub {
          font-size: 0.72rem;
          color: var(--text-muted);
          line-height: 1.25;
        }
        .toggle-row {
          display: flex;
          justify-content: space-between;
          align-items: center;
          gap: 16px;
        }
        .toggle-info {
          display: flex;
          flex-direction: column;
          gap: 3px;
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
          background: rgba(255, 170, 0, 0.15);
          border: 1px solid #ffaa00;
          color: #ffaa00;
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
        .btn-start-session {
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 10px;
          width: 100%;
          padding: 14px;
          background: linear-gradient(135deg, #ffaa00, #ff6600);
          color: #000;
          font-family: var(--font-display);
          font-size: 1.05rem;
          font-weight: 900;
          letter-spacing: 0.05em;
          border-radius: var(--radius-full);
          border: none;
          cursor: pointer;
          transition: all 0.2s;
        }
        .btn-start-session:hover {
          opacity: 0.95;
          transform: translateY(-2px);
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
          }
          .fighter-interactive-card {
            padding: 10px 12px;
          }
          .char-hero-name {
            font-size: 1.15rem;
          }
          .btn-start-session {
            padding: 12px;
            font-size: 0.95rem;
          }
        }
      `}</style>
    </div>
  );
};
