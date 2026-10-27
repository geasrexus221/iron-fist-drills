import { useState } from 'react';
import type {
  CharacterName,
  QuizMode,
  InputFormat,
  QuizQuestion,
  QuizScore,
  MinusBracket,
  StringFilter,
  ThrowDrillType,
  SessionScope,
  DrillModifiers,
  Move,
} from './types/tekken';
import {
  generatePunishmentQuestion,
  generateFrameTrapQuestion,
  generateThrowBreakQuestion,
  getPunishmentMovePool,
  getFrameTrapMovePool,
  getThrowBreakMovePool,
  shuffleArray,
  isThrowMove,
  type FrameTrapCandidate,
} from './utils/engine';
import { CHARACTER_DATA } from './data';
import { useDeviceType } from './hooks/useDeviceType';
import { MainMenu } from './components/MainMenu';
import { PunishmentSetup } from './components/PunishmentSetup';
import { FrameTrapSetup } from './components/FrameTrapSetup';
import { ThrowBreakSetup } from './components/ThrowBreakSetup';
import { QuizArena } from './components/QuizArena';
import { ThrowBreakArena } from './components/ThrowBreakArena';
import { FrameExplorer } from './components/FrameExplorer';

type ScreenState = 'menu' | 'punish-setup' | 'frametrap-setup' | 'throwbreak-setup' | 'quiz' | 'explorer';

