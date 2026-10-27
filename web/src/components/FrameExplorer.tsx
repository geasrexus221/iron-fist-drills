import React, { useState, useMemo, useEffect, useCallback, useRef } from 'react';
import { createPortal } from 'react-dom';
import type { CharacterName, Move } from '../types/tekken';
import { CHARACTERS, CHARACTER_DATA } from '../data';
import { matchesMoveQuery, formatStartup, getMoveAttributes } from '../utils/notation';
import {
  Search,
  Play,
  X,
  ArrowLeft,
  Info,
  Bookmark,
  Download,
  Upload,
  Check,
  RotateCcw,
  Settings,
  ChevronUp,
  ChevronDown,
} from 'lucide-react';
import { MoveDetailModal } from './MoveDetailModal';
import { CharacterPickerModal } from './CharacterPickerModal';
import { AttributeGuideModal } from './AttributeGuideModal';
import {
  loadFavorites,
  saveFavorites,
  exportFavoritesToFile,
  importFavoritesFromFile,
  DEFAULT_FAVORITES,
  type FavoritesMap,
} from '../utils/favorites';

export interface ColumnVisibility {
  video: boolean;
  fav: boolean;
  input: boolean;
  name: boolean;
  target: boolean;
  startup: boolean;
  block: boolean;
  hit: boolean;
  attribute: boolean;
  ch: boolean;
}

export const DEFAULT_COLUMN_VISIBILITY: ColumnVisibility = {
  video: true,
  fav: true,
  input: true,
  name: true,
  target: true,
  startup: true,
  block: true,
  hit: true,
  attribute: true,
  ch: true,
};

interface FrameExplorerProps {
  onBack?: () => void;
}

interface MoveTableRowProps {
  move: Move;
  isFav: boolean;
  onSelect: (m: Move) => void;
  onPlayVideo: (m: Move) => void;
  onToggleFav: (id: string) => void;
  columns: ColumnVisibility;
  highlightRows: boolean;
}

// Ultra-fast memoized table row: avoids re-rendering unaffected rows
const MoveTableRow = React.memo<MoveTableRowProps>(({
  move: m,
  isFav,
  onSelect,
  onPlayVideo,
  onToggleFav,
  columns,
  highlightRows,
}) => {
  const targetClasses = m.target?.includes('l')
    ? 'target-l'
    : m.target?.includes('m')
    ? 'target-m'
    : 'target-h';

  const moveAttrs = useMemo(() => getMoveAttributes(m), [m]);

  const blockNum = m.block_num;
  const isPunishable = blockNum !== null && blockNum <= -10;
  const isPlus = blockNum !== null && blockNum > 0;

  const rowHighlightClass = highlightRows
    ? isPunishable
      ? 'row-punishable-highlight'
      : isPlus
      ? 'row-plus-highlight'
      : ''
    : '';

  return (
    <tr
      className={`row-clickable ${rowHighlightClass}`}
      onClick={() => onSelect(m)}
      title="Klik untuk membuka Opsi Follow-Up Lab (Spreadsheet)"
    >
      {columns.video && (
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
      )}

      {columns.fav && (
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
      )}

      {columns.input && (
        <td className="td-input">
          <span className="input-badge">{m.input}</span>
        </td>
      )}

      {columns.name && (
        <td className="td-name">
          <div className="name-cell">
            <span className="name-text">{m.name}</span>
            {m.is_launcher && <span className="pill-launcher">Launcher</span>}
          </div>
        </td>
      )}

      {columns.target && (
        <td className="td-target">
          {m.target ? <span className={targetClasses}>{m.target}</span> : '-'}
        </td>
      )}

      {columns.startup && (
        <td className="td-speed">{formatStartup(m.startup, m.startup_num)}</td>
      )}

      {columns.block && (
        <td className={`td-block ${isPunishable ? 'text-crimson font-bold' : isPlus ? 'text-green font-bold' : ''}`}>
          <span className="frame-val-wrap">
            <span>{m.block || '-'}</span>
            {m.block_tooltip && (
              <span className="wiki-tooltip-icon" title={m.block_tooltip}>
                <Info size={10} />
              </span>
            )}
          </span>
        </td>
      )}

      {columns.hit && (
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
      )}

      {columns.attribute && (
        <td className="td-attr">
          {moveAttrs.length > 0 ? (
            <div className="attr-badges-wrap">
              {moveAttrs.map((b) => (
                <span key={b.code} className={`attr-badge ${b.colorClass}`} title={b.label}>
                  {b.code}
                </span>
              ))}
            </div>
          ) : (
            <span className="no-attr">-</span>
          )}
        </td>
      )}

      {columns.ch && (
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
      )}
    </tr>
  );
});

