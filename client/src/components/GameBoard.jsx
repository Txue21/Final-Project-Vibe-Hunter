import { useState, useEffect, useRef, Fragment } from 'react';
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
  const [turnFlash, setTurnFlash]   = useState(null); // { text, bg } — brief result in turn bar
  const [sunkSplash, setSunkSplash] = useState(null); // { message, type } — center overlay

  const sunkGroupsRef = useRef(new Set()); // tracks "playerId-groupId" keys already notified
  
  const player = getPlayer();
  const [myTurnOrder, setMyTurnOrder] = useState(null);

  const SHIP_NAME_BY_SIZE = { 3: 'Submarine', 4: 'Destroyer', 5: 'Carrier' };

  function flashTurn(text, bg) {
    setTurnFlash({ text, bg });
    setTimeout(() => setTurnFlash(null), 2000);
  }

  function showSunkSplash(message, type) {
    setSunkSplash({ message, type });
    setTimeout(() => setSunkSplash(null), 2500);
  }

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

      // Detect newly sunk ships on own board (defender notification)
      if (gameData.status === 'active' && gameData.players) {
        const me = gameData.players.find(p => p.player_id === player.playerId);
        if (me && me.ships) {
          // Group cells by group_id
          const groups = {};
          for (const ship of me.ships) {
            if (!groups[ship.group_id]) groups[ship.group_id] = [];
            groups[ship.group_id].push(ship);
          }
          for (const [groupId, cells] of Object.entries(groups)) {
            const allSunk = cells.every(c => c.is_sunk);
            const key = `${me.player_id}-${groupId}`;
            if (allSunk && !sunkGroupsRef.current.has(key)) {
              sunkGroupsRef.current.add(key);
              const shipName = SHIP_NAME_BY_SIZE[cells.length] || `${cells.length}-cell ship`;
              showSunkSplash(`Your ${shipName} was sunk!`, 'defender');
            }
          }
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
      // Ship sunk → center-screen overlay; regular hit/miss → flash in turn bar
      if (data.ship_sunk) {
        const shipName = SHIP_NAME_BY_SIZE[data.sunk_ship_size] || 'ship';
        showSunkSplash(`You sunk their ${shipName}!`, 'attacker');
      } else if (data.result === 'hit') {
        flashTurn(`🎯 HIT! ${formatCoordinate(row, col)}`, '#d97706');
      } else {
        flashTurn(`💨 Miss at ${formatCoordinate(row, col)}`, '#4b5563');
      }

      // Check if someone won
      if (data.game_status === 'finished' && data.winner_id) {
        setTimeout(() => {
          onGameOver(data.winner_id);
        }, 1000);
      } else {
        // Refresh game state
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
              <Fragment key={row}>
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
                  
                  return (
                    <GridCell
                      key={`cell-${row}-${col}`}
                      row={row}
                      col={col}
                      state={cellState}
                      size={35}
                      disabled={!canClick}
                      onClick={canClick ? () => handleFire(row, col) : undefined}
                    />
                  );
                })}
              </Fragment>
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
      {/* Center-screen ship-sunk splash (attacker = green, defender = red) */}
      {sunkSplash && (
        <div style={styles.sunkOverlay}>
          <div style={{
            ...styles.sunkCard,
            ...(sunkSplash.type === 'attacker' ? styles.sunkCardAttacker : styles.sunkCardDefender),
          }}>
            <div style={styles.sunkIcon}>
              {sunkSplash.type === 'attacker' ? '🎯' : '💥'}
            </div>
            <div style={styles.sunkText}>{sunkSplash.message}</div>
          </div>
        </div>
      )}

      <div style={styles.content}>
        {/* Header */}
        <div style={styles.header}>
          <div>
            <h1 style={styles.title}>⚔️ Game #{gameId}</h1>
            <p style={styles.subtitle}>
              {game.grid_size}×{game.grid_size} Grid • {game.active_players} Players Active
            </p>
          </div>
          <button onClick={onBackToLobby} style={styles.backBtn}>
            ← Back to Lobby
          </button>
        </div>

        {/* Turn Indicator — also flashes hit/miss result briefly */}
        <div
          className={!turnFlash && isMyTurn ? 'pulse-animation' : ''}
          style={{
            ...styles.turnIndicator,
            backgroundColor: turnFlash ? turnFlash.bg : (isMyTurn ? '#10b981' : '#f59e0b'),
            transition: 'background-color 0.3s',
          }}
        >
          {turnFlash ? (
            <span>{turnFlash.text}</span>
          ) : isMyTurn ? (
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
  sunkOverlay: {
    position: 'fixed',
    inset: 0,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    background: 'rgba(0,0,0,0.55)',
    zIndex: 10000,
    pointerEvents: 'none',
  },
  sunkCard: {
    textAlign: 'center',
    padding: '44px 64px',
    borderRadius: '24px',
    boxShadow: '0 24px 64px rgba(0,0,0,0.45)',
    animation: 'sunkSplashIn 0.35s ease-out',
  },
  sunkCardAttacker: {
    background: 'linear-gradient(135deg, #10b981, #047857)',
    color: 'white',
  },
  sunkCardDefender: {
    background: 'linear-gradient(135deg, #ef4444, #b91c1c)',
    color: 'white',
  },
  sunkIcon: {
    fontSize: '64px',
    marginBottom: '12px',
    lineHeight: 1,
  },
  sunkText: {
    fontSize: '26px',
    fontWeight: '800',
    letterSpacing: '0.5px',
  },
};

export default GameBoard;
