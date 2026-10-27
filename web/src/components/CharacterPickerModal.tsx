import React, { useEffect, useState, useMemo } from 'react';
import { createPortal } from 'react-dom';
import type { CharacterName } from '../types/tekken';
import { CHARACTERS, CHARACTER_DATA } from '../data';
import { getThrowCountForCharacter } from '../utils/engine';
import { X, CheckCircle2, Search } from 'lucide-react';

interface CharacterPickerModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectCharacter: (char: CharacterName) => void;
  selectedChar: CharacterName;
  title: string;
  role?: 'p1' | 'p2';
  pickerType?: 'moves' | 'throws';
}

export const CharacterPickerModal: React.FC<CharacterPickerModalProps> = ({
  isOpen,
  onClose,
  onSelectCharacter,
  selectedChar,
  title,
  role,
  pickerType = 'moves',
}) => {
  const [search, setSearch] = useState('');
  const [sortBy, setSortBy] = useState<'name' | 'moves'>('name');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc');

  // Reset search when modal opens/closes
  useEffect(() => {
    if (isOpen) setSearch('');
  }, [isOpen]);

  // Close on Escape key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    if (isOpen) {
      window.addEventListener('keydown', handleKeyDown);
    }
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  const handleToggleSort = (type: 'name' | 'moves') => {
    if (sortBy === type) {
      setSortOrder((prev) => (prev === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortBy(type);
      setSortOrder(type === 'name' ? 'asc' : 'desc');
    }
  };

  const filteredChars = useMemo(() => {
    let list = CHARACTERS;
    if (search.trim()) {
      const q = search.toLowerCase().trim();
      list = CHARACTERS.filter(
        (c) =>
          c.name.toLowerCase().includes(q) ||
          c.style.toLowerCase().includes(q) ||
          c.title.toLowerCase().includes(q)
      );
    }

    return [...list].sort((a, b) => {
      if (sortBy === 'name') {
        const comp = a.name.localeCompare(b.name);
        return sortOrder === 'asc' ? comp : -comp;
      } else {
        const countA = pickerType === 'throws' ? getThrowCountForCharacter(a.name) : (CHARACTER_DATA[a.name]?.length || 0);
        const countB = pickerType === 'throws' ? getThrowCountForCharacter(b.name) : (CHARACTER_DATA[b.name]?.length || 0);
        const comp = countB - countA; // default moves: descending (most moves first)
        return sortOrder === 'asc' ? -comp : comp;
      }
    });
  }, [search, pickerType, sortBy, sortOrder]);

  if (!isOpen) return null;

  return createPortal(
    <div className="picker-modal-overlay" onClick={onClose}>
      <div 
        className="picker-modal-card animate-slide-up" 
        onClick={(e) => e.stopPropagation()}
        style={{ maxWidth: '520px' }}
      >
        <div className="picker-modal-header">
          <div>
            <span className={`picker-role-tag ${role === 'p1' ? 'tag-p1' : 'tag-p2'}`}>
              {role === 'p1' ? 'PLAYER 1 (ANDA)' : 'PLAYER 2 (LAWAN)'}
            </span>
            <h3 className="picker-modal-title">{title}</h3>
          </div>
          <button className="btn-close-modal" onClick={onClose} aria-label="Tutup">
            <X size={18} />
          </button>
        </div>

        {/* Search Input (autoFocus removed to prevent Android soft-keyboard popup) */}
        <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
          <Search size={15} style={{ position: 'absolute', left: 12, color: 'var(--text-muted)' }} />
          <input
            type="text"
            className="search-field"
            placeholder="Cari karakter (cth: Yoshimitsu, King, Nina)..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            style={{ paddingLeft: 36, paddingRight: 32, fontSize: '0.85rem' }}
          />
          {search && (
            <button
              type="button"
              onClick={() => setSearch('')}
              style={{
                position: 'absolute',
                right: 10,
                background: 'transparent',
                border: 'none',
                color: 'var(--text-muted)',
                cursor: 'pointer',
              }}
            >
              <X size={14} />
            </button>
          )}
        </div>

        {/* Sort Bar: Nama ▼ | Gerakan ▼ */}
        <div className="picker-sort-bar">
          <span className="sort-label">Urutkan:</span>
          <div className="sort-actions">
            <button
              type="button"
              className={`btn-sort-toggle ${sortBy === 'name' ? 'is-active' : ''}`}
              onClick={() => handleToggleSort('name')}
            >
              <span>Nama</span>
              <span className="sort-arrow">{sortBy === 'name' ? (sortOrder === 'asc' ? '▲' : '▼') : '▼'}</span>
            </button>
            <span className="sort-sep">|</span>
            <button
              type="button"
              className={`btn-sort-toggle ${sortBy === 'moves' ? 'is-active' : ''}`}
              onClick={() => handleToggleSort('moves')}
            >
              <span>{pickerType === 'throws' ? 'Grab' : 'Gerakan'}</span>
              <span className="sort-arrow">{sortBy === 'moves' ? (sortOrder === 'asc' ? '▲' : '▼') : '▼'}</span>
            </button>
          </div>
        </div>

        {/* 35 Character List (Scrollable) */}
        <div
          className="picker-list-vertical"
          style={{
            maxHeight: '52vh',
            overflowY: 'auto',
            paddingRight: '4px',
          }}
        >
          {filteredChars.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '24px 0', color: 'var(--text-muted)', fontSize: '0.85rem' }}>
              Tidak ada karakter yang cocok dengan "{search}".
            </div>
          ) : (
            filteredChars.map((char) => {
              const isSelected = selectedChar === char.name;
              const moveCount = CHARACTER_DATA[char.name]?.length || 0;
              const punishCount = CHARACTER_DATA[char.name]?.filter((m) => m.is_punishable).length || 0;
              const throwCount = getThrowCountForCharacter(char.name);

              return (
                <button
                  key={char.name}
                  type="button"
                  className={`picker-row-item ${isSelected ? `is-selected ${role === 'p1' ? 'p1-selected' : 'p2-selected'}` : ''}`}
                  onClick={() => {
                    onSelectCharacter(char.name);
                    onClose();
                  }}
                >
                  <div className="row-info">
                    <span className="row-name" style={{ color: char.color }}>{char.name}</span>
                  </div>

                  <div className="row-stats">
                    {pickerType === 'throws' ? (
                      <span className="row-stat-val" style={{ color: '#ffaa00', fontWeight: 800 }}>
                        {throwCount} grab
                      </span>
                    ) : (
                      <>
                        <span className="row-stat-val">{moveCount} moves</span>
                        {role === 'p2' && (
                          <span className="row-stat-punish text-crimson">{punishCount} punishable</span>
                        )}
                      </>
                    )}
                  </div>

                  <div className="row-check">
                    {isSelected ? (
                      <CheckCircle2 
                        size={20} 
                        className={role === 'p1' ? 'text-cyan' : 'text-crimson'} 
                      />
                    ) : (
                      <div className="empty-check-circle" />
                    )}
                  </div>
                </button>
              );
            })
          )}
        </div>
      </div>
    </div>,
    document.body
  );
};
