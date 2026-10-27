import React, { useEffect } from 'react';
import { createPortal } from 'react-dom';
import { X } from 'lucide-react';
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
        {/* Header: Judul & Tombol Tutup Saja */}
        <div className="attr-guide-header">
          <span className="attr-guide-simple-title">Kepanjangan Atribut</span>
          <button
            type="button"
            className="btn-close-modal"
            onClick={onClose}
            title="Tutup"
          >
            <X size={18} />
          </button>
        </div>

        {/* Daftar Singkatan & Kepanjangan */}
        <div className="attr-simple-grid-scroll">
          {ATTRIBUTE_DIRECTORY.map((item) => (
            <div key={item.code} className="attr-simple-row">
              <span className={`attr-badge ${item.colorClass} attr-simple-badge`}>
                {item.code}
              </span>
              <span className="attr-simple-fullname">{item.fullName}</span>
            </div>
          ))}
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
