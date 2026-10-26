import React from 'react';
import type { QuizMode, QuizScore } from '../types/tekken';
import { Shield, Zap, BookOpen, Flame, ArrowLeft, RotateCcw, ShieldAlert } from 'lucide-react';

interface HeaderProps {
  currentScreen: 'menu' | 'punish-setup' | 'frametrap-setup' | 'throwbreak-setup' | 'quiz' | 'explorer';
  currentMode: QuizMode;
  onNavigate: (screen: 'menu' | 'punish-setup' | 'frametrap-setup' | 'throwbreak-setup' | 'quiz' | 'explorer') => void;
  onResetMatchup: () => void;
  score: QuizScore;
  userChar: string;
  oppChar: string;
}

export const Header: React.FC<HeaderProps> = ({
  currentScreen,
  currentMode,
  onNavigate,
  onResetMatchup,
  score,
  userChar,
  oppChar,
}) => {
  const accuracy = score.totalAnswered > 0 
    ? Math.round((score.correctCount / score.totalAnswered) * 100) 
    : 100;

  const isMenu = currentScreen === 'menu';
  const isQuiz = currentScreen === 'quiz';
  const showHeaderBack = isQuiz || currentScreen === 'explorer';

  return (
    <header className="header-container">
      <div className="header-main-row">
        {/* Brand Logo & Back to Menu */}
        <div className="brand-group">
          {showHeaderBack && (
            <button 
              className="btn-back-main" 
              onClick={() => onNavigate('menu')}
              title="Kembali ke Menu Utama"
            >
              <ArrowLeft size={16} />
              <span>Menu Utama</span>
            </button>
          )}

          <div className="brand" onClick={() => onNavigate('menu')}>
            <span className="brand-icon">
              <Zap size={18} className="text-cyan" />
            </span>
            <div className="brand-text">
              <span className="brand-title">TEKKEN 8</span>
              <span className="brand-subtitle">FRAME LAB & TRAINER</span>
            </div>
          </div>
        </div>

        {/* In-Quiz Stats & Matchup Pill */}
        {isQuiz && (
          <div className="header-quiz-info">
            <div className="matchup-pill">
              {currentMode === 'throw-break' ? (
                <>
                  <span className="p1-name">Defense</span>
                  <span className="vs-sep">vs</span>
                  <span className="p2-name">{oppChar}</span>
                </>
              ) : (
                <>
                  <span className="p1-name">{userChar}</span>
                  {currentMode === 'punishment' && (
                    <>
                      <span className="vs-sep">vs</span>
                      <span className="p2-name">{oppChar}</span>
                    </>
                  )}
                </>
              )}
              <button 
                className="btn-change-setup" 
                onClick={onResetMatchup}
                title="Ganti Karakter / Setup"
              >
                <RotateCcw size={12} />
                <span>Ganti</span>
              </button>
            </div>

            <div className="streak-badge">
              <Flame size={16} className="text-gold" />
              <span className="streak-num">{score.streak}</span>
              <span className="streak-lbl">STREAK</span>
            </div>

            <div className="accuracy-pill">
              <span className="acc-num">{accuracy}%</span>
              <span className="acc-lbl">ACC</span>
            </div>
          </div>
        )}

        {/* Quick Nav Tabs */}
        <nav className="header-nav-tabs">
          <button
            className={`h-nav-btn ${isMenu ? 'h-active' : ''}`}
            onClick={() => onNavigate('menu')}
          >
            Menu
          </button>
          <button
            className={`h-nav-btn ${(currentScreen === 'punish-setup' || (isQuiz && currentMode === 'punishment')) ? 'h-active h-cyan' : ''}`}
            onClick={() => onNavigate('punish-setup')}
          >
            <Shield size={14} />
            <span>Punish</span>
          </button>
          <button
            className={`h-nav-btn ${(currentScreen === 'throwbreak-setup' || (isQuiz && currentMode === 'throw-break')) ? 'h-active h-amber' : ''}`}
            onClick={() => onNavigate('throwbreak-setup')}
          >
            <ShieldAlert size={14} />
            <span>Throw Break</span>
          </button>
          <button
            className={`h-nav-btn ${(currentScreen === 'frametrap-setup' || (isQuiz && currentMode === 'frame-trap')) ? 'h-active h-crimson' : ''}`}
            onClick={() => onNavigate('frametrap-setup')}
          >
            <Zap size={14} />
            <span>Frame Trap</span>
          </button>
          <button
            className={`h-nav-btn ${currentScreen === 'explorer' ? 'h-active h-gold' : ''}`}
            onClick={() => onNavigate('explorer')}
          >
            <BookOpen size={14} />
            <span>Explorer</span>
          </button>
        </nav>
      </div>

      <style>{`
        .header-container {
          background: #131622;
          border: 1px solid rgba(255, 255, 255, 0.08);
          border-radius: var(--radius-md);
          padding: 10px 16px;
          margin-bottom: 18px;
        }
        .header-main-row {
          display: flex;
          align-items: center;
          justify-content: space-between;
          flex-wrap: wrap;
          gap: 12px;
        }
        .brand-group {
          display: flex;
          align-items: center;
          gap: 12px;
        }
        .btn-back-main {
          display: flex;
          align-items: center;
          gap: 6px;
          background: #0d0f18;
          border: 1px solid rgba(255, 255, 255, 0.1);
          color: var(--text-secondary);
          font-size: 0.8rem;
          font-weight: 700;
          padding: 6px 12px;
          border-radius: var(--radius-sm);
          cursor: pointer;
          transition: all 0.2s;
        }
        .btn-back-main:hover {
          color: #fff;
          background: rgba(255, 255, 255, 0.1);
        }
        .brand {
          display: flex;
          align-items: center;
          gap: 8px;
          cursor: pointer;
        }
        .brand-icon {
          font-size: 1.5rem;
        }
        .brand-text {
          display: flex;
          flex-direction: column;
          line-height: 1;
        }
        .brand-title {
          font-family: var(--font-display);
          font-size: 1.25rem;
          font-weight: 900;
          letter-spacing: 0.08em;
          color: #fff;
        }
        .brand-subtitle {
          font-size: 0.58rem;
          font-weight: 800;
          letter-spacing: 0.12em;
          color: var(--text-muted);
        }
        .header-quiz-info {
          display: flex;
          align-items: center;
          gap: 8px;
        }
        .matchup-pill {
          display: flex;
          align-items: center;
          gap: 6px;
          background: #0d0f18;
          border: 1px solid rgba(255, 255, 255, 0.08);
          padding: 4px 10px;
          border-radius: var(--radius-full);
          font-size: 0.8rem;
          font-weight: 700;
        }
        .p1-name {
          color: var(--electric-cyan);
        }
        .p2-name {
          color: var(--devil-crimson);
        }
        .vs-sep {
          color: var(--text-muted);
          font-size: 0.7rem;
        }
        .btn-change-setup {
          display: flex;
          align-items: center;
          gap: 3px;
          background: rgba(255, 255, 255, 0.1);
          color: var(--text-secondary);
          font-size: 0.68rem;
          padding: 2px 6px;
          border-radius: var(--radius-full);
          transition: all 0.2s;
        }
        .btn-change-setup:hover {
          color: #fff;
          background: rgba(255, 255, 255, 0.2);
        }
        .streak-badge {
          display: flex;
          align-items: center;
          gap: 5px;
          background: #0d0f18;
          border: 1px solid rgba(255, 183, 3, 0.3);
          padding: 4px 10px;
          border-radius: var(--radius-sm);
        }
        .text-gold {
          color: var(--heihachi-gold);
        }
        .streak-num {
          font-family: var(--font-display);
          font-weight: 900;
          font-size: 1.1rem;
          color: var(--heihachi-gold);
          line-height: 1;
        }
        .streak-lbl {
          font-size: 0.55rem;
          font-weight: 800;
          color: var(--text-muted);
        }
        .accuracy-pill {
          display: flex;
          flex-direction: column;
          align-items: center;
          background: #0d0f18;
          border: 1px solid rgba(255, 255, 255, 0.08);
          padding: 3px 8px;
          border-radius: var(--radius-sm);
          line-height: 1;
        }
        .acc-num {
          font-family: var(--font-display);
          font-weight: 800;
          font-size: 0.95rem;
          color: #fff;
        }
        .acc-lbl {
          font-size: 0.52rem;
          color: var(--text-muted);
          font-weight: 700;
        }
        .header-nav-tabs {
          display: flex;
          align-items: center;
          gap: 6px;
        }
        .h-nav-btn {
          display: flex;
          align-items: center;
          gap: 5px;
          padding: 6px 12px;
          border-radius: var(--radius-sm);
          font-size: 0.8rem;
          font-weight: 700;
          color: var(--text-secondary);
          background: #0d0f18;
          border: 1px solid rgba(255, 255, 255, 0.06);
          transition: all 0.15s;
        }
        .h-nav-btn:hover {
          color: #fff;
          background: rgba(255, 255, 255, 0.08);
        }
        .h-nav-btn.h-active {
          color: #fff;
          border-color: rgba(255, 255, 255, 0.3);
          background: rgba(255, 255, 255, 0.1);
        }
        .h-nav-btn.h-cyan.h-active {
          border-color: var(--electric-cyan);
          background: rgba(0, 229, 255, 0.15);
          color: var(--electric-cyan);
        }
        .h-nav-btn.h-amber.h-active {
          border-color: #ffaa00;
          background: rgba(255, 170, 0, 0.15);
          color: #ffaa00;
        }
        .h-nav-btn.h-crimson.h-active {
          border-color: var(--devil-crimson);
          background: rgba(255, 30, 86, 0.15);
          color: var(--devil-crimson);
        }
        .h-nav-btn.h-gold.h-active {
          border-color: var(--heihachi-gold);
          background: rgba(255, 183, 3, 0.15);
          color: var(--heihachi-gold);
        }

        @media (max-width: 768px) {
          .header-container {
            padding: 8px 12px;
          }
          .header-main-row {
            gap: 8px;
          }
          .header-quiz-info {
            order: 3;
            width: 100%;
            justify-content: space-between;
          }
          .header-nav-tabs {
            overflow-x: auto;
          }
        }
      `}</style>
    </header>
  );
};