MoveTableRow.displayName = 'MoveTableRow';

const COLUMN_STORAGE_KEY = 't8_explorer_col_visibility';
const HIGHLIGHT_STORAGE_KEY = 't8_explorer_highlight_rows';

const getInitialColumns = (): ColumnVisibility => {
  try {
    const saved = localStorage.getItem(COLUMN_STORAGE_KEY);
    if (saved) return { ...DEFAULT_COLUMN_VISIBILITY, ...JSON.parse(saved) };
  } catch (e) {
    // fallback
  }
  return DEFAULT_COLUMN_VISIBILITY;
};

const getInitialHighlight = (): boolean => {
  try {
    const saved = localStorage.getItem(HIGHLIGHT_STORAGE_KEY);
    if (saved !== null) return saved === 'true';
  } catch (e) {
    // fallback
  }
  return true;
};

type SortField = 'input' | 'name' | 'target' | 'startup' | 'block' | 'hit' | 'ch';
type SortDirection = 'asc' | 'desc';

interface SortConfig {
  field: SortField;
  direction: SortDirection;
}

export const FrameExplorer: React.FC<FrameExplorerProps> = ({ onBack }) => {
  const [selectedChar, setSelectedChar] = useState<CharacterName>('Jin');
  const [isPickerOpen, setIsPickerOpen] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [columns, setColumns] = useState<ColumnVisibility>(getInitialColumns);
  const [highlightRows, setHighlightRows] = useState<boolean>(getInitialHighlight);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterType, setFilterType] = useState<string>('all');
  const [sortConfig, setSortConfig] = useState<SortConfig | null>(null);

  // Favorites state (persisted to data/favorites.json)
  const [favorites, setFavorites] = useState<FavoritesMap>(DEFAULT_FAVORITES);
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Modals state
  const [selectedDetailMove, setSelectedDetailMove] = useState<Move | null>(null);
  const [previewVideoMove, setPreviewVideoMove] = useState<Move | null>(null);
  const [isAttrGuideOpen, setIsAttrGuideOpen] = useState(false);

  const moves = CHARACTER_DATA[selectedChar] || [];
  const currentCharData = CHARACTERS.find((c) => c.name === selectedChar);

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

  // Settings handlers
  const handleToggleColumn = (key: keyof ColumnVisibility, value: boolean) => {
    setColumns((prev) => {
      const next = { ...prev, [key]: value };
      localStorage.setItem(COLUMN_STORAGE_KEY, JSON.stringify(next));
      return next;
    });
  };

  const handleToggleHighlightRows = (value: boolean) => {
    setHighlightRows(value);
    localStorage.setItem(HIGHLIGHT_STORAGE_KEY, String(value));
  };

  const handleResetSettings = () => {
    setColumns(DEFAULT_COLUMN_VISIBILITY);
    setHighlightRows(true);
    localStorage.setItem(COLUMN_STORAGE_KEY, JSON.stringify(DEFAULT_COLUMN_VISIBILITY));
    localStorage.setItem(HIGHLIGHT_STORAGE_KEY, 'true');
  };

  // Dynamic table minimum width based on active columns
  const tableMinWidth = useMemo(() => {
    let w = 0;
    if (columns.video) w += 40;
    if (columns.fav) w += 38;
    if (columns.input) w += 115;
    if (columns.name) w += 200;
    if (columns.target) w += 70;
    if (columns.startup) w += 80;
    if (columns.block) w += 85;
    if (columns.hit) w += 80;
    if (columns.attribute) w += 110;
    if (columns.ch) w += 80;
    return w;
  }, [columns]);

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
    setSearchQuery('');
    setFilterType('all');
    setSelectedDetailMove(null);
    setSortConfig(null);
  }, [selectedChar]);

  const handleSort = (field: SortField) => {
    setSortConfig((prev) => {
      if (!prev || prev.field !== field) {
        return { field, direction: 'asc' };
      }
      if (prev.direction === 'asc') {
        return { field, direction: 'desc' };
      }
      return null;
    });
  };

  const filteredMoves = useMemo(() => {
    return moves.filter((m) => {
      // Smart Tekken notation and name search
      if (!matchesMoveQuery(m, searchQuery)) return false;

      // Filter types
      if (filterType === 'favorites') {
        return currentCharFavs.has(m.id);
      } else if (filterType === 'punishable') {
        return m.is_punishable;
      } else if (filterType === 'safe-block') {
        return m.block_num !== null && m.block_num >= -9 && m.block_num <= 0;
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

  const sortedMoves = useMemo(() => {
    if (!sortConfig) return filteredMoves;

    const { field, direction } = sortConfig;
    const factor = direction === 'asc' ? 1 : -1;

    return [...filteredMoves].sort((a, b) => {
      if (field === 'input') {
        return factor * a.input.localeCompare(b.input, undefined, { numeric: true, sensitivity: 'base' });
      }
      if (field === 'name') {
        return factor * a.name.localeCompare(b.name, undefined, { sensitivity: 'base' });
      }
      if (field === 'target') {
        const tA = a.target || '';
        const tB = b.target || '';
        return factor * tA.localeCompare(tB);
      }
      if (field === 'startup') {
        if (a.startup_num === null && b.startup_num === null) return 0;
        if (a.startup_num === null) return 1;
        if (b.startup_num === null) return -1;
        return factor * (a.startup_num - b.startup_num);
      }
      if (field === 'block') {
        if (a.block_num === null && b.block_num === null) return 0;
        if (a.block_num === null) return 1;
        if (b.block_num === null) return -1;
        return factor * (a.block_num - b.block_num);
      }
      if (field === 'hit') {
        if (a.hit_num === null && b.hit_num === null) return 0;
        if (a.hit_num === null) return 1;
        if (b.hit_num === null) return -1;
        return factor * (a.hit_num - b.hit_num);
      }
      if (field === 'ch') {
        if (a.ch_num === null && b.ch_num === null) return 0;
        if (a.ch_num === null) return 1;
        if (b.ch_num === null) return -1;
        return factor * (a.ch_num - b.ch_num);
      }
      return 0;
    });
  }, [filteredMoves, sortConfig]);

  const handleSelectMove = useCallback((m: Move) => {
    setSelectedDetailMove(m);
  }, []);

  const handlePlayVideo = useCallback((m: Move) => {
    setPreviewVideoMove(m);
  }, []);

  const handleSearchChange = (val: string) => {
    setSearchQuery(val);
  };

  const handleFilterChange = (filter: string) => {
    setFilterType(filter);
  };

  const renderSortIndicator = (field: SortField) => {
    if (!sortConfig || sortConfig.field !== field) return null;
    return (
      <span className="th-sort-icon-wrap">
        {sortConfig.direction === 'asc' ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
      </span>
    );
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

      {/* Top Controls: Compact Character Switcher (Triggers Modal) */}
      <div
        className="char-compact-picker glass-panel"
        onClick={() => setIsPickerOpen(true)}
        role="button"
        tabIndex={0}
        title="Klik untuk mengganti karakter"
      >
        <div className="char-compact-left">
          <div
            className="char-compact-avatar"
            style={{
              background: `linear-gradient(135deg, ${currentCharData?.color || '#00e5ff'}33, ${currentCharData?.color || '#00e5ff'}11)`,
              borderColor: currentCharData?.color || '#00e5ff',
              color: currentCharData?.color || '#00e5ff',
            }}
          >
            {currentCharData?.avatar || selectedChar.slice(0, 2).toUpperCase()}
          </div>
          <div className="char-compact-text">
            <div className="char-compact-title-row">
              <span className="char-compact-name" style={{ color: currentCharData?.color || '#fff' }}>
                {selectedChar}
              </span>
              <span className="char-compact-moves-badge">
                {moves.length} moves
              </span>
              {currentCharFavs.size > 0 && (
                <span className="char-compact-fav-badge">
                  ★ {currentCharFavs.size}
                </span>
              )}
            </div>
            <span className="char-compact-subtitle">
              {currentCharData?.title || currentCharData?.style || 'Tekken 8 Fighter'}
            </span>
          </div>
        </div>

        <button
          type="button"
          className="btn-change-char-compact"
          onClick={(e) => {
            e.stopPropagation();
            setIsPickerOpen(true);
          }}
        >
          <RotateCcw size={13} />
          <span>Ganti Karakter</span>
        </button>
      </div>

      {/* Filter and Search Bar */}
      <div className="explorer-filters glass-panel">
        <div className="search-gear-row">
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
          <button
            type="button"
            className="btn-explorer-settings"
            onClick={() => setIsSettingsOpen(true)}
            title="Pengaturan Spreadsheet"
          >
            <Settings size={18} />
          </button>
        </div>

        <div className="filter-chips-row">
          <button
            type="button"
            className={`f-chip ${filterType === 'all' ? 'chip-active' : ''}`}
            onClick={() => handleFilterChange('all')}
          >
            Semua {moves.length}
          </button>

          <button
            type="button"
            className={`f-chip chip-gold ${filterType === 'favorites' ? 'chip-active' : ''}`}
            onClick={() => handleFilterChange('favorites')}
          >
            Favorit {currentCharFavs.size}
          </button>

          <button
            type="button"
            className={`f-chip chip-crimson ${filterType === 'punishable' ? 'chip-active' : ''}`}
            onClick={() => handleFilterChange('punishable')}
          >
            Punishable
          </button>
          <button
            type="button"
            className={`f-chip ${filterType === 'safe-block' ? 'chip-active' : ''}`}
            onClick={() => handleFilterChange('safe-block')}
          >
            Safe on Block
          </button>
          <button
            type="button"
            className={`f-chip chip-green ${filterType === 'plus-block' ? 'chip-active' : ''}`}
            onClick={() => handleFilterChange('plus-block')}
          >
            Plus on Block
          </button>
          <button
            type="button"
            className={`f-chip chip-gold ${filterType === 'launchers' ? 'chip-active' : ''}`}
            onClick={() => handleFilterChange('launchers')}
          >
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
            Dengan Video
          </button>
        </div>
      </div>

      {/* Main Full-Width Table */}
      <div className="table-wrapper glass-panel">
        <table className="frame-table" style={{ minWidth: `${tableMinWidth}px` }}>
          <thead>
            <tr>
              {columns.video && <th className="th-video" style={{ width: '40px' }}>Clip</th>}
              {columns.fav && <th className="th-fav" style={{ width: '38px' }}>Fav</th>}
              {columns.input && (
                <th
                  className={`th-input th-sortable ${sortConfig?.field === 'input' ? 'th-active-sort' : ''}`}
                  style={{ width: '115px' }}
                  onClick={() => handleSort('input')}
                  title="Klik untuk menyortir berdasarkan Notasi Input"
                >
                  <div className="th-header-inner">
                    <span>Notasi Input</span>
                    {renderSortIndicator('input')}
                  </div>
                </th>
              )}
              {columns.name && (
                <th
                  className={`th-name th-sortable ${sortConfig?.field === 'name' ? 'th-active-sort' : ''}`}
                  style={{ width: '200px' }}
                  onClick={() => handleSort('name')}
                  title="Klik untuk menyortir berdasarkan Nama Gerakan"
                >
                  <div className="th-header-inner">
                    <span>Nama Gerakan</span>
                    {renderSortIndicator('name')}
                  </div>
                </th>
              )}
              {columns.target && (
                <th
                  className={`th-target th-sortable ${sortConfig?.field === 'target' ? 'th-active-sort' : ''}`}
                  style={{ width: '70px' }}
                  onClick={() => handleSort('target')}
                  title="Klik untuk menyortir berdasarkan Target Serangan"
                >
                  <div className="th-header-inner">
                    <span>Target</span>
                    {renderSortIndicator('target')}
                  </div>
                </th>
              )}
              {columns.startup && (
                <th
                  className={`th-speed th-sortable ${sortConfig?.field === 'startup' ? 'th-active-sort' : ''}`}
                  style={{ width: '80px' }}
                  onClick={() => handleSort('startup')}
                  title="Klik untuk menyortir berdasarkan Startup Frame"
                >
                  <div className="th-header-inner">
                    <span>Startup</span>
                    {renderSortIndicator('startup')}
                  </div>
                </th>
              )}
              {columns.block && (
                <th
                  className={`th-block th-sortable ${sortConfig?.field === 'block' ? 'th-active-sort' : ''}`}
                  style={{ width: '85px' }}
                  onClick={() => handleSort('block')}
                  title="Klik untuk menyortir berdasarkan Block Frame"
                >
                  <div className="th-header-inner">
                    <span>Block</span>
                    {renderSortIndicator('block')}
                  </div>
                </th>
              )}
              {columns.hit && (
                <th
                  className={`th-hit th-sortable ${sortConfig?.field === 'hit' ? 'th-active-sort' : ''}`}
                  style={{ width: '80px' }}
                  onClick={() => handleSort('hit')}
                  title="Klik untuk menyortir berdasarkan Hit Frame"
                >
                  <div className="th-header-inner">
                    <span>Hit</span>
                    {renderSortIndicator('hit')}
                  </div>
                </th>
              )}
              {columns.attribute && (
                <th
                  className="th-attr"
                  style={{ width: '110px' }}
                >
                  <div className="th-header-inner">
                    <span>Atribut</span>
                    <button
                      type="button"
                      className="btn-attr-info-trigger"
                      onClick={(e) => {
                        e.stopPropagation();
                        setIsAttrGuideOpen(true);
                      }}
                      title="Lihat penjelasan & kepanjangan lengkap seluruh atribut"
                    >
                      <Info size={11} />
                    </button>
                  </div>
                </th>
              )}
              {columns.ch && (
                <th
                  className={`th-ch th-sortable ${sortConfig?.field === 'ch' ? 'th-active-sort' : ''}`}
                  style={{ width: '80px' }}
                  onClick={() => handleSort('ch')}
                  title="Klik untuk menyortir berdasarkan Counter Hit Frame"
                >
                  <div className="th-header-inner">
                    <span>CH</span>
                    {renderSortIndicator('ch')}
                  </div>
                </th>
              )}
            </tr>
          </thead>
          <tbody>
            {sortedMoves.length === 0 ? (
              <tr>
                <td colSpan={Object.values(columns).filter(Boolean).length || 1} className="td-empty">
                  {filterType === 'favorites'
                    ? `Belum ada gerakan favorit untuk ${selectedChar}. Klik ikon bookmark/bintang pada baris gerakan untuk menambahkan.`
                    : 'Tidak ada gerakan yang cocok dengan filter atau pencarian.'}
                </td>
              </tr>
            ) : (
              sortedMoves.map((m) => (
                <MoveTableRow
                  key={m.id}
                  move={m}
                  isFav={currentCharFavs.has(m.id)}
                  onSelect={handleSelectMove}
                  onPlayVideo={handlePlayVideo}
                  onToggleFav={handleToggleFav}
                  columns={columns}
                  highlightRows={highlightRows}
                />
              ))
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
                  <span className="f-val text-cyan">{formatStartup(previewVideoMove.startup, previewVideoMove.startup_num)}</span>
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
          onSelectMove={(newMove) => setSelectedDetailMove(newMove)}
        />
      )}

      {/* Character Picker Popup Modal */}
      <CharacterPickerModal
        isOpen={isPickerOpen}
        onClose={() => setIsPickerOpen(false)}
        title="PILIH KARAKTER EXPLORER"
        selectedChar={selectedChar}
        onSelectCharacter={(char) => {
          setSelectedChar(char);
          setIsPickerOpen(false);
        }}
      />

      {/* Attribute Definitions & Guide Modal */}
      {isAttrGuideOpen && (
        <AttributeGuideModal
          isOpen={isAttrGuideOpen}
          onClose={() => setIsAttrGuideOpen(false)}
        />
      )}

      {/* Settings Modal (Column Visibility & Row Highlight) */}
      {isSettingsOpen &&
        createPortal(
          <div className="modal-backdrop" onClick={() => setIsSettingsOpen(false)}>
            <div className="settings-modal-card animate-slide-up" onClick={(e) => e.stopPropagation()}>
              <div className="settings-modal-header">
                <div className="settings-header-title">
                  <Settings size={16} className="text-cyan" />
                  <span className="settings-title-text">Pengaturan Spreadsheet</span>
                </div>
                <button
                  type="button"
                  className="btn-close-modal"
                  onClick={() => setIsSettingsOpen(false)}
                  title="Tutup"
                >
                  <X size={18} />
                </button>
              </div>

              <div className="settings-modal-body">
                {/* Section: Row Highlight */}
                <div className="settings-group">
                  <div className="settings-group-title">Highlight Status Frame Baris</div>
                  <label className="settings-toggle-row">
                    <input
                      type="checkbox"
                      checked={highlightRows}
                      onChange={(e) => handleToggleHighlightRows(e.target.checked)}
                      className="settings-checkbox"
                    />
                    <div className="toggle-text-block">
                      <span className="toggle-main-label">Aktifkan pewarnaan baris</span>
                      <span className="toggle-sub-label">
                        Unsafe = Merah, Plus on Block = Hijau, Safe = Netral
                      </span>
                    </div>
                  </label>
                </div>

                {/* Section: Column Visibility */}
                <div className="settings-group">
                  <div className="settings-group-title">Pilih Kolom Tampil</div>
                  <div className="columns-toggle-grid">
                    {[
                      { key: 'video', label: 'Clip Video' },
                      { key: 'fav', label: 'Favorit' },
                      { key: 'input', label: 'Notasi Input' },
                      { key: 'name', label: 'Nama Gerakan' },
                      { key: 'target', label: 'Target' },
                      { key: 'startup', label: 'Startup Frame' },
                      { key: 'block', label: 'Block Frame' },
                      { key: 'hit', label: 'Hit Frame' },
                      { key: 'attribute', label: 'Atribut Gerakan (HC, LC, KND, dll.)' },
                      { key: 'ch', label: 'Counter Hit Frame' },
                    ].map((col) => (
                      <label key={col.key} className="col-checkbox-item">
                        <input
                          type="checkbox"
                          checked={columns[col.key as keyof ColumnVisibility]}
                          onChange={(e) => handleToggleColumn(col.key as keyof ColumnVisibility, e.target.checked)}
                          className="settings-checkbox"
                        />
                        <span>{col.label}</span>
                      </label>
                    ))}
                  </div>
                </div>
              </div>

              <div className="settings-modal-footer">
                <button
                  type="button"
                  className="btn-reset-settings"
                  onClick={handleResetSettings}
                >
                  Reset Pengaturan
                </button>
                <button
                  type="button"
                  className="btn-done-settings"
                  onClick={() => setIsSettingsOpen(false)}
                >
                  Selesai
                </button>
              </div>
            </div>
          </div>,
          document.body
        )}
    </div>
  );
};
