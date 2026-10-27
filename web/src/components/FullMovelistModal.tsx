import React, { useState, useMemo, useEffect } from 'react';
import { createPortal } from 'react-dom';
import type { Move, CharacterName } from '../types/tekken';
import { CHARACTER_DATA } from '../data';
import { matchesMoveQuery, formatStartup } from '../utils/notation';
import { isThrowMove } from '../utils/engine';
import { useDeviceType } from '../hooks/useDeviceType';
import { Search, X, Rocket, ArrowLeft, Shield } from 'lucide-react';

interface FullMovelistModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectMove: (move: Move | null) => void;
  character: CharacterName;
  hintMinusFrames?: number;
}

export const FullMovelistModal: React.FC<FullMovelistModalProps> = ({
  isOpen,
  onClose,
  onSelectMove,
  character,
  hintMinusFrames,
}) => {
  const { isMobile } = useDeviceType();
  const [searchTerm, setSearchTerm] = useState('');
  const [speedFilter, setSpeedFilter] = useState<string>('all');
  const [visibleCount, setVisibleCount] = useState<number>(40);

  // Close on Escape key
  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  const moves = CHARACTER_DATA[character] || [];

  const filteredMoves = useMemo(() => {
    return moves.filter((m) => {
      // Exclude throws from punish selection
      if (isThrowMove(m)) return false;

      // Smart Tekken notation and name search
      if (!matchesMoveQuery(m, searchTerm)) return false;

      // Speed filter
      if (speedFilter === 'i10') {
        return m.startup_num === 10;
      } else if (speedFilter === 'i11-12') {
        return m.startup_num !== null && m.startup_num >= 11 && m.startup_num <= 12;
      } else if (speedFilter === 'i13-14') {
        return m.startup_num !== null && m.startup_num >= 13 && m.startup_num <= 14;
      } else if (speedFilter === 'i15+') {
        return m.startup_num !== null && m.startup_num >= 15;
      } else if (speedFilter === 'launchers') {
        return m.is_launcher;
      }

      return true;
    });
  }, [moves, searchTerm, speedFilter]);

  const displayedMoves = useMemo(() => {
    return filteredMoves.slice(0, visibleCount);
  }, [filteredMoves, visibleCount]);

  if (!isOpen) return null;

  return createPortal(
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal-content movelist-content animate-slide-up" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <div className="header-titles">
            <h2 className="modal-title">
              PILIH MOVE {character.toUpperCase()}
              {hintMinusFrames !== undefined && (
                <span className="hint-pill" style={{ marginLeft: 8, fontSize: '0.74rem' }}>
                  Target: -{hintMinusFrames}f
                </span>
              )}
            </h2>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <button
              type="button"
              className="btn-modal-cancel"
              onClick={onClose}
              title="Tutup & Batal Memilih (ESC)"
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 5,
                background: 'rgba(255, 255, 255, 0.08)',
                border: '1px solid rgba(255, 255, 255, 0.15)',
                color: '#e2e8f0',
                padding: '6px 12px',
                borderRadius: '6px',
                fontSize: '0.8rem',
                fontWeight: 700,
                cursor: 'pointer',
              }}
            >
              <ArrowLeft size={14} />
              <span>{isMobile ? 'Batal' : 'Batal / Tutup (ESC)'}</span>
            </button>
            <button className="btn-close" onClick={onClose} title="Tutup (ESC)">
              <X size={20} />
            </button>
          </div>
        </div>

        {/* Search & Filter Bar */}
        <div className="filter-bar">
          <div className="search-input-wrapper">
            <Search size={16} className="search-icon" />
            <input
              type="text"
              className="search-input"
              placeholder="Cari notasi (cth: df+2, 1,1,2, ff+2) atau nama move..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              autoFocus
            />
            {searchTerm && (
              <button className="btn-clear-search" onClick={() => setSearchTerm('')}>
                <X size={14} />
              </button>
            )}
          </div>

          <div className="filter-chips">
            <button
              className={`chip ${speedFilter === 'all' ? 'chip-active' : ''}`}
              onClick={() => setSpeedFilter('all')}
            >
              Semua ({moves.length})
            </button>
            <button
              className={`chip ${speedFilter === 'i10' ? 'chip-active' : ''}`}
              onClick={() => setSpeedFilter('i10')}
            >
              i10 Jab
            </button>
            <button
              className={`chip ${speedFilter === 'i11-12' ? 'chip-active' : ''}`}
              onClick={() => setSpeedFilter('i11-12')}
            >
              i11 - i12
            </button>
            <button
              className={`chip ${speedFilter === 'i13-14' ? 'chip-active' : ''}`}
              onClick={() => setSpeedFilter('i13-14')}
            >
              i13 - i14
            </button>
            <button
              className={`chip ${speedFilter === 'i15+' ? 'chip-active' : ''}`}
              onClick={() => setSpeedFilter('i15+')}
            >
              i15+
            </button>
            <button
              className={`chip ${speedFilter === 'launchers' ? 'chip-active chip-launcher' : ''}`}
              onClick={() => setSpeedFilter('launchers')}
            >
              <Rocket size={13} />
              Launchers
            </button>

            {hintMinusFrames !== undefined && (
              <button
                type="button"
                className="chip chip-safe"
                style={{
                  background: 'rgba(16, 185, 129, 0.15)',
                  borderColor: 'rgba(16, 185, 129, 0.45)',
                  color: '#10b981',
                  fontWeight: 800,
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 5,
                }}
                onClick={() => {
                  onSelectMove(null);
                  onClose();
                }}
                title="Pilih Safe on Block jika Anda menilai serangan lawan tidak minus / aman"
              >
                <Shield size={13} />
                <span>Safe on Block</span>
              </button>
            )}
          </div>
        </div>

        {/* Moves List Scroll */}
        <div
          className="moves-scroll-list"
          onScroll={(e) => {
            const { scrollTop, scrollHeight, clientHeight } = e.currentTarget;
            if (scrollHeight - scrollTop - clientHeight < 200 && visibleCount < filteredMoves.length) {
              setVisibleCount((prev) => Math.min(prev + 40, filteredMoves.length));
            }
          }}
        >
          {filteredMoves.length === 0 ? (
            <div className="empty-state">
              <span>Tidak ada gerakan yang cocok dengan pencarian "{searchTerm}"</span>
            </div>
          ) : (
            displayedMoves.map((m) => {
              const targetClasses = m.target?.includes('l')
                ? 'target-l'
                : m.target?.includes('m')
                ? 'target-m'
                : 'target-h';

              const isGuaranteed =
                hintMinusFrames !== undefined &&
                m.startup_num !== null &&
                m.startup_num <= hintMinusFrames;

              return (
                <div
                  key={m.id}
                  className={`move-row-card ${isGuaranteed ? 'move-guaranteed' : ''}`}
                  onClick={() => {
                    onSelectMove(m);
                    onClose();
                  }}
                >
                  <div className="row-left">
                    <span className="move-input-badge">{m.input}</span>
                    <div className="move-meta-names">
                      <span className="row-move-name">{m.name}</span>
                      <div className="row-sub-tags">
                        {m.target && <span className={targetClasses}>{m.target}</span>}
                        {m.damage && <span className="tag-dmg">{m.damage} dmg</span>}
                        {m.is_launcher && (
                          <span className="tag-launcher">
                            <Rocket size={11} /> Launcher
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="row-right">
                    <div className="row-frames">
                      <div className="frame-stat">
                        <span className="frame-val">{formatStartup(m.startup, m.startup_num)}</span>
                        <span className="frame-lbl">Startup</span>
                      </div>
                      <div className="frame-stat">
                        <span
                          className={`frame-val ${
                            (m.block_num ?? 0) < 0 ? 'text-crimson' : 'text-cyan'
                          }`}
                        >
                          {m.block || 'N/A'}
                        </span>
                        <span className="frame-lbl">Block</span>
                      </div>
                    </div>

                    <button className="btn-pick-move">Pilih</button>
                  </div>
                </div>
              );
            })
          )}
          {filteredMoves.length > visibleCount && (
            <div style={{ textAlign: 'center', padding: '10px' }}>
              <button
                type="button"
                className="btn-load-more"
                onClick={() => setVisibleCount((prev) => prev + 40)}
              >
                Muat lebih banyak ({filteredMoves.length - visibleCount} tersisa)...
              </button>
            </div>
          )}
        </div>

        {/* Modal Bottom Footer with Move Counter */}
        <div
          style={{
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center',
            padding: '6px 14px',
            borderTop: '1px solid rgba(255, 255, 255, 0.08)',
            background: '#0d101a',
            borderRadius: '0 0 var(--radius-md) var(--radius-md)',
          }}
        >
          <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>
            Menampilkan <strong>{displayedMoves.length}</strong> dari {filteredMoves.length} gerakan {character}
          </span>
        </div>
      </div>
    </div>,
    document.body
  );
};
