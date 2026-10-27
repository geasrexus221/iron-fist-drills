import React, { useEffect } from 'react';
import { createPortal } from 'react-dom';
import { X, Info } from 'lucide-react';
import { ATTRIBUTE_DIRECTORY } from '../utils/notation';

export interface AttributeGuideModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const AttributeGuideModal: React.FC<AttributeGuideModalProps> = ({ isOpen, onClose }) => {
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

  if (!isOpen) return null;

  return createPortal(
    <div className="modal-backdrop" onClick={onClose}>
      <div className="attr-guide-modal-card animate-slide-up" onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div className="attr-guide-header">
          <div className="attr-guide-title-wrap">
            <span className="attr-guide-simple-title">Panduan & Kepanjangan Atribut</span>
          </div>
          <button
            type="button"
            className="btn-close-modal"
            onClick={onClose}
            title="Tutup"
          >
            <X size={18} />
          </button>
        </div>

        {/* Modal Scroll Content */}
        <div className="attr-guide-scroll-container">
          <div className="attr-guide-section-label">Move Properties</div>
          <div className="attr-simple-grid-scroll">
            {ATTRIBUTE_DIRECTORY.map((item) => (
              <div key={item.code} className="attr-simple-row" title={item.description}>
                <span className={`attr-badge ${item.colorClass} attr-simple-badge`}>
                  {item.code}
                </span>
                <span className="attr-simple-fullname">{item.fullName}</span>
              </div>
            ))}
          </div>

          {/* Info Tip Note tentang Launcher & Knockdown */}
          <div className="attr-guide-tip-note">
            <Info size={13} className="inline-block mr-1 text-sky-400 shrink-0 mt-0.5" />
            <span>
              <strong>Catatan:</strong> Status Launcher (+XXa) dan Knockdown (KND) dibaca langsung dari angka keunggulan frame di kolom HIT/CH.
            </span>
          </div>
        </div>

        {/* Footer */}
        <div className="attr-guide-simple-footer">
          <button type="button" className="btn-done-settings" onClick={onClose}>
            Tutup
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
};
