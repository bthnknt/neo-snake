// ============================================
// NEO SNAKE - Main App Component
// ============================================

import { useState, useCallback, useRef } from 'react';
import { MainMenu } from './components/MainMenu';
import { GameCanvas } from './components/GameCanvas';
import { GameOverModal } from './components/GameOverModal';
import { ShopModal } from './components/ShopModal';
import { SettingsModal } from './components/SettingsModal';
import { PauseMenu } from './components/PauseMenu';
import { GameHUD } from './components/GameHUD';
import { DPad } from './components/DPad';
import { AdventureMap } from './components/AdventureMap';
import { useGameStore } from './store/gameStore';
import { useShopStore } from './store/shopStore';
import { useUserStore, type GameMode } from './store/userStore';
import type { SnakeConfig, Direction } from './engine/types';
import './App.css';

type Screen = 'menu' | 'game' | 'gameover' | 'adventureMap';

export default function App() {
    const [screen, setScreen] = useState<Screen>('menu');
    const [showShop, setShowShop] = useState(false);
    const [showSettings, setShowSettings] = useState(false);
    const [showPauseMenu, setShowPauseMenu] = useState(false);
    const [currentSnake, setCurrentSnake] = useState<SnakeConfig | null>(null);
    const [currentMode, setCurrentMode] = useState<GameMode>('classic');
    const [gameKey, setGameKey] = useState(0); // Key to force GameCanvas remount on retry
    const [justUnlockedLevel, setJustUnlockedLevel] = useState<number | null>(null); // For unlock animation

    const directionCallbackRef = useRef<((dir: Direction) => void) | null>(null);

    const { startGame, reset, isPlaying, isPaused, pauseGame, resumeGame } = useGameStore();
    const { getSelectedSnake } = useShopStore();
    const { dpadEnabled, unlockNextLevel } = useUserStore();

    const handleStartGame = useCallback((snake: SnakeConfig, mode: GameMode) => {
        setCurrentSnake(snake);
        setCurrentMode(mode);
        startGame(snake, mode);
        setScreen('game');
    }, [startGame]);

    const handleGameOver = useCallback(() => {
        setScreen('gameover');
    }, []);

    // Level up is now handled automatically in GameCanvas with flash animation
    const handleLevelUp = useCallback((_level: number) => {
        // No-op: level up animation is now in-game
    }, []);

    const handlePlayAgain = useCallback(() => {
        const snake = getSelectedSnake();
        if (!snake) return;

        // Get current game state BEFORE any changes
        const store = useGameStore.getState();
        const currentLives = store.lives;
        const isFullReset = currentLives === 0; // All lives used, starting fresh

        setCurrentSnake(snake);

        // Calculate total lives: base 3 + snake's extra lives
        const snakeExtraLives = snake?.extraLives || 0;
        const totalLives = 3 + snakeExtraLives;

        // Reset game state for retry
        // If lives > 0: continue with same snake size (no gameKey change)
        // If lives = 0: full reset with fresh snake (gameKey change) but keep level
        useGameStore.setState({
            isPlaying: true,
            isPaused: false,
            isGameOver: false,
            score: isFullReset ? 0 : store.score, // Reset score on full reset
            catHitsThisLevel: isFullReset ? 0 : store.catHitsThisLevel,
            level: isFullReset ? store.lastPlayedLevel : store.level, // Restart from SAME LEVEL, not level 1!
            lives: isFullReset ? totalLives : store.lives, // Reset lives to 3 + snake extra lives on full reset
            isFirstGame: isFullReset ? true : store.isFirstGame, // Reset first-game protection on full reset
            isDying: false,
            isStunned: false,
            stunEndTime: 0,
        });

        // ALWAYS remount GameCanvas on full reset (all lives used)
        // This resets the snake to its initial size (important for Adventure Mode!)
        if (isFullReset) {
            setGameKey(k => k + 1);
        }

        setScreen('game');
    }, [getSelectedSnake]);

    const handleMainMenu = useCallback(() => {
        reset();
        setShowPauseMenu(false);
        setScreen('menu');
    }, [reset]);

    // Pause menu handlers
    const handlePauseGame = useCallback(() => {
        pauseGame();
        setShowPauseMenu(true);
    }, [pauseGame]);

    const handleResumeGame = useCallback(() => {
        setShowPauseMenu(false);
        resumeGame();
    }, [resumeGame]);

    const handleOpenSettingsFromPause = useCallback(() => {
        setShowSettings(true);
    }, []);

    const handleDpadPress = useCallback((direction: Direction) => {
        if (directionCallbackRef.current) {
            directionCallbackRef.current(direction);
        }
    }, []);

    const setDirectionCallback = useCallback((callback: (dir: Direction) => void) => {
        directionCallbackRef.current = callback;
    }, []);

    // Adventure mode level complete handler - just unlock next level
    const handleAdventureLevelComplete = useCallback((completedLevel: number) => {
        console.log('[Adventure] Level completed:', completedLevel);
        // Unlock next level (game continues automatically, no screen change)
        unlockNextLevel();
    }, [unlockNextLevel]);

    return (
        <div className="app">
            {/* Main Menu */}
            {screen === 'menu' && (
                <MainMenu
                    onStartGame={handleStartGame}
                    onOpenShop={() => setShowShop(true)}
                    onOpenSettings={() => setShowSettings(true)}
                    onOpenAdventureMap={() => setScreen('adventureMap')}
                />
            )}

            {/* Adventure Map */}
            {screen === 'adventureMap' && (
                <AdventureMap
                    currentLevel={useGameStore.getState().level}
                    justUnlockedLevel={justUnlockedLevel ?? undefined}
                    onSelectLevel={(level) => {
                        // Start adventure mode at selected level
                        console.log('[DEBUG App] Starting adventure at level:', level);
                        const snake = getSelectedSnake();
                        setCurrentSnake(snake);
                        setCurrentMode('adventure');
                        startGame(snake, 'adventure', level);
                        console.log('[DEBUG App] After startGame, gameStore level:', useGameStore.getState().level);
                        setJustUnlockedLevel(null); // Clear unlock animation
                        setScreen('game');
                    }}
                    onBack={() => setScreen('menu')}
                />
            )}

            {/* Game - Render both in 'game' and 'gameover' screens to preserve snake size */}
            {(screen === 'game' || screen === 'gameover') && currentSnake && (
                <div className="game-screen">
                    {/* HUD - Above game area with pause button */}
                    <GameHUD
                        onPause={handlePauseGame}
                        showPauseButton={isPlaying && !isPaused && screen === 'game'}
                    />

                    <div className="game-area">
                        <GameCanvas
                            key={gameKey}
                            snakeConfig={currentSnake}
                            gameMode={currentMode}
                            onGameOver={handleGameOver}
                            onLevelUp={handleLevelUp}
                            onAdventureLevelComplete={handleAdventureLevelComplete}
                            onDirectionCallbackReady={setDirectionCallback}
                        />
                    </div>

                    {/* D-Pad - Fixed position at bottom, only if enabled */}
                    {dpadEnabled && isPlaying && !isPaused && screen === 'game' && (
                        <div className="dpad-area">
                            <DPad
                                onDirectionChange={handleDpadPress}
                                disabled={false}
                            />
                        </div>
                    )}

                    {/* Game Over Modal - Overlay on top of GameCanvas */}
                    {screen === 'gameover' && (
                        <GameOverModal
                            onPlayAgain={handlePlayAgain}
                            onMainMenu={handleMainMenu}
                        />
                    )}
                </div>
            )}

            {/* Pause Menu Overlay */}
            {showPauseMenu && (
                <PauseMenu
                    onResume={handleResumeGame}
                    onSettings={handleOpenSettingsFromPause}
                    onMainMenu={handleMainMenu}
                />
            )}


            {/* Level Up Modal removed - now using in-game flash animation */}

            {/* Shop Modal */}
            {showShop && (
                <ShopModal onClose={() => setShowShop(false)} />
            )}

            {/* Settings Modal */}
            {showSettings && (
                <SettingsModal onClose={() => setShowSettings(false)} />
            )}
        </div>
    );
}