export function App() {
  const deviceInfo = useDeviceType();
  const [currentScreen, setCurrentScreen] = useState<ScreenState>('menu');
  const [userChar, setUserChar] = useState<CharacterName>('Jin');
  const [oppChar, setOppChar] = useState<CharacterName>('King');
  const [quizMode, setQuizMode] = useState<QuizMode>('punishment');
  const [inputFormat, setInputFormat] = useState<InputFormat>('four-choices');
  const [minusFilter, setMinusFilter] = useState<MinusBracket[]>(['all-moves']);
  const [stringFilter, setStringFilter] = useState<StringFilter>('all');
  const [throwDrillType, setThrowDrillType] = useState<ThrowDrillType>('direct');

  // Modifiers & Session Scope state
  const [sessionScope, setSessionScope] = useState<SessionScope>('endless');
  const [drillModifiers, setDrillModifiers] = useState<DrillModifiers>({
    sessionScope: 'endless',
    isSinglePlay: false,
    isBlitzMode: false,
    isSurvivalMode: false,
    isBlindMode: true,
  });

  // Gauntlet progression state
  const [gauntletQueue, setGauntletQueue] = useState<any[]>([]);
  const [gauntletIndex, setGauntletIndex] = useState<number>(0);

  const [currentQuestion, setCurrentQuestion] = useState<QuizQuestion | null>(null);
  const [score, setScore] = useState<QuizScore>({
    streak: 0,
    bestStreak: 0,
    totalAnswered: 0,
    correctCount: 0,
    optimalCount: 0,
  });

  const nextQuestion = () => {
    if (sessionScope === 'gauntlet' && gauntletQueue.length > 0) {
      const nextIdx = gauntletIndex + 1;
      if (nextIdx < gauntletQueue.length) {
        setGauntletIndex(nextIdx);
        const nextItem = gauntletQueue[nextIdx];
        const modifiersPayload = {
          sessionScope: 'gauntlet' as const,
          gauntletIndex: nextIdx + 1,
          gauntletTotal: gauntletQueue.length,
          isSinglePlay: drillModifiers.isSinglePlay,
          isBlitzMode: drillModifiers.isBlitzMode,
          isSurvivalMode: drillModifiers.isSurvivalMode,
          isBlindMode: drillModifiers.isBlindMode,
        };

        if (quizMode === 'punishment') {
          const q = generatePunishmentQuestion(
            userChar,
            oppChar,
            inputFormat,
            minusFilter,
            drillModifiers.isBlindMode,
            nextItem as Move,
            modifiersPayload,
            stringFilter
          );
          setCurrentQuestion(q);
        } else if (quizMode === 'frame-trap') {
          const q = generateFrameTrapQuestion(
            userChar,
            oppChar,
            inputFormat,
            drillModifiers.isBlindMode,
            nextItem as FrameTrapCandidate,
            modifiersPayload
          );
          setCurrentQuestion(q);
        } else {
          const q = generateThrowBreakQuestion(
            oppChar,
            drillModifiers.isBlindMode,
            throwDrillType,
            nextItem as Move,
            modifiersPayload
          );
          setCurrentQuestion(q);
        }
        return;
      }
    }

    // Endless mode or fallback
    const modifiersPayload = {
      sessionScope: 'endless' as const,
      isSinglePlay: drillModifiers.isSinglePlay,
      isBlitzMode: drillModifiers.isBlitzMode,
      isSurvivalMode: drillModifiers.isSurvivalMode,
      isBlindMode: drillModifiers.isBlindMode,
    };

    let q: QuizQuestion;
    if (quizMode === 'punishment') {
      q = generatePunishmentQuestion(
        userChar,
        oppChar,
        inputFormat,
        minusFilter,
        drillModifiers.isBlindMode,
        undefined,
        modifiersPayload,
        stringFilter
      );
    } else if (quizMode === 'frame-trap') {
      q = generateFrameTrapQuestion(
        userChar,
        oppChar,
        inputFormat,
        drillModifiers.isBlindMode,
        undefined,
        modifiersPayload
      );
    } else {
      q = generateThrowBreakQuestion(
        oppChar,
        drillModifiers.isBlindMode,
        throwDrillType,
        undefined,
        modifiersPayload
      );
    }
    setCurrentQuestion(q);
  };

  const handleStartPunish = (
    uChar: CharacterName,
    oChar: CharacterName,
    format: InputFormat,
    mFilter: MinusBracket[],
    modifiers: DrillModifiers,
    sFilter: StringFilter = 'all'
  ) => {
    setUserChar(uChar);
    setOppChar(oChar);
    setInputFormat(format);
    setQuizMode('punishment');
    setMinusFilter(mFilter);
    setStringFilter(sFilter);
    setSessionScope(modifiers.sessionScope);
    setDrillModifiers(modifiers);
    setScore({
      streak: 0,
      bestStreak: 0,
      totalAnswered: 0,
      correctCount: 0,
      optimalCount: 0,
    });

    if (modifiers.sessionScope === 'gauntlet') {
      const rawPool = getPunishmentMovePool(oChar, mFilter, sFilter);
      const pool = shuffleArray(rawPool.length > 0 ? rawPool : (CHARACTER_DATA[oChar] || []).filter((m) => !isThrowMove(m)));
      setGauntletQueue(pool);
      setGauntletIndex(0);
      const firstMove = pool[0];
      const q = generatePunishmentQuestion(
        uChar,
        oChar,
        format,
        mFilter,
        modifiers.isBlindMode,
        firstMove,
        {
          sessionScope: 'gauntlet',
          gauntletIndex: 1,
          gauntletTotal: pool.length,
          isSinglePlay: modifiers.isSinglePlay,
          isBlitzMode: modifiers.isBlitzMode,
          isSurvivalMode: modifiers.isSurvivalMode,
          isBlindMode: modifiers.isBlindMode,
        },
        sFilter
      );
      setCurrentQuestion(q);
    } else {
      setGauntletQueue([]);
      setGauntletIndex(0);
      const q = generatePunishmentQuestion(
        uChar,
        oChar,
        format,
        mFilter,
        modifiers.isBlindMode,
        undefined,
        {
          sessionScope: 'endless',
          isSinglePlay: modifiers.isSinglePlay,
          isBlitzMode: modifiers.isBlitzMode,
          isSurvivalMode: modifiers.isSurvivalMode,
          isBlindMode: modifiers.isBlindMode,
        },
        sFilter
      );
      setCurrentQuestion(q);
    }

    setCurrentScreen('quiz');
  };

  const handleStartFrameTrap = (
    uChar: CharacterName,
    format: InputFormat,
    modifiers: DrillModifiers
  ) => {
    setUserChar(uChar);
    setInputFormat(format);
    setQuizMode('frame-trap');
    setSessionScope(modifiers.sessionScope);
    setDrillModifiers(modifiers);
    setScore({
      streak: 0,
      bestStreak: 0,
      totalAnswered: 0,
      correctCount: 0,
      optimalCount: 0,
    });

    if (modifiers.sessionScope === 'gauntlet') {
      const rawPool = getFrameTrapMovePool(uChar);
      const pool = shuffleArray(rawPool);
      setGauntletQueue(pool);
      setGauntletIndex(0);
      const firstItem = pool[0];
      const q = generateFrameTrapQuestion(
        uChar,
        oppChar,
        format,
        modifiers.isBlindMode,
        firstItem,
        {
          sessionScope: 'gauntlet',
          gauntletIndex: 1,
          gauntletTotal: pool.length,
          isSinglePlay: modifiers.isSinglePlay,
          isBlitzMode: modifiers.isBlitzMode,
          isSurvivalMode: modifiers.isSurvivalMode,
          isBlindMode: modifiers.isBlindMode,
        }
      );
      setCurrentQuestion(q);
    } else {
      setGauntletQueue([]);
      setGauntletIndex(0);
      const q = generateFrameTrapQuestion(
        uChar,
        oppChar,
        format,
        modifiers.isBlindMode,
        undefined,
        {
          sessionScope: 'endless',
          isSinglePlay: modifiers.isSinglePlay,
          isBlitzMode: modifiers.isBlitzMode,
          isSurvivalMode: modifiers.isSurvivalMode,
          isBlindMode: modifiers.isBlindMode,
        }
      );
      setCurrentQuestion(q);
    }

    setCurrentScreen('quiz');
  };

  const handleStartThrowBreak = (
    oChar: CharacterName,
    tDrillType: ThrowDrillType,
    modifiers: DrillModifiers
  ) => {
    setOppChar(oChar);
    setQuizMode('throw-break');
    setThrowDrillType(tDrillType);
    setSessionScope(modifiers.sessionScope);
    setDrillModifiers(modifiers);
    setScore({
      streak: 0,
      bestStreak: 0,
      totalAnswered: 0,
      correctCount: 0,
      optimalCount: 0,
    });

    if (modifiers.sessionScope === 'gauntlet') {
      const rawPool = getThrowBreakMovePool(oChar, tDrillType);
      const pool = shuffleArray(rawPool);
      setGauntletQueue(pool);
      setGauntletIndex(0);
      const firstItem = pool[0];
      const q = generateThrowBreakQuestion(
        oChar,
        modifiers.isBlindMode,
        tDrillType,
        firstItem,
        {
          sessionScope: 'gauntlet',
          gauntletIndex: 1,
          gauntletTotal: pool.length,
          isSinglePlay: modifiers.isSinglePlay,
          isBlitzMode: modifiers.isBlitzMode,
          isSurvivalMode: modifiers.isSurvivalMode,
          isBlindMode: modifiers.isBlindMode,
        }
      );
      setCurrentQuestion(q);
    } else {
      setGauntletQueue([]);
      setGauntletIndex(0);
      const q = generateThrowBreakQuestion(
        oChar,
        modifiers.isBlindMode,
        tDrillType,
        undefined,
        {
          sessionScope: 'endless',
          isSinglePlay: modifiers.isSinglePlay,
          isBlitzMode: modifiers.isBlitzMode,
          isSurvivalMode: modifiers.isSurvivalMode,
          isBlindMode: modifiers.isBlindMode,
        }
      );
      setCurrentQuestion(q);
    }

    setCurrentScreen('quiz');
  };

  const handleRetrySession = () => {
    if (quizMode === 'punishment') {
      handleStartPunish(userChar, oppChar, inputFormat, minusFilter, drillModifiers, stringFilter);
    } else if (quizMode === 'frame-trap') {
      handleStartFrameTrap(userChar, inputFormat, drillModifiers);
    } else {
      handleStartThrowBreak(oppChar, throwDrillType, drillModifiers);
    }
  };

  const handleSelectModeFromMenu = (mode: QuizMode | 'explorer') => {
    if (mode === 'punishment') {
      setQuizMode('punishment');
      setCurrentScreen('punish-setup');
    } else if (mode === 'frame-trap') {
      setQuizMode('frame-trap');
      setCurrentScreen('frametrap-setup');
    } else if (mode === 'throw-break') {
      setQuizMode('throw-break');
      setCurrentScreen('throwbreak-setup');
    } else {
      setCurrentScreen('explorer');
    }
  };

  const handleAnswerRecorded = (isCorrect: boolean, isOptimal: boolean) => {
    setScore((prev) => {
      const newStreak = isCorrect ? prev.streak + 1 : 0;
      const newBestStreak = Math.max(prev.bestStreak, newStreak);
      return {
        streak: newStreak,
        bestStreak: newBestStreak,
        totalAnswered: prev.totalAnswered + 1,
        correctCount: prev.correctCount + (isCorrect ? 1 : 0),
        optimalCount: prev.optimalCount + (isOptimal ? 1 : 0),
      };
    });
  };

  const handleBackToSetup = () => {
    if (quizMode === 'punishment') {
      setCurrentScreen('punish-setup');
    } else if (quizMode === 'frame-trap') {
      setCurrentScreen('frametrap-setup');
    } else {
      setCurrentScreen('throwbreak-setup');
    }
  };

  return (
    <div
      className={`app-container ${deviceInfo.isMobile ? 'is-mobile' : ''} ${
        deviceInfo.isAndroid ? 'is-android' : ''
      } ${deviceInfo.isLandscape ? 'is-landscape' : ''}`}
    >
      <main className="main-content">
        {currentScreen === 'menu' && (
          <MainMenu
            onSelectMode={handleSelectModeFromMenu}
            streak={score.bestStreak}
          />
        )}

        {currentScreen === 'punish-setup' && (
          <PunishmentSetup
            onStart={handleStartPunish}
            onBack={() => setCurrentScreen('menu')}
            initialUserChar={userChar}
            initialOppChar={oppChar}
            initialFormat={inputFormat}
            initialMinusFilter={minusFilter}
            initialStringFilter={stringFilter}
            initialModifiers={drillModifiers}
          />
        )}

        {currentScreen === 'frametrap-setup' && (
          <FrameTrapSetup
            onStart={handleStartFrameTrap}
            onBack={() => setCurrentScreen('menu')}
            initialUserChar={userChar}
            initialFormat={inputFormat}
            initialModifiers={drillModifiers}
          />
        )}

        {currentScreen === 'throwbreak-setup' && (
          <ThrowBreakSetup
            onStart={handleStartThrowBreak}
            onBack={() => setCurrentScreen('menu')}
            initialOppChar={oppChar}
            initialDrillType={throwDrillType}
            initialModifiers={drillModifiers}
          />
        )}

        {currentScreen === 'quiz' && currentQuestion && (
          quizMode === 'throw-break' ? (
            <ThrowBreakArena
              question={currentQuestion}
              onNextQuestion={nextQuestion}
              onAnswerRecorded={handleAnswerRecorded}
              oppChar={oppChar}
              score={score}
              onBackToMenu={() => setCurrentScreen('menu')}
              onBackToSetup={handleBackToSetup}
              onRetrySession={handleRetrySession}
            />
          ) : (
            <QuizArena
              question={currentQuestion}
              format={inputFormat}
              onNextQuestion={nextQuestion}
              onAnswerRecorded={handleAnswerRecorded}
              userChar={userChar}
              oppChar={oppChar}
              score={score}
              onBackToMenu={() => setCurrentScreen('menu')}
              onBackToSetup={handleBackToSetup}
              onRetrySession={handleRetrySession}
            />
          )
        )}

        {currentScreen === 'explorer' && (
          <FrameExplorer onBack={() => setCurrentScreen('menu')} />
        )}
      </main>

      <footer className="app-footer">
        <p>
          Tekken 8 Frame Lab &amp; Trainer &bull; Data &amp; Videos via{' '}
          <a href="https://wavu.wiki" target="_blank" rel="noreferrer">
            Wavu.wiki
          </a>{' '}
          Community &bull; Full Tekken 8 Roster (35 Karakter &bull; 5.300+ Gerakan)
        </p>
      </footer>

      <style>{`
        .app-container {
          max-width: 1100px;
          margin: 0 auto;
          padding: 12px 16px 36px;
          display: flex;
          flex-direction: column;
          min-height: 100vh;
        }
        .main-content {
          flex: 1;
        }
        .app-footer {
          margin-top: 32px;
          text-align: center;
          font-size: 0.78rem;
          color: var(--text-muted);
          border-top: 1px solid rgba(255, 255, 255, 0.06);
          padding-top: 16px;
        }
        .app-footer a {
          color: var(--electric-cyan);
          text-decoration: none;
        }
        .app-footer a:hover {
          text-decoration: underline;
        }
        @media (max-width: 768px) {
          .app-container {
            padding: max(8px, env(safe-area-inset-top)) max(8px, env(safe-area-inset-right)) max(16px, env(safe-area-inset-bottom)) max(8px, env(safe-area-inset-left));
            max-width: 100%;
          }
          .app-footer {
            margin-top: 16px;
            padding-top: 10px;
            font-size: 0.7rem;
          }
        }
        .is-mobile {
          overflow-x: hidden;
        }
      `}</style>
    </div>
  );
}

export default App;
