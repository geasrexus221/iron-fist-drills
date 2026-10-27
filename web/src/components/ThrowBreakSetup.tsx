import React, { useState } from 'react';
import type { CharacterName, ThrowDrillType, SessionScope, DrillModifiers } from '../types/tekken';
import { CHARACTERS } from '../data';
import { CharacterPickerModal } from './CharacterPickerModal';
import { ArrowLeft, RotateCcw, ShieldAlert, Info, X } from 'lucide-react';

interface ThrowBreakSetupProps {
  onStart: (oppChar: CharacterName, throwDrillType: ThrowDrillType, modifiers: DrillModifiers) => void;
  onBack: () => void;
  initialOppChar?: CharacterName;
  initialDrillType?: ThrowDrillType;
  initialModifiers?: Partial<DrillModifiers>;
}

export const ThrowBreakSetup: React.FC<ThrowBreakSetupProps> = ({
  onStart,
  onBack,
  initialOppChar = 'King',
  initialDrillType = 'direct',
  initialModifiers,
}) => {
  const [oppChar, setOppChar] = useState<CharacterName>(initialOppChar);
  const [throwDrillType, setThrowDrillType] = useState<ThrowDrillType>(initialDrillType);
  const [sessionScope, setSessionScope] = useState<SessionScope>(initialModifiers?.sessionScope || 'endless');
  const [isSinglePlay, setIsSinglePlay] = useState<boolean>(initialModifiers?.isSinglePlay || false);
  const [isBlitzMode, setIsBlitzMode] = useState<boolean>(initialModifiers?.isBlitzMode || false);
  const [isSurvivalMode, setIsSurvivalMode] = useState<boolean>(initialModifiers?.isSurvivalMode || false);
  const [isBlindMode, setIsBlindMode] = useState<boolean>(initialModifiers?.isBlindMode ?? true);
  const [isPickerOpen, setIsPickerOpen] = useState(false);
  const [infoModal, setInfoModal] = useState<'drill-type' | 'session-scope' | 'modifiers' | null>(null);

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
        <div className="section-header-row">
          <span className="setup-section-title">TIPE LATIHAN BANTINGAN</span>
          <button
            type="button"
            className="btn-info-circle"
            onClick={() => setInfoModal('drill-type')}
            title="Penjelasan Tipe Latihan Bantingan"
          >
            <Info size={14} />
          </button>
        </div>
        <div className="drill-mode-grid">
          <button
            type="button"
            className={`drill-mode-btn ${throwDrillType === 'direct' ? 'selected' : ''}`}
            onClick={() => setThrowDrillType('direct')}
          >
            <span className="drill-btn-title">{throwDrillType === 'direct' ? '✓ ' : ''}POTONGAN MANDIRI</span>
            <span className="drill-btn-sub">Latihan per-tahap (termasuk sambungan)</span>
          </button>
          <button
            type="button"
            className={`drill-mode-btn ${throwDrillType === 'multistage' ? 'selected' : ''}`}
            onClick={() => setThrowDrillType('multistage')}
          >
            <span className="drill-btn-title">{throwDrillType === 'multistage' ? '✓ ' : ''}RANTAI BERTAHAP</span>
            <span className="drill-btn-sub">Simulasi match (lanjut jika gagal lepas)</span>
          </button>
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

      {/* Info Popup Modal */}
      {infoModal && (
        <div className="info-modal-overlay animate-fade-in" onClick={() => setInfoModal(null)}>
          <div className="info-modal-card animate-slide-up" onClick={(e) => e.stopPropagation()}>
            <div className="info-modal-header">
              <div className="info-modal-title-wrap">
                <Info size={16} className="text-cyan" />
                <h3 className="info-modal-title">
                  {infoModal === 'drill-type' && 'Tipe Latihan Bantingan'}
                  {infoModal === 'session-scope' && 'Tipe Sesi Latihan'}
                  {infoModal === 'modifiers' && 'Tantangan & Modifier'}
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
              {infoModal === 'drill-type' && (
                <div className="info-desc-list">
                  <div className="info-desc-item">
                    <span className="info-item-label text-cyan">Potongan Mandiri</span>
                    <span className="info-item-text">Melatih setiap tahap bantingan (starter atau sambungan chain throw King) secara terpisah untuk memfokuskan reaksi tangan break (1, 2, atau 1+2).</span>
                  </div>
                  <div className="info-desc-item">
                    <span className="info-item-label text-gold">Rantai Bertahap</span>
                    <span className="info-item-text">Simulasi match nyata: jika Anda gagal melepaskan bantingan di tahap awal, rangkaian rantai bantingan akan terus berlanjut ke tahap berikutnya hingga tuntas atau berhasil di-break.</span>
                  </div>
                </div>
              )}

              {infoModal === 'session-scope' && (
                <div className="info-desc-list">
                  <div className="info-desc-item">
                    <span className="info-item-label text-cyan">Endless Mode</span>
                    <span className="info-item-text">Latihan tanpa henti. Bantingan grappler diacak terus-menerus tanpa batas untuk membangun refleks visual instingtif.</span>
                  </div>
                  <div className="info-desc-item">
                    <span className="info-item-label text-gold">Gauntlet Mode</span>
                    <span className="info-item-text">Setiap gerakan bantingan diuji tepat 1 kali tanpa pengulangan hingga selesai, disertai rekapitulasi performa.</span>
                  </div>
                </div>
              )}

              {infoModal === 'modifiers' && (
                <div className="info-desc-list">
                  <div className="info-desc-item">
                    <span className="info-item-label text-cyan">Once</span>
                    <span className="info-item-text">Animasi bantingan hanya diputar 1 kali lalu membeku sampai Anda menekan tombol break.</span>
                  </div>
                  <div className="info-desc-item">
                    <span className="info-item-label text-gold">Blitz</span>
                    <span className="info-item-text">Batas waktu dinamis mulai dari 4 detik (+1.0 detik tiap stage grab chain). Respon salah jika waktu habis.</span>
                  </div>
                  <div className="info-desc-item">
                    <span className="info-item-label text-crimson">Survival</span>
                    <span className="info-item-text">Diberikan 3 HP (nyawa). Gagal melepaskan bantingan atau kehabisan waktu mengurangi 1 HP. Sesi Game Over jika HP habis.</span>
                  </div>
                  <div className="info-desc-item">
                    <span className="info-item-label text-purple">Blind</span>
                    <span className="info-item-text">Menyembunyikan nama bantingan sebelum jawaban dipilih untuk melatih membaca gerakan tangan lawan (kiri 1, kanan 2, atau kedua tangan 1+2).</span>
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
      <button
        id="btn-start-throwbreak"
        className="btn-start-session"
        onClick={() =>
          onStart(oppChar, throwDrillType, {
            sessionScope,
            isSinglePlay,
            isBlitzMode,
            isSurvivalMode,
            isBlindMode,
          })
        }
      >
        <span>MULAI LATIHAN THROW BREAK ({oppChar.toUpperCase()})</span>
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
        .tag-amber {
          background: rgba(255, 183, 3, 0.15);
          color: var(--heihachi-gold);
          border: 1px solid rgba(255, 183, 3, 0.3);
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
        .card-p2-glow:hover {
          border-color: var(--heihachi-gold);
          box-shadow: 0 4px 25px rgba(255, 183, 3, 0.15);
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
          color: var(--heihachi-gold);
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
        .drill-mode-grid {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 10px;
        }
        .drill-mode-btn {
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          padding: 10px 12px;
          background: #0d0f18;
          border: 1.5px solid rgba(255, 255, 255, 0.08);
          border-radius: var(--radius-sm);
          text-align: center;
          cursor: pointer;
          transition: all 0.2s;
          gap: 3px;
        }
        .drill-mode-btn:hover {
          background: rgba(255, 255, 255, 0.05);
          border-color: rgba(255, 255, 255, 0.2);
        }
        .drill-mode-btn.selected {
          border-color: var(--electric-cyan);
          background: rgba(0, 229, 255, 0.12);
          box-shadow: 0 0 14px rgba(0, 229, 255, 0.25);
        }
        .drill-btn-title {
          font-weight: 800;
          font-size: 0.85rem;
          color: #fff;
          letter-spacing: 0.03em;
        }
        .drill-mode-btn.selected .drill-btn-title {
          color: var(--electric-cyan);
        }
        .drill-btn-sub {
          font-size: 0.72rem;
          color: var(--text-muted);
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
        .scope-chip,
        .modifier-chip {
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
        .modifier-chip:hover {
          background: rgba(255, 255, 255, 0.06);
          border-color: rgba(255, 255, 255, 0.22);
          color: #fff;
        }
        .active-scope,
        .active-modifier {
          background: rgba(0, 229, 255, 0.14) !important;
          border-color: var(--electric-cyan) !important;
          color: var(--electric-cyan) !important;
          box-shadow: 0 0 14px rgba(0, 229, 255, 0.25);
        }
        .active-scope-gold {
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
        .btn-start-session {
          width: 100%;
          padding: 14px;
          background: linear-gradient(135deg, #ffb703 0%, #fb8500 100%);
          color: #000;
          font-weight: 900;
          font-size: 1.05rem;
          letter-spacing: 0.05em;
          border-radius: var(--radius-full);
          border: none;
          cursor: pointer;
          transition: all 0.2s;
          display: flex;
          align-items: center;
          justify-content: center;
        }
        .btn-start-session:hover {
          opacity: 0.95;
          transform: scale(1.01);
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
        .text-gold {
          color: var(--heihachi-gold);
        }
        .text-cyan {
          color: var(--electric-cyan);
        }
        .text-crimson {
          color: var(--devil-crimson);
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
          .session-scope-row {
            grid-template-columns: 1fr 1fr;
            gap: 8px;
          }
          .modifier-grid {
            grid-template-columns: repeat(4, 1fr);
            gap: 6px;
          }
          .btn-start-session {
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
        .is-android .drill-mode-btn {
          padding: 8px 10px !important;
        }
        .is-android .drill-btn-title {
          font-size: 0.76rem !important;
        }
        .is-android .drill-btn-sub {
          font-size: 0.65rem !important;
        }
        .is-android .scope-chip,
        .is-android .modifier-chip {
          font-size: 0.72rem !important;
          padding: 7px 8px !important;
          min-height: 34px !important;
        }
        .is-android .btn-start-session {
          font-size: 0.88rem !important;
          padding: 10px 14px !important;
        }
      `}</style>
    </div>
  );
};
