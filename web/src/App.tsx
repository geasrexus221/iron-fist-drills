import { useState } from 'react';
import type { CharacterName, QuizMode, InputFormat, QuizQuestion, QuizScore, MinusBracket, ThrowDrillType } from './types/tekken';
import { generatePunishmentQuestion, generateFrameTrapQuestion, generateThrowBreakQuestion } from './utils/engine';
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
  const [inputFormat, setInputFormat] = useState<InputFormat>('full-movelist');
  const [minusFilter, setMinusFilter] = useState<MinusBracket[]>(['all-moves']);
  const [isBlindMode, setIsBlindMode] = useState<boolean>(true);
  const [throwDrillType, setThrowDrillType] = useState<ThrowDrillType>('direct');

  const [currentQuestion, setCurrentQuestion] = useState<QuizQuestion | null>(null);
  const [score, setScore] = useState<QuizScore>({
    streak: 0,
    bestStreak: 0,
    totalAnswered: 0,
    correctCount: 0,
    optimalCount: 0,
  });

  const nextQuestion = (
    mode: QuizMode = quizMode,
    format: InputFormat = inputFormat,
    uChar: CharacterName = userChar,
    oChar: CharacterName = oppChar,
    mFilter: MinusBracket[] = minusFilter,
    bMode: boolean = isBlindMode,
    tDrillType: ThrowDrillType = throwDrillType
  ) => {
    let q: QuizQuestion;
    if (mode === 'punishment') {
      q = generatePunishmentQuestion(uChar, oChar, format, mFilter, bMode);
    } else if (mode === 'frame-trap') {
      q = generateFrameTrapQuestion(uChar, oChar, format, bMode);
    } else {
      q = generateThrowBreakQuestion(oChar, bMode, tDrillType);
    }
    setCurrentQuestion(q);
  };

  const handleStartPunish = (
    uChar: CharacterName,
    oChar: CharacterName,
    format: InputFormat,
    mFilter: MinusBracket[],
    bMode: boolean
  ) => {
    setUserChar(uChar);
    setOppChar(oChar);
    setInputFormat(format);
    setQuizMode('punishment');
    setMinusFilter(mFilter);
    setIsBlindMode(bMode);
    nextQuestion('punishment', format, uChar, oChar, mFilter, bMode);
    setCurrentScreen('quiz');
  };

  const handleStartFrameTrap = (uChar: CharacterName, format: InputFormat, bMode: boolean) => {
    setUserChar(uChar);
    setInputFormat(format);
    setQuizMode('frame-trap');
    setIsBlindMode(bMode);
    nextQuestion('frame-trap', format, uChar, oppChar, minusFilter, bMode);
    setCurrentScreen('quiz');
  };

  const handleStartThrowBreak = (oChar: CharacterName, bMode: boolean, tDrillType: ThrowDrillType) => {
    setOppChar(oChar);
    setQuizMode('throw-break');
    setIsBlindMode(bMode);
    setThrowDrillType(tDrillType);
    nextQuestion('throw-break', inputFormat, userChar, oChar, minusFilter, bMode, tDrillType);
    setCurrentScreen('quiz');
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
            initialBlindMode={isBlindMode}
          />
        )}

        {currentScreen === 'frametrap-setup' && (
          <FrameTrapSetup
            onStart={handleStartFrameTrap}
            onBack={() => setCurrentScreen('menu')}
            initialUserChar={userChar}
            initialFormat={inputFormat}
            initialBlindMode={isBlindMode}
          />
        )}

        {currentScreen === 'throwbreak-setup' && (
          <ThrowBreakSetup
            onStart={handleStartThrowBreak}
            onBack={() => setCurrentScreen('menu')}
            initialOppChar={oppChar}
            initialBlindMode={isBlindMode}
            initialDrillType={throwDrillType}
          />
        )}

        {currentScreen === 'quiz' && currentQuestion && (
          quizMode === 'throw-break' ? (
            <ThrowBreakArena
              question={currentQuestion}
              onNextQuestion={() => nextQuestion(quizMode, inputFormat, userChar, oppChar, minusFilter, isBlindMode, throwDrillType)}
              onAnswerRecorded={handleAnswerRecorded}
              oppChar={oppChar}
              onBackToMenu={() => setCurrentScreen('menu')}
              onBackToSetup={handleBackToSetup}
            />
          ) : (
            <QuizArena
              question={currentQuestion}
              format={inputFormat}
              onNextQuestion={() => nextQuestion(quizMode, inputFormat, userChar, oppChar, minusFilter, isBlindMode)}
              onAnswerRecorded={handleAnswerRecorded}
              userChar={userChar}
              oppChar={oppChar}
              onBackToMenu={() => setCurrentScreen('menu')}
              onBackToSetup={handleBackToSetup}
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
