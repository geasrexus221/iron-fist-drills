import React, { useState } from 'react';
import type { CharacterName, InputFormat, SessionScope, DrillModifiers } from '../types/tekken';
import { CHARACTERS } from '../data';
import { CharacterPickerModal } from './CharacterPickerModal';
import { Zap, ArrowLeft, RotateCcw, Info, X } from 'lucide-react';

interface FrameTrapSetupProps {
  onStart: (userChar: CharacterName, format: InputFormat, modifiers: DrillModifiers) => void;
  onBack: () => void;
  initialUserChar?: CharacterName;
  initialFormat?: InputFormat;
  initialModifiers?: Partial<DrillModifiers>;
}

export const FrameTrapSetup: React.FC<FrameTrapSetupProps> = ({
  onStart,
  onBack,
  initialUserChar = 'Jin',
  initialFormat = 'four-choices',
  initialModifiers,
}) => {
  const [userChar, setUserChar] = useState<CharacterName>(initialUserChar);
  const [format, setFormat] = useState<InputFormat>(initialFormat);
  const [sessionScope, setSessionScope] = useState<SessionScope>(initialModifiers?.sessionScope || 'endless');
  const [isSinglePlay, setIsSinglePlay] = useState<boolean>(initialModifiers?.isSinglePlay || false);
  const [isBlitzMode, setIsBlitzMode] = useState<boolean>(initialModifiers?.isBlitzMode || false);
  const [isSurvivalMode, setIsSurvivalMode] = useState<boolean>(initialModifiers?.isSurvivalMode || false);
  const [isBlindMode, setIsBlindMode] = useState<boolean>(initialModifiers?.isBlindMode ?? true);
  const [isPickerOpen, setIsPickerOpen] = useState(false);
  const [infoModal, setInfoModal] = useState<'session-scope' | 'modifiers' | 'format' | null>(null);

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
              {infoModal === 'session-scope' && (
                <div className="info-desc-list">
                  <div className="info-desc-item">
                    <span className="info-item-label text-cyan">Endless Mode</span>
                    <span className="info-item-text">Latihan tanpa henti. Situasi frame trap diacak terus-menerus tanpa batas untuk membangun insting berkelanjutan.</span>
                  </div>
                  <div className="info-desc-item">
                    <span className="info-item-label text-gold">Gauntlet Mode</span>
                    <span className="info-item-text">Setiap setup frame trap diuji tepat 1 kali tanpa pengulangan hingga selesai, dilengkapi evaluasi statistik.</span>
                  </div>
                </div>
              )}

              {infoModal === 'modifiers' && (
                <div className="info-desc-list">
                  <div className="info-desc-item">
                    <span className="info-item-label text-cyan">Once</span>
                    <span className="info-item-text">Video gerakan hanya diputar 1 kali lalu membeku (freeze) sampai Anda menjawab.</span>
                  </div>
                  <div className="info-desc-item">
                    <span className="info-item-label text-gold">Blitz</span>
                    <span className="info-item-text">Batas waktu memilih jawaban 3 detik. Waktu habis dihitung sebagai respon salah.</span>
                  </div>
                  <div className="info-desc-item">
                    <span className="info-item-label text-crimson">Survival</span>
                    <span className="info-item-text">Diberikan 3 HP (nyawa). Respon salah atau waktu habis akan mengurangi 1 HP. Sesi Game Over jika HP habis.</span>
                  </div>
                  <div className="info-desc-item">
                    <span className="info-item-label text-purple">Blind</span>
                    <span className="info-item-text">Sembunyikan angka frame advantage sebelum jawaban dipilih untuk menguji insting membaca situasi.</span>
                  </div>
                </div>
              )}

              {infoModal === 'format' && (
                <div className="info-desc-list">
                  <div className="info-desc-item">
                    <span className="info-item-label text-gold">Custom Move</span>
                    <span className="info-item-text">Menebak nama gerakan spesifik karakter Anda beserta notasi inputnya untuk mengeksekusi trap.</span>
                  </div>
                  <div className="info-desc-item">
                    <span className="info-item-label text-cyan">Tombol Generik</span>
                    <span className="info-item-text">Pilihan cepat tombol aksi standar berdasarkan startup frame tanpa menghafal nama gerakan spesifik.</span>
                  </div>
                </div>
              )}
            </div>

            <div className="info-modal-footer">
              <button
                type="button"
                className="btn-info-modal-dismiss"
                onClick={() => setInfoModal(null)}
              >
                Tutup
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Start Button */}
      <div className="setup-action-row">
        <button
          className="btn-start-drill"
          onClick={() =>
            onStart(userChar, format, {
              sessionScope,
              isSinglePlay,
              isBlitzMode,
              isSurvivalMode,
              isBlindMode,
            })
          }
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
          font-size: 0.75rem;
          font-weight: 800;
          letter-spacing: 0.08em;
          color: var(--text-muted);
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
          .session-scope-row {
            grid-template-columns: 1fr 1fr;
            gap: 8px;
          }
          .modifier-grid {
            grid-template-columns: repeat(4, 1fr);
            gap: 6px;
          }
          .btn-start-drill {
            padding: 12px;
            font-size: 0.95rem;
          }
        }

        /* Android Font & Compact Scaling */
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
        .is-android .format-chip {
          font-size: 0.72rem !important;
          padding: 7px 8px !important;
          min-height: 34px !important;
        }
        .is-android .btn-start-drill {
          font-size: 0.88rem !important;
          padding: 10px 14px !important;
        }
      `}</style>
    </div>
  );
};
