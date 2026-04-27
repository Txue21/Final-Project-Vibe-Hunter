import { useState, useEffect, useRef } from 'react';
import { getGame, getMoves, fireMissile, sonarScan, surrenderGame } from '../services/api';
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
  const [sonarMode, setSonarMode] = useState(false);     // sonar targeting active
  const [sonarHover, setSonarHover] = useState(null);    // { row, col } hovered cell while in sonar mode
  const [sonarResults, setSonarResults] = useState(null); // { cells, hasSignal, shipCells }
  const [showSurrenderModal, setShowSurrenderModal] = useState(false);

  const player = getPlayer();
  const [myTurnOrder, setMyTurnOrder] = useState(null);
  const intervalRef = useRef(null);

  useEffect(() => {
    fetchGameData();
    
    // Poll every 2 seconds for updates
    intervalRef.current = setInterval(fetchGameData, 2000);
    
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [gameId]);

  const fetchGameData = async () => {
    // Fetch game state
    const { data: gameData, error: gameError } = await getGame(gameId, player?.playerId);
    
    if (gameData) {
      setGame(gameData);
      
      // Find my turn order
      if (gameData.players && Array.isArray(gameData.players)) {
        const me = gameData.players.find(p => p.player_id === player.playerId);
        if (me) {
          setMyTurnOrder(me.turn_order);
        }
      }
      
      // Check if game is finished — stop polling immediately
      const winner = getWinner(gameData);
      if (winner !== null) {
        if (intervalRef.current) {
          clearInterval(intervalRef.current);
          intervalRef.current = null;
        }
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

  const handleFire = async (row, col, targetPlayerId) => {
    if (firing) return;
    
    setFiring(true);
    setError('');

    const { data, error: apiError } = await fireMissile(
      gameId,
      player.playerId,
      targetPlayerId,
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

  const handleSonar = async (row, col) => {
    if (firing) return;
    setSonarMode(false);
    setSonarHover(null);
    setFiring(true);
    setError('');

    const { data, error: apiError } = await sonarScan(gameId, player.playerId, row, col);

    if (data) {
      setSonarResults({ cells: data.scan_cells, hasSignal: data.has_signal, shipCells: data.ship_cells || [] });
      const msg = data.has_signal ? '📡 Signal detected in scan area!' : '📡 Nothing in range';
      setFireResult({ result: 'sonar', coord: msg, ship_sunk: false, sunk_ship_size: null });
      setTimeout(() => setFireResult(null), 3000);
      setTimeout(() => setSonarResults(null), 4000);
      fetchGameData();
    } else {
      setError(apiError);
    }

    setFiring(false);
  };

  const handleSurrender = async () => {
    setShowSurrenderModal(false);
    const { data, error: apiError } = await surrenderGame(gameId, player.playerId);
    if (data) {
      if (data.game_status === 'finished') {
        onGameOver(data.winner_id);
      } else {
        fetchGameData();
      }
    } else {
      setError(apiError);
    }
  };

  // Compute scan shape cells from a hover center — mirrors backend logic
  const getScanCells = (centerRow, centerCol, gridSize) => {
    const offsets = gridSize < 10
      ? [[0,0],[-1,0],[1,0],[0,-1],[0,1]]
      : [[-1,-1],[-1,0],[-1,1],[0,-1],[0,0],[0,1],[1,-1],[1,0],[1,1]];
    return offsets
      .map(([dr, dc]) => ({ row: centerRow + dr, col: centerCol + dc }))
      .filter(c => c.row >= 0 && c.row < gridSize && c.col >= 0 && c.col < gridSize);
  };

  const renderBoard = (boardPlayer, isMyBoard) => {
    if (!game) return null;

    // Own board: show all ships. Opponent board: backend returns sunk cells only.
    const ships = boardPlayer.ships || [];
    const canClick = !isMyBoard && isMyTurn && !firing && !boardPlayer.is_eliminated;
    const canSonar = sonarMode && !isMyBoard && !boardPlayer.is_eliminated;

    // Hover preview — shape to show before the player commits a sonar click
    const sonarPreviewCells = (canSonar && sonarHover && !sonarResults)
      ? getScanCells(sonarHover.row, sonarHover.col, game.grid_size)
      : [];

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

                  // Sonar overlays — priority: ship > signal/scanned > preview-center > preview
                  let sonarResult = null;
                  if (!isMyBoard && sonarResults) {
                    const inScan = sonarResults.cells.some(c => c.row === row && c.col === col);
                    if (inScan) {
                      sonarResult = sonarResults.hasSignal ? 'signal' : 'scanned';
                    }
                    // Ship cells revealed by sonar override the generic signal colour
                    if (sonarResults.shipCells && sonarResults.shipCells.some(c => c.row === row && c.col === col)) {
                      sonarResult = 'ship';
                    }
                  }
                  // Hover preview shape (only before firing, no result displayed yet)
                  if (!sonarResult && sonarPreviewCells.length) {
                    const inPreview = sonarPreviewCells.some(c => c.row === row && c.col === col);
                    if (inPreview) {
                      sonarResult = (row === sonarHover.row && col === sonarHover.col)
                        ? 'preview-center'
                        : 'preview';
                    }
                  }

                  const clickHandler = canSonar
                    ? () => handleSonar(row, col)
                    : (canClick && !alreadyFired ? () => handleFire(row, col, boardPlayer.player_id) : undefined);

                  return (
                    <GridCell
                      key={`cell-${row}-${col}`}
                      row={row}
                      col={col}
                      state={cellState}
                      size={35}
                      disabled={canSonar ? false : (!canClick || alreadyFired)}
                      onClick={clickHandler}
                      sonarResult={sonarResult}
                      onCellHover={canSonar ? (r, c) => setSonarHover(r !== null ? { row: r, col: c } : null) : undefined}
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
      {/* Surrender Confirmation Modal */}
      {showSurrenderModal && (
        <div style={styles.sunkOverlay}>
          <div style={{ ...styles.sunkSplashBox, pointerEvents: 'all' }}>
            <div style={{ fontSize: '48px' }}>⚠️</div>
            <div style={{ fontSize: '24px', fontWeight: 'bold', color: '#7f1d1d', marginBottom: '12px' }}>Surrender?</div>
            <p style={{ color: '#6b7280', marginBottom: '24px', fontSize: '15px' }}>
              Are you sure? You will lose this game. This cannot be undone.
            </p>
            <div style={{ display: 'flex', gap: '12px', justifyContent: 'center' }}>
              <button
                onClick={handleSurrender}
                style={{ padding: '12px 28px', background: '#ef4444', color: 'white', border: 'none', borderRadius: '8px', fontWeight: 'bold', fontSize: '16px', cursor: 'pointer' }}
              >Yes, Surrender</button>
              <button
                onClick={() => setShowSurrenderModal(false)}
                style={{ padding: '12px 28px', background: '#e5e7eb', color: '#374151', border: 'none', borderRadius: '8px', fontWeight: 'bold', fontSize: '16px', cursor: 'pointer' }}
              >Cancel</button>
            </div>
          </div>
        </div>
      )}
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
              fireResult.result === 'sonar'    ? '#fef3c7' :
              fireResult.result === 'defender' ? '#fef3c7' : '#f3f4f6',
            borderColor:
              fireResult.result === 'hit'      ? '#f87171' :
              fireResult.result === 'miss'     ? '#d1d5db' :
              fireResult.result === 'sonar'    ? '#fbbf24' :
              fireResult.result === 'defender' ? '#fbbf24' : '#d1d5db',
          }}>
            {fireResult.result === 'hit' && !fireResult.ship_sunk && `🎯 HIT at ${fireResult.coord}!`}
            {fireResult.result === 'hit' && fireResult.ship_sunk  && `💀 SUNK! ${fireResult.sunk_ship_size}-cell ship destroyed at ${fireResult.coord}!`}
            {fireResult.result === 'miss'     && `💨 Miss at ${fireResult.coord}`}
            {fireResult.result === 'sonar'    && fireResult.coord}
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
          <button
            onClick={() => setShowSurrenderModal(true)}
            style={{ ...styles.backBtn, background: 'rgba(239,68,68,0.8)', borderColor: '#ef4444', marginLeft: '8px' }}
          >
            🏳️ Surrender
          </button>
        </div>

        {/* Turn Indicator + Sonar Button */}
        <div style={{ display: 'flex', gap: '10px', alignItems: 'stretch', marginBottom: '20px' }}>
          <div 
            className={isMyTurn ? 'pulse-animation' : ''}
            style={{
              ...styles.turnIndicator,
              flex: 1,
              marginBottom: 0,
              backgroundColor: isMyTurn ? '#10b981' : '#f59e0b',
            }}
          >
            {sonarMode ? (
              <span>📡 SONAR MODE — click an opponent cell to scan</span>
            ) : isMyTurn ? (
              <span>🎯 YOUR TURN! Click on an opponent’s board to fire</span>
            ) : (
              <span>⏳ Waiting for {currentTurnPlayer?.username || `Player ${currentTurnPlayer?.player_id}`}...</span>
            )}
          </div>

          {/* Sonar button — only in sonar mode games, on my turn, and if not yet used */}
          {game.game_mode === 'sonar' && isMyTurn && !myPlayer?.sonar_used && (
            <button
              onClick={() => { setSonarMode(m => { if (m) setSonarHover(null); return !m; }); }}
              style={{
                padding: '0 20px',
                background: sonarMode ? '#f59e0b' : '#fbbf24',
                border: '2px solid #f59e0b',
                borderRadius: '10px',
                fontWeight: 'bold',
                fontSize: '16px',
                cursor: 'pointer',
                color: '#1e1b4b',
                whiteSpace: 'nowrap',
              }}
            >
              📡 {sonarMode ? 'Cancel Scan' : 'Use Sonar'}
            </button>
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
          <div style={{
            ...styles.boardsContainer,
            gridTemplateColumns: game.grid_size > 10 ? '1fr' : 'repeat(auto-fit, minmax(350px, 1fr))'
          }}>
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
