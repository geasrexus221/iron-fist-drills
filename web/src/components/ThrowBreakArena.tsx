import React, { useState, useEffect, useRef, useCallback } from 'react';
import type { QuizQuestion, CharacterName, ThrowBreakButton, ThrowBreakEvaluation, Move, QuizScore } from '../types/tekken';
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
  Trophy,
  Timer,
  EyeOff,
  RotateCcw,
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
  score?: QuizScore;
  onBackToMenu: () => void;
  onBackToSetup: () => void;
  onRetrySession?: () => void;
}

export const ThrowBreakArena: React.FC<ThrowBreakArenaProps> = ({
  question,
  onNextQuestion,
  onAnswerRecorded,
  oppChar,
  score,
  onBackToMenu,
  onBackToSetup,
  onRetrySession,
}) => {
  const { isMobile } = useDeviceType();
  const [selectedButton, setSelectedButton] = useState<ThrowBreakButton | null>(null);
  const [isAnswered, setIsAnswered] = useState(false);
  const [evaluation, setEvaluation] = useState<ThrowBreakEvaluation | null>(null);
  const [isVideoMuted, setIsVideoMuted] = useState(true);
  const [showResultFlash, setShowResultFlash] = useState(false);

  // Modifiers state
  const [survivalHp, setSurvivalHp] = useState<number>(3);
  const [summaryModal, setSummaryModal] = useState<{
    isOpen: boolean;
    status: 'completed' | 'game-over';
    title: string;
    subtitle: string;
  } | null>(null);

  // Active move & chain stage states (supports multi-stage sequential transitions)
  const [activeMove, setActiveMove] = useState(question.throwMove);
  const [activeChainStage, setActiveChainStage] = useState(question.chainStage || 1);
  const [activeFollowups, setActiveFollowups] = useState(question.chainFollowups || []);
  const [activeValidBreaks, setActiveValidBreaks] = useState(question.validBreaks || ['1', '2']);
  const [activeRawBreakText, setActiveRawBreakText] = useState(question.rawBreakText || '');

  const maxBlitzTime = 4.0 + Math.max(0, (activeChainStage || 1) - 1) * 1.0;
  const [timeLeft, setTimeLeft] = useState<number>(maxBlitzTime);
  const [isVideoPlaying, setIsVideoPlaying] = useState<boolean>(false);

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

    const initialMaxTime = 4.0 + Math.max(0, initialStage - 1) * 1.0;
    setTimeLeft(initialMaxTime);
    setIsVideoPlaying(!question.throwMove?.video_url);

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

  // Blitz mode timeout handler
  const handleTimeout = useCallback(() => {
    if (isAnswered) return;
    setIsAnswered(true);
    setSelectedButton(null);
    setPendingContinuation(null);
    setVerdictText({
      status: 'failed',
      text: `WAKTU HABIS! (${maxBlitzTime.toFixed(1)} Detik)`,
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

    if (question.isSurvivalMode) {
      setSurvivalHp((prev) => {
        const next = Math.max(0, prev - 1);
        if (next === 0) {
          setSummaryModal({
            isOpen: true,
            status: 'game-over',
            title: 'GAME OVER',
            subtitle: 'Nyawa Anda telah habis akibat kehabisan waktu di Blitz Mode!',
          });
        }
        return next;
      });
    }
  }, [isAnswered, activeChainStage, onAnswerRecorded, question.isSurvivalMode, maxBlitzTime]);

  // Blitz mode timer countdown: ONLY starts once video is playing!
  useEffect(() => {
    if (!question.isBlitzMode || isAnswered || summaryModal?.isOpen) return;
    if (activeMove?.video_url && !isVideoPlaying) return;

    const timer = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 0.05) {
          clearInterval(timer);
          handleTimeout();
          return 0;
        }
        return Math.max(0, prev - 0.05);
      });
    }, 50);

    return () => clearInterval(timer);
  }, [question.isBlitzMode, isAnswered, summaryModal, handleTimeout, activeMove?.video_url, isVideoPlaying]);

  const handleSelectButton = useCallback((button: ThrowBreakButton) => {
    if (isAnswered || !activeMove) return;

    setSelectedButton(button);

    // Single play mode: replay video on answer
    if (question.isSinglePlay && videoRef.current) {
      videoRef.current.play().catch(() => {});
    }

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

    // Survival Mode HP damage on fail
    if (question.isSurvivalMode) {
      setSurvivalHp((prev) => {
        const next = Math.max(0, prev - 1);
        if (next === 0) {
          setSummaryModal({
            isOpen: true,
            status: 'game-over',
            title: 'GAME OVER',
            subtitle: 'Nyawa Anda telah habis! Bantingan tidak berhasil di-break.',
          });
        }
        return next;
      });
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
  }, [
    isAnswered,
    activeMove,
    question.isSinglePlay,
    question.isSurvivalMode,
    question.throwDrillType,
    activeChainStage,
    activeFollowups,
    oppChar,
    onAnswerRecorded,
  ]);

  const handleNextAction = useCallback(() => {
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

      const stageTime = 4.0 + Math.max(0, nextStageNum - 1) * 1.0;
      setTimeLeft(stageTime);
      setIsVideoPlaying(!nextMove.video_url);

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
      if (question.sessionScope === 'gauntlet' && question.gauntletIndex === question.gauntletTotal) {
        setSummaryModal({
          isOpen: true,
          status: 'completed',
          title: 'GAUNTLET TUNTAS!',
          subtitle: `Selamat! Semua ${question.gauntletTotal} bantingan dalam tantangan Gauntlet berhasil Anda selesaikan.`,
        });
        return;
      }
      onNextQuestion();
    }
  }, [pendingContinuation, question.sessionScope, question.gauntletIndex, question.gauntletTotal, onNextQuestion]);

  const handleRetryFromModal = useCallback(() => {
    setSummaryModal(null);
    setSurvivalHp(3);
    if (onRetrySession) {
      onRetrySession();
    } else {
      onNextQuestion();
    }
  }, [onRetrySession, onNextQuestion]);

  // Keyboard controls: 1, 2, 3 (for 1+2), and Space/Enter for Next Action
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (summaryModal?.isOpen) {
        if (e.key === 'Enter') {
          e.preventDefault();
          handleRetryFromModal();
        } else if (e.key === 'Escape') {
          e.preventDefault();
          setSummaryModal(null);
          onBackToSetup();
        }
        return;
      }

      if (e.key === 'Escape') {
        e.preventDefault();
        onBackToSetup();
        return;
      }

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
  }, [
    isAnswered,
    summaryModal,
    handleRetryFromModal,
    onBackToSetup,
    handleSelectButton,
    handleNextAction,
  ]);

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

        {/* HUD Modifiers & Badges */}
        <div className="arena-nav-right">
          {question.sessionScope === 'gauntlet' && (
            <div className="hud-gauntlet-tag">
              <Trophy size={14} className="text-gold" />
              <span>GAUNTLET: {question.gauntletIndex ?? 1} / {question.gauntletTotal ?? 1}</span>
            </div>
          )}

          {question.isSurvivalMode && (
            <div className="hud-survival-tag">
              <span className="hud-label">HP</span>
              <div className="hud-hearts-row">
                {[1, 2, 3].map((heartIndex) => (
                  <span
                    key={heartIndex}
                    className={`hud-heart ${heartIndex <= survivalHp ? 'heart-full' : 'heart-empty'}`}
                    title={heartIndex <= survivalHp ? 'Nyawa Aktif' : 'Nyawa Hilang'}
                  >
                    ♥
                  </span>
                ))}
              </div>
            </div>
          )}

          {question.isSinglePlay && (
            <span className="hud-mode-pill pill-singleplay">
              <EyeOff size={13} />
              <span>SINGLE PLAY</span>
            </span>
          )}

          {question.isBlitzMode && (
            <div className="hud-blitz-box">
              <div className="hud-blitz-text">
                <Timer size={13} className="text-amber" />
                <span>
                  BLITZ:{' '}
                  {!isVideoPlaying && activeMove?.video_url
                    ? `MEMUAT VIDEO (${maxBlitzTime.toFixed(1)}s)`
                    : `${timeLeft.toFixed(1)}s`}
                </span>
              </div>
              <div className="hud-blitz-bar-bg">
                <div
                  className="hud-blitz-bar-fill"
                  style={{
                    width: `${Math.max(0, (timeLeft / maxBlitzTime) * 100)}%`,
                    background:
                      !isVideoPlaying && activeMove?.video_url
                        ? 'var(--warning-amber)'
                        : timeLeft > maxBlitzTime * 0.5
                        ? 'var(--electric-cyan)'
                        : timeLeft > maxBlitzTime * 0.25
                        ? 'var(--heihachi-gold)'
                        : 'var(--devil-crimson)',
                  }}
                />
              </div>
            </div>
          )}
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
                loop={isAnswered || !question.isSinglePlay}
                onPlaying={() => setIsVideoPlaying(true)}
                onEnded={() => {
                  if (question.isSinglePlay && !isAnswered) {
                    videoRef.current?.pause();
                  }
                }}
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
            <span>
              {pendingContinuation
                ? `RONDE BERIKUTNYA (TAHAP ${pendingContinuation.nextStageNum})`
                : question.sessionScope === 'gauntlet' && question.gauntletIndex === question.gauntletTotal
                ? 'Selesai & Lihat Hasil'
                : 'RONDE BERIKUTNYA'}
            </span>
            <ArrowRight size={18} />
            {!isMobile && <span className="kbd-hint">Space / Enter</span>}
          </button>
        </div>
      )}

      {/* Session Summary Modal (Pop-up saat Gauntlet Tuntas atau Survival Game Over) */}
      {summaryModal?.isOpen && (
        <div className="session-summary-overlay animate-fade-in">
          <div className="session-summary-card animate-slide-up" onClick={(e) => e.stopPropagation()}>
            <div className={`summary-header-badge ${summaryModal.status === 'completed' ? 'badge-complete' : 'badge-gameover'}`}>
              {summaryModal.status === 'completed' ? <Trophy size={34} /> : <XCircle size={34} />}
            </div>
            <h2 className="summary-title">{summaryModal.title}</h2>
            <p className="summary-subtitle">{summaryModal.subtitle}</p>

            <div className="summary-stats-grid">
              <div className="summary-stat-box">
                <span className="stat-num">{score?.totalAnswered || 0}</span>
                <span className="stat-label">Total Bantingan</span>
              </div>
              <div className="summary-stat-box">
                <span className="stat-num text-cyan">
                  {score?.totalAnswered ? Math.round(((score.correctCount || 0) / score.totalAnswered) * 100) : 0}%
                </span>
                <span className="stat-label">Akurasi Break</span>
              </div>
              <div className="summary-stat-box">
                <span className="stat-num text-gold">{score?.optimalCount || 0}</span>
                <span className="stat-label">Break Sukses</span>
              </div>
              <div className="summary-stat-box">
                <span className="stat-num text-green">{score?.bestStreak || 0}</span>
                <span className="stat-label">Best Streak</span>
              </div>
            </div>

            <div className="summary-actions-row">
              <button
                id="btn-summary-retry"
                type="button"
                className="btn-summary-retry"
                onClick={handleRetryFromModal}
              >
                <RotateCcw size={16} />
                <span>Ulangi (Retry)</span>
              </button>
              <button
                id="btn-summary-exit"
                type="button"
                className="btn-summary-exit"
                onClick={() => {
                  setSummaryModal(null);
                  onBackToSetup();
                }}
              >
                <ArrowLeft size={16} />
                <span>Menu Utama / Setup</span>
              </button>
            </div>
          </div>
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

        /* HUD Badges & Modifiers */
        .arena-nav-right {
          display: flex;
          align-items: center;
          gap: 8px;
        }
        .hud-gauntlet-tag {
          display: flex;
          align-items: center;
          gap: 6px;
          font-family: var(--font-display);
          font-size: 0.75rem;
          font-weight: 900;
          color: var(--heihachi-gold);
          background: rgba(255, 183, 3, 0.1);
          border: 1px solid rgba(255, 183, 3, 0.3);
          padding: 4px 10px;
          border-radius: var(--radius-full);
          letter-spacing: 0.04em;
        }
        .hud-survival-tag {
          display: flex;
          align-items: center;
          gap: 6px;
          background: rgba(255, 30, 86, 0.1);
          border: 1px solid rgba(255, 30, 86, 0.3);
          padding: 3px 10px;
          border-radius: var(--radius-full);
        }
        .hud-survival-tag .hud-label {
          font-size: 0.7rem;
          font-weight: 900;
          color: var(--devil-crimson);
        }
        .hud-hearts-row {
          display: flex;
          gap: 4px;
          font-size: 1.05rem;
          line-height: 1;
        }
        .hud-heart.heart-full {
          color: var(--devil-crimson);
          text-shadow: 0 0 8px rgba(255, 30, 86, 0.6);
        }
        .hud-heart.heart-empty {
          color: rgba(255, 255, 255, 0.2);
        }
        .hud-mode-pill {
          display: flex;
          align-items: center;
          gap: 5px;
          font-size: 0.72rem;
          font-weight: 800;
          padding: 3px 8px;
          border-radius: var(--radius-full);
        }
        .pill-singleplay {
          color: var(--electric-cyan);
          background: rgba(0, 229, 255, 0.1);
          border: 1px solid rgba(0, 229, 255, 0.25);
        }
        .hud-blitz-box {
          display: flex;
          flex-direction: column;
          gap: 3px;
          min-width: 110px;
        }
        .hud-blitz-text {
          display: flex;
          align-items: center;
          gap: 5px;
          font-family: var(--font-display);
          font-size: 0.75rem;
          font-weight: 900;
          color: var(--heihachi-gold);
        }
        .hud-blitz-bar-bg {
          width: 100%;
          height: 5px;
          background: rgba(255, 255, 255, 0.1);
          border-radius: 3px;
          overflow: hidden;
        }
        .hud-blitz-bar-fill {
          height: 100%;
          transition: width 0.06s linear, background-color 0.2s;
        }

        /* Session Summary Modal */
        .session-summary-overlay {
          position: fixed;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          background: rgba(0, 0, 0, 0.82);
          backdrop-filter: blur(8px);
          display: flex;
          align-items: center;
          justify-content: center;
          z-index: 10000;
          padding: 16px;
        }
        .session-summary-card {
          background: #111420;
          border: 1.5px solid rgba(255, 255, 255, 0.12);
          border-radius: var(--radius-lg);
          padding: 28px 24px;
          max-width: 440px;
          width: 100%;
          text-align: center;
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 16px;
          box-shadow: 0 10px 40px rgba(0, 0, 0, 0.7);
        }
        .summary-header-badge {
          width: 68px;
          height: 68px;
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
        }
        .badge-complete {
          background: rgba(255, 183, 3, 0.15);
          color: var(--heihachi-gold);
          border: 2px solid var(--heihachi-gold);
          box-shadow: 0 0 20px rgba(255, 183, 3, 0.3);
        }
        .badge-gameover {
          background: rgba(255, 30, 86, 0.15);
          color: var(--devil-crimson);
          border: 2px solid var(--devil-crimson);
          box-shadow: 0 0 20px rgba(255, 30, 86, 0.3);
        }
        .summary-title {
          font-family: var(--font-display);
          font-size: 1.6rem;
          font-weight: 900;
          color: #fff;
          margin: 0;
          letter-spacing: 0.05em;
        }
        .summary-subtitle {
          font-size: 0.85rem;
          color: var(--text-secondary);
          margin: 0;
          line-height: 1.4;
        }
        .summary-stats-grid {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 10px;
          width: 100%;
        }
        .summary-stat-box {
          background: rgba(255, 255, 255, 0.03);
          border: 1px solid rgba(255, 255, 255, 0.06);
          border-radius: var(--radius-sm);
          padding: 10px;
          display: flex;
          flex-direction: column;
          gap: 2px;
        }
        .summary-stat-box .stat-num {
          font-family: var(--font-display);
          font-size: 1.35rem;
          font-weight: 900;
          color: #fff;
        }
        .summary-stat-box .stat-label {
          font-size: 0.7rem;
          color: var(--text-muted);
          text-transform: uppercase;
          letter-spacing: 0.05em;
        }
        .summary-actions-row {
          display: flex;
          gap: 10px;
          width: 100%;
          margin-top: 6px;
        }
        .btn-summary-retry,
        .btn-summary-exit {
          flex: 1;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 6px;
          padding: 12px 14px;
          border-radius: var(--radius-sm);
          font-family: var(--font-display);
          font-size: 0.85rem;
          font-weight: 800;
          cursor: pointer;
          transition: all 0.15s ease-in-out;
        }
        .btn-summary-retry {
          background: linear-gradient(135deg, #00e5ff 0%, #0088ff 100%);
          color: #000;
          border: none;
        }
        .btn-summary-retry:hover {
          opacity: 0.95;
          transform: translateY(-1px);
        }
        .btn-summary-exit {
          background: rgba(255, 255, 255, 0.06);
          border: 1px solid rgba(255, 255, 255, 0.12);
          color: #fff;
        }
        .btn-summary-exit:hover {
          background: rgba(255, 255, 255, 0.1);
        }

        @media (max-width: 600px) {
          .arena-top-nav {
            flex-direction: column;
            align-items: stretch;
            gap: 8px;
          }
          .arena-nav-right {
            justify-content: space-between;
            width: 100%;
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
