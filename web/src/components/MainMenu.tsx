import React from 'react';
import { Shield, Zap, BookOpen, ArrowRight, Flame, ShieldAlert } from 'lucide-react';
import type { QuizMode } from '../types/tekken';

interface MainMenuProps {
  onSelectMode: (mode: QuizMode | 'explorer') => void;
  streak: number;
}

export const MainMenu: React.FC<MainMenuProps> = ({ onSelectMode, streak }) => {
  return (
    <div className="main-menu-container animate-slide-up">
      {/* Hero Header */}
      <div className="menu-hero">
        <div className="hero-badge">
          <span className="badge badge-cyan">Tekken 8 Dojo</span>
          {streak > 0 && (
            <span className="badge badge-gold">
              <Flame size={12} /> {streak} Win Streak
            </span>
          )}
        </div>
        <h1 className="hero-title">TEKKEN 8 FRAME TRAINER</h1>
        <p className="hero-subtitle">
          Pilih mode latihan untuk mengasah reaksi *block punish*, *throw break*, dan penguasaan *frame trap*.
        </p>
      </div>

      {/* Mode Cards Grid (2x2) */}
      <div className="mode-grid">
        {/* Card 1: Punishment Training */}
        <div 
          className="mode-card card-punish"
          onClick={() => onSelectMode('punishment')}
        >
          <div className="mode-card-header">
            <div className="mode-icon-circle icon-shield">
              <Shield size={24} />
            </div>
            <span className="mode-badge-tag tag-crimson">Defensive Drill</span>
          </div>

          <div className="mode-card-body">
            <h2 className="mode-title">Punishment Training</h2>
          </div>

          <div className="mode-card-footer">
            <button className="btn-mode-action btn-punish">
              <span>Masuk Setup</span>
              <ArrowRight size={16} />
            </button>
          </div>
        </div>

        {/* Card 2: Throw Break Drill */}
        <div 
          className="mode-card card-throwbreak"
          onClick={() => onSelectMode('throw-break')}
        >
          <div className="mode-card-header">
            <div className="mode-icon-circle icon-throw">
              <ShieldAlert size={24} />
            </div>
            <span className="mode-badge-tag tag-amber">Lepas Bantingan</span>
          </div>

          <div className="mode-card-body">
            <h2 className="mode-title">Throw Break Drill</h2>
          </div>

          <div className="mode-card-footer">
            <button className="btn-mode-action btn-throwbreak">
              <span>Masuk Setup</span>
              <ArrowRight size={16} />
            </button>
          </div>
        </div>

        {/* Card 3: Frame Trap Training */}
        <div 
          className="mode-card card-frametrap"
          onClick={() => onSelectMode('frame-trap')}
        >
          <div className="mode-card-header">
            <div className="mode-icon-circle icon-zap">
              <Zap size={24} />
            </div>
            <span className="mode-badge-tag tag-cyan">Offensive Pressure</span>
          </div>

          <div className="mode-card-body">
            <h2 className="mode-title">Frame Trap Training</h2>
          </div>

          <div className="mode-card-footer">
            <button className="btn-mode-action btn-frametrap">
              <span>Masuk Setup</span>
              <ArrowRight size={16} />
            </button>
          </div>
        </div>

        {/* Card 4: Frame Explorer */}
        <div 
          className="mode-card card-explorer"
          onClick={() => onSelectMode('explorer')}
        >
          <div className="mode-card-header">
            <div className="mode-icon-circle icon-book">
              <BookOpen size={24} />
            </div>
            <span className="mode-badge-tag tag-gold">Movelist &amp; Lab</span>
          </div>

          <div className="mode-card-body">
            <h2 className="mode-title">Frame Explorer</h2>
          </div>

          <div className="mode-card-footer">
            <button className="btn-mode-action btn-explorer">
              <span>Buka Database</span>
              <ArrowRight size={16} />
            </button>
          </div>
        </div>
      </div>

      <style>{`
        .main-menu-container {
          max-width: 980px;
          margin: 0 auto;
          display: flex;
          flex-direction: column;
          gap: 20px;
          padding: 6px 0 24px;
        }
        .menu-hero {
          text-align: center;
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 6px;
        }
        .hero-badge {
          display: flex;
          gap: 8px;
          margin-bottom: 2px;
        }
        .hero-title {
          font-family: var(--font-display);
          font-size: 2.1rem;
          font-weight: 900;
          letter-spacing: 0.08em;
          background: linear-gradient(135deg, #ffffff 0%, #00e5ff 60%, #ff1e56 100%);
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
          margin: 0;
          line-height: 1.1;
        }
        .hero-subtitle {
          color: var(--text-secondary);
          font-size: 0.95rem;
          max-width: 580px;
          line-height: 1.35;
        }
        .mode-grid {
          display: grid;
          grid-template-columns: repeat(2, 1fr);
          gap: 14px;
        }
        .mode-card {
          background: #131622;
          border: 1px solid rgba(255, 255, 255, 0.08);
          border-radius: var(--radius-md);
          padding: 16px 18px;
          display: flex;
          flex-direction: column;
          gap: 12px;
          cursor: pointer;
          transition: transform 0.18s cubic-bezier(0.16, 1, 0.3, 1), border-color 0.18s;
          position: relative;
        }
        .mode-card:hover {
          transform: translateY(-3px);
        }
        .mode-card:active {
          transform: scale(0.98);
        }
        .card-punish:hover {
          border-color: var(--devil-crimson);
          box-shadow: 0 6px 24px rgba(255, 30, 86, 0.18);
        }
        .card-throwbreak:hover {
          border-color: #ffaa00;
          box-shadow: 0 6px 24px rgba(255, 170, 0, 0.18);
        }
        .card-frametrap:hover {
          border-color: var(--electric-cyan);
          box-shadow: 0 6px 24px rgba(0, 229, 255, 0.18);
        }
        .card-explorer:hover {
          border-color: var(--heihachi-gold);
          box-shadow: 0 6px 24px rgba(255, 183, 3, 0.18);
        }
        .mode-card-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
        }
        .mode-icon-circle {
          width: 44px;
          height: 44px;
          border-radius: var(--radius-md);
          display: flex;
          align-items: center;
          justify-content: center;
        }
        .icon-shield {
          background: rgba(255, 30, 86, 0.12);
          color: var(--devil-crimson);
          border: 1px solid rgba(255, 30, 86, 0.3);
        }
        .icon-throw {
          background: rgba(255, 170, 0, 0.12);
          color: #ffaa00;
          border: 1px solid rgba(255, 170, 0, 0.3);
        }
        .icon-zap {
          background: rgba(0, 229, 255, 0.12);
          color: var(--electric-cyan);
          border: 1px solid rgba(0, 229, 255, 0.3);
        }
        .icon-book {
          background: rgba(255, 183, 3, 0.12);
          color: var(--heihachi-gold);
          border: 1px solid rgba(255, 183, 3, 0.3);
        }
        .mode-badge-tag {
          font-size: 0.68rem;
          font-weight: 800;
          text-transform: uppercase;
          letter-spacing: 0.06em;
          padding: 3px 8px;
          border-radius: var(--radius-full);
        }
        .tag-crimson {
          background: rgba(255, 30, 86, 0.15);
          color: var(--devil-crimson);
          border: 1px solid rgba(255, 30, 86, 0.3);
        }
        .tag-amber {
          background: rgba(255, 170, 0, 0.15);
          color: #ffaa00;
          border: 1px solid rgba(255, 170, 0, 0.3);
        }
        .tag-cyan {
          background: rgba(0, 229, 255, 0.15);
          color: var(--electric-cyan);
          border: 1px solid rgba(0, 229, 255, 0.3);
        }
        .tag-gold {
          background: rgba(255, 183, 3, 0.15);
          color: var(--heihachi-gold);
          border: 1px solid rgba(255, 183, 3, 0.3);
        }
        .mode-card-body {
          display: flex;
          flex-direction: column;
          gap: 4px;
          flex: 1;
        }
        .mode-title {
          font-family: var(--font-display);
          font-size: 1.25rem;
          font-weight: 800;
          color: #fff;
          margin: 0;
          line-height: 1.2;
        }
        .mode-card-footer {
          margin-top: auto;
        }
        .btn-mode-action {
          width: 100%;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 6px;
          padding: 9px 12px;
          border-radius: var(--radius-sm);
          font-weight: 800;
          font-size: 0.84rem;
          letter-spacing: 0.04em;
          transition: all 0.15s;
          cursor: pointer;
        }
        .btn-punish {
          background: rgba(255, 30, 86, 0.15);
          color: var(--devil-crimson);
          border: 1px solid rgba(255, 30, 86, 0.4);
        }
        .mode-card:hover .btn-punish {
          background: var(--devil-crimson);
          color: #fff;
        }
        .btn-throwbreak {
          background: rgba(255, 170, 0, 0.15);
          color: #ffaa00;
          border: 1px solid rgba(255, 170, 0, 0.4);
        }
        .mode-card:hover .btn-throwbreak {
          background: #ffaa00;
          color: #000;
        }
        .btn-frametrap {
          background: rgba(0, 229, 255, 0.15);
          color: var(--electric-cyan);
          border: 1px solid rgba(0, 229, 255, 0.4);
        }
        .mode-card:hover .btn-frametrap {
          background: var(--electric-cyan);
          color: #000;
        }
        .btn-explorer {
          background: rgba(255, 183, 3, 0.15);
          color: var(--heihachi-gold);
          border: 1px solid rgba(255, 183, 3, 0.4);
        }
        .mode-card:hover .btn-explorer {
          background: var(--heihachi-gold);
          color: #000;
        }

        /* Mobile Viewport: 2x2 compact grid fits 100% without scroll */
        @media (max-width: 768px) {
          .main-menu-container {
            gap: 12px;
            padding: 4px 0 16px;
          }
          .menu-hero {
            gap: 4px;
          }
          .hero-badge {
            display: none;
          }
          .hero-title {
            font-size: 1.35rem;
          }
          .hero-subtitle {
            font-size: 0.76rem;
            max-width: 100%;
            line-height: 1.25;
          }
          .mode-grid {
            grid-template-columns: repeat(2, 1fr) !important;
            gap: 8px !important;
          }
          .mode-card {
            padding: 10px 10px;
            gap: 8px;
            border-radius: var(--radius-sm);
          }
          .mode-icon-circle {
            width: 34px;
            height: 34px;
            border-radius: 6px;
          }
          .mode-icon-circle svg {
            width: 18px;
            height: 18px;
          }
          .mode-badge-tag {
            font-size: 0.55rem;
            padding: 2px 5px;
          }
          .mode-title {
            font-size: 0.95rem;
          }
          .btn-mode-action {
            padding: 6px 8px;
            font-size: 0.74rem;
            min-height: 32px;
            border-radius: 4px;
          }
        }
      `}</style>
    </div>
  );
};
