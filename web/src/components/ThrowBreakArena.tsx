import React, { useState, useEffect, useRef } from 'react';
import type { QuizQuestion, CharacterName, ThrowBreakButton, ThrowBreakEvaluation, Move } from '../types/tekken';
import { CHARACTER_DATA } from '../data';
import { evaluateThrowBreak, parseThrowBreak, findChainFollowups } from '../utils/engine';
import { useDeviceType, triggerHaptic } from '../hooks/useDeviceType';
import {
  Play,
  Check,
  XCircle,
  ArrowRight,
  Volume2,
  VolumeX,
  ArrowLeft,
  Settings,
  Hand,
} from 'lucide-react';

interface ChainStepHistory {
  stage: number;
  moveName: string;
  moveInput: string;
  status: 'escaped' | 'failed' | 'current';
}

interface PendingContinuation {
  nextMove: Move;
  nextFollowups: Move[];
  nextStageNum: number;
}

interface ThrowBreakArenaProps {
  question: QuizQuestion;
  onNextQuestion: () => void;
  onAnswerRecorded: (isCorrect: boolean, isOptimal: boolean) => void;
  oppChar: CharacterName;
  onBackToMenu: () => void;
  onBackToSetup: () => void;
}

export const ThrowBreakArena: React.FC<ThrowBreakArenaProps> = ({
  question,
  onNextQuestion,
  onAnswerRecorded,
  oppChar,
  onBackToMenu,
  onBackToSetup,
}) => {
  const { isMobile } = useDeviceType();
  const [selectedButton, setSelectedButton] = useState<ThrowBreakButton | null>(null);
  const [isAnswered, setIsAnswered] = useState(false);
  const [evaluation, setEvaluation] = useState<ThrowBreakEvaluation | null>(null);
  const [isVideoMuted, setIsVideoMuted] = useState(true);
  const [showResultFlash, setShowResultFlash] = useState(false);

  // Active move & chain stage states (supports multi-stage sequential transitions)
  const [activeMove, setActiveMove] = useState(question.throwMove);
  const [activeChainStage, setActiveChainStage] = useState(question.chainStage || 1);
  const [activeFollowups, setActiveFollowups] = useState(question.chainFollowups || []);
  const [activeValidBreaks, setActiveValidBreaks] = useState(question.validBreaks || ['1', '2']);
  const [activeRawBreakText, setActiveRawBreakText] = useState(question.rawBreakText || '');

  // Continuation & Verdict State
  const [pendingContinuation, setPendingContinuation] = useState<PendingContinuation | null>(null);
  const [verdictText, setVerdictText] = useState<{ status: 'success' | 'failed'; text: string } | null>(null);
  const [chainHistory, setChainHistory] = useState<ChainStepHistory[]>([]);

  const videoRef = useRef<HTMLVideoElement>(null);
  const flashTimeoutRef = useRef<number | null>(null);

  // Cleanup flash timer on unmount
  useEffect(() => {
    return () => {
      if (flashTimeoutRef.current) clearTimeout(flashTimeoutRef.current);
    };
  }, []);

  // Reset state on new question
  useEffect(() => {
    setSelectedButton(null);
    setIsAnswered(false);
    setEvaluation(null);
    setShowResultFlash(false);
    setActiveMove(question.throwMove);
    const initialStage = question.chainStage || 1;
    setActiveChainStage(initialStage);
    setActiveFollowups(question.chainFollowups || []);
    setActiveValidBreaks(question.validBreaks || ['1', '2']);
    setActiveRawBreakText(question.rawBreakText || '');
    setPendingContinuation(null);
    setVerdictText(null);

    setChainHistory([
      {
        stage: initialStage,
        moveName: question.throwMove?.name || 'Starter',
        moveInput: question.throwMove?.input || '',
        status: 'current',
      },
    ]);

    if (videoRef.current) {
      videoRef.current.currentTime = 0;
      videoRef.current.play().catch(() => {});
    }
  }, [question.id, question.throwMove]);

  const handleSelectButton = (button: ThrowBreakButton) => {
    if (isAnswered || !activeMove) return;

    setSelectedButton(button);

    const result = evaluateThrowBreak(activeMove, button);
    const isCorrect = result.status === 'escaped';

    if (isCorrect) {
      // 1. ESCAPED!
      setIsAnswered(true);
      setEvaluation(result);
      setPendingContinuation(null);
      setVerdictText({
        status: 'success',
        text: `BERHASIL BREAK! [${button}]`,
      });
      setChainHistory((prev) =>
        prev.map((step) =>
          step.stage === activeChainStage ? { ...step, status: 'escaped' } : step
        )
      );
      onAnswerRecorded(true, true);
      triggerHaptic('success');
      setShowResultFlash(true);
      if (flashTimeoutRef.current) clearTimeout(flashTimeoutRef.current);
      flashTimeoutRef.current = window.setTimeout(() => setShowResultFlash(false), 650);
      return;
    }

    // 2. FAILED THIS STAGE:
    if (question.throwDrillType === 'multistage' && activeFollowups.length > 0) {
      // Intermediate Failure -> Stop and wait for user to click "RONDE BERIKUTNYA" to continue chain!
      setIsAnswered(true);
      setEvaluation(result);
      const failedStage = activeChainStage;
      setVerdictText({
        status: 'failed',
        text: `GAGAL BREAK ${failedStage}/x! [${button}]`,
      });
      setChainHistory((prev) =>
        prev.map((step) =>
          step.stage === activeChainStage ? { ...step, status: 'failed' } : step
        )
      );

      const nextMove = activeFollowups[Math.floor(Math.random() * activeFollowups.length)];
      const allOppMoves = CHARACTER_DATA[oppChar] || [];
      const nextFollowups = findChainFollowups(nextMove, allOppMoves);
      const nextStageNum = activeChainStage + 1;

      setPendingContinuation({
        nextMove,
        nextFollowups,
        nextStageNum,
      });

      // Brief red flash
      setShowResultFlash(true);
      triggerHaptic('error');
      if (flashTimeoutRef.current) clearTimeout(flashTimeoutRef.current);
      flashTimeoutRef.current = window.setTimeout(() => setShowResultFlash(false), 500);
      return;
    }

    // 3. TERMINAL FAILURE (final stage or single throw)
    setIsAnswered(true);
    setEvaluation(result);
    setPendingContinuation(null);
    setVerdictText({
      status: 'failed',
      text: question.throwDrillType === 'multistage'
        ? `GAGAL BREAK ${activeChainStage}/x! [${button}]`
        : `GAGAL BREAK! [${button}]`,
    });
    setChainHistory((prev) =>
      prev.map((step) =>
        step.stage === activeChainStage ? { ...step, status: 'failed' } : step
      )
    );
    onAnswerRecorded(false, false);
    triggerHaptic('error');
    setShowResultFlash(true);
    if (flashTimeoutRef.current) clearTimeout(flashTimeoutRef.current);
    flashTimeoutRef.current = window.setTimeout(() => setShowResultFlash(false), 650);
  };

  const handleNextAction = () => {
    triggerHaptic('light');
    if (pendingContinuation) {
      // Advance to the continuation of this chain throw!
      const nextMove = pendingContinuation.nextMove;
      const nextStageNum = pendingContinuation.nextStageNum;
      const nextFollowups = pendingContinuation.nextFollowups;
      const parsed = parseThrowBreak(nextMove);

      setActiveMove(nextMove);
      setActiveChainStage(nextStageNum);
      setActiveFollowups(nextFollowups);
      setActiveValidBreaks(parsed.validBreaks);
      setActiveRawBreakText(parsed.rawText);
      setSelectedButton(null);
      setEvaluation(null);
      setIsAnswered(false);
      setPendingContinuation(null);
      setVerdictText(null);

      setChainHistory((prev) => [
        ...prev,
        {
          stage: nextStageNum,
          moveName: nextMove.name || '',
          moveInput: nextMove.input || '',
          status: 'current',
        },
      ]);

      if (videoRef.current) {
        videoRef.current.currentTime = 0;
        videoRef.current.play().catch(() => {});
      }
    } else {
      // Move to completely new question round
      onNextQuestion();
    }
  };

  // Keyboard controls: 1, 2, 3 (for 1+2), and Space/Enter for Next Action
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (isAnswered) {
        if (e.code === 'Space' || e.code === 'Enter') {
          e.preventDefault();
          handleNextAction();
        }
      } else {
        if (e.key === '1') {
          e.preventDefault();
          handleSelectButton('1');
        } else if (e.key === '2') {
          e.preventDefault();
          handleSelectButton('2');
        } else if (e.key === '3' || e.key === 'w' || e.key === 'W') {
          e.preventDefault();
          handleSelectButton('1+2');
        }
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isAnswered, pendingContinuation, activeMove, handleSelectButton, handleNextAction]);

  const validBreaks = activeValidBreaks || ['1', '2'];

  return (
    <div className="quiz-arena-container animate-slide-up">
      {/* Top Navigation Bar - Compact without clutter badges */}
      <div className="arena-top-nav">
        <div className="arena-nav-left">
          <button className="btn-arena-nav" onClick={onBackToMenu} title="Kembali ke Menu Utama">
            <ArrowLeft size={15} />
            <span>Menu Utama</span>
          </button>
          <button className="btn-arena-nav" onClick={onBackToSetup} title="Ganti Grappler & Opsi">
            <Settings size={15} />
            <span>Ganti Setup</span>
          </button>
        </div>
      </div>

      {/* Main Arena Box */}
      <div className="arena-card">
        {/* Compact Scenario Header: Move Name & Input only (matches Punish Mode compact layout) */}
        <div className="seq-hud-header">
          <div className="seq-hud-title">
            <span className="seq-actor-pill">
              {oppChar}
            </span>
            <span className="seq-move-heading">
              {question.isBlindMode && !isAnswered ? (
                'Bantingan Lawan (Membaca Visual)'
              ) : (
                <>
                  {activeMove?.name} <span className="scenario-move-input">({activeMove?.input})</span>
                </>
              )}
            </span>
          </div>
        </div>

        {/* Chain Progress Breadcrumb (Multistage Mode) */}
        {question.throwDrillType === 'multistage' && chainHistory.length > 0 && (
          <div className="chain-progress-bar-hud">
            <span className="cp-title">ALUR:</span>
            <div className="cp-steps">
              {chainHistory.map((step, idx) => (
                <div key={step.stage} className="cp-step-item">
                  {idx > 0 && <span className="cp-arrow">→</span>}
                  <span className={`cp-badge cp-${step.status}`}>
                    {step.stage}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Video Player */}
        <div className={`video-viewport ${isAnswered ? (evaluation?.status === 'escaped' ? 'video-border-success' : 'video-border-failed') : ''}`}>
          {/* Result Flash Overlay (Centang / X di tengah video) */}
          {showResultFlash && (
            <div className={`result-flash-overlay ${evaluation?.status === 'escaped' ? 'flash-success' : 'flash-failed'}`}>
              <div className="flash-icon-box">
                {evaluation?.status === 'escaped' ? (
                  <Check size={72} strokeWidth={3.5} />
                ) : (
                  <XCircle size={72} strokeWidth={3.5} />
                )}
              </div>
            </div>
          )}

          {activeMove?.video_url ? (
            <div className="video-wrapper">
              <video
                ref={videoRef}
                src={activeMove.video_url}
                autoPlay
                loop
                muted={isVideoMuted}
                playsInline
                className="move-video"
              />
              <button
                className="btn-audio-toggle"
                onClick={() => setIsVideoMuted(!isVideoMuted)}
                title={isVideoMuted ? 'Nyalakan Suara' : 'Bisukan Suara'}
              >
                {isVideoMuted ? <VolumeX size={16} /> : <Volume2 size={16} />}
              </button>
            </div>
          ) : (
            <div className="video-fallback">
              <Play size={36} className="pulse-icon text-amber" />
              <span className="fallback-text">Animasi bantingan {activeMove?.input}</span>
              <span className="fallback-sub">Data frame aktif &bull; Video sedang dipersiapkan</span>
            </div>
          )}
        </div>

        {/* Move Stat Strip */}
        <div className="move-stat-strip">
          <span className="stat-pill pill-target target-throw">
            THROW ({activeMove?.target || 'th(h)'})
          </span>
          <span className="stat-pill pill-escape">
            Break:{' '}
            <strong>
              {question.isBlindMode && !isAnswered ? '?' : activeRawBreakText || validBreaks.join(' / ')}
            </strong>
          </span>
        </div>
      </div>

      {/* Throw Break Reaction Buttons: 1, 2, 1+2 (Compact Side-by-Side) */}
      <div className="throw-buttons-grid">
        {(['1', '2', '1+2'] as ThrowBreakButton[]).map((btn) => {
          const isSelected = selectedButton === btn;
          const isCorrect = validBreaks.includes(btn);

          let btnClass = '';
          if (isAnswered) {
            if (isCorrect) {
              btnClass = 'choice-optimal';
            } else if (isSelected) {
              btnClass = 'choice-failed';
            } else {
              btnClass = 'choice-dimmed';
            }
          }

          let subLabel = '';
          if (btn === '1') subLabel = 'Kiri (LP)';
          else if (btn === '2') subLabel = 'Kanan (RP)';
          else subLabel = 'Kedua Tangan';

          let shortcutKey = btn === '1+2' ? '3 / W' : btn;

          return (
            <button
              key={btn}
              id={`btn-throw-${btn.replace('+', '')}`}
              className={`throw-reaction-btn ${btnClass} ${isSelected ? 'is-selected' : ''}`}
              onClick={() => handleSelectButton(btn)}
              disabled={isAnswered}
            >
              <div className="btn-top-indicator">
                {!isMobile && <span className="kbd-shortcut-pill">{shortcutKey}</span>}
                <Hand size={14} className="hand-icon" />
              </div>
              <span className="throw-btn-label">TOMBOL [ {btn} ]</span>
              <span className="throw-btn-sub">{subLabel}</span>
            </button>
          );
        })}
      </div>

      {/* Centered Next Round Control Bar with Verdict above the button */}
      {isAnswered && (
        <div className="arena-control-bar animate-fade-in">
          {verdictText && (
            <div className={`verdict-above-next-pill ${verdictText.status === 'success' ? 'verdict-pill-success' : 'verdict-pill-failed'}`}>
              <span>{verdictText.text}</span>
            </div>
          )}

          <button
            id="btn-next-round"
            className="btn-next btn-next-pulsing"
            onClick={handleNextAction}
          >
            <span>{pendingContinuation ? `RONDE BERIKUTNYA (TAHAP ${pendingContinuation.nextStageNum})` : 'RONDE BERIKUTNYA'}</span>
            <ArrowRight size={18} />
            {!isMobile && <span className="kbd-hint">Space / Enter</span>}
          </button>
        </div>
      )}


      <style>{`
        .quiz-arena-container {
          display: flex;
          flex-direction: column;
          gap: 14px;
          max-width: 900px;
          margin: 0 auto;
        }
        .arena-top-nav {
          display: flex;
          justify-content: space-between;
          align-items: center;
          gap: 10px;
          flex-wrap: wrap;
        }
        .arena-nav-left {
          display: flex;
          align-items: center;
          gap: 8px;
        }
        .btn-arena-nav {
          display: flex;
          align-items: center;
          gap: 6px;
          background: rgba(255, 255, 255, 0.05);
          border: 1px solid rgba(255, 255, 255, 0.1);
          color: var(--text-secondary);
          padding: 6px 12px;
          border-radius: var(--radius-sm);
          font-size: 0.8rem;
          font-weight: 700;
          cursor: pointer;
          transition: all 0.15s;
        }
        .btn-arena-nav:hover {
          color: #fff;
          background: rgba(255, 255, 255, 0.1);
        }
        .arena-nav-right {
          display: flex;
          align-items: center;
          gap: 8px;
          flex-wrap: wrap;
        }
        .blind-pill {
          display: flex;
          align-items: center;
          gap: 5px;
          font-size: 0.72rem;
          font-weight: 800;
          color: #ffaa00;
          background: rgba(255, 170, 0, 0.15);
          border: 1px solid rgba(255, 170, 0, 0.3);
          padding: 4px 8px;
          border-radius: var(--radius-full);
        }
        .mode-indicator {
          display: flex;
          align-items: center;
          gap: 6px;
          font-size: 0.78rem;
          font-weight: 800;
          letter-spacing: 0.05em;
          padding: 4px 10px;
          border-radius: var(--radius-full);
        }
        .ind-throw {
          background: rgba(255, 170, 0, 0.12);
          border: 1px solid rgba(255, 170, 0, 0.3);
          color: #ffaa00;
        }
        .matchup-tag {
          font-size: 0.78rem;
          font-weight: 700;
          color: var(--text-muted);
          background: rgba(255, 255, 255, 0.04);
          padding: 4px 8px;
          border-radius: var(--radius-sm);
        }
        .arena-card {
          background: #131622;
          border: 1px solid rgba(255, 255, 255, 0.08);
          border-radius: var(--radius-md);
          padding: 16px;
          display: flex;
          flex-direction: column;
          gap: 12px;
        }
        .seq-hud-header {
          display: flex;
          align-items: center;
          justify-content: flex-start;
          gap: 10px;
          flex-wrap: wrap;
        }
        .seq-hud-title {
          display: flex;
          align-items: center;
          gap: 8px;
          flex-wrap: wrap;
        }
        .seq-actor-pill {
          font-family: var(--font-display);
          font-size: 0.72rem;
          font-weight: 900;
          letter-spacing: 0.08em;
          text-transform: uppercase;
          color: #ffaa00;
          background: rgba(255, 170, 0, 0.12);
          border: 1px solid rgba(255, 170, 0, 0.3);
          padding: 2px 8px;
          border-radius: 4px;
        }
        .seq-move-heading {
          font-family: var(--font-display);
          font-size: 1.15rem;
          font-weight: 800;
          color: #fff;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }
        .scenario-move-input {
          color: #ffaa00;
          font-weight: 800;
        }
        .video-viewport {
          position: relative;
          background: #000;
          border-radius: var(--radius-sm);
          overflow: hidden;
          aspect-ratio: 16 / 9;
          display: flex;
          align-items: center;
          justify-content: center;
          border: 2px solid transparent;
          transition: border-color 0.25s, box-shadow 0.25s;
        }
        .video-border-success {
          border-color: #00f076 !important;
          box-shadow: 0 0 25px rgba(0, 240, 118, 0.45) !important;
        }
        .video-border-failed {
          border-color: #ff1e56 !important;
          box-shadow: 0 0 25px rgba(255, 30, 86, 0.45) !important;
        }

        /* Result Flash Overlay (Centang / X di tengah video) */
        .result-flash-overlay {
          position: absolute;
          inset: 0;
          display: flex;
          align-items: center;
          justify-content: center;
          pointer-events: none;
          z-index: 25;
          animation: flashFade 0.65s ease-out forwards;
        }
        .flash-icon-box {
          width: 96px;
          height: 96px;
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          animation: popScale 0.65s cubic-bezier(0.175, 0.885, 0.32, 1.275) forwards;
        }
        .flash-success .flash-icon-box {
          background: rgba(0, 240, 118, 0.25);
          border: 3px solid #00f076;
          color: #00f076;
          box-shadow: 0 0 35px rgba(0, 240, 118, 0.65);
        }
        .flash-failed .flash-icon-box {
          background: rgba(255, 30, 86, 0.25);
          border: 3px solid #ff1e56;
          color: #ff1e56;
          box-shadow: 0 0 35px rgba(255, 30, 86, 0.65);
        }
        @keyframes popScale {
          0% { transform: scale(0.35); opacity: 0; }
          35% { transform: scale(1.15); opacity: 1; }
          100% { transform: scale(1.0); opacity: 0.95; }
        }
        @keyframes flashFade {
          0% { opacity: 0; }
          20% { opacity: 1; }
          75% { opacity: 1; }
          100% { opacity: 0; }
        }

        .video-wrapper {
          position: relative;
          width: 100%;
          height: 100%;
        }
        .move-video {
          width: 100%;
          height: 100%;
          object-fit: contain;
        }
        .btn-audio-toggle {
          position: absolute;
          top: 10px;
          right: 10px;
          background: rgba(0, 0, 0, 0.6);
          border: 1px solid rgba(255, 255, 255, 0.2);
          color: #fff;
          border-radius: 50%;
          width: 32px;
          height: 32px;
          display: flex;
          align-items: center;
          justify-content: center;
          cursor: pointer;
        }
        .video-fallback {
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 6px;
        }
        .fallback-text {
          font-weight: 800;
          color: #fff;
          font-size: 1rem;
        }
        .fallback-sub {
          font-size: 0.75rem;
          color: var(--text-muted);
        }
        .move-stat-strip {
          display: flex;
          gap: 8px;
          align-items: center;
          flex-wrap: wrap;
          background: #0d0f18;
          padding: 8px 12px;
          border-radius: var(--radius-sm);
          border: 1px solid rgba(255, 255, 255, 0.06);
        }
        .stat-pill {
          padding: 4px 10px;
          border-radius: 4px;
          font-size: 0.8rem;
          background: rgba(255, 255, 255, 0.05);
          color: var(--text-secondary);
        }
        .stat-pill strong {
          color: #fff;
        }
        .target-throw {
          background: #ffaa00;
          color: #000;
          font-weight: 900;
        }

        /* Control Bar with Verdict directly above the button */
        .arena-control-bar {
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          gap: 10px;
          width: 100%;
          margin: 10px 0 12px 0;
        }
        .verdict-above-next-pill {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          gap: 6px;
          padding: 6px 18px;
          border-radius: var(--radius-full);
          font-family: var(--font-display);
          font-size: 0.95rem;
          font-weight: 900;
          letter-spacing: 0.04em;
          line-height: 1.2;
          box-shadow: 0 0 16px rgba(0, 0, 0, 0.4);
        }
        .verdict-pill-success {
          background: rgba(0, 240, 118, 0.15);
          border: 1.5px solid rgba(0, 240, 118, 0.6);
          color: var(--success-green);
          box-shadow: 0 0 16px rgba(0, 240, 118, 0.25);
        }
        .verdict-pill-failed {
          background: rgba(255, 30, 86, 0.15);
          border: 1.5px solid rgba(255, 30, 86, 0.6);
          color: var(--devil-crimson);
          box-shadow: 0 0 16px rgba(255, 30, 86, 0.25);
        }
        .btn-next {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          gap: 8px;
          background: linear-gradient(135deg, #00e5ff 0%, #0088ff 100%);
          color: #000;
          font-family: var(--font-display);
          font-weight: 900;
          font-size: 0.95rem;
          padding: 10px 24px;
          border-radius: var(--radius-full);
          border: none;
          cursor: pointer;
          transition: transform 0.15s, box-shadow 0.15s;
          letter-spacing: 0.04em;
        }
        .btn-next-pulsing {
          animation: nextPulse 1.8s infinite;
        }
        @keyframes nextPulse {
          0%, 100% { transform: scale(1); box-shadow: 0 0 14px rgba(0, 229, 255, 0.4); }
          50% { transform: scale(1.02); box-shadow: 0 0 24px rgba(0, 229, 255, 0.7); }
        }
        .kbd-hint {
          font-size: 0.7rem;
          background: rgba(0, 0, 0, 0.25);
          padding: 2px 6px;
          border-radius: 4px;
        }
        /* Chain Progress Breadcrumb HUD (Multistage Mode) */
        .chain-progress-bar-hud {
          display: flex;
          align-items: center;
          gap: 10px;
          background: rgba(0, 0, 0, 0.4);
          border: 1px solid rgba(255, 255, 255, 0.08);
          border-radius: var(--radius-sm);
          padding: 6px 12px;
          overflow-x: auto;
        }
        .cp-title {
          font-size: 0.72rem;
          font-weight: 900;
          letter-spacing: 0.06em;
          color: var(--text-muted);
          white-space: nowrap;
          text-transform: uppercase;
        }
        .cp-steps {
          display: flex;
          align-items: center;
          gap: 6px;
          flex-wrap: wrap;
        }
        .cp-step-item {
          display: flex;
          align-items: center;
          gap: 6px;
        }
        .cp-arrow {
          color: var(--text-muted);
          font-size: 0.8rem;
          font-weight: 800;
        }
        .cp-badge {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          min-width: 24px;
          height: 24px;
          padding: 0 6px;
          border-radius: var(--radius-full);
          font-size: 0.82rem;
          font-weight: 900;
          letter-spacing: 0.02em;
          white-space: nowrap;
          line-height: 1;
        }
        .cp-current {
          background: rgba(0, 136, 255, 0.22);
          border: 1.5px solid #0088ff;
          color: #00b0ff;
          box-shadow: 0 0 10px rgba(0, 136, 255, 0.4);
        }
        .cp-failed {
          background: rgba(255, 30, 86, 0.22);
          border: 1.5px solid #ff1e56;
          color: #ff3366;
          box-shadow: 0 0 10px rgba(255, 30, 86, 0.3);
        }
        .cp-escaped {
          background: rgba(0, 240, 118, 0.22);
          border: 1.5px solid #00f076;
          color: #00f076;
          box-shadow: 0 0 10px rgba(0, 240, 118, 0.3);
        }


        /* Throw Reaction Buttons Grid - Always 3 columns side-by-side */
        .throw-buttons-grid {
          display: grid;
          grid-template-columns: repeat(3, 1fr) !important;
          gap: 8px;
          width: 100%;
        }
        .throw-reaction-btn {
          background: #131622;
          border: 1.5px solid rgba(255, 255, 255, 0.1);
          border-radius: var(--radius-sm);
          padding: 8px 6px;
          min-height: 52px;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          gap: 2px;
          cursor: pointer;
          transition: all 0.15s ease-in-out;
        }
        .throw-reaction-btn:hover:not(:disabled) {
          border-color: #ffaa00;
          background: rgba(255, 170, 0, 0.08);
          transform: translateY(-1px);
        }
        .btn-top-indicator {
          display: flex;
          align-items: center;
          justify-content: space-between;
          width: 100%;
          padding: 0 4px;
        }
        .kbd-shortcut-pill {
          font-size: 0.65rem;
          font-weight: 800;
          color: var(--text-muted);
          background: rgba(255, 255, 255, 0.06);
          padding: 1px 5px;
          border-radius: 3px;
        }
        .hand-icon {
          color: var(--text-muted);
        }
        .throw-btn-label {
          font-family: var(--font-display);
          font-size: 1.05rem;
          font-weight: 900;
          color: #fff;
          letter-spacing: 0.04em;
          line-height: 1.1;
        }
        .throw-btn-sub {
          font-size: 0.68rem;
          color: var(--text-secondary);
          font-weight: 600;
          white-space: nowrap;
        }
        .choice-optimal {
          border-color: var(--success-green) !important;
          background: rgba(0, 240, 118, 0.18) !important;
          box-shadow: 0 0 16px rgba(0, 240, 118, 0.3);
        }
        .choice-optimal .throw-btn-label {
          color: var(--success-green);
        }
        .choice-failed {
          border-color: var(--devil-crimson) !important;
          background: rgba(255, 30, 86, 0.18) !important;
          box-shadow: 0 0 16px rgba(255, 30, 86, 0.3);
        }
        .choice-dimmed {
          opacity: 0.45;
        }


        @media (max-width: 600px) {
          .arena-top-nav {
            flex-direction: row;
            align-items: center;
            gap: 8px;
          }
          .arena-nav-left {
            display: flex;
            width: 100%;
            gap: 8px;
          }
          .btn-arena-nav {
            flex: 1;
            min-height: 38px;
            justify-content: center;
            font-size: 0.8rem;
          }
          .video-viewport {
            height: 200px;
          }
          .throw-buttons-grid {
            grid-template-columns: repeat(3, 1fr) !important;
            gap: 6px;
          }
          .throw-reaction-btn {
            min-height: 48px;
            padding: 6px 4px;
          }
          .throw-btn-label {
            font-size: 0.95rem;
          }
          .throw-btn-sub {
            font-size: 0.62rem;
          }
          .throw-reaction-btn:active:not(:disabled) {
            transform: scale(0.97);
          }
        }
      `}</style>
    </div>
  );
};
