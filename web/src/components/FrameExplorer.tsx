import React, { useState, useMemo, useEffect, useCallback, useRef } from 'react';
import { createPortal } from 'react-dom';
import type { CharacterName, Move } from '../types/tekken';
import { CHARACTERS, CHARACTER_DATA } from '../data';
import { matchesMoveQuery } from '../utils/notation';
import {
  Search,
  Play,
  Rocket,
  ShieldAlert,
  Zap,
  X,
  ArrowLeft,
  Info,
  Bookmark,
  Download,
  Upload,
  Check,
  Scissors,
} from 'lucide-react';
import { MoveDetailModal } from './MoveDetailModal';
import {
  loadFavorites,
  saveFavorites,
  exportFavoritesToFile,
  importFavoritesFromFile,
  DEFAULT_FAVORITES,
  type FavoritesMap,
} from '../utils/favorites';

interface FrameExplorerProps {
  onBack?: () => void;
}

interface MoveTableRowProps {
  move: Move;
  isFav: boolean;
  onSelect: (m: Move) => void;
  onPlayVideo: (m: Move) => void;
  onToggleFav: (id: string) => void;
}

// Ultra-fast memoized table row: avoids re-rendering unaffected rows
const MoveTableRow = React.memo<MoveTableRowProps>(({
  move: m,
  isFav,
  onSelect,
  onPlayVideo,
  onToggleFav,
}) => {
  const targetClasses = m.target?.includes('l')
    ? 'target-l'
    : m.target?.includes('m')
    ? 'target-m'
    : 'target-h';

  const blockNum = m.block_num;
  const isPunishable = blockNum !== null && blockNum <= -10;
  const isPlus = blockNum !== null && blockNum > 0;

  return (
    <tr
      className={`row-clickable ${isPunishable ? 'row-punishable' : isPlus ? 'row-plus' : ''}`}
      onClick={() => onSelect(m)}
      title="Klik untuk membuka Opsi Follow-Up Lab (Spreadsheet)"
    >
      <td className="td-video" onClick={(e) => e.stopPropagation()}>
        {m.video_url ? (
          <button
            type="button"
            className="btn-play-clip"
            onClick={() => onPlayVideo(m)}
            title={m.is_string_video ? `Video dari full string: ${m.video_string_parent} (Gerakan ini: ${m.input})` : "Lihat Video Klip"}
          >
            <Play size={12} />
          </button>
        ) : (
          <span className="no-clip">-</span>
        )}
      </td>
      <td className="td-fav" onClick={(e) => e.stopPropagation()}>
        <button
          type="button"
          className={`btn-fav-toggle ${isFav ? 'is-active' : ''}`}
          onClick={() => onToggleFav(m.id)}
          title={isFav ? 'Hapus dari Gerakan Favorit' : 'Tandai sebagai Gerakan Favorit'}
        >
          <Bookmark size={13} fill={isFav ? '#ffd700' : 'none'} />
        </button>
      </td>
      <td className="td-input">
        <div style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
          <span className="input-badge">{m.input}</span>
          {m.has_string_extensions && (
            <span
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                color: '#f59e0b',
                padding: '1px 3px',
                borderRadius: '3px',
                background: 'rgba(245, 158, 11, 0.15)',
              }}
              title={`Potongan string: Lawan dapat berhenti di sini atau lanjut ke ${m.string_extension_sample || '...'}`}
            >
              <Scissors size={10} />
            </span>
          )}
        </div>
      </td>
      <td className="td-name">
        <div className="name-cell">
          <span className="name-text">{m.name}</span>
          {m.is_launcher && <span className="pill-launcher">Launcher</span>}
        </div>
      </td>
      <td className="td-target">
        {m.target ? <span className={targetClasses}>{m.target}</span> : '-'}
      </td>
      <td className="td-dmg">{m.damage || '-'}</td>
      <td className="td-speed">{m.startup || '-'}</td>
      <td className={`td-block ${isPunishable ? 'text-crimson font-bold' : isPlus ? 'text-cyan font-bold' : ''}`}>
        <span className="frame-val-wrap">
          <span>{m.block || '-'}</span>
          {m.block_tooltip && (
            <span className="wiki-tooltip-icon" title={m.block_tooltip}>
              <Info size={10} />
            </span>
          )}
        </span>
      </td>
      <td className="td-hit">
        <span className="frame-val-wrap">
          <span>{m.hit || '-'}</span>
          {m.hit_tooltip && (
            <span className="wiki-tooltip-icon" title={m.hit_tooltip}>
              <Info size={10} />
            </span>
          )}
        </span>
      </td>
      <td className="td-ch">
        <span className="frame-val-wrap">
          <span>{m.ch || '-'}</span>
          {m.ch_tooltip && (
            <span className="wiki-tooltip-icon" title={m.ch_tooltip}>
              <Info size={10} />
            </span>
          )}
        </span>
      </td>
    </tr>
  );
});

