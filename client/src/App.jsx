import { useState } from 'react';
import RegisterPlayer from './components/RegisterPlayer';
import Lobby from './components/Lobby';
import ShipPlacement from './components/ShipPlacement';
import GameBoard from './components/GameBoard';
import GameOver from './components/GameOver';
import { getPlayer, getMyGames } from './utils/localStorage';
import { saveGame, getSavedGame, clearGame, addMyGame, updateMyGame, removeMyGame } from './utils/localStorage';

function App() {
  const savedGame = getSavedGame();
  const restoredPlayer = getPlayer();

  const [player, setPlayer] = useState(restoredPlayer);
  const [currentGameId, setCurrentGameId] = useState(savedGame?.gameId ?? null);
  const [currentView, setCurrentView] = useState(
    restoredPlayer && savedGame ? savedGame.view : 'lobby'
  );
  const [winnerId, setWinnerId] = useState(null);

  const handleRegisterSuccess = (playerData) => {
    setPlayer(playerData);
    clearGame();
    setCurrentView('lobby');
  };

  // Called after joining a waiting game -> go to ship placement
  const handleJoinGame = (gameId) => {
    setCurrentGameId(gameId);
    setCurrentView('shipPlacement');
    saveGame(gameId, 'shipPlacement');
    addMyGame(gameId, 'shipPlacement');
  };

  // Called when clicking "View Game" on an already-active game -> go straight to board
  const handleViewGame = (gameId) => {
    setCurrentGameId(gameId);
    setCurrentView('game');
    saveGame(gameId, 'game');
    addMyGame(gameId, 'game');
  };

  // Rejoin a game from the lobby (no new join API call, just navigate)
  const handleRejoinGame = (gameId, view) => {
    setCurrentGameId(gameId);
    setCurrentView(view);
    saveGame(gameId, view);
  };

  const handlePlacementComplete = () => {
    setCurrentView('game');
    saveGame(currentGameId, 'game');
    updateMyGame(currentGameId, 'game');
  };

  const handleGameOver = (winner) => {
    setWinnerId(winner);
    setCurrentView('gameOver');
  };

  const handleBackToLobby = (gameId) => {
    if (gameId) removeMyGame(gameId);
    setCurrentGameId(null);
    setCurrentView('lobby');
    setWinnerId(null);
    clearGame();
  };

  // Not registered - show registration
  if (!player) {
    return <RegisterPlayer onRegisterSuccess={handleRegisterSuccess} />;
  }

  // Show appropriate view based on state
  if (currentView === 'shipPlacement' && currentGameId) {
    return (
      <ShipPlacement 
        gameId={currentGameId} 
        onPlacementComplete={handlePlacementComplete}
        onBackToLobby={() => handleBackToLobby(currentGameId)}
      />
    );
  }

  if (currentView === 'game' && currentGameId) {
    return (
      <GameBoard
        gameId={currentGameId}
        onGameOver={handleGameOver}
        onBackToLobby={() => handleBackToLobby(currentGameId)}
      />
    );
  }

  if (currentView === 'gameOver' && currentGameId) {
    return (
      <GameOver
        winnerId={winnerId}
        gameId={currentGameId}
        onBackToLobby={() => handleBackToLobby(currentGameId)}
      />
    );
  }

  // Default - show lobby
  return (
    <Lobby
      onJoinGame={handleJoinGame}
      onViewGame={handleViewGame}
      onRejoinGame={handleRejoinGame}
      myGames={getMyGames()}
    />
  );
}

export default App;