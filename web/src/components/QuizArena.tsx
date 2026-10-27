import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import type { QuizQuestion, Move, PunishEvaluation, FrameTrapEvaluation, InputFormat, CharacterName, QuizScore } from '../types/tekken';
import { evaluatePunish, evaluateFrameTrap } from '../utils/engine';
import { FullMovelistModal } from './FullMovelistModal';
import { useDeviceType, triggerHaptic } from '../hooks/useDeviceType';
import { Play, Check, XCircle, ArrowRight, BookOpen, Volume2, VolumeX, ArrowLeft, Settings, Scissors, Shield, Zap, Timer, EyeOff, Trophy, RotateCcw } from 'lucide-react';

export interface GenericOption {
  id: string;
  speed: number;
  label: string;
  title: string;
  key: string;
  isLauncher?: boolean;
}

export const GENERIC_FRAME_OPTIONS: GenericOption[] = [
  { id: 'i10', speed: 10, label: 'i10', title: 'Jab Punish', key: '1' },
  { id: 'i11', speed: 11, label: 'i11', title: 'Fast Punish', key: '2' },
  { id: 'i12', speed: 12, label: 'i12', title: 'Medium Punish', key: '3' },
  { id: 'i13', speed: 13, label: 'i13', title: 'Heavy Punish (13-14f)', key: '4' },
  { id: 'i15', speed: 15, label: 'i15', title: 'Standard Launcher', key: '5', isLauncher: true },
  { id: 'i15_plus', speed: 16, label: 'i15>', title: 'Heavy / Stagger Launch', key: '6', isLauncher: true },
];

interface QuizArenaProps {
  question: QuizQuestion;
  format: InputFormat;
  onNextQuestion: () => void;
  onAnswerRecorded: (isCorrect: boolean, isOptimal: boolean) => void;
  userChar: CharacterName;
  oppChar: CharacterName;
  score?: QuizScore;
  onOpenMovelist?: () => void;
  onBackToMenu: () => void;
  onBackToSetup: () => void;
  onRetrySession?: () => void;
}

