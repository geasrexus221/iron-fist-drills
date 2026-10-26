import React, { useState, useMemo, useEffect } from 'react';
import { createPortal } from 'react-dom';
import type { CharacterName, Move } from '../types/tekken';
import {
  X,
  ArrowLeft,
  Search,
  Zap,
  Shield,
  CheckCircle2,
  Flame,
  ExternalLink,
  Play,
  Info,
  Bookmark,
} from 'lucide-react';

export interface MoveDetailModalProps {
  move: Move;
  allCharacterMoves: Move[];
  characterName: CharacterName;
  onClose: () => void;
  onSelectMove?: (move: Move) => void;
  favorites?: Set<string>;
  onToggleFavorite?: (id: string) => void;
}

type FrameScenario = 'hit' | 'block' | 'ch';
type FollowupFilter = 'all' | 'neutral' | 'favorites' | 'mid' | 'high' | 'low' | 'launcher' | 'clean-only';

export const MoveDetailModal: React.FC<MoveDetailModalProps> = ({
  move: initialMove,
  allCharacterMoves,
  characterName,
  onClose,
  onSelectMove,
  favorites,
  onToggleFavorite,
}) => {
  // Navigation stack to explore flowcharts
  const [history, setHistory] = useState<Move[]>([initialMove]);
  const currentMove = history[history.length - 1];

  // Opponent reaction speed benchmark (default 10 = standard i10 jab)
  const [opponentSpeed, setOpponentSpeed] = useState<number>(10);

  // Filters for follow-ups
  const [followupFilter, setFollowupFilter] = useState<FollowupFilter>('neutral');
  const [searchFilter, setSearchFilter] = useState('');
  const [visibleCount, setVisibleCount] = useState<number>(50);

  // Video preview inside followup modal
  const [previewVideo, setPreviewVideo] = useState<Move | null>(null);

  // Synchronize when initialMove changes
  useEffect(() => {
    setHistory([initialMove]);
    setSearchFilter('');
    setFollowupFilter('neutral');
    setVisibleCount(50);
  }, [initialMove.id]);

  // Close on Escape key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        if (previewVideo) {
          setPreviewVideo(null);
        } else {
          onClose();
        }
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [previewVideo, onClose]);

  // Parse numerical advantage from move fields
  const parseNum = (valStr?: string | null, valNum?: number | null): number | null => {
    if (valNum !== null && valNum !== undefined) return valNum;
    if (!valStr) return null;
    const match = valStr.match(/([+-]?\d+)/);
    return match ? parseInt(match[1], 10) : null;
  };

  const hitAdvantage = parseNum(currentMove.hit, currentMove.hit_num);
  const blockAdvantage = parseNum(currentMove.block, currentMove.block_num);
  const chAdvantage = parseNum(currentMove.ch, currentMove.ch_num);

  // Default scenario selection: prefer positive advantage (hit or block)
  const [scenario, setScenario] = useState<FrameScenario>(() => {
    if (hitAdvantage !== null && hitAdvantage > 0) return 'hit';
    if (blockAdvantage !== null && blockAdvantage > 0) return 'block';
    if (hitAdvantage !== null) return 'hit';
    if (blockAdvantage !== null) return 'block';
    return 'hit';
  });

  useEffect(() => {
    if (hitAdvantage !== null && hitAdvantage > 0) setScenario('hit');
    else if (blockAdvantage !== null && blockAdvantage > 0) setScenario('block');
    else if (hitAdvantage !== null) setScenario('hit');
    else if (blockAdvantage !== null) setScenario('block');
  }, [currentMove.id]);

  // Active advantage based on scenario
  const currentAdvantage = useMemo(() => {
    if (scenario === 'hit') return hitAdvantage;
    if (scenario === 'block') return blockAdvantage;
    if (scenario === 'ch') return chAdvantage;
    return null;
  }, [scenario, hitAdvantage, blockAdvantage, chAdvantage]);

  // Max startup of player's move that beats or trades with opponent
  // Opponent attack lands at: advantage + opponentSpeed
  const opponentArrival = currentAdvantage !== null ? currentAdvantage + opponentSpeed : null;

  // Calculate available follow-ups
  const followups = useMemo(() => {
    if (currentAdvantage === null || opponentArrival === null || opponentArrival < 10) {
      return [];
    }

    return allCharacterMoves
      .filter((m) => {
        // Exclude current move itself if identical
        if (m.id === currentMove.id) return false;
        if (!m.startup_num) return false;

        // Must start up within the arrival window
        return m.startup_num >= 10 && m.startup_num <= opponentArrival;
      })
      .map((m) => {
        const diff = opponentArrival - (m.startup_num || 10);
        return {
          move: m,
          diff,
          isCleanBeat: diff > 0,
          isTrade: diff === 0,
        };
      })
      .sort((a, b) => {
        // Sort by startup speed (fastest first), then by damage
        if ((a.move.startup_num || 0) !== (b.move.startup_num || 0)) {
          return (a.move.startup_num || 0) - (b.move.startup_num || 0);
        }
        return (parseInt(b.move.damage || '0') || 0) - (parseInt(a.move.damage || '0') || 0);
      });
  }, [allCharacterMoves, currentMove, currentAdvantage, opponentArrival]);

  // Apply filters on followups
  const filteredFollowups = useMemo(() => {
    return followups.filter((item) => {
      const m = item.move;

      // Text search
      if (searchFilter) {
        const q = searchFilter.toLowerCase();
        const matchesInput = m.input.toLowerCase().includes(q);
        const matchesName = m.name.toLowerCase().includes(q);
        if (!matchesInput && !matchesName) return false;
      }

      // Category filters
      if (followupFilter === 'neutral') {
        const inp = m.input;
        const isStringFollowup = inp.startsWith(currentMove.input + ',');
        if (isStringFollowup) return false;
      } else if (followupFilter === 'clean-only') {
        if (!item.isCleanBeat) return false;
      } else if (followupFilter === 'mid') {
        if (!m.is_mid && !m.target?.toLowerCase().includes('m')) return false;
      } else if (followupFilter === 'high') {
        if (!m.is_high && !m.target?.toLowerCase().includes('h')) return false;
      } else if (followupFilter === 'low') {
        if (!m.is_low && !m.target?.toLowerCase().includes('l')) return false;
      } else if (followupFilter === 'launcher') {
        if (!m.is_launcher) return false;
      } else if (followupFilter === 'favorites') {
        if (!favorites?.has(m.id)) return false;
      }

      return true;
    });
  }, [followups, followupFilter, searchFilter, currentMove]);

  const displayedFollowups = useMemo(() => {
    return filteredFollowups.slice(0, visibleCount);
  }, [filteredFollowups, visibleCount]);

  // Navigate to inspect a follow-up move
  const handleInspectMove = (m: Move) => {
    setHistory((prev) => [...prev, m]);
    setSearchFilter('');
    setFollowupFilter('neutral');
    setVisibleCount(50);
    if (onSelectMove) {
      onSelectMove(m);
    }
  };

  const handleBackHistory = () => {
    if (history.length > 1) {
      const prevMove = history[history.length - 2];
      setHistory((prev) => prev.slice(0, -1));
      if (onSelectMove) {
        onSelectMove(prevMove);
      }
    }
  };

  return createPortal(
    <div className="modal-backdrop" onClick={onClose}>
      <div className="sheet-modal-card animate-slide-up" onClick={(e) => e.stopPropagation()}>
        {/* Header Bar: Clean, Compact & Responsively Wrapping */}
        <div className="sheet-header">
          <div className="sheet-header-left">
            {history.length > 1 && (
              <button
                type="button"
                className="btn-history-back"
                onClick={handleBackHistory}
                title="Kembali ke move sebelumnya"
              >
                <ArrowLeft size={14} />
                <span>Kembali</span>
              </button>
            )}
            <span className="char-badge">{characterName}</span>
            <div className="main-move-info">
              <span className="main-move-input">{currentMove.input}</span>
              <span className="main-move-name">{currentMove.name}</span>
            </div>

            {/* Quick Stats Strip */}
            <div className="quick-stats-strip">
              <span className="q-stat">
                Startup: <strong className="text-cyan">{currentMove.startup || (currentMove.startup_num ? `i${currentMove.startup_num}` : '-')}</strong>
              </span>
              <span className="q-stat">
                Block: <strong className={(currentMove.block_num ?? 0) > 0 ? 'text-cyan' : (currentMove.block_num ?? 0) <= -10 ? 'text-crimson' : 'text-amber'}>{currentMove.block || '-'}</strong>
                {currentMove.block_tooltip && (
                  <span className="wiki-tooltip-icon" title={currentMove.block_tooltip}>
                    <Info size={9} />
                  </span>
                )}
              </span>
              <span className="q-stat">
                Hit: <strong className={(currentMove.hit_num ?? 0) > 0 ? 'text-green' : 'text-secondary'}>{currentMove.hit || '-'}</strong>
                {currentMove.hit_tooltip && (
                  <span className="wiki-tooltip-icon" title={currentMove.hit_tooltip}>
                    <Info size={9} />
                  </span>
                )}
              </span>
              {currentMove.ch && (
                <span className="q-stat">
                  CH: <strong className="text-gold">{currentMove.ch}</strong>
                  {currentMove.ch_tooltip && (
                    <span className="wiki-tooltip-icon" title={currentMove.ch_tooltip}>
                      <Info size={9} />
                    </span>
                  )}
                </span>
              )}
              <span className="q-stat">Dmg: <strong>{currentMove.damage || '-'}</strong></span>
              {currentMove.target && <span className={`target-mini-pill target-${currentMove.target.toLowerCase()}`}>{currentMove.target}</span>}
              {currentMove.is_launcher && <span className="launcher-mini-pill">Launcher</span>}
            </div>
          </div>

          <button
            type="button"
            className="btn-sheet-close"
            onClick={onClose}
            title="Tutup (ESC)"
          >
            <X size={18} />
          </button>
        </div>

        {/* Controls Toolbar: Scenarios, Speed, Formula (Flows Downward on smaller screens) */}
        <div className="sheet-toolbar">
          <div className="toolbar-left">
            <div className="scenario-pills">
              <button
                type="button"
                className={`scenario-pill ${scenario === 'hit' ? 'active' : ''}`}
                onClick={() => setScenario('hit')}
                disabled={hitAdvantage === null}
              >
                <CheckCircle2 size={13} />
                <span>On Hit ({currentMove.hit || 'N/A'})</span>
              </button>
              <button
                type="button"
                className={`scenario-pill ${scenario === 'block' ? 'active' : ''}`}
                onClick={() => setScenario('block')}
                disabled={blockAdvantage === null}
              >
                <Shield size={13} />
                <span>On Block ({currentMove.block || 'N/A'})</span>
              </button>
              {chAdvantage !== null && (
                <button
                  type="button"
                  className={`scenario-pill ${scenario === 'ch' ? 'active' : ''}`}
                  onClick={() => setScenario('ch')}
                >
                  <Flame size={13} />
                  <span>On CH ({currentMove.ch})</span>
                </button>
              )}
            </div>

            <div className="opp-speed-wrap">
              <span className="opp-speed-label">vs Serangan Lawan:</span>
              <select
                value={opponentSpeed}
                onChange={(e) => setOpponentSpeed(Number(e.target.value))}
                className="opp-speed-select"
              >
                <option value={10}>i10 Jab (Standar Universal)</option>
                <option value={11}>i11 ws4 / Magic 4</option>
                <option value={12}>i12 Dickjab / Mid Check</option>
                <option value={14}>i14 Mid Launcher</option>
                <option value={15}>i15 Hopkick / Launcher</option>
              </select>
            </div>
          </div>

          {currentAdvantage !== null && opponentArrival !== null && (
            <div className="formula-inline">
              <Zap size={13} className="text-amber" />
              <span>
                Keuntungan <strong className="text-green">+{currentAdvantage}F</strong> + Lawan <strong>i{opponentSpeed}</strong> = Lawan mendarat di <strong>Frame {opponentArrival}</strong>.
                Rentang follow-up: <strong className="text-cyan">i10 s/d i{opponentArrival}</strong>
              </span>
            </div>
          )}
        </div>

        {/* Filter and Search Bar */}
        <div className="sheet-filter-bar">
          <div className="filter-chips-group">
            <button
              type="button"
              className={`sheet-filter-chip ${followupFilter === 'neutral' ? 'active' : ''}`}
              onClick={() => { setFollowupFilter('neutral'); setVisibleCount(50); }}
              title="Hanya gerakan pembuka netral (bukan lanjutan string dari move ini)"
            >
              Starter Mandiri
            </button>
            <button
              type="button"
              className={`sheet-filter-chip ${followupFilter === 'all' ? 'active' : ''}`}
              onClick={() => { setFollowupFilter('all'); setVisibleCount(50); }}
            >
              Semua Move ({followups.length})
            </button>
            <button
              type="button"
              className={`sheet-filter-chip chip-green ${followupFilter === 'clean-only' ? 'active' : ''}`}
              onClick={() => { setFollowupFilter('clean-only'); setVisibleCount(50); }}
            >
              Clean Beat
            </button>
            <button
              type="button"
              className={`sheet-filter-chip ${followupFilter === 'mid' ? 'active' : ''}`}
              onClick={() => { setFollowupFilter('mid'); setVisibleCount(50); }}
            >
              Mid (Anti-Duck)
            </button>
            <button
              type="button"
              className={`sheet-filter-chip ${followupFilter === 'launcher' ? 'active' : ''}`}
              onClick={() => { setFollowupFilter('launcher'); setVisibleCount(50); }}
            >
              Launcher
            </button>
            <button
              type="button"
              className={`sheet-filter-chip ${followupFilter === 'low' ? 'active' : ''}`}
              onClick={() => { setFollowupFilter('low'); setVisibleCount(50); }}
            >
              Low Mixup
            </button>
            {favorites && favorites.size > 0 && (
              <button
                type="button"
                className={`sheet-filter-chip chip-gold ${followupFilter === 'favorites' ? 'active' : ''}`}
                onClick={() => { setFollowupFilter('favorites'); setVisibleCount(50); }}
              >
                <Bookmark size={12} fill={followupFilter === 'favorites' ? '#ffd700' : 'none'} />
                Favorit Saja ({followups.filter((f) => favorites.has(f.move.id)).length})
              </button>
            )}
          </div>

          <div className="sheet-search-wrap">
            <Search size={13} className="sheet-search-icon" />
            <input
              type="text"
              className="sheet-search-input"
              placeholder="Cari move follow-up..."
              value={searchFilter}
              onChange={(e) => { setSearchFilter(e.target.value); setVisibleCount(50); }}
            />
            {searchFilter && (
              <button
                type="button"
                className="btn-sheet-clear"
                onClick={() => setSearchFilter('')}
              >
                <X size={12} />
              </button>
            )}
          </div>
        </div>

        {/* Spreadsheet Table: Full Width, Wraps Downward */}
        <div
          className="sheet-table-container"
          onScroll={(e) => {
            const { scrollTop, scrollHeight, clientHeight } = e.currentTarget;
            if (scrollHeight - scrollTop - clientHeight < 200 && visibleCount < filteredFollowups.length) {
              setVisibleCount((prev) => Math.min(prev + 40, filteredFollowups.length));
            }
          }}
        >
          {filteredFollowups.length === 0 ? (
            <div className="sheet-empty">
              <span>Tidak ada gerakan yang cocok dengan filter atau rentang frame ini.</span>
            </div>
          ) : (
            <table className="sheet-table">
              <thead>
                <tr>
                  <th className="th-video" style={{ width: '40px' }}>Clip</th>
                  <th className="th-fav" style={{ width: '36px' }}>Fav</th>
                  <th style={{ width: '105px' }}>Input</th>
                  <th>Nama Gerakan</th>
                  <th style={{ width: '65px' }}>Target</th>
                  <th style={{ width: '75px' }}>Startup</th>
                  <th style={{ width: '135px' }}>Selisih vs Lawan</th>
                  <th style={{ width: '75px' }}>On Block</th>
                  <th style={{ width: '65px' }}>Dmg</th>
                  <th style={{ width: '120px' }}>Properti</th>
                  <th style={{ width: '50px', textAlign: 'center' }}>Lab</th>
                </tr>
              </thead>
              <tbody>
                {displayedFollowups.map(({ move: m, diff, isCleanBeat, isTrade }) => {
                  const isMid = m.is_mid || m.target?.toLowerCase().includes('m');
                  const isLow = m.is_low || m.target?.toLowerCase().includes('l');
                  const targetLabel = isMid ? 'Mid' : isLow ? 'Low' : 'High';
                  const targetClass = isMid ? 'target-m' : isLow ? 'target-l' : 'target-h';

                  const blockNum = m.block_num;
                  const isPunishable = blockNum !== null && blockNum <= -10;
                  const isPlus = blockNum !== null && blockNum > 0;

                  return (
                    <tr
                      key={m.id}
                      className="sheet-row"
                      onClick={() => handleInspectMove(m)}
                      title="Klik untuk membuka & menganalisis move ini"
                    >
                      <td className="td-video" onClick={(e) => e.stopPropagation()}>
                        {m.video_url ? (
                          <button
                            type="button"
                            className="btn-play-clip"
                            onClick={() => setPreviewVideo(m)}
                            title="Tonton Video Gerakan Ini"
                          >
                            <Play size={11} />
                          </button>
                        ) : (
                          <span className="no-clip">-</span>
                        )}
                      </td>
                      <td className="td-fav" onClick={(e) => e.stopPropagation()}>
                        {onToggleFavorite && (
                          <button
                            type="button"
                            className={`btn-fav-toggle ${favorites?.has(m.id) ? 'is-active' : ''}`}
                            onClick={() => onToggleFavorite(m.id)}
                            title={favorites?.has(m.id) ? 'Hapus dari Favorit' : 'Tandai sebagai Favorit'}
                          >
                            <Bookmark size={12} fill={favorites?.has(m.id) ? '#ffd700' : 'none'} />
                          </button>
                        )}
                      </td>
                      <td className="td-input">
                        <span className="sheet-input-badge">{m.input}</span>
                      </td>
                      <td className="td-name">
                        <span className="sheet-move-name">{m.name}</span>
                      </td>
                      <td className="td-target">
                        <span className={`sheet-target-badge ${targetClass}`}>{targetLabel}</span>
                      </td>
                      <td className="td-startup">
                        <strong className="text-cyan">
                          {m.startup || (m.startup_num ? `i${m.startup_num}` : '-')}
                        </strong>
                      </td>
                      <td className="td-diff">
                        {isCleanBeat ? (
                          <span className="diff-pill pill-faster">
                            +{diff}F Lebih Cepat
                          </span>
                        ) : isTrade ? (
                          <span className="diff-pill pill-trade">
                            Trade 0F
                          </span>
                        ) : (
                          <span className="diff-pill pill-slower">
                            -{Math.abs(diff)}F Lebih Lambat
                          </span>
                        )}
                      </td>
                      <td className="td-block">
                        <span className="frame-val-wrap">
                          <span className={isPunishable ? 'text-crimson font-bold' : isPlus ? 'text-cyan font-bold' : 'text-secondary'}>
                            {m.block || '-'}
                          </span>
                          {m.block_tooltip && (
                            <span className="wiki-tooltip-icon" title={m.block_tooltip}>
                              <Info size={10} />
                            </span>
                          )}
                        </span>
                      </td>
                      <td className="td-damage">
                        <span className="text-gold font-bold">{m.damage || '-'}</span>
                      </td>
                      <td className="td-props">
                        <div className="props-wrap">
                          {m.is_launcher && <span className="prop-badge prop-launch">Launcher</span>}
                          {!isPunishable && isMid && <span className="prop-badge prop-safe">Safe Mid</span>}
                          {isLow && <span className="prop-badge prop-low">Low</span>}
                        </div>
                      </td>
                      <td className="td-link" style={{ textAlign: 'center' }}>
                        <button
                          type="button"
                          className="btn-table-inspect"
                          title="Analisis move ini"
                        >
                          <ExternalLink size={13} />
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
          {filteredFollowups.length > visibleCount && (
            <div style={{ textAlign: 'center', padding: '10px' }}>
              <button
                type="button"
                className="btn-load-more"
                onClick={() => setVisibleCount((prev) => prev + 40)}
              >
                Muat lebih banyak ({filteredFollowups.length - visibleCount} opsi tersisa)...
              </button>
            </div>
          )}
        </div>

        {/* Footer info note */}
        <div className="sheet-footer">
          <span className="sheet-footer-text">
            <strong>Tips:</strong> Klik baris gerakan mana saja di spreadsheet untuk langsung menganalisis opsi lanjutan berikutnya.
          </span>
          <span className="sheet-footer-count">
            Total Opsi: <strong>{filteredFollowups.length}</strong> gerakan
          </span>
        </div>
      </div>

      {/* Video Preview Modal inside Follow-up Spreadsheet */}
      {previewVideo && previewVideo.video_url && (
        <div
          className="modal-backdrop"
          style={{ zIndex: 1200 }}
          onClick={(e) => {
            e.stopPropagation();
            setPreviewVideo(null);
          }}
        >
          <div className="video-modal-card" onClick={(e) => e.stopPropagation()}>
            <div className="v-modal-header">
              <div className="v-modal-title" style={{ display: 'flex', alignItems: 'center', flexWrap: 'wrap', gap: 6 }}>
                <span className="v-char">{characterName}:</span>
                <span className="v-name">{previewVideo.name}</span>
                <span className="v-input">({previewVideo.input})</span>
                {previewVideo.is_string_video && (
                  <span
                    style={{
                      background: 'rgba(245, 158, 11, 0.15)',
                      border: '1px solid rgba(245, 158, 11, 0.4)',
                      color: '#f59e0b',
                      fontSize: '0.68rem',
                      fontWeight: 800,
                      padding: '2px 8px',
                      borderRadius: '4px',
                    }}
                  >
                    Klip Rangkaian: {previewVideo.video_string_parent} (Fokus s/d: {previewVideo.input})
                  </span>
                )}
              </div>
              <button
                type="button"
                className="btn-close-modal"
                onClick={() => setPreviewVideo(null)}
                title="Tutup Video"
              >
                <X size={18} />
              </button>
            </div>

            <div className="v-player-container">
              <video
                src={previewVideo.video_url}
                autoPlay
                loop
                controls
                playsInline
                className="modal-video-element"
              />
            </div>

            <div className="v-modal-footer">
              <div className="footer-stat">
                <span className="f-lbl">Startup</span>
                <span className="f-val text-cyan">{previewVideo.startup || 'N/A'}</span>
              </div>
              <div className="footer-stat">
                <span className="f-lbl">Block</span>
                <span className={`f-val ${(previewVideo.block_num ?? 0) < 0 ? 'text-crimson' : 'text-cyan'}`}>
                  {previewVideo.block || 'N/A'}
                </span>
              </div>
              <div className="footer-stat">
                <span className="f-lbl">Hit</span>
                <span className="f-val">{previewVideo.hit || 'N/A'}</span>
              </div>
              <div className="footer-stat">
                <span className="f-lbl">Damage</span>
                <span className="f-val text-gold">{previewVideo.damage || 'N/A'}</span>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>,
    document.body
  );
};
