import React, { useState } from 'react';
import type { CharacterName, InputFormat } from '../types/tekken';
import { CHARACTERS } from '../data';
import { CharacterPickerModal } from './CharacterPickerModal';
import { Zap, ArrowLeft, Swords, Sparkles, RotateCcw } from 'lucide-react';

interface FrameTrapSetupProps {
  onStart: (userChar: CharacterName, format: InputFormat, isBlindMode: boolean) => void;
  onBack: () => void;
  initialUserChar?: CharacterName;
  initialFormat?: InputFormat;
  initialBlindMode?: boolean;
}

export const FrameTrapSetup: React.FC<FrameTrapSetupProps> = ({
  onStart,
  onBack,
  initialUserChar = 'Jin',
  initialFormat = 'full-movelist',
  initialBlindMode = true,
}) => {
  const [userChar, setUserChar] = useState<CharacterName>(initialUserChar);
  const [format, setFormat] = useState<InputFormat>(initialFormat);
  const [isBlindMode, setIsBlindMode] = useState<boolean>(initialBlindMode);
  const [isPickerOpen, setIsPickerOpen] = useState(false);

  const charData = CHARACTERS.find((c) => c.name === userChar);

  return (
    <div className="setup-container animate-slide-up">
      {/* Top Navigation */}
      <div className="setup-nav">
        <button className="btn-back" onClick={onBack}>
          <ArrowLeft size={16} />
          <span>Kembali ke Menu Utama</span>
        </button>
        <span className="setup-mode-tag tag-cyan">
          <Zap size={14} /> Frame Trap Training
        </span>
      </div>

      <div className="setup-header">
        <h1 className="setup-title">SETUP FRAME TRAP DRILL</h1>
      </div>

      {/* Single Fighter Card (P1) */}
      <div className="single-fighter-section">
        <div
          className="fighter-interactive-card card-p1-glow"
          onClick={() => setIsPickerOpen(true)}
        >
          <div className="card-top-header">
            <span className="fighter-role role-p1">P1: KARAKTER ANDA</span>
            <span className="change-hint-btn">
              <RotateCcw size={12} />
              <span>Ganti Karakter</span>
            </span>
          </div>

          <div className="card-character-body">
            <div className="char-hero-info">
              <h2 className="char-hero-name" style={{ color: charData?.color }}>
                {userChar}
              </h2>
            </div>
          </div>
        </div>
      </div>

      {/* Character Picker Popup Modal */}
      <CharacterPickerModal
        isOpen={isPickerOpen}
        onClose={() => setIsPickerOpen(false)}
        role="p1"
        title="PILIH KARAKTER ANDA"
        selectedChar={userChar}
        onSelectCharacter={(char) => setUserChar(char)}
      />

      {/* Blind Mode Setting */}
      <div className="setup-card">
        <div className="toggle-row">
          <div className="toggle-info">
            <span className="setup-section-title">BLIND MODE (TUTUP ANGKA ADVANTAGE)</span>
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
          onClick={() => onStart(userChar, format, isBlindMode)}
        >
          <span>MULAI LATIHAN FRAME TRAP ({userChar})</span>
          <Zap size={20} />
        </button>
      </div>

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
        .tag-cyan {
          background: rgba(0, 229, 255, 0.15);
          color: var(--electric-cyan);
          border: 1px solid rgba(0, 229, 255, 0.3);
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
          color: var(--electric-cyan);
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
          margin: 0;
          line-height: 1.1;
        }
        .setup-card {
          background: #131622;
          border: 1px solid rgba(255, 255, 255, 0.08);
          border-radius: var(--radius-md);
          padding: 12px 16px;
          display: flex;
          flex-direction: column;
          gap: 10px;
        }
        .setup-section-title {
          font-size: 0.85rem;
          font-weight: 800;
          letter-spacing: 0.05em;
          color: #fff;
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
          gap: 10px;
        }
        .format-card {
          display: flex;
          align-items: center;
          gap: 10px;
          padding: 12px 14px;
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
          font-size: 0.88rem;
          color: #fff;
        }
        .setup-action-row {
          display: flex;
          justify-content: center;
          margin-top: 4px;
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
          padding: 14px;
          border-radius: var(--radius-full);
          letter-spacing: 0.05em;
          transition: transform 0.15s, opacity 0.15s;
        }
        .btn-start-drill:hover {
          transform: scale(1.01);
          opacity: 0.95;
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
            font-size: 1.15rem;
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
      `}</style>
    </div>
  );
};