export const QuizArena: React.FC<QuizArenaProps> = ({
  question,
  format,
  onNextQuestion,
  onAnswerRecorded,
  userChar,
  oppChar,
  score,
  onBackToMenu,
  onBackToSetup,
  onRetrySession,
}) => {
  const { isMobile } = useDeviceType();
  const [selectedMove, setSelectedMove] = useState<Move | null>(null);
  const [selectedGenericId, setSelectedGenericId] = useState<string | null>(null);
  const [choseSafe, setChoseSafe] = useState(false);
  const [isAnswered, setIsAnswered] = useState(false);
  const [punishEval, setPunishEval] = useState<PunishEvaluation | null>(null);
  const [frameTrapEval, setFrameTrapEval] = useState<FrameTrapEvaluation | null>(null);
  const [isMovelistOpen, setIsMovelistOpen] = useState(false);
  const [isVideoMuted, setIsVideoMuted] = useState(true);
  const [showResultFlash, setShowResultFlash] = useState(false);

  // Modifiers state
  const [survivalHp, setSurvivalHp] = useState<number>(3);
  const maxBlitzTime = question.maxBlitzTime || 4.0;
  const [timeLeft, setTimeLeft] = useState<number>(maxBlitzTime);
  const [isVideoPlaying, setIsVideoPlaying] = useState<boolean>(false);
  const [summaryModal, setSummaryModal] = useState<{
    isOpen: boolean;
    status: 'completed' | 'game-over';
    title: string;
    subtitle: string;
  } | null>(null);

  const videoRef = useRef<HTMLVideoElement>(null);
  const flashTimeoutRef = useRef<number | null>(null);

  const currentDisplayMove =
    question.mode === 'punishment' ? question.opponentMove : question.userLeadMove;
  const isPunishMode = question.mode === 'punishment';

  // Reset state on new question
  useEffect(() => {
    setSelectedMove(null);
    setSelectedGenericId(null);
    setChoseSafe(false);
    setIsAnswered(false);
    setPunishEval(null);
    setFrameTrapEval(null);
    setShowResultFlash(false);
    setTimeLeft(question.maxBlitzTime || 4.0);
    setIsVideoPlaying(!currentDisplayMove?.video_url);
    if (flashTimeoutRef.current) clearTimeout(flashTimeoutRef.current);

    if (videoRef.current) {
      videoRef.current.currentTime = 0;
      videoRef.current.play().catch(() => {});
    }
  }, [question.id, question.maxBlitzTime, currentDisplayMove?.video_url]);

  useEffect(() => {
    return () => {
      if (flashTimeoutRef.current) clearTimeout(flashTimeoutRef.current);
    };
  }, []);

  // Blitz mode timeout handler
  const handleTimeout = useCallback(() => {
    if (isAnswered) return;
    setIsAnswered(true);
    setSelectedMove(null);
    setSelectedGenericId(null);
    setChoseSafe(false);
    setShowResultFlash(true);
    if (flashTimeoutRef.current) clearTimeout(flashTimeoutRef.current);
    flashTimeoutRef.current = window.setTimeout(() => setShowResultFlash(false), 650);

    const msg = `WAKTU HABIS! Batas respon ${maxBlitzTime.toFixed(1)} detik telah terlampaui.`;
    if (question.mode === 'punishment') {
      setPunishEval({
        status: 'too-slow',
        frameDiff: 0,
        damageDealt: '0',
        message: msg,
      });
    } else {
      setFrameTrapEval({
        status: 'interrupted',
        effectiveStartup: 99,
        frameDiff: 99,
        message: msg,
      });
    }

    onAnswerRecorded(false, false);
    triggerHaptic('error');

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
  }, [isAnswered, onAnswerRecorded, question, maxBlitzTime]);

  // Blitz mode timer countdown: ONLY starts once video is playing!
  useEffect(() => {
    if (!question.isBlitzMode || isAnswered || summaryModal?.isOpen) return;
    if (currentDisplayMove?.video_url && !isVideoPlaying) return;

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
  }, [question.isBlitzMode, isAnswered, summaryModal, handleTimeout, currentDisplayMove?.video_url, isVideoPlaying]);

  const handleSelectMove = useCallback(
    (move: Move | null) => {
      if (isAnswered) return;

      setSelectedMove(move);
      setChoseSafe(move === null);
      setIsAnswered(true);

      // In single play mode: resume and loop video when answered
      if (question.isSinglePlay && videoRef.current) {
        videoRef.current.play().catch(() => {});
      }

      // Trigger brief flash icon in center of video
      setShowResultFlash(true);
      if (flashTimeoutRef.current) clearTimeout(flashTimeoutRef.current);
      flashTimeoutRef.current = window.setTimeout(() => {
        setShowResultFlash(false);
      }, 650);

      let isCorrect = false;
      let isOptimal = false;

      if (question.mode === 'punishment' && question.opponentMove) {
        const evaluation = evaluatePunish(question.opponentMove, move);
        setPunishEval(evaluation);

        isCorrect = evaluation.status !== 'too-slow';
        isOptimal = evaluation.status === 'optimal';
        onAnswerRecorded(isCorrect, isOptimal);
        triggerHaptic(isCorrect ? 'success' : 'error');
      } else if (question.mode === 'frame-trap' && question.userLeadMove && move) {
        const evaluation = evaluateFrameTrap(
          question.userLeadMove,
          question.condition || 'hit',
          move
        );
        setFrameTrapEval(evaluation);

        isCorrect = evaluation.status === 'counter-hit';
        isOptimal = evaluation.status === 'counter-hit';
        onAnswerRecorded(isCorrect, isOptimal);
        triggerHaptic(isCorrect ? 'success' : 'error');
      }

      // Survival Mode HP deduction on mistake
      if (question.isSurvivalMode && !isCorrect) {
        setSurvivalHp((prev) => {
          const next = Math.max(0, prev - 1);
          if (next === 0) {
            setSummaryModal({
              isOpen: true,
              status: 'game-over',
              title: 'GAME OVER',
              subtitle: 'Nyawa Anda telah habis! Seluruh 3 HP berkurang.',
            });
          }
          return next;
        });
      }
    },
    [isAnswered, onAnswerRecorded, question]
  );

  const handleSelectGeneric = useCallback(
    (opt: GenericOption | null) => {
      if (isAnswered) return;

      if (opt === null) {
        triggerHaptic('medium');
        setSelectedGenericId('safe');
        handleSelectMove(null);
        return;
      }

      triggerHaptic('light');
      setSelectedGenericId(opt.id);

      const moveObj: Move = {
        id: `generic-${opt.id}`,
        character: userChar,
        name: `${userChar} ${opt.title}`,
        input: opt.label,
        damage: opt.isLauncher ? 'Combo Launch' : 'Guaranteed',
        startup: opt.label,
        startup_num: opt.speed,
        block: '',
        block_num: null,
        hit: '',
        hit_num: null,
        ch: '',
        ch_num: null,
        notes: '',
        is_low: false,
        is_high: false,
        is_mid: false,
        is_punishable: false,
        is_plus_on_block: false,
        is_plus_on_hit: false,
        is_launcher: !!opt.isLauncher,
      };

      handleSelectMove(moveObj);
    },
    [handleSelectMove, isAnswered, userChar]
  );

  const handleNextOrFinish = useCallback(() => {
    if (question.sessionScope === 'gauntlet' && question.gauntletIndex === question.gauntletTotal) {
      setSummaryModal({
        isOpen: true,
        status: 'completed',
        title: 'GAUNTLET TUNTAS!',
        subtitle: `Selamat! Semua ${question.gauntletTotal} gerakan dalam tantangan Gauntlet berhasil Anda tuntaskan.`,
      });
      return;
    }
    onNextQuestion();
  }, [question.sessionScope, question.gauntletIndex, question.gauntletTotal, onNextQuestion]);

  const handleRetryFromModal = useCallback(() => {
    setSummaryModal(null);
    setSurvivalHp(3);
    if (onRetrySession) {
      onRetrySession();
    } else {
      onNextQuestion();
    }
  }, [onRetrySession, onNextQuestion]);

  // Global Keyboard listener: Escape to exit, Space/Enter for next, 1-6 for generic frame choices
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // If modal is open, Enter retries and Escape exits
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

      // If full movelist modal is open, let modal handle Escape
      if (isMovelistOpen) return;

      // Escape key exits back to setup immediately
      if (e.key === 'Escape') {
        e.preventDefault();
        onBackToSetup();
        return;
      }

      // Next question via Space or Enter
      if (isAnswered && (e.code === 'Space' || e.code === 'Enter')) {
        e.preventDefault();
        handleNextOrFinish();
        return;
      }

      // Hotkeys for generic format
      if (!isAnswered && format === 'four-choices') {
        if (question.mode === 'punishment' && (e.key === 's' || e.key === 'S' || e.key === '0')) {
          e.preventDefault();
          handleSelectGeneric(null);
          return;
        }
        const match = GENERIC_FRAME_OPTIONS.find((opt) => opt.key === e.key);
        if (match) {
          e.preventDefault();
          handleSelectGeneric(match);
        }
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [
    isAnswered,
    isMovelistOpen,
    summaryModal,
    handleNextOrFinish,
    handleRetryFromModal,
    onBackToSetup,
    format,
    question.mode,
    handleSelectGeneric,
  ]);

  const isRoundSuccess = useMemo(() => {
    if (!isAnswered) return null;
    if (isPunishMode) {
      return punishEval ? punishEval.status !== 'too-slow' : false;
    } else {
      return frameTrapEval ? frameTrapEval.status !== 'interrupted' : false;
    }
  }, [isAnswered, isPunishMode, punishEval, frameTrapEval]);

  const moveDisplayName = useMemo(() => {
    if (!currentDisplayMove) return '';
    const name = (currentDisplayMove.name || '').trim();
    const input = (currentDisplayMove.input || '').trim();
    if (name && name.toLowerCase() !== input.toLowerCase()) {
      return `${name} (${input})`;
    }
    return input;
  }, [currentDisplayMove]);

  const parsedHits = useMemo(() => {
    if (!currentDisplayMove?.input) return [];
    const rawParts = currentDisplayMove.input.split(',').map((s) => s.trim()).filter(Boolean);
    const hits: string[] = [];
    let buffer = '';

    for (let i = 0; i < rawParts.length; i++) {
      const part = rawParts[i];
      const isPureDirection = /^(f|b|d|u|df|db|uf|ub|qcf|qcb|ws|fc|ss|wr)$/i.test(part);
      if (isPureDirection && i < rawParts.length - 1) {
        buffer = buffer ? `${buffer},${part}` : part;
      } else {
        if (buffer) {
          hits.push(`${buffer},${part}`);
          buffer = '';
        } else {
          hits.push(part);
        }
      }
    }
    if (buffer) hits.push(buffer);
    return hits.length > 0 ? hits : [currentDisplayMove.input];
  }, [currentDisplayMove?.input]);

  const renderTargetBadge = (target?: string) => {
    if (!target) return null;
    const t = target.toLowerCase();
    if (t.includes('l')) {
      return <span className="stat-pill pill-target target-low">LOW ({target})</span>;
    }
    if (t.includes('m')) {
      return <span className="stat-pill pill-target target-mid">MID ({target})</span>;
    }
    return <span className="stat-pill pill-target target-high">HIGH ({target})</span>;
  };

  return (
    <div className="quiz-arena-container animate-slide-up">
      {/* Top Arena Navigation Bar */}
      <div className="arena-top-nav">
        <div className="arena-nav-left">
          <button className="btn-arena-nav" onClick={onBackToMenu} title="Kembali ke Menu Utama">
            <ArrowLeft size={15} />
            <span>Menu Utama</span>
          </button>
          <button className="btn-arena-nav btn-arena-nav-accent" onClick={onBackToSetup} title="Ganti Karakter & Opsi (ESC)">
            <Settings size={15} />
            <span>{isMobile ? 'Ganti Setup' : 'Ganti Setup (ESC)'}</span>
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
                  {!isVideoPlaying && currentDisplayMove?.video_url
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
                      !isVideoPlaying && currentDisplayMove?.video_url
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
        {/* Interactive String Sequence Visualizer & Header */}
        <div className={`string-sequence-hud ${currentDisplayMove?.has_string_extensions ? 'hud-cut' : currentDisplayMove?.input?.includes(',') ? 'hud-full' : 'hud-single'}`}>
          <div className="seq-hud-header">
            <div className="seq-hud-title">
              <span className="seq-actor-pill">
                {isPunishMode ? `${oppChar}` : `${userChar}`}
              </span>

              {currentDisplayMove?.has_string_extensions ? (
                <>
                  <span className="seq-tag-badge badge-tag-amber">
                    <Scissors size={12} />
                    <span>POTONGAN STRING</span>
                  </span>
                  <span className="seq-move-heading">
                    {moveDisplayName}
                  </span>
                  <span className="seq-cut-alert-pill">
                    Berhenti di Hit #{parsedHits.length} (Lanjutan batal)
                  </span>
                </>
              ) : currentDisplayMove?.input?.includes(',') ? (
                <>
                  <span className="seq-tag-badge badge-tag-green">
                    <Check size={12} />
                    <span>FULL STRING</span>
                  </span>
                  <span className="seq-move-heading">
                    {moveDisplayName}
                  </span>
                  <span className="seq-full-alert-pill">
                    {parsedHits.length} Hits Selesai
                  </span>
                </>
              ) : (
                <>
                  <span className="seq-tag-badge badge-tag-cyan">
                    <Zap size={12} />
                    <span>GERAKAN TUNGGAL</span>
                  </span>
                  <span className="seq-move-heading">
                    {moveDisplayName}
                  </span>
                </>
              )}
            </div>

          </div>

          <div className="seq-chain-row">
            {parsedHits.map((hit, idx) => {
              const isTargetHit = idx === parsedHits.length - 1;
              return (
                <React.Fragment key={idx}>
                  <div className={`seq-hit-node ${isTargetHit ? 'node-target' : 'node-prev'}`}>
                    <span className="node-idx">HIT #{idx + 1}</span>
                    <span className="node-code">{hit}</span>
                    <span className="node-status">{isTargetHit ? 'DITAHAN (BLOCK)' : 'TERHUBUNG'}</span>
                  </div>
                  {idx < parsedHits.length - 1 && <span className="seq-connector">&rarr;</span>}
                </React.Fragment>
              );
            })}

            {/* If Incomplete String: Show Cut Node and Ghost Continuation */}
            {currentDisplayMove?.has_string_extensions && (
              <>
                <span className="seq-connector text-amber">&rarr;</span>
                <div className="seq-hit-node node-stop">
                  <span className="node-idx text-amber">STOP</span>
                  <span className="node-code text-amber"><Scissors size={12} /> BERHENTI</span>
                  <span className="node-status text-amber">DIHENTIKAN</span>
                </div>
                {currentDisplayMove.string_extension_sample && (
                  <div className="seq-hit-node node-ghost" title="Lanjutan ini tidak dikeluarkan oleh lawan">
                    <span className="node-idx">LANJUTAN</span>
                    <span className="node-code text-muted">{currentDisplayMove.string_extension_sample}</span>
                    <span className="node-status text-muted">BATAL / OFF</span>
                  </div>
                )}
              </>
            )}

            {/* If Full String Completed */}
            {!currentDisplayMove?.has_string_extensions && currentDisplayMove?.input?.includes(',') && (
              <>
                <span className="seq-connector text-green">&rarr;</span>
                <div className="seq-hit-node node-complete">
                  <span className="node-idx text-green">FINISH</span>
                  <span className="node-code text-green"><Check size={12} /> SELESAI</span>
                  <span className="node-status text-green">FULL COMBO</span>
                </div>
              </>
            )}
          </div>
        </div>

        {/* Video Player with Border Glow & Center Flash Result */}
        <div className={`video-viewport ${isAnswered ? (isRoundSuccess ? 'video-border-success' : 'video-border-failed') : ''}`}>
          {/* Result Flash Overlay (Centang / X di tengah video) */}
          {showResultFlash && (
            <div className={`result-flash-overlay ${isRoundSuccess ? 'flash-success' : 'flash-failed'}`}>
              <div className="flash-icon-box">
                {isRoundSuccess ? <Check size={72} strokeWidth={3.5} /> : <XCircle size={72} strokeWidth={3.5} />}
              </div>
            </div>
          )}

          {/* Floating Center-Bottom HUD (di tengah bawah video / di bawah kaki petarung) */}
          {!isPunishMode && (
            currentDisplayMove?.is_string_video ? (
              <div className="video-center-bottom-hud hud-string-video">
                <div className="hud-content-wrap">
                  <span className="pulse-dot dot-amber" />
                  <span className="hud-focus-pill">
                    FOKUS: <strong>{currentDisplayMove.input}</strong>
                  </span>
                  <span className="hud-divider">&bull;</span>
                  <span className="hud-desc-text">
                    {isMobile ? (
                      <>Klip: <strong>{currentDisplayMove.video_string_parent}</strong> (abaikan sisa)</>
                    ) : (
                      <>Klip Full String: <strong>{currentDisplayMove.video_string_parent}</strong> &mdash; abaikan pukulan berikutnya!</>
                    )}
                  </span>
                </div>
              </div>
            ) : currentDisplayMove?.has_string_extensions ? (
              <div className="video-center-bottom-hud hud-cut-string">
                <div className="hud-content-wrap">
                  <Scissors size={12} className="text-amber" />
                  <span className="hud-focus-pill">
                    BERHENTI DI: <strong>{currentDisplayMove.input}</strong>
                  </span>
                  <span className="hud-divider">&bull;</span>
                  <span className="hud-desc-text">
                    {isMobile ? (
                      <>Potongan (tanpa {currentDisplayMove.string_extension_sample || '...'})</>
                    ) : (
                      <>Rangkaian dipotong (lanjutan {currentDisplayMove.string_extension_sample || '...'} tidak ditekan)</>
                    )}
                  </span>
                </div>
              </div>
            ) : currentDisplayMove?.input?.includes(',') ? (
              <div className="video-center-bottom-hud hud-full-string">
                <div className="hud-content-wrap">
                  <Check size={12} className="text-green" />
                  <span className="hud-focus-pill">
                    FULL STRING: <strong>{currentDisplayMove.input}</strong>
                  </span>
                  <span className="hud-divider">&bull;</span>
                  <span className="hud-desc-text">{isMobile ? 'Kombo tuntas' : 'Kombo diselesaikan hingga tuntas'}</span>
                </div>
              </div>
            ) : null
          )}

          {currentDisplayMove?.video_url ? (
            <div className="video-wrapper">
              <video
                ref={videoRef}
                src={currentDisplayMove.video_url}
                autoPlay
                loop={isAnswered || !question.isSinglePlay}
                muted={isVideoMuted}
                playsInline
                onPlaying={() => setIsVideoPlaying(true)}
                onEnded={() => {
                  if (question.isSinglePlay && !isAnswered) {
                    videoRef.current?.pause();
                  }
                }}
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
              <Play size={36} className="pulse-icon text-cyan" />
              <span className="fallback-text">Animasi gerakan {currentDisplayMove?.input}</span>
              <span className="fallback-sub">
                {currentDisplayMove?.has_string_extensions
                  ? `Lawan berhenti di ${currentDisplayMove?.input} (tidak lanjut ke ${currentDisplayMove?.string_extension_sample || '...'})`
                  : 'Data frame aktif'}
              </span>
            </div>
          )}
        </div>

        {/* High-Contrast Move Stat Strip (Frame Info) */}
        <div className="move-stat-strip">
          {renderTargetBadge(currentDisplayMove?.target)}
          <span className="stat-pill pill-speed">
            Startup: <strong>{currentDisplayMove?.startup || (currentDisplayMove?.startup_num ? `i${currentDisplayMove.startup_num}` : '-')}</strong>
          </span>
          {isPunishMode ? (
            <span className="stat-pill pill-block-minus">
              Block:{' '}
              {question.isBlindMode && !isAnswered ? (
                <strong className="text-muted">?</strong>
              ) : question.isOpponentSafe ? (
                <strong className="text-green">{currentDisplayMove?.block || 'Safe'} (Safe on Block)</strong>
              ) : (
                <strong className="text-crimson">-{question.minusFrames}F (Punishable)</strong>
              )}
            </span>
          ) : question.condition === 'hit' ? (
            <span className="stat-pill pill-advantage-hit">
              Hit Frame:{' '}
              {question.isBlindMode && !isAnswered ? (
                <strong className="text-muted">?</strong>
              ) : (
                <strong className="text-green">+{question.advantageFrames}F (ON HIT)</strong>
              )}
            </span>
          ) : (
            <span className="stat-pill pill-advantage-block">
              Block Frame:{' '}
              {question.isBlindMode && !isAnswered ? (
                <strong className="text-muted">?</strong>
              ) : (
                <strong className="text-cyan">+{question.advantageFrames}F (ON BLOCK)</strong>
              )}
            </span>
          )}

          {/* Dedicated Frame Analysis Pill (Frame Trap Drill only, hidden in punishment mode to save space) */}
          {!isPunishMode && isAnswered && (
            <div className={`stat-verdict-pill ${isRoundSuccess ? 'verdict-pill-success' : 'verdict-pill-failed'}`}>
              <span>
                Adv: <strong>+{question.advantageFrames}F</strong> vs Pilihan: <strong>{selectedMove?.startup || (selectedMove?.startup_num ? `i${selectedMove.startup_num}` : 'i10')}</strong>
              </span>
              <span className="verdict-margin-tag">
                Frame Efektif {(selectedMove?.startup_num ?? 0) - (question.advantageFrames ?? 0)}F &bull;{' '}
                {(selectedMove?.startup_num ?? 0) - (question.advantageFrames ?? 0) < 10
                  ? 'COUNTER HIT'
                  : (selectedMove?.startup_num ?? 0) - (question.advantageFrames ?? 0) === 10
                  ? 'TRADE'
                  : 'TERPOTONG JAB'}
              </span>
            </div>
          )}
        </div>
      </div>

      {/* Input Action Area: Choices / Movelist */}
      <div className="input-action-area">
        {format === 'four-choices' ? (
          <div className="generic-choices-container">
            {/* Centered Action Control Bar (Safe on Block + Ronde Berikutnya) */}
            <div className="arena-control-bar">
              {isPunishMode && (
                <button
                  id="btn-safe-on-block"
                  type="button"
                  className={`btn-safe-action ${
                    isAnswered
                      ? question.isOpponentSafe
                        ? 'decision-correct'
                        : choseSafe
                        ? 'decision-wrong'
                        : ''
                      : choseSafe
                      ? 'is-selected'
                      : ''
                  }`}
                  onClick={() => handleSelectGeneric(null)}
                  disabled={isAnswered}
                  title="Pilih jika move lawan aman (Hotkey: S atau 0)"
                >
                  <Shield size={17} />
                  <span>Safe on Block</span>
                  {!isMobile && <span className="action-key-tag">[S / 0]</span>}
                </button>
              )}

              <button
                id="btn-next-round"
                type="button"
                className={`btn-next-action ${isAnswered ? 'btn-next-active' : 'btn-next-hidden'}`}
                onClick={handleNextOrFinish}
                tabIndex={isAnswered ? 0 : -1}
                title="Ronde Berikutnya (Space / Enter)"
              >
                <span>
                  {question.sessionScope === 'gauntlet' && question.gauntletIndex === question.gauntletTotal
                    ? 'Selesai & Lihat Hasil'
                    : 'Ronde Berikutnya'}
                </span>
                <ArrowRight size={17} />
                {!isMobile && <span className="action-key-tag">Space</span>}
              </button>
            </div>

            <div className="generic-grid">
              {GENERIC_FRAME_OPTIONS.map((opt) => {
                const isSelected = selectedGenericId === opt.id;
                let cardStatusClass = '';

                if (isAnswered) {
                  if (isPunishMode) {
                    if (question.isOpponentSafe) {
                      cardStatusClass = 'choice-failed';
                    } else {
                      const minus = question.minusFrames ?? 10;
                      const speed = opt.speed;
                      if (speed > minus) {
                        cardStatusClass = 'choice-failed';
                      } else {
                        // Guaranteed hit! Check optimality
                        if (minus >= 16 && (opt.id === 'i15' || opt.id === 'i15_plus')) {
                          cardStatusClass = 'choice-optimal';
                        } else if (minus === 15 && opt.id === 'i15') {
                          cardStatusClass = 'choice-optimal';
                        } else if ((minus === 13 || minus === 14) && opt.id === 'i13') {
                          cardStatusClass = 'choice-optimal';
                        } else if (minus === 12 && opt.id === 'i12') {
                          cardStatusClass = 'choice-optimal';
                        } else if (minus === 11 && opt.id === 'i11') {
                          cardStatusClass = 'choice-optimal';
                        } else if (minus === 10 && opt.id === 'i10') {
                          cardStatusClass = 'choice-optimal';
                        } else {
                          cardStatusClass = 'choice-valid';
                        }
                      }
                    }
                  } else {
                    const adv = question.advantageFrames ?? 0;
                    const effective = opt.speed - adv;
                    if (effective < 10) cardStatusClass = 'choice-optimal';
                    else if (effective === 10) cardStatusClass = 'choice-valid';
                    else cardStatusClass = 'choice-failed';
                  }
                }

                return (
                  <button
                    key={opt.id}
                    id={`btn-generic-${opt.id}`}
                    type="button"
                    className={`generic-card ${cardStatusClass} ${isSelected ? 'is-selected' : ''}`}
                    onClick={() => handleSelectGeneric(opt)}
                    disabled={isAnswered}
                  >
                    <div className="generic-card-header">
                      <span className="generic-frame-label">{opt.label}</span>
                      {!isMobile && <span className="generic-key-badge">[{opt.key}]</span>}
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        ) : (
          <div className="movelist-action-container">
            {/* Centered Action Control Bar for Full Movelist Mode */}
            <div className="arena-control-bar">
              {isPunishMode && (
                <button
                  id="btn-safe-on-block"
                  type="button"
                  className={`btn-safe-action ${
                    isAnswered
                      ? question.isOpponentSafe
                        ? 'decision-correct'
                        : choseSafe
                        ? 'decision-wrong'
                        : ''
                      : choseSafe
                      ? 'is-selected'
                      : ''
                  }`}
                  onClick={() => handleSelectMove(null)}
                  disabled={isAnswered}
                  title="Klik jika move lawan aman (Hotkey: S atau 0)"
                >
                  <Shield size={17} />
                  <span>Safe on Block</span>
                  {!isMobile && <span className="action-key-tag">[S / 0]</span>}
                </button>
              )}

              <button
                id="btn-open-movelist-modal"
                type="button"
                className="btn-open-movelist-action"
                onClick={() => setIsMovelistOpen(true)}
                disabled={isAnswered}
                title="Buka daftar lengkap move karakter"
              >
                <BookOpen size={17} />
                <span>{selectedMove ? `Ganti Move (${selectedMove.input})` : `Pilih Custom Move (${userChar})`}</span>
              </button>

              <button
                id="btn-next-round"
                type="button"
                className={`btn-next-action ${isAnswered ? 'btn-next-active' : 'btn-next-hidden'}`}
                onClick={handleNextOrFinish}
                tabIndex={isAnswered ? 0 : -1}
                title="Ronde Berikutnya (Space / Enter)"
              >
                <span>
                  {question.sessionScope === 'gauntlet' && question.gauntletIndex === question.gauntletTotal
                    ? 'Selesai & Lihat Hasil'
                    : 'Ronde Berikutnya'}
                </span>
                <ArrowRight size={17} />
                {!isMobile && <span className="action-key-tag">Space</span>}
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Full Movelist Modal */}
      <FullMovelistModal
        isOpen={isMovelistOpen}
        onClose={() => setIsMovelistOpen(false)}
        onSelectMove={(move) => handleSelectMove(move)}
        character={userChar}
        hintMinusFrames={isPunishMode ? question.minusFrames : undefined}
      />

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
                <span className="stat-label">Total Gerakan</span>
              </div>
              <div className="summary-stat-box">
                <span className="stat-num text-cyan">
                  {score?.totalAnswered ? Math.round(((score.correctCount || 0) / score.totalAnswered) * 100) : 0}%
                </span>
                <span className="stat-label">Akurasi</span>
              </div>
              <div className="summary-stat-box">
                <span className="stat-num text-gold">{score?.optimalCount || 0}</span>
                <span className="stat-label">Optimal Punish</span>
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
          max-width: 940px;
          margin: 0 auto;
        }
        .arena-top-nav {
          display: flex;
          justify-content: space-between;
          align-items: center;
          flex-wrap: wrap;
          gap: 10px;
        }
        .arena-nav-left {
          display: flex;
          gap: 8px;
        }
        .btn-arena-nav {
          display: flex;
          align-items: center;
          gap: 6px;
          background: #131622;
          border: 1px solid rgba(255, 255, 255, 0.08);
          padding: 6px 12px;
          border-radius: var(--radius-sm);
          font-size: 0.82rem;
          font-weight: 700;
          color: var(--text-secondary);
          transition: all 0.2s;
        }
        .btn-arena-nav:hover {
          color: #fff;
          background: rgba(255, 255, 255, 0.1);
        }
        .btn-arena-nav-accent {
          border-color: rgba(255, 183, 3, 0.35);
          color: var(--heihachi-gold);
        }
        .btn-arena-nav-accent:hover {
          background: rgba(255, 183, 3, 0.15);
          color: #fff;
        }
        .arena-nav-right {
          display: flex;
          align-items: center;
          gap: 8px;
        }
        .blind-pill {
          display: flex;
          align-items: center;
          gap: 5px;
          font-size: 0.7rem;
          font-weight: 800;
          padding: 4px 10px;
          border-radius: var(--radius-full);
          background: rgba(255, 183, 3, 0.15);
          border: 1px solid rgba(255, 183, 3, 0.3);
          color: var(--heihachi-gold);
          letter-spacing: 0.05em;
        }
        .mode-indicator {
          display: flex;
          align-items: center;
          gap: 6px;
          font-size: 0.72rem;
          font-weight: 800;
          padding: 4px 10px;
          border-radius: var(--radius-full);
          letter-spacing: 0.06em;
        }
        .ind-punish {
          background: rgba(255, 30, 86, 0.15);
          color: var(--devil-crimson);
          border: 1px solid rgba(255, 30, 86, 0.3);
        }
        .ind-frametrap {
          background: rgba(0, 229, 255, 0.15);
          color: var(--electric-cyan);
          border: 1px solid rgba(0, 229, 255, 0.3);
        }
        .matchup-tag {
          font-size: 0.8rem;
          font-weight: 700;
          color: var(--text-muted);
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
        /* String Sequence HUD & Integrated Header */
        .string-sequence-hud {
          background: #0d111d;
          border-radius: var(--radius-sm);
          padding: 10px 14px;
          border: 1px solid rgba(255, 255, 255, 0.08);
          display: flex;
          flex-direction: column;
          gap: 8px;
        }
        .string-sequence-hud.hud-cut {
          border-color: rgba(245, 158, 11, 0.35);
          background: linear-gradient(180deg, rgba(245, 158, 11, 0.08) 0%, #0d111d 100%);
        }
        .string-sequence-hud.hud-full {
          border-color: rgba(16, 185, 129, 0.3);
          background: linear-gradient(180deg, rgba(16, 185, 129, 0.06) 0%, #0d111d 100%);
        }
        .string-sequence-hud.hud-single {
          border-color: rgba(0, 229, 255, 0.2);
          background: linear-gradient(180deg, rgba(0, 229, 255, 0.04) 0%, #0d111d 100%);
        }
        .seq-hud-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          flex-wrap: wrap;
          gap: 8px;
        }
        .seq-hud-title {
          display: flex;
          align-items: center;
          flex-wrap: wrap;
          gap: 8px;
        }
        .seq-actor-pill {
          background: rgba(255, 255, 255, 0.08);
          border: 1px solid rgba(255, 255, 255, 0.15);
          color: #e2e8f0;
          font-size: 0.72rem;
          font-weight: 800;
          padding: 3px 8px;
          border-radius: 4px;
          letter-spacing: 0.05em;
        }
        .seq-tag-badge {
          font-size: 0.68rem;
          font-weight: 800;
          padding: 3px 8px;
          border-radius: 4px;
          display: inline-flex;
          align-items: center;
          gap: 4px;
          letter-spacing: 0.04em;
        }
        .badge-tag-amber {
          background: rgba(245, 158, 11, 0.18);
          border: 1px solid rgba(245, 158, 11, 0.5);
          color: #fbbf24;
        }
        .badge-tag-green {
          background: rgba(16, 185, 129, 0.16);
          border: 1px solid rgba(16, 185, 129, 0.45);
          color: #10b981;
        }
        .badge-tag-cyan {
          background: rgba(0, 229, 255, 0.15);
          border: 1px solid rgba(0, 229, 255, 0.4);
          color: var(--electric-cyan);
        }
        .seq-move-heading {
          font-family: var(--font-display);
          font-size: 1.15rem;
          font-weight: 900;
          color: #fff;
          display: inline-flex;
          align-items: center;
          gap: 6px;
        }
        .seq-cut-alert-pill {
          font-size: 0.7rem;
          color: #fbbf24;
          font-weight: 600;
        }
        .seq-full-alert-pill {
          font-size: 0.7rem;
          color: #10b981;
          font-weight: 600;
        }
        .seq-hud-right {
          display: flex;
          align-items: center;
          gap: 8px;
          margin-left: auto;
        }
        .seq-chain-row {
          display: flex;
          align-items: center;
          flex-wrap: wrap;
          gap: 6px;
        }
        .seq-hit-node {
          display: flex;
          flex-direction: column;
          align-items: center;
          padding: 4px 10px;
          border-radius: 5px;
          background: #141929;
          border: 1px solid rgba(255, 255, 255, 0.09);
          min-width: 60px;
        }
        .node-prev {
          opacity: 0.85;
        }
        .node-target {
          background: rgba(0, 229, 255, 0.12);
          border-color: var(--electric-cyan);
          box-shadow: 0 0 10px rgba(0, 229, 255, 0.25);
        }
        .node-stop {
          background: rgba(245, 158, 11, 0.16);
          border-color: #f59e0b;
        }
        .node-ghost {
          opacity: 0.45;
          border-style: dashed;
          background: rgba(255, 255, 255, 0.02);
        }
        .node-complete {
          background: rgba(16, 185, 129, 0.12);
          border-color: #10b981;
        }
        .node-idx {
          font-size: 0.58rem;
          font-weight: 800;
          color: var(--text-muted);
          letter-spacing: 0.06em;
        }
        .node-code {
          font-family: monospace;
          font-size: 0.95rem;
          font-weight: 900;
          color: #fff;
          display: inline-flex;
          align-items: center;
          gap: 4px;
        }
        .node-status {
          font-size: 0.58rem;
          font-weight: 800;
          color: var(--text-muted);
          letter-spacing: 0.04em;
        }
        .node-target .node-status {
          color: var(--electric-cyan);
        }
        .seq-connector {
          font-weight: 900;
          color: rgba(255, 255, 255, 0.35);
          font-size: 1.1rem;
        }

        /* Video Player & Glowing Borders */
        .video-viewport {
          position: relative;
          width: 100%;
          height: 320px;
          max-height: 340px;
          background: #000;
          border-radius: var(--radius-sm);
          overflow: hidden;
          border: 1px solid rgba(255, 255, 255, 0.08);
          display: flex;
          align-items: center;
          justify-content: center;
          transition: border-color 0.2s, box-shadow 0.2s;
        }
        .video-border-success {
          border: 3px solid var(--success-green) !important;
          box-shadow: 0 0 24px rgba(0, 240, 118, 0.45) !important;
        }
        .video-border-failed {
          border: 3px solid var(--devil-crimson) !important;
          box-shadow: 0 0 24px rgba(255, 30, 86, 0.45) !important;
        }
        .video-wrapper {
          width: 100%;
          height: 100%;
          position: relative;
        }
        .move-video {
          width: 100%;
          height: 100%;
          object-fit: contain;
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

        /* Floating Center-Bottom Video HUD (di tengah bawah video) */
        .video-center-bottom-hud {
          position: absolute;
          bottom: 14px;
          left: 50%;
          transform: translateX(-50%);
          z-index: 10;
          display: flex;
          align-items: center;
          justify-content: center;
          pointer-events: none;
          max-width: 92%;
          width: max-content;
        }
        .video-center-bottom-hud .hud-content-wrap {
          background: rgba(10, 13, 22, 0.92);
          backdrop-filter: blur(10px);
          border-radius: 30px;
          padding: 6px 18px;
          display: flex;
          align-items: center;
          gap: 10px;
          font-size: 0.78rem;
          color: #e2e8f0;
          white-space: nowrap;
          box-shadow: 0 4px 20px rgba(0, 0, 0, 0.75);
          transition: all 0.2s ease;
        }
        .hud-string-video .hud-content-wrap {
          border: 1px solid rgba(245, 158, 11, 0.6);
          box-shadow: 0 4px 20px rgba(0, 0, 0, 0.75), 0 0 16px rgba(245, 158, 11, 0.25);
        }
        .hud-cut-string .hud-content-wrap {
          border: 1px solid rgba(245, 158, 11, 0.45);
        }
        .hud-full-string .hud-content-wrap {
          border: 1px solid rgba(16, 185, 129, 0.45);
        }
        .hud-focus-pill {
          font-weight: 800;
          color: #fff;
          letter-spacing: 0.04em;
          display: inline-flex;
          align-items: center;
          gap: 5px;
        }
        .hud-focus-pill strong {
          color: #fbbf24;
          font-family: monospace;
          font-size: 0.92rem;
          padding: 1px 6px;
          border-radius: 4px;
          background: rgba(245, 158, 11, 0.2);
          border: 1px solid rgba(245, 158, 11, 0.35);
        }
        .hud-full-string .hud-focus-pill strong {
          color: #10b981;
          background: rgba(16, 185, 129, 0.2);
          border-color: rgba(16, 185, 129, 0.35);
        }
        .hud-divider {
          color: rgba(255, 255, 255, 0.3);
          font-size: 0.9rem;
        }
        .hud-desc-text {
          font-size: 0.73rem;
          color: #cbd5e1;
        }
        .hud-desc-text strong {
          color: #fff;
        }
        .pulse-dot {
          width: 7px;
          height: 7px;
          border-radius: 50%;
          display: inline-block;
          animation: pulseDot 1.5s infinite;
        }
        .dot-amber {
          background: #f59e0b;
          box-shadow: 0 0 6px #f59e0b;
        }
        @keyframes pulseDot {
          0%, 100% { opacity: 1; transform: scale(1); }
          50% { opacity: 0.4; transform: scale(0.8); }
        }

        .btn-audio-toggle {
          position: absolute;
          top: 10px;
          right: 10px;
          background: rgba(0, 0, 0, 0.65);
          color: #fff;
          border: 1px solid rgba(255, 255, 255, 0.2);
          width: 32px;
          height: 32px;
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          transition: all 0.2s;
        }
        .btn-audio-toggle:hover {
          background: var(--electric-cyan);
          color: #000;
        }
        .video-fallback {
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 6px;
        }
        .fallback-text {
          font-weight: 700;
          color: var(--text-secondary);
          font-size: 0.9rem;
        }
        .fallback-sub {
          font-size: 0.72rem;
          color: var(--text-muted);
        }

        /* Move Stat Strip (Directly Below Video) */
        .move-stat-strip {
          display: flex;
          align-items: center;
          flex-wrap: wrap;
          gap: 8px;
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
        .pill-target {
          font-weight: 900;
          letter-spacing: 0.05em;
        }
        .target-low {
          background: var(--devil-crimson);
          color: #fff;
        }
        .target-mid {
          background: var(--electric-cyan);
          color: #000;
        }
        .target-high {
          background: var(--heihachi-gold);
          color: #000;
        }

        /* Dedicated Frame Analysis Verdict Pill (Lingkaran Merah) */
        .stat-verdict-pill {
          display: inline-flex;
          align-items: center;
          gap: 8px;
          padding: 4px 12px;
          border-radius: 4px;
          font-size: 0.82rem;
          font-weight: 700;
          margin-left: auto;
          line-height: 1.25;
        }
        .verdict-pill-success {
          background: rgba(0, 240, 118, 0.15);
          border: 1px solid rgba(0, 240, 118, 0.45);
          color: var(--success-green);
        }
        .verdict-pill-failed {
          background: rgba(255, 30, 86, 0.15);
          border: 1px solid rgba(255, 30, 86, 0.45);
          color: var(--devil-crimson);
        }
        .verdict-margin-tag {
          background: rgba(255, 255, 255, 0.1);
          padding: 2px 6px;
          border-radius: 3px;
          font-weight: 800;
          font-size: 0.74rem;
          letter-spacing: 0.03em;
        }

        .key-frame-badge {
          display: flex;
          flex-direction: column;
          align-items: center;
          padding: 4px 12px;
          border-radius: var(--radius-sm);
          background: #0d0f18;
          border: 1px solid rgba(255, 255, 255, 0.08);
          line-height: 1.1;
        }
        .badge-minus {
          border-color: rgba(255, 30, 86, 0.45);
        }
        .badge-minus .kf-val {
          color: var(--devil-crimson);
        }
        .badge-safe {
          border-color: rgba(0, 240, 118, 0.45);
        }
        .badge-safe .kf-val {
          color: var(--success-green);
        }
        .badge-blind {
          border-color: rgba(255, 183, 3, 0.35);
        }
        .badge-blind .kf-val {
          color: var(--heihachi-gold);
        }
        .badge-hit {
          border-color: rgba(0, 240, 118, 0.3);
        }
        .badge-plus {
          border-color: rgba(0, 229, 255, 0.3);
        }
        .kf-label {
          font-size: 0.58rem;
          font-weight: 800;
          color: var(--text-muted);
          letter-spacing: 0.08em;
        }
        .kf-val {
          font-family: var(--font-display);
          font-size: 1.15rem;
          font-weight: 900;
        }

        /* Action Control Bar (Center Aligned with Permanent Reserved Space for Next Button) */
        .arena-control-bar {
          display: flex;
          justify-content: center;
          align-items: center;
          gap: 14px;
          width: 100%;
          margin: 4px 0 10px 0;
        }
        .btn-safe-action {
          display: inline-flex;
          align-items: center;
          gap: 8px;
          background: #181d2e;
          border: 1.5px solid rgba(0, 240, 118, 0.45);
          border-radius: var(--radius-sm);
          color: var(--success-green);
          padding: 10px 22px;
          font-weight: 800;
          font-size: 0.9rem;
          cursor: pointer;
          transition: all 0.15s ease-in-out;
          white-space: nowrap;
        }
        .btn-safe-action:hover:not(:disabled) {
          background: rgba(0, 240, 118, 0.15);
          border-color: var(--success-green);
          transform: translateY(-1px);
        }
        .btn-safe-action:disabled {
          cursor: not-allowed;
          opacity: 0.85;
        }
        .btn-open-movelist-action {
          display: inline-flex;
          align-items: center;
          gap: 8px;
          background: rgba(0, 229, 255, 0.1);
          border: 1.5px solid rgba(0, 229, 255, 0.4);
          border-radius: var(--radius-sm);
          color: var(--electric-cyan);
          padding: 10px 20px;
          font-weight: 800;
          font-size: 0.9rem;
          cursor: pointer;
          transition: all 0.15s ease-in-out;
          white-space: nowrap;
        }
        .btn-open-movelist-action:hover:not(:disabled) {
          background: rgba(0, 229, 255, 0.2);
          border-color: var(--electric-cyan);
          transform: translateY(-1px);
        }
        .btn-open-movelist-action:disabled {
          cursor: not-allowed;
          opacity: 0.8;
        }
        .btn-next-action {
          display: inline-flex;
          align-items: center;
          gap: 8px;
          background: var(--electric-cyan);
          color: #000;
          border: none;
          border-radius: var(--radius-sm);
          padding: 10px 22px;
          font-weight: 800;
          font-size: 0.9rem;
          cursor: pointer;
          transition: all 0.15s ease-in-out;
          white-space: nowrap;
        }
        .btn-next-action:hover {
          background: #fff;
          transform: translateY(-1px);
          box-shadow: 0 0 16px rgba(0, 229, 255, 0.4);
        }
        .btn-next-hidden {
          visibility: hidden !important;
          pointer-events: none !important;
        }
        .btn-next-active {
          visibility: visible;
          pointer-events: auto;
          animation: popScale 0.2s ease-out;
        }
        .action-key-tag {
          font-size: 0.72rem;
          font-weight: 800;
          padding: 2px 6px;
          border-radius: 4px;
          background: rgba(0, 0, 0, 0.25);
          letter-spacing: 0.04em;
        }
        .decision-correct {
          background: rgba(0, 240, 118, 0.25) !important;
          border: 2px solid var(--success-green) !important;
          color: #fff !important;
        }
        .decision-wrong {
          background: rgba(255, 30, 86, 0.25) !important;
          border: 2px solid var(--devil-crimson) !important;
          color: #fff !important;
        }

        .input-action-area {
          display: flex;
          flex-direction: column;
        }
        .generic-choices-container {
          display: flex;
          flex-direction: column;
          gap: 6px;
        }
        .movelist-action-container {
          display: flex;
          flex-direction: column;
          gap: 6px;
        }
        .generic-grid {
          display: grid;
          grid-template-columns: repeat(3, 1fr) !important;
          gap: 6px;
        }
        @media (max-width: 820px) {
          .generic-grid {
            grid-template-columns: repeat(3, 1fr) !important;
            gap: 6px;
          }
        }
        @media (max-width: 480px) {
          .generic-grid {
            grid-template-columns: repeat(3, 1fr) !important;
            gap: 5px;
          }
        }
        .generic-card {
          background: #131622;
          border: 1.5px solid rgba(255, 255, 255, 0.1);
          border-radius: var(--radius-sm);
          padding: 8px 12px;
          min-height: 44px;
          display: flex;
          align-items: center;
          justify-content: center;
          cursor: pointer;
          transition: all 0.15s ease-in-out;
          position: relative;
        }
        .generic-card:hover:not(:disabled) {
          border-color: var(--electric-cyan);
          background: rgba(0, 229, 255, 0.08);
        }
        .generic-card.is-selected {
          outline: 2px solid var(--electric-cyan);
          background: rgba(0, 229, 255, 0.15);
        }
        .generic-card-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          width: 100%;
          line-height: 1;
        }
        .generic-frame-label {
          font-family: var(--font-display);
          font-size: 1.1rem;
          font-weight: 900;
          color: var(--electric-cyan);
          letter-spacing: 0.02em;
          line-height: 1;
        }
        .generic-key-badge {
          font-family: var(--font-display);
          font-size: 0.72rem;
          font-weight: 800;
          color: var(--text-muted);
          background: rgba(255, 255, 255, 0.06);
          padding: 2px 6px;
          border-radius: 4px;
          border: 1px solid rgba(255, 255, 255, 0.12);
          line-height: 1;
        }

        /* Top Arena HUD Badges */
        .arena-nav-right {
          display: flex;
          align-items: center;
          gap: 10px;
          flex-wrap: wrap;
        }
        .hud-gauntlet-tag {
          display: flex;
          align-items: center;
          gap: 6px;
          font-family: var(--font-display);
          font-size: 0.8rem;
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
        .choice-optimal {
          border-color: var(--electric-cyan) !important;
          background: rgba(0, 229, 255, 0.12) !important;
        }
        .choice-valid {
          border-color: var(--success-green) !important;
          background: rgba(0, 240, 118, 0.1) !important;
        }
        .choice-failed {
          border-color: var(--devil-crimson) !important;
          background: rgba(255, 30, 86, 0.1) !important;
          opacity: 0.7;
        }

        @media (max-width: 768px) {
          .arena-top-nav {
            flex-direction: column;
            align-items: stretch;
            gap: 8px;
          }
          .arena-nav-left {
            display: flex;
            width: 100%;
            gap: 8px;
          }
          .btn-arena-nav {
            flex: 1;
            min-height: 42px;
            justify-content: center;
            padding: 8px 10px;
            font-size: 0.8rem;
          }
          .arena-nav-right {
            display: flex;
            justify-content: space-between;
            align-items: center;
            width: 100%;
            gap: 6px;
            font-size: 0.72rem;
          }
          .string-sequence-hud {
            padding: 6px 10px !important;
            gap: 5px !important;
          }
          .seq-hud-header {
            flex-direction: row !important;
            align-items: center !important;
            justify-content: space-between !important;
            gap: 4px !important;
          }
          .seq-hud-title {
            gap: 4px !important;
            align-items: center !important;
          }
          .seq-actor-pill {
            font-size: 0.65rem !important;
            padding: 2px 6px !important;
          }
          .seq-tag-badge {
            font-size: 0.62rem !important;
            padding: 2px 6px !important;
          }
          .seq-move-heading {
            font-size: 0.95rem !important;
            gap: 4px !important;
          }
          .seq-cut-alert-pill,
          .seq-full-alert-pill {
            font-size: 0.62rem !important;
          }
          .key-frame-badge {
            padding: 2px 8px !important;
          }
          .kf-label {
            font-size: 0.52rem !important;
          }
          .kf-val {
            font-size: 0.95rem !important;
          }
          .seq-hit-node {
            padding: 2px 6px !important;
            min-width: 44px !important;
            border-radius: 4px !important;
          }
          .node-idx,
          .node-status {
            font-size: 0.5rem !important;
          }
          .node-code {
            font-size: 0.82rem !important;
          }
          .seq-connector {
            font-size: 0.9rem !important;
          }
          .seq-chain-row {
            overflow-x: auto;
            -webkit-overflow-scrolling: touch;
            padding-bottom: 4px;
            gap: 4px !important;
          }
          .video-viewport {
            height: 220px;
          }
          .video-center-bottom-hud {
            bottom: 8px !important;
            max-width: 95% !important;
            width: auto !important;
          }
          .video-center-bottom-hud .hud-content-wrap {
            padding: 4px 10px !important;
            gap: 6px !important;
            font-size: 0.7rem !important;
            white-space: normal !important;
            border-radius: 20px !important;
          }
          .hud-focus-pill {
            font-size: 0.72rem !important;
          }
          .hud-focus-pill strong {
            font-size: 0.8rem !important;
            padding: 0 4px !important;
          }
          .hud-desc-text {
            font-size: 0.68rem !important;
          }
          .generic-grid {
            grid-template-columns: repeat(3, 1fr) !important;
            gap: 5px;
          }
          .generic-card {
            min-height: 42px;
            padding: 4px 6px;
          }
          .generic-card:active:not(:disabled) {
            transform: scale(0.97);
          }
          .arena-control-bar {
            display: flex;
            width: 100%;
            gap: 8px;
            flex-wrap: wrap;
          }
          .btn-safe-action,
          .btn-open-movelist-action,
          .btn-next-action {
            flex: 1;
            min-height: 46px;
            justify-content: center;
            padding: 10px 14px;
            font-size: 0.85rem;
          }
          .btn-safe-action:active:not(:disabled),
          .btn-open-movelist-action:active:not(:disabled),
          .btn-next-action:active {
            transform: scale(0.97);
          }
        }
      `}</style>
    </div>
  );
};
