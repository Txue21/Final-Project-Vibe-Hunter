import { useState } from 'react';
import RegisterPlayer from './components/RegisterPlayer';
import Lobby from './components/Lobby';
import ShipPlacement from './components/ShipPlacement';
import GameBoard from './components/GameBoard';
import GameOver from './components/GameOver';

function App() {
  const [player, setPlayer] = useState(null);
  const [currentGameId, setCurrentGameId] = useState(null);
  const [currentView, setCurrentView] = useState('lobby'); // 'lobby', 'shipPlacement', 'game', 'gameOver'
  const [winnerId, setWinnerId] = useState(null);

  const handleRegisterSuccess = (playerData) => {
    setPlayer(playerData);
    setCurrentView('lobby');
  };

  // Called after joining a waiting game → go to ship placement
  const handleJoinGame = (gameId) => {
    setCurrentGameId(gameId);
    setCurrentView('shipPlacement');
  };

  // Called when clicking "View Game" on an already-active game → go straight to board
  const handleViewGame = (gameId) => {
    setCurrentGameId(gameId);
    setCurrentView('game');
  };

  const handlePlacementComplete = () => {
    setCurrentView('game');
  };

  const handleGameOver = (winner) => {
    setWinnerId(winner);
    setCurrentView('gameOver');
  };

  const handleBackToLobby = () => {
    setCurrentGameId(null);
    setCurrentView('lobby');
    setWinnerId(null);
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
      />
    );
  }

  if (currentView === 'game' && currentGameId) {
    return (
      <GameBoard
        gameId={currentGameId}
        onGameOver={handleGameOver}
        onBackToLobby={handleBackToLobby}
      />
    );
  }

  if (currentView === 'gameOver' && currentGameId) {
    return (
      <GameOver
        winnerId={winnerId}
        gameId={currentGameId}
        onBackToLobby={handleBackToLobby}
      />
    );
  }

  // Default - show lobby
  return <Lobby onJoinGame={handleJoinGame} onViewGame={handleViewGame} />;
}

export default App;