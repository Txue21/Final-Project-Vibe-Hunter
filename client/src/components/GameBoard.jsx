import { useState, useEffect } from 'react';
import { getGame, getMoves, fireMissile } from '../services/api';
import { getPlayer } from '../utils/localStorage';
import { formatCoordinate } from '../utils/gridHelpers';
import { getCellState, isPlayersTurn, getWinner } from '../utils/gameHelpers';
import GridCell from './GridCell';
import MoveHistory from './MoveHistory';

function GameBoard({ gameId, onGameOver, onBackToLobby }) {
  const [game, setGame] = useState(null);
  const [moves, setMoves] = useState([]);
  const [loading, setLoading] = useState(true);
  const [firing, setFiring] = useState(false);
  const [error, setError] = useState('');
  const [fireResult, setFireResult] = useState(null);   // { result, coord, ship_sunk, sunk_ship_size }
  const [sunkSplash, setSunkSplash] = useState(null);   // { size, coord } shown for 2.5s
  const [prevMoveCount, setPrevMoveCount] = useState(0); // defender notification tracking

  const player = getPlayer();
  const [myTurnOrder, setMyTurnOrder] = useState(null);

  useEffect(() => {
    fetchGameData();
    
    // Poll every 2 seconds for updates
    const interval = setInterval(fetchGameData, 2000);
    
    return () => clearInterval(interval);
  }, [gameId]);

  const fetchGameData = async () => {
    // Fetch game state
    const { data: gameData, error: gameError } = await getGame(gameId);
    
    if (gameData) {
      setGame(gameData);
      
      // Find my turn order
      if (gameData.players && Array.isArray(gameData.players)) {
        const me = gameData.players.find(p => p.player_id === player.playerId);
        if (me) {
          setMyTurnOrder(me.turn_order);
        }
      }
      
      // Check if game is finished
      const winner = getWinner(gameData);
      if (winner !== null) {
        onGameOver(winner);
      }
    } else {
      setError(gameError);
    }

    // Fetch moves
    const { data: movesData } = await getMoves(gameId);
    if (movesData) {
      // Defender notification: detect new moves that targeted me
      setPrevMoveCount(prev => {
        if (movesData.length > prev && prev > 0) {
          const newMoves = movesData.slice(prev);
          newMoves.forEach(m => {
            if (m.target_player_id === player.playerId && m.result === 'hit') {
              const coord = (m.row !== undefined && m.col !== undefined)
                ? `${String.fromCharCode(65 + m.row)}${m.col + 1}` : '?';
              setFireResult({ result: 'defender', coord, sunk_ship_size: null });
              setTimeout(() => setFireResult(null), 2500);
            }
          });
        }
        return movesData.length;
      });
      setMoves(movesData);
    }

    setLoading(false);
  };

  const handleFire = async (row, col) => {
    if (firing) return;
    
    setFiring(true);
    setError('');

    const { data, error: apiError } = await fireMissile(
      gameId, 
      player.playerId, 
      row, 
      col
    );

    if (data) {
      const coord = formatCoordinate(row, col);
      // Show in-UI toast instead of alert
      setFireResult({ result: data.result, coord, ship_sunk: data.ship_sunk, sunk_ship_size: data.sunk_ship_size });
      setTimeout(() => setFireResult(null), 2500);

      // Show sunk splash overlay
      if (data.ship_sunk) {
        setSunkSplash({ size: data.sunk_ship_size, coord });
        setTimeout(() => setSunkSplash(null), 2500);
      }

      // Check if someone won
      if (data.game_status === 'finished' && data.winner_id) {
        setTimeout(() => {
          onGameOver(data.winner_id);
        }, 1500);
      } else {
        fetchGameData();
      }
    } else {
      setError(apiError);
    }

    setFiring(false);
  };

  const renderBoard = (boardPlayer, isMyBoard) => {
    if (!game) return null;

    const ships = isMyBoard && boardPlayer.ships ? boardPlayer.ships : [];
    const canClick = !isMyBoard && isMyTurn && !firing && !boardPlayer.is_eliminated;
    
    return (
      <div style={styles.singleBoard}>
        <div style={styles.boardHeader}>
          <h3 style={styles.boardTitle}>
            {isMyBoard ? '🛡️ Your Board' : `👤 ${boardPlayer.username || `Player ${boardPlayer.player_id}`}`}
          </h3>
          {boardPlayer.is_eliminated && (
            <span style={styles.eliminatedBadge}>❌ Eliminated</span>
          )}
        </div>

        <div style={styles.gridWrapper}>
          <div style={{
            ...styles.grid,
            gridTemplateColumns: `30px repeat(${game.grid_size}, 35px)`,
          }}>
            {/* Corner */}
            <div style={styles.cornerCell}></div>
            
            {/* Column headers */}
            {Array.from({ length: game.grid_size }, (_, i) => (
              <div key={`col-${i}`} style={styles.headerCell}>
                {i + 1}
              </div>
            ))}

            {/* Rows */}
            {Array.from({ length: game.grid_size }, (_, row) => (
              <>
                {/* Row header */}
                <div key={`row-header-${row}`} style={styles.headerCell}>
                  {String.fromCharCode(65 + row)}
                </div>
                
                {/* Cells */}
                {Array.from({ length: game.grid_size }, (_, col) => {
                  const cellState = getCellState(
                    row, 
                    col, 
                    ships, 
                    moves, 
                    boardPlayer.player_id, 
                    isMyBoard
                  );
                  
                  const alreadyFired = ['hit', 'miss', 'sunk'].includes(cellState);
                  return (
                    <GridCell
                      key={`cell-${row}-${col}`}
                      row={row}
                      col={col}
                      state={cellState}
                      size={35}
                      disabled={!canClick || alreadyFired}
                      onClick={canClick && !alreadyFired ? () => handleFire(row, col) : undefined}
                    />
                  );
                })}
              </>
            ))}
          </div>
        </div>
      </div>
    );
  };

  if (loading) {
    return (
      <div style={styles.container}>
        <div style={styles.loadingBox}>
          <h2>Loading game...</h2>
        </div>
      </div>
    );
  }

  if (!game) {
    return (
      <div style={styles.container}>
        <div style={styles.errorBox}>
          <h2>Game not found</h2>
          <p>{error}</p>
          <button onClick={onBackToLobby} style={styles.backBtn}>
            Back to Lobby
          </button>
        </div>
      </div>
    );
  }

  const myPlayer = game.players?.find(p => p.player_id === player.playerId);
  const opponents = game.players?.filter(p => p.player_id !== player.playerId) || [];
  const isMyTurn = myTurnOrder !== null && isPlayersTurn(game.current_turn_index, myTurnOrder);
  const currentTurnPlayer = game.players?.find(p => p.turn_order === game.current_turn_index);

  return (
    <div style={styles.container}>
      {/* Sunk Splash Overlay */}
      {sunkSplash && (
        <div style={styles.sunkOverlay}>
          <div style={styles.sunkSplashBox} className="cell-sunk-animation">
            <div style={{ fontSize: '64px' }}>💀</div>
            <div style={{ fontSize: '28px', fontWeight: 'bold', color: '#7f1d1d' }}>
              Ship Sunk!
            </div>
            <div style={{ fontSize: '16px', color: '#991b1b', marginTop: '8px' }}>
              {sunkSplash.size}-cell ship destroyed at {sunkSplash.coord}
            </div>
          </div>
        </div>
      )}

        {/* Fire Result Toast — fixed bottom-right, never shifts layout */}
        {fireResult && (
          <div style={{
            ...styles.fireToast,
            backgroundColor:
              fireResult.result === 'hit'      ? '#fee2e2' :
              fireResult.result === 'miss'     ? '#f3f4f6' :
              fireResult.result === 'defender' ? '#fef3c7' : '#f3f4f6',
            borderColor:
              fireResult.result === 'hit'      ? '#f87171' :
              fireResult.result === 'miss'     ? '#d1d5db' :
              fireResult.result === 'defender' ? '#fbbf24' : '#d1d5db',
          }}>
            {fireResult.result === 'hit' && !fireResult.ship_sunk && `🎯 HIT at ${fireResult.coord}!`}
            {fireResult.result === 'hit' && fireResult.ship_sunk  && `💀 SUNK! ${fireResult.sunk_ship_size}-cell ship destroyed at ${fireResult.coord}!`}
            {fireResult.result === 'miss'     && `💨 Miss at ${fireResult.coord}`}
            {fireResult.result === 'defender' && `⚠️ Enemy hit your ship at ${fireResult.coord}!`}
          </div>
        )}

      <div style={styles.content}>
        <div style={styles.header}>
          <div>
            <h1 style={styles.title}>⚔️ Game #{gameId}</h1>
            <p style={styles.subtitle}>
              {game.grid_size}×{game.grid_size} Grid • {game.active_players} Players Active
              {player && <> • You: <strong>{player.username}</strong></>}
            </p>
          </div>
          <button onClick={onBackToLobby} style={styles.backBtn}>
            ← Back to Lobby
          </button>
        </div>

        {/* Turn Indicator */}
        <div 
          className={isMyTurn ? 'pulse-animation' : ''}
          style={{
            ...styles.turnIndicator,
            backgroundColor: isMyTurn ? '#10b981' : '#f59e0b',
          }}
        >
          {isMyTurn ? (
            <span>🎯 YOUR TURN! Click on an opponent's board to fire</span>
          ) : (
            <span>⏳ Waiting for {currentTurnPlayer?.username || `Player ${currentTurnPlayer?.player_id}`}...</span>
          )}
        </div>

        {/* Error Message */}
        {error && (
          <div style={styles.errorMessage}>⚠️ {error}</div>
        )}

        {/* Main Content: Boards + Move History */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: '1fr 400px',
          gap: '20px',
          alignItems: 'start',
        }}>
          {/* Boards Grid */}
          <div style={styles.boardsContainer}>
            {/* My Board */}
            {myPlayer && renderBoard(myPlayer, true)}

            {/* Opponent Boards */}
            {opponents.map(opponent => (
              <div key={opponent.player_id}>
                {renderBoard(opponent, false)}
              </div>
            ))}
          </div>

          {/* Move History Sidebar */}
          <div style={{
            background: 'white',
            borderRadius: '12px',
            boxShadow: '0 8px 16px rgba(0,0,0,0.1)',
            height: 'calc(100vh - 200px)',
            position: 'sticky',
            top: '20px',
            overflow: 'hidden',
          }}>
            <MoveHistory gameId={gameId} />
          </div>
        </div>
      </div>
    </div>
  );
}

const styles = {
  container: {
    minHeight: '100vh',
    width: '100%',
    background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
    padding: '20px',
    boxSizing: 'border-box',
    overflowY: 'auto',
    position: 'relative',
  },
  sunkOverlay: {
    position: 'fixed',
    inset: 0,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    background: 'rgba(0,0,0,0.55)',
    zIndex: 1000,
    pointerEvents: 'none',
  },
  sunkSplashBox: {
    background: 'white',
    borderRadius: '20px',
    padding: '40px 60px',
    textAlign: 'center',
    boxShadow: '0 20px 60px rgba(0,0,0,0.4)',
  },
  fireToast: {
    position: 'fixed',
    bottom: '32px',
    right: '32px',
    zIndex: 999,
    padding: '14px 22px',
    borderRadius: '12px',
    border: '2px solid',
    fontSize: '17px',
    fontWeight: 'bold',
    boxShadow: '0 8px 24px rgba(0,0,0,0.18)',
    animation: 'slideInRight 0.3s ease-out',
    maxWidth: '360px',
  },
  content: {
    maxWidth: '1400px',
    margin: '0 auto',
  },
  header: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '20px',
  },
  title: {
    fontSize: '32px',
    color: 'white',
    margin: 0,
    textShadow: '2px 2px 4px rgba(0,0,0,0.2)',
  },
  subtitle: {
    fontSize: '16px',
    color: 'rgba(255,255,255,0.9)',
    margin: '5px 0 0 0',
  },
  backBtn: {
    padding: '10px 20px',
    background: 'rgba(255,255,255,0.2)',
    color: 'white',
    border: '2px solid white',
    borderRadius: '8px',
    cursor: 'pointer',
    fontSize: '16px',
    fontWeight: '600',
  },
  turnIndicator: {
    padding: '16px',
    borderRadius: '10px',
    textAlign: 'center',
    color: 'white',
    fontSize: '18px',
    fontWeight: 'bold',
    marginBottom: '20px',
    boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
  },
  firingControls: {
    background: 'white',
    padding: '20px',
    borderRadius: '12px',
    marginBottom: '20px',
    boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
  },
  coordinateInputs: {
    display: 'flex',
    gap: '16px',
    alignItems: 'flex-end',
  },
  label: {
    display: 'block',
    marginBottom: '6px',
    color: '#374151',
    fontWeight: '600',
    fontSize: '14px',
  },
  select: {
    padding: '10px',
    fontSize: '16px',
    border: '2px solid #d1d5db',
    borderRadius: '6px',
    minWidth: '80px',
  },
  fireBtn: {
    padding: '12px 24px',
    background: 'linear-gradient(135deg, #ef4444 0%, #dc2626 100%)',
    color: 'white',
    border: 'none',
    borderRadius: '8px',
    fontSize: '16px',
    fontWeight: 'bold',
    cursor: 'pointer',
    flex: 1,
  },
  errorMessage: {
    marginTop: '12px',
    padding: '10px',
    background: '#fee2e2',
    color: '#dc2626',
    borderRadius: '6px',
    fontSize: '14px',
  },
  boardsContainer: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(350px, 1fr))',
    gap: '20px',
  },
  singleBoard: {
    background: 'white',
    padding: '16px',
    borderRadius: '12px',
    boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
  },
  boardHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '12px',
  },
  boardTitle: {
    margin: 0,
    fontSize: '18px',
    color: '#374151',
  },
  eliminatedBadge: {
    padding: '4px 12px',
    background: '#fee2e2',
    color: '#dc2626',
    borderRadius: '20px',
    fontSize: '12px',
    fontWeight: 'bold',
  },
  gridWrapper: {
    overflow: 'auto',
  },
  grid: {
    display: 'grid',
    gap: '0',
    justifyContent: 'center',
  },
  cornerCell: {
    width: '30px',
    height: '30px',
  },
  headerCell: {
    width: '35px',
    height: '30px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontWeight: 'bold',
    color: '#667eea',
    fontSize: '12px',
  },
  loadingBox: {
    background: 'white',
    padding: '60px',
    borderRadius: '12px',
    textAlign: 'center',
    marginTop: '100px',
    maxWidth: '500px',
    margin: '100px auto',
  },
  errorBox: {
    background: 'white',
    padding: '60px',
    borderRadius: '12px',
    textAlign: 'center',
    marginTop: '100px',
    maxWidth: '500px',
    margin: '100px auto',
    color: '#dc2626',
  },
};

export default GameBoard;
