import { useState, useEffect } from 'react';
import { getGame, placeShips } from '../services/api';
import { getPlayer } from '../utils/localstorage';
import { formatCoordinate, isValidCoordinate, isSameCoordinate } from '../utils/gridHelpers';
import { validateShipPlacement } from '../utils/gameHelpers';

function ShipPlacement({ gameId, onPlacementComplete }) {
  const [game, setGame] = useState(null);
  const [ships, setShips] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [hoveredCell, setHoveredCell] = useState(null);
  
  const player = getPlayer();
  const maxShips = 3;

  // Fetch game state on mount
  useEffect(() => {
    fetchGameState();
    
    // Poll every 3 seconds to check if all players are ready
    const interval = setInterval(fetchGameState, 3000);
    return () => clearInterval(interval);
  }, [gameId]);

  const fetchGameState = async () => {
    const { data, error: apiError } = await getGame(gameId);
    
    if (data) {
      setGame(data);
      setLoading(false);
      
      // If game status changed to 'active', all players placed ships
      if (data.status === 'active') {
        onPlacementComplete();
      }
    } else {
      setError(apiError);
      setLoading(false);
    }
  };

  const handleCellClick = (row, col) => {
    // Check if already have 3 ships
    if (ships.length >= maxShips) {
      // If clicking an existing ship, remove it
      const existingIndex = ships.findIndex(s => s.row === row && s.col === col);
      if (existingIndex >= 0) {
        setShips(ships.filter((_, i) => i !== existingIndex));
      } else {
        setError('Maximum 3 ships. Click on a ship to remove it.');
      }
      return;
    }

    // Check if cell already has a ship
    const existingShip = ships.find(s => s.row === row && s.col === col);
    if (existingShip) {
      // Remove ship
      setShips(ships.filter(s => !(s.row === row && s.col === col)));
    } else {
      // Add ship
      setShips([...ships, { row, col }]);
      setError('');
    }
  };

  const handleSubmit = async () => {
    // Validate placement
    const validation = validateShipPlacement(ships, game.grid_size);
    if (!validation.valid) {
      setError(validation.error);
      return;
    }

    setSubmitting(true);
    setError('');

    const { data, error: apiError } = await placeShips(gameId, player.playerId, ships);

    if (data) {
      alert('Ships placed successfully! Waiting for other players...');
      // Continue polling to detect when game becomes active
    } else {
      setError(apiError);
    }

    setSubmitting(false);
  };

  const handleClear = () => {
    setShips([]);
    setError('');
  };

  const isShipPlaced = (row, col) => {
    return ships.some(s => s.row === row && s.col === col);
  };

  if (loading) {
    return (
      <div style={styles.container}>
        <div style={styles.loadingCard}>
          <h2>Loading game...</h2>
        </div>
      </div>
    );
  }

  if (!game) {
    return (
      <div style={styles.container}>
        <div style={styles.errorCard}>
          <h2>Game not found</h2>
          <p>{error}</p>
        </div>
      </div>
    );
  }

  return (
    <div style={styles.container}>
      <div style={styles.content}>
        {/* Header */}
        <div style={styles.header}>
          <div>
            <h1 style={styles.title}>⚓ Place Your Ships</h1>
            <p style={styles.subtitle}>
              Game #{gameId} • {game.grid_size}×{game.grid_size} Grid
            </p>
          </div>
          <div style={styles.shipCounter}>
            <span style={styles.counterText}>
              {ships.length} / {maxShips} Ships Placed
            </span>
          </div>
        </div>

        {/* Instructions */}
        <div style={styles.instructions}>
          <p>📍 Click on the grid to place your 3 ships (1 cell each)</p>
          <p>🔄 Click on a placed ship to remove it</p>
        </div>

        {/* Grid */}
        <div style={styles.gridContainer}>
          <div style={{
            ...styles.grid,
            gridTemplateColumns: `40px repeat(${game.grid_size}, 40px)`,
          }}>
            {/* Corner cell */}
            <div style={styles.cornerCell}></div>
            
            {/* Column headers */}
            {Array.from({ length: game.grid_size }, (_, i) => (
              <div key={`col-${i}`} style={styles.headerCell}>
                {i + 1}
              </div>
            ))}

            {/* Rows with cells */}
            {Array.from({ length: game.grid_size }, (_, row) => (
              <>
                {/* Row header */}
                <div key={`row-header-${row}`} style={styles.headerCell}>
                  {String.fromCharCode(65 + row)}
                </div>
                
                {/* Grid cells */}
                {Array.from({ length: game.grid_size }, (_, col) => {
                  const hasShip = isShipPlaced(row, col);
                  const isHovered = hoveredCell?.row === row && hoveredCell?.col === col;
                  
                  return (
                    <div
                      key={`cell-${row}-${col}`}
                      style={{
                        ...styles.cell,
                        backgroundColor: hasShip ? '#3b82f6' : isHovered ? '#e0e7ff' : '#f3f4f6',
                        cursor: 'pointer',
                        border: hasShip ? '2px solid #1d4ed8' : '1px solid #d1d5db',
                      }}
                      onClick={() => handleCellClick(row, col)}
                      onMouseEnter={() => setHoveredCell({ row, col })}
                      onMouseLeave={() => setHoveredCell(null)}
                      title={formatCoordinate(row, col)}
                    >
                      {hasShip && <span style={styles.shipIcon}>🚢</span>}
                    </div>
                  );
                })}
              </>
            ))}
          </div>
        </div>

        {/* Ship List */}
        {ships.length > 0 && (
          <div style={styles.shipList}>
            <h3 style={styles.shipListTitle}>Your Ships:</h3>
            <div style={styles.shipTags}>
              {ships.map((ship, i) => (
                <span key={i} style={styles.shipTag}>
                  🚢 {formatCoordinate(ship.row, ship.col)}
                </span>
              ))}
            </div>
          </div>
        )}

        {/* Error */}
        {error && (
          <div style={styles.errorBox}>
            ⚠️ {error}
          </div>
        )}

        {/* Actions */}
        <div style={styles.actions}>
          <button
            onClick={handleClear}
            disabled={ships.length === 0 || submitting}
            style={{
              ...styles.clearBtn,
              opacity: ships.length === 0 || submitting ? 0.5 : 1,
            }}
          >
            🔄 Clear All
          </button>
          
          <button
            onClick={handleSubmit}
            disabled={ships.length !== maxShips || submitting}
            style={{
              ...styles.submitBtn,
              opacity: ships.length !== maxShips || submitting ? 0.5 : 1,
            }}
          >
            {submitting ? '⏳ Placing...' : '✅ Confirm Placement'}
          </button>
        </div>

        {/* Waiting message */}
        {submitting && (
          <div style={styles.waitingBox}>
            ⏳ Waiting for other players to place their ships...
          </div>
        )}
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
  },
  content: {
    maxWidth: '900px',
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
  shipCounter: {
    background: 'rgba(255,255,255,0.2)',
    padding: '12px 24px',
    borderRadius: '10px',
    border: '2px solid white',
  },
  counterText: {
    fontSize: '18px',
    fontWeight: 'bold',
    color: 'white',
  },
  instructions: {
    background: 'rgba(255,255,255,0.95)',
    padding: '16px',
    borderRadius: '10px',
    marginBottom: '20px',
    fontSize: '14px',
    color: '#374151',
  },
  gridContainer: {
    background: 'white',
    padding: '20px',
    borderRadius: '12px',
    boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
    marginBottom: '20px',
  },
  grid: {
    display: 'grid',
    gap: '0',
    justifyContent: 'center',
  },
  cornerCell: {
    width: '40px',
    height: '40px',
    backgroundColor: 'transparent',
  },
  headerCell: {
    width: '40px',
    height: '40px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontWeight: 'bold',
    color: '#667eea',
    fontSize: '14px',
    backgroundColor: 'transparent',
  },
  cell: {
    width: '40px',
    height: '40px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    transition: 'all 0.2s',
    userSelect: 'none',
  },
  shipIcon: {
    fontSize: '20px',
  },
  shipList: {
    background: 'white',
    padding: '16px',
    borderRadius: '10px',
    marginBottom: '20px',
  },
  shipListTitle: {
    margin: '0 0 12px 0',
    color: '#374151',
    fontSize: '16px',
  },
  shipTags: {
    display: 'flex',
    gap: '10px',
    flexWrap: 'wrap',
  },
  shipTag: {
    background: '#dbeafe',
    color: '#1e40af',
    padding: '6px 14px',
    borderRadius: '20px',
    fontSize: '14px',
    fontWeight: '600',
    border: '1px solid #93c5fd',
  },
  errorBox: {
    background: '#fee2e2',
    color: '#dc2626',
    padding: '12px',
    borderRadius: '8px',
    marginBottom: '16px',
    border: '1px solid #fecaca',
    fontSize: '14px',
  },
  actions: {
    display: 'flex',
    gap: '12px',
    justifyContent: 'center',
  },
  clearBtn: {
    padding: '14px 28px',
    background: '#6b7280',
    color: 'white',
    border: 'none',
    borderRadius: '8px',
    fontSize: '16px',
    fontWeight: 'bold',
    cursor: 'pointer',
    transition: 'background-color 0.3s',
  },
  submitBtn: {
    padding: '14px 28px',
    background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
    color: 'white',
    border: 'none',
    borderRadius: '8px',
    fontSize: '16px',
    fontWeight: 'bold',
    cursor: 'pointer',
    transition: 'transform 0.2s',
  },
  waitingBox: {
    background: '#fef3c7',
    color: '#92400e',
    padding: '14px',
    borderRadius: '8px',
    marginTop: '16px',
    textAlign: 'center',
    fontSize: '16px',
    fontWeight: '600',
  },
  loadingCard: {
    background: 'white',
    padding: '40px',
    borderRadius: '12px',
    textAlign: 'center',
    marginTop: '100px',
  },
  errorCard: {
    background: 'white',
    padding: '40px',
    borderRadius: '12px',
    textAlign: 'center',
    marginTop: '100px',
    color: '#dc2626',
  },
};

export default ShipPlacement;