MoveTableRow.displayName = 'MoveTableRow';

export const FrameExplorer: React.FC<FrameExplorerProps> = ({ onBack }) => {
  const [selectedChar, setSelectedChar] = useState<CharacterName>('Jin');
  const [searchQuery, setSearchQuery] = useState('');
  const [filterType, setFilterType] = useState<string>('all');
  const [visibleCount, setVisibleCount] = useState<number>(60);

  // Favorites state (persisted to data/favorites.json)
  const [favorites, setFavorites] = useState<FavoritesMap>(DEFAULT_FAVORITES);
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [charTabFilter, setCharTabFilter] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Modals state
  const [selectedDetailMove, setSelectedDetailMove] = useState<Move | null>(null);
  const [previewVideoMove, setPreviewVideoMove] = useState<Move | null>(null);

  const moves = CHARACTER_DATA[selectedChar] || [];

  // Load favorites on mount from file/api
  useEffect(() => {
    loadFavorites().then(setFavorites);
  }, []);

  // Quick toast helper
  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3000);
  };

  // Set of favorite IDs for current character
  const currentCharFavs = useMemo(() => {
    return new Set(favorites[selectedChar] || []);
  }, [favorites, selectedChar]);

  // Filtered characters for top tab bar
  const visibleChars = useMemo(() => {
    if (!charTabFilter.trim()) return CHARACTERS;
    const q = charTabFilter.toLowerCase().trim();
    return CHARACTERS.filter((c) => c.name.toLowerCase().includes(q));
  }, [charTabFilter]);

  // Toggle favorite for a move
  const handleToggleFav = useCallback((moveId: string) => {
    setFavorites((prev) => {
      const list = prev[selectedChar] || [];
      const exists = list.includes(moveId);
      const updated = exists ? list.filter((id) => id !== moveId) : [...list, moveId];
      const next: FavoritesMap = { ...prev, [selectedChar]: updated };
      saveFavorites(next); // writes directly to data/favorites.json!
      return next;
    });
  }, [selectedChar]);

  // Export favorites to JSON file
  const handleExportJson = () => {
    exportFavoritesToFile(favorites);
    showToast('File favorites.json berhasil di-download!');
  };

  // Import favorites from JSON file
  const handleImportJson = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const loaded = await importFavoritesFromFile(file);
      setFavorites(loaded);
      await saveFavorites(loaded);
      showToast('Daftar favorit berhasil diperbarui dari file!');
    } catch (err) {
      alert(String(err));
    }
    e.target.value = '';
  };

  // Sync state when character changes
  useEffect(() => {
    setVisibleCount(60);
    setSearchQuery('');
    setFilterType('all');
    setSelectedDetailMove(null);
  }, [selectedChar]);

  const filteredMoves = useMemo(() => {
    return moves.filter((m) => {
      // Smart Tekken notation and name search
      if (!matchesMoveQuery(m, searchQuery)) return false;

      // Filter types
      if (filterType === 'favorites') {
        return currentCharFavs.has(m.id);
      } else if (filterType === 'punishable') {
        return m.is_punishable;
      } else if (filterType === 'plus-block') {
        return m.is_plus_on_block;
      } else if (filterType === 'launchers') {
        return m.is_launcher;
      } else if (filterType === 'lows') {
        return m.is_low;
      } else if (filterType === 'mids') {
        return m.is_mid;
      } else if (filterType === 'highs') {
        return m.is_high;
      } else if (filterType === 'has-video') {
        return !!m.video_url;
      }

      return true;
    });
  }, [moves, searchQuery, filterType, currentCharFavs]);

  const displayedMoves = useMemo(() => {
    return filteredMoves.slice(0, visibleCount);
  }, [filteredMoves, visibleCount]);

  const handleSelectMove = useCallback((m: Move) => {
    setSelectedDetailMove(m);
  }, []);

  const handlePlayVideo = useCallback((m: Move) => {
    setPreviewVideoMove(m);
  }, []);

  const handleSearchChange = (val: string) => {
    setSearchQuery(val);
    setVisibleCount(60);
  };

  const handleFilterChange = (filter: string) => {
    setFilterType(filter);
    setVisibleCount(60);
  };

  return (
    <div className="explorer-container animate-slide-up">
      {/* Top Bar: Back Button, Notification & File Backup Controls */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 8, marginBottom: 8 }}>
        {onBack ? (
          <button
            type="button"
            onClick={onBack}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 6,
              background: '#131622',
              border: '1px solid rgba(255, 255, 255, 0.08)',
              padding: '6px 12px',
              borderRadius: 'var(--radius-sm)',
              fontSize: '0.82rem',
              fontWeight: 700,
              color: 'var(--text-secondary)',
              cursor: 'pointer',
            }}
          >
            <ArrowLeft size={16} />
            <span>Kembali ke Menu Utama</span>
          </button>
        ) : <div />}

        {/* File Actions: Export & Import JSON */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          {toastMessage && (
            <span
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 5,
                background: 'rgba(34, 197, 94, 0.15)',
                color: '#22c55e',
                border: '1px solid rgba(34, 197, 94, 0.3)',
                padding: '4px 10px',
                borderRadius: '4px',
                fontSize: '0.74rem',
                fontWeight: 700,
              }}
            >
              <Check size={13} />
              {toastMessage}
            </span>
          )}

          <input
            type="file"
            ref={fileInputRef}
            onChange={handleImportJson}
            accept=".json"
            style={{ display: 'none' }}
          />

          <button
            type="button"
            className="btn-file-action"
            onClick={() => fileInputRef.current?.click()}
            title="Muat daftar favorit dari file JSON eksternal"
          >
            <Upload size={13} />
            <span>Import JSON</span>
          </button>

          <button
            type="button"
            className="btn-file-action"
            onClick={handleExportJson}
            title="Download salinan file favorit sebagai favorites.json"
          >
            <Download size={13} />
            <span>Export JSON</span>
          </button>
        </div>
      </div>

      {/* Top Controls: Character Switcher */}
      <div className="char-switcher-bar glass-panel">
        <div className="char-switcher-header">
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <span style={{ fontSize: '0.78rem', fontWeight: 800, letterSpacing: '0.05em', color: 'var(--text-muted)', textTransform: 'uppercase' }}>
              Pilih Karakter ({CHARACTERS.length}):
            </span>
            <select
              className="char-dropdown-select"
              value={selectedChar}
              onChange={(e) => setSelectedChar(e.target.value as CharacterName)}
            >
              {CHARACTERS.map((char) => {
                const favCount = (favorites[char.name] || []).length;
                return (
                  <option key={char.name} value={char.name}>
                    {char.name} ({CHARACTER_DATA[char.name]?.length || 0} moves{favCount > 0 ? ` - ★${favCount}` : ''})
                  </option>
                );
              })}
            </select>
          </div>

          <div style={{ position: 'relative', width: '220px' }}>
            <Search size={13} style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
            <input
              type="text"
              className="search-field"
              placeholder="Filter tab karakter..."
              value={charTabFilter}
              onChange={(e) => setCharTabFilter(e.target.value)}
              style={{ padding: '5px 26px 5px 30px', height: '30px', fontSize: '0.78rem' }}
            />
            {charTabFilter && (
              <button
                type="button"
                onClick={() => setCharTabFilter('')}
                style={{ position: 'absolute', right: 8, top: '50%', transform: 'translateY(-50%)', background: 'transparent', border: 'none', color: 'var(--text-muted)', cursor: 'pointer' }}
              >
                <X size={12} />
              </button>
            )}
          </div>
        </div>

        <div className="char-tabs">
          {visibleChars.map((char) => {
            const charFavCount = (favorites[char.name] || []).length;
            return (
              <button
                key={char.name}
                id={`tab-explorer-${char.name.toLowerCase()}`}
                className={`char-tab-btn ${selectedChar === char.name ? 'active' : ''}`}
                onClick={() => setSelectedChar(char.name)}
                style={{
                  borderColor: selectedChar === char.name ? char.color : 'transparent',
                }}
              >
                <span className="c-tab-name" style={{ color: selectedChar === char.name ? char.color : '#fff' }}>
                  {char.name}
                </span>
                <span className="c-tab-count">
                  ({CHARACTER_DATA[char.name]?.length || 0})
                  {charFavCount > 0 && (
                    <span style={{ color: '#ffd700', marginLeft: 4 }}>
                      ★{charFavCount}
                    </span>
                  )}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="explorer-filters glass-panel">
        <div className="search-box">
          <Search size={16} className="search-icon" />
          <input
            type="text"
            className="search-field"
            placeholder={`Cari move ${selectedChar} (cth: df+2, 1,1,2, electric, dll)...`}
            value={searchQuery}
            onChange={(e) => handleSearchChange(e.target.value)}
          />
          {searchQuery && (
            <button className="btn-clear" onClick={() => handleSearchChange('')}>
              <X size={14} />
            </button>
          )}
        </div>

        <div className="filter-chips-row">
          <button
            type="button"
            className={`f-chip ${filterType === 'all' ? 'chip-active' : ''}`}
            onClick={() => handleFilterChange('all')}
          >
            Semua ({moves.length})
          </button>

          {/* Favorite Moves Filter Chip */}
          <button
            type="button"
            className={`f-chip chip-gold ${filterType === 'favorites' ? 'chip-active' : ''}`}
            onClick={() => handleFilterChange('favorites')}
          >
            <Bookmark size={13} fill={filterType === 'favorites' ? '#ffd700' : 'none'} />
            Favorit ({currentCharFavs.size})
          </button>

          <button
            type="button"
            className={`f-chip chip-crimson ${filterType === 'punishable' ? 'chip-active' : ''}`}
            onClick={() => handleFilterChange('punishable')}
          >
            <ShieldAlert size={14} />
            Punishable (&le; -10)
          </button>
          <button
            type="button"
            className={`f-chip chip-cyan ${filterType === 'plus-block' ? 'chip-active' : ''}`}
            onClick={() => handleFilterChange('plus-block')}
          >
            <Zap size={14} />
            Plus on Block (&gt; 0)
          </button>
          <button
            type="button"
            className={`f-chip chip-gold ${filterType === 'launchers' ? 'chip-active' : ''}`}
            onClick={() => handleFilterChange('launchers')}
          >
            <Rocket size={14} />
            Launchers
          </button>
          <button
            type="button"
            className={`f-chip ${filterType === 'lows' ? 'chip-active' : ''}`}
            onClick={() => handleFilterChange('lows')}
          >
            Lows
          </button>
          <button
            type="button"
            className={`f-chip ${filterType === 'mids' ? 'chip-active' : ''}`}
            onClick={() => handleFilterChange('mids')}
          >
            Mids
          </button>
          <button
            type="button"
            className={`f-chip ${filterType === 'has-video' ? 'chip-active' : ''}`}
            onClick={() => handleFilterChange('has-video')}
          >
            <Play size={13} />
            Dengan Video
          </button>
        </div>
      </div>

      {/* Main Full-Width Table */}
      <div
        className="table-wrapper glass-panel"
        onScroll={(e) => {
          const { scrollTop, scrollHeight, clientHeight } = e.currentTarget;
          if (scrollHeight - scrollTop - clientHeight < 200 && visibleCount < filteredMoves.length) {
            setVisibleCount((prev) => Math.min(prev + 50, filteredMoves.length));
          }
        }}
      >
        <table className="frame-table">
          <thead>
            <tr>
              <th className="th-video" style={{ width: '40px' }}>Clip</th>
              <th className="th-fav" style={{ width: '38px' }}>Fav</th>
              <th className="th-input" style={{ width: '105px' }}>Notasi Input</th>
              <th className="th-name">Nama Gerakan</th>
              <th className="th-target" style={{ width: '65px' }}>Target</th>
              <th className="th-dmg" style={{ width: '75px' }}>Damage</th>
              <th className="th-speed" style={{ width: '75px' }}>Startup</th>
              <th className="th-block" style={{ width: '85px' }}>Block</th>
              <th className="th-hit" style={{ width: '75px' }}>Hit</th>
              <th className="th-ch" style={{ width: '75px' }}>Counter Hit</th>
            </tr>
          </thead>
          <tbody>
            {filteredMoves.length === 0 ? (
              <tr>
                <td colSpan={10} className="td-empty">
                  {filterType === 'favorites'
                    ? `Belum ada gerakan favorit untuk ${selectedChar}. Klik ikon bookmark/bintang pada baris gerakan untuk menambahkan.`
                    : 'Tidak ada gerakan yang cocok dengan filter atau pencarian.'}
                </td>
              </tr>
            ) : (
              displayedMoves.map((m) => (
                <MoveTableRow
                  key={m.id}
                  move={m}
                  isFav={currentCharFavs.has(m.id)}
                  onSelect={handleSelectMove}
                  onPlayVideo={handlePlayVideo}
                  onToggleFav={handleToggleFav}
                />
              ))
            )}
            {filteredMoves.length > visibleCount && (
              <tr>
                <td colSpan={10} className="td-load-more">
                  <button
                    type="button"
                    className="btn-load-more"
                    onClick={() => setVisibleCount((prev) => prev + 50)}
                  >
                    Muat lebih banyak ({filteredMoves.length - visibleCount} gerakan lagi)...
                  </button>
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Video Preview Modal for Main Table (Fixed in viewport center) */}
      {previewVideoMove && previewVideoMove.video_url &&
        createPortal(
          <div className="modal-backdrop" onClick={() => setPreviewVideoMove(null)}>
            <div className="video-modal-card" onClick={(e) => e.stopPropagation()}>
              <div className="v-modal-header">
                <div className="v-modal-title">
                  <span className="v-char">{selectedChar}:</span>
                  <span className="v-name">{previewVideoMove.name}</span>
                  <span className="v-input">({previewVideoMove.input})</span>
                </div>
                <button
                  type="button"
                  className="btn-close-modal"
                  onClick={() => setPreviewVideoMove(null)}
                  title="Tutup"
                >
                  <X size={18} />
                </button>
              </div>

              <div className="v-player-container">
                <video
                  src={previewVideoMove.video_url}
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
                  <span className="f-val text-cyan">{previewVideoMove.startup || 'N/A'}</span>
                </div>
                <div className="footer-stat">
                  <span className="f-lbl">Block</span>
                  <span className={`f-val ${(previewVideoMove.block_num ?? 0) < 0 ? 'text-crimson' : 'text-cyan'}`}>
                    {previewVideoMove.block || 'N/A'}
                  </span>
                </div>
                <div className="footer-stat">
                  <span className="f-lbl">Hit</span>
                  <span className="f-val">{previewVideoMove.hit || 'N/A'}</span>
                </div>
                <div className="footer-stat">
                  <span className="f-lbl">Damage</span>
                  <span className="f-val text-gold">{previewVideoMove.damage || 'N/A'}</span>
                </div>
              </div>
            </div>
          </div>,
          document.body
        )}

      {/* Pop-up Follow-up Spreadsheet Modal (When user clicks any move row) */}
      {selectedDetailMove && (
        <MoveDetailModal
          move={selectedDetailMove}
          allCharacterMoves={moves}
          characterName={selectedChar}
          favorites={currentCharFavs}
          onToggleFavorite={handleToggleFav}
          onClose={() => setSelectedDetailMove(null)}
        />
      )}
    </div>
  );
};
