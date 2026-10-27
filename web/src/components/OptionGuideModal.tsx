import React, { useEffect } from 'react';
import { createPortal } from 'react-dom';
import { X } from 'lucide-react';

export interface OptionGuideModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const OptionGuideModal: React.FC<OptionGuideModalProps> = ({ isOpen, onClose }) => {
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
      <div className="option-guide-modal-card animate-slide-up" onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div className="option-guide-header">
          <span className="option-guide-title">Penjelasan Option Move</span>
          <button type="button" className="btn-close-modal" onClick={onClose} title="Tutup">
            <X size={18} />
          </button>
        </div>

        {/* Content Body */}
        <div className="option-guide-body">
          <div className="option-guide-section">
            <h4 className="option-guide-subhead">Apa itu Option Move?</h4>
            <p className="option-guide-text">
              Option Move adalah daftar rekomendasi gerakan lanjutan karakter Anda yang memiliki kecepatan <em>startup</em> cukup untuk menyerang sebelum atau bersamaan dengan respon tercepat lawan pada skenario frame advantage tertentu (<em>Frame Trap</em>).
            </p>
          </div>

          <div className="option-guide-section">
            <h4 className="option-guide-subhead">Kecepatan Respon Lawan</h4>
            <div className="option-guide-item">
              <span className="guide-bullet-title">Lawan Berdiri Normal:</span>
              <p className="option-guide-text">
                Respon tercepat lawan adalah <strong>i10</strong> (jab berdiri). Namun, harap diingat bahwa beberapa karakter memiliki pengecualian khusus yang lebih cepat atau unik (seperti <em>Flash</em> Yoshimitsu i6/i8, serangan <em>Power Crush</em> ber-armor, <em>Parry</em>, atau <em>Sabaki</em>), sehingga pemain tetap harus berhati-hati.
              </p>
            </div>
            <div className="option-guide-item">
              <span className="guide-bullet-title">Lawan Force Crouch (FC):</span>
              <p className="option-guide-text">
                Lawan dipaksa berada dalam posisi jongkok, sehingga tidak bisa membalas dengan jab berdiri i10. Respon tercepat lawan dari posisi jongkok adalah <em>While Standing</em> <strong>i11</strong> (ws+4).
              </p>
            </div>
          </div>

          <div className="option-guide-section">
            <h4 className="option-guide-subhead">Cabang Skenario Jurus (Dinamis)</h4>
            <p className="option-guide-text">
              Tab skenario muncul secara dinamis sesuai properti khusus yang dimiliki oleh jurus:
            </p>
            <ul className="option-guide-list">
              <li><strong>On Hit:</strong> Kondisi standar ketika serangan awal mengenai lawan yang sedang berdiri.</li>
              <li><strong>On CH (Counter Hit / Critical):</strong> Muncul jika jurus memiliki keuntungan berbeda saat memotong serangan lawan (Counter Hit). Seringkali menghasilkan stagger besar atau <em>knockdown</em>.</li>
              <li><strong>On Crouch:</strong> Muncul jika jurus memiliki keuntungan frame khusus saat mengenai lawan yang sedang menunduk (misal Heihachi f+4 +15c). Karena lawan dalam posisi jongkok, seluruh serangan berstatus High otomatis luput (whiff), dan hanya serangan Mid/Low yang ditampilkan.</li>
              <li><strong>Clean Hit:</strong> Muncul jika jurus memiliki efek jarak titik nol (menempel) yang melipatgandakan keuntungan frame atau meluncurkan lawan ke udara.</li>
              <li><strong>On Block:</strong> Opsi serangan saat jurus awal ditahan lawan (hanya aktif jika jurus menghasilkan keuntungan / <em>plus frame</em>).</li>
            </ul>
          </div>

          <div className="option-guide-section">
            <h4 className="option-guide-subhead">Interaksi Arena: WI & FI</h4>
            <p className="option-guide-text">
              Atribut <strong>WI (Wall Interaction)</strong> menggabungkan <em>Wall Splat</em>, <em>Wall Crush</em>, <em>Wall Break</em>, <em>Balcony Break</em>, dan <em>Wall Blast</em>. Sedangkan atribut <strong>FI (Floor Interaction)</strong> menandakan serangan yang dapat meruntuhkan lantai atau memicu <em>Floor Blast</em>.
            </p>
          </div>

          <div className="option-guide-section">
            <h4 className="option-guide-subhead">Akses Stance Khusus Karakter</h4>
            <p className="option-guide-text">
              Jurus bertanda nama stance (misal FUJ, SEN, WRA) hanya dapat dieksekusi jika Anda menekan tombol transisi yang tertera (misal via D atau F). Jika tidak menekan tombol transisi, karakter tetap berdiri biasa.
            </p>
          </div>
        </div>

        {/* Footer */}
        <div className="option-guide-footer">
          <button type="button" className="btn-done-settings" onClick={onClose}>
            Tutup
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
};
