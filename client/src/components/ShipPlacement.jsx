import { useState, useEffect } from 'react';
import { getGame, placeShips } from '../services/api';
import { getPlayer } from '../utils/localStorage';

// Ship configs matching backend: sizes 3, 4, 5 — one of each
const SHIP_CONFIGS = [
  { size: 3, name: 'Destroyer',  emoji: '\u{1F6A4}', color: '#3b82f6', colorLight: '#dbeafe' },
  { size: 4, name: 'Battleship', emoji: '\u{1F6A2}', color: '#8b5cf6', colorLight: '#ede9fe' },
  { size: 5, name: 'Carrier',    emoji: '\u{1F6F3}', color: '#ef4444', colorLight: '#fee2e2' },
];

function ShipPlacement({ gameId, onPlacementComplete, onBackToLobby }) {
  const [game, setGame] = useState(null);
  const [placedShips, setPlacedShips] = useState([]); // [{start_row, start_col, size, orientation}]
  const [selectedSize, setSelectedSize] = useState(3);
  const [orientation, setOrientation] = useState('horizontal');
  const [hoveredCell, setHoveredCell] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [placed, setPlaced] = useState(false);

  const player = getPlayer();

  useEffect(() => {
    fetchGameState();
    const interval = setInterval(fetchGameState, 3000);
    return () => clearInterval(interval);
  }, [gameId]);

  // Auto-advance to next unplaced ship after placing one
  useEffect(() => {
    const placedSizes = placedShips.map(s => s.size);
    if (placedSizes.includes(selectedSize)) {
      const next = SHIP_CONFIGS.find(c => !placedSizes.includes(c.size));
      if (next) setSelectedSize(next.size);
    }
  }, [placedShips]);

  // Space bar = flip orientation
  useEffect(() => {
    const handleKey = (e) => {
      if (e.code === 'Space' || e.key === ' ') {
        e.preventDefault();
        setOrientation(o => o === 'horizontal' ? 'vertical' : 'horizontal');
      }
    };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, []);

  const fetchGameState = async () => {
    const { data, error: apiError } = await getGame(gameId);
    if (data) {
      setGame(data);
      setLoading(false);
      if (data.status === 'active') {
        onPlacementComplete();
      }
    } else {
      setError(apiError);
      setLoading(false);
    }
  };

  // Expand a ship into its individual cell coordinates
  const getShipCells = (startRow, startCol, size, orient) => {
    const cells = [];
    for (let i = 0; i < size; i++) {
      cells.push({
        row: orient === 'vertical'   ? startRow + i : startRow,
        col: orient === 'horizontal' ? startCol + i : startCol,
      });
    }
    return cells;
  };

  const fitsInGrid = (startRow, startCol, size, orient, gridSize) => {
    if (orient === 'horizontal') return startCol + size <= gridSize && startRow >= 0 && startRow < gridSize;
    return startRow + size <= gridSize && startCol >= 0 && startCol < gridSize;
  };

  const getOccupied = (ships = placedShips) => {
    const set = new Set();
    ships.forEach(ship =>
      getShipCells(ship.start_row, ship.start_col, ship.size, ship.orientation)
        .forEach(c => set.add(`${c.row},${c.col}`))
    );
    return set;
  };

  const handleCellClick = (row, col) => {
    if (!game || placed) return;

    // Click on an existing ship cell -> remove that ship
    const occupied = getOccupied();
    if (occupied.has(`${row},${col}`)) {
      const idx = placedShips.findIndex(ship =>
        getShipCells(ship.start_row, ship.start_col, ship.size, ship.orientation)
          .some(c => c.row === row && c.col === col)
      );
      if (idx >= 0) {
        const removed = placedShips[idx];
        setPlacedShips(placedShips.filter((_, i) => i !== idx));
        setSelectedSize(removed.size);
        setError('');
      }
      return;
    }

    if (placedShips.some(s => s.size === selectedSize)) {
      setError(`${SHIP_CONFIGS.find(c => c.size === selectedSize)?.name} is already placed — click it to remove first.`);
      return;
    }

    const cells = getShipCells(row, col, selectedSize, orientation);
    if (!fitsInGrid(row, col, selectedSize, orientation, game.grid_size)) {
      setError('Ship extends beyond the grid — try a different cell or flip orientation (Space).');
      return;
    }
    if (cells.some(c => occupied.has(`${c.row},${c.col}`))) {
      setError('Ships cannot overlap!');
      return;
    }

    setPlacedShips([...placedShips, { start_row: row, start_col: col, size: selectedSize, orientation }]);
    setError('');
  };

  const handleSubmit = async () => {
    if (placedShips.length !== 3) {
      setError('Place all 3 ships first.');
      return;
    }
    setSubmitting(true);
    setError('');
    const { data, error: apiError } = await placeShips(gameId, player.playerId, placedShips);
    if (data) {
      setPlaced(true);
    } else {
      setError(apiError);
      setSubmitting(false);
    }
  };

  const handleClear = () => {
    setPlacedShips([]);
    setSelectedSize(3);
    setError('');
  };

  // Compute preview cells for the hovered cell
  const previewCells = (() => {
    if (!hoveredCell || !game || placed || placedShips.some(s => s.size === selectedSize)) return [];
    const cells = getShipCells(hoveredCell.row, hoveredCell.col, selectedSize, orientation);
    if (!fitsInGrid(hoveredCell.row, hoveredCell.col, selectedSize, orientation, game.grid_size)) return [];
    return cells;
  })();

  const previewValid = previewCells.length > 0 && !previewCells.some(c => getOccupied().has(`${c.row},${c.col}`));

  // Per-cell visual data
  const getCellDisplay = (row, col) => {
    for (const ship of placedShips) {
      const cells = getShipCells(ship.start_row, ship.start_col, ship.size, ship.orientation);
      const idx = cells.findIndex(c => c.row === row && c.col === col);
      if (idx >= 0) {
        const cfg = SHIP_CONFIGS.find(c => c.size === ship.size);
        return { type: 'placed', color: cfg.color, colorLight: cfg.colorLight, isHead: idx === 0 };
      }
    }
    const inPreview = previewCells.some(c => c.row === row && c.col === col);
    if (inPreview) return { type: 'preview', valid: previewValid };
    return { type: 'empty' };
  };

  if (loading) {
    return (
      <div style={styles.container}>
        <div style={styles.centerCard}><h2 style={{ color: '#374151' }}>Loading game...</h2></div>
      </div>
    );
  }

  if (!game) {
    return (
      <div style={styles.container}>
        <div style={styles.centerCard}><h2 style={{ color: '#dc2626' }}>Game not found</h2><p>{error}</p></div>
      </div>
    );
  }

  const placedSizes = placedShips.map(s => s.size);
  const allPlaced = placedShips.length === 3;
  const selectedCfg = SHIP_CONFIGS.find(c => c.size === selectedSize);

  return (
    <div style={styles.container}>
      <div style={styles.content}>

        {/* Header */}
        <div style={styles.header}>
          <div>
            <h1 style={styles.title}>⚓ Place Your Ships</h1>
            <p style={styles.subtitle}>Game #{gameId} · {game.grid_size}×{game.grid_size} Grid</p>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div style={styles.counterBadge}>{placedShips.length} / 3 Ships Placed</div>
            <button
              onClick={() => { if (window.confirm('Leave this game and go back to lobby? You can rejoin later.')) onBackToLobby(); }}
              style={styles.backBtn}
            >
              ← Lobby
            </button>
          </div>
        </div>

        {/* Ship Selector */}
        <div style={styles.shipSelectorRow}>
          {SHIP_CONFIGS.map(cfg => {
            const isPlaced   = placedSizes.includes(cfg.size);
            const isSelected = selectedSize === cfg.size && !isPlaced;
            return (
              <button
                key={cfg.size}
                onClick={() => { if (!isPlaced) { setSelectedSize(cfg.size); setError(''); } }}
                style={{
                  ...styles.shipBtn,
                  border: `3px solid ${isSelected ? cfg.color : isPlaced ? '#d1d5db' : '#9ca3af'}`,
                  background: isPlaced ? '#f3f4f6' : isSelected ? cfg.colorLight : 'white',
                  opacity: isPlaced ? 0.6 : 1,
                  cursor: isPlaced ? 'not-allowed' : 'pointer',
                  transform: isSelected ? 'scale(1.05)' : 'scale(1)',
                }}
                disabled={isPlaced}
              >
                <span style={{ fontSize: '28px' }}>{cfg.emoji}</span>
                <span style={{ fontWeight: 'bold', color: cfg.color }}>{cfg.name}</span>
                <div style={styles.shipSizeBar}>
                  {Array.from({ length: cfg.size }, (_, i) => (
                    <div key={i} style={{ ...styles.shipCell, background: cfg.color }} />
                  ))}
                </div>
                <span style={{ fontSize: '12px', color: '#6b7280' }}>{cfg.size} cells</span>
                {isPlaced && <span style={styles.placedBadge}>&#10003; Placed</span>}
              </button>
            );
          })}
        </div>

        {/* Orientation toggle */}
        {!allPlaced && (
          <div style={styles.orientationRow}>
            <button
              onClick={() => setOrientation(o => o === 'horizontal' ? 'vertical' : 'horizontal')}
              style={styles.orientBtn}
            >
              {orientation === 'horizontal' ? '↔ Horizontal' : '↕ Vertical'}
              <span style={{ fontSize: '12px', marginLeft: '8px', opacity: 0.75 }}>(Space to flip)</span>
            </button>
            {!placedSizes.includes(selectedSize) && (
              <span style={styles.placingHint}>
                Placing: <strong>{selectedCfg?.emoji} {selectedCfg?.name}</strong> ({selectedCfg?.size} cells, {orientation})
              </span>
            )}
          </div>
        )}

        {/* Grid */}
        <div style={styles.gridContainer}>
          <div style={{ ...styles.grid, gridTemplateColumns: `40px repeat(${game.grid_size}, 40px)` }}>
            <div style={styles.cornerCell} />
            {Array.from({ length: game.grid_size }, (_, i) => (
              <div key={`col-${i}`} style={styles.headerCell}>{i + 1}</div>
            ))}
            {Array.from({ length: game.grid_size }, (_, row) => (
              <>
                <div key={`rh-${row}`} style={styles.headerCell}>{String.fromCharCode(65 + row)}</div>
                {Array.from({ length: game.grid_size }, (_, col) => {
                  const display = getCellDisplay(row, col);
                  let bg = '#f3f4f6';
                  let cursor = placed ? 'default' : 'pointer';

                  if (display.type === 'placed') {
                    bg = display.colorLight;
                  } else if (display.type === 'preview') {
                    bg = display.valid ? '#bbf7d0' : '#fee2e2';
                  }

                  return (
                    <div
                      key={`cell-${row}-${col}`}
                      style={{ ...styles.cell, backgroundColor: bg, cursor }}
                      onClick={() => handleCellClick(row, col)}
                      onMouseEnter={() => !placed && setHoveredCell({ row, col })}
                      onMouseLeave={() => setHoveredCell(null)}
                      title={`${String.fromCharCode(65 + row)}${col + 1}`}
                    >
                      {display.type === 'placed' && (
                        <span style={{ fontSize: '18px' }}>
                          {SHIP_CONFIGS.find(c => c.color === display.color)?.emoji || '\u{1F6A2}'}
                        </span>
                      )}
                    </div>
                  );
                })}
              </>
            ))}
          </div>
        </div>

        {/* Error */}
        {error && <div style={styles.errorBox}>⚠ {error}</div>}

        {/* Placed ships summary */}
        {placedShips.length > 0 && (
          <div style={styles.summaryRow}>
            {placedShips.map(ship => {
              const cfg = SHIP_CONFIGS.find(c => c.size === ship.size);
              const headCoord = `${String.fromCharCode(65 + ship.start_row)}${ship.start_col + 1}`;
              return (
                <span key={ship.size} style={{ ...styles.summaryTag, borderColor: cfg.color, color: cfg.color }}>
                  {cfg.emoji} {cfg.name} @ {headCoord} ({ship.orientation[0].toUpperCase()})
                  <button
                    onClick={() => { setPlacedShips(placedShips.filter(s => s.size !== ship.size)); setSelectedSize(ship.size); }}
                    style={styles.removeBtn}
                    title="Remove ship"
                  >✕</button>
                </span>
              );
            })}
          </div>
        )}

        {/* Actions */}
        {!placed ? (
          <div style={styles.actions}>
            <button
              onClick={handleClear}
              disabled={placedShips.length === 0}
              style={{ ...styles.clearBtn, opacity: placedShips.length === 0 ? 0.4 : 1 }}
            >
              ↺ Clear All
            </button>
            <button
              onClick={handleSubmit}
              disabled={!allPlaced || submitting}
              style={{ ...styles.submitBtn, opacity: !allPlaced || submitting ? 0.5 : 1 }}
            >
              {submitting ? 'Confirming...' : '✓ Confirm Placement'}
            </button>
          </div>
        ) : (
          <div style={styles.waitingBox}>✓ Ships placed! Waiting for other players...</div>
        )}

        {/* Player Roster */}
        {game.players && game.players.length > 0 && (() => {
          const readyCount = game.players.filter(p => p.ships_placed).length;
          return (
            <div style={styles.rosterBox}>
              <h3 style={styles.rosterTitle}>
                👥 Players ({readyCount}/{game.players.length} ready)
              </h3>
              <div style={styles.rosterList}>
                {game.players.map(p => {
                  const isMe = p.player_id === player?.playerId;
                  return (
                    <div key={p.player_id} style={{
                      ...styles.rosterRow,
                      background: isMe ? '#eef2ff' : 'white',
                      border: isMe ? '2px solid #667eea' : '2px solid #e5e7eb',
                    }}>
                      <span style={styles.rosterName}>
                        {p.username}
                        {isMe && <span style={styles.youBadge}>YOU</span>}
                      </span>
                      <span style={{
                        ...styles.rosterStatus,
                        color: p.ships_placed ? '#10b981' : '#f59e0b',
                      }}>
                        {p.ships_placed ? '✅ Ready' : '🚢 Placing...'}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })()}

        {/* Instructions */}
        <div style={styles.instructions}>
          <strong>How to place ships:</strong> Select a ship above → click a grid cell to place it →
          use ↔/↕ or press <kbd>Space</kbd> to flip orientation → click a placed ship to remove it.
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
  },
  content: { maxWidth: '900px', margin: '0 auto' },
  centerCard: {
    background: 'white',
    padding: '40px',
    borderRadius: '12px',
    textAlign: 'center',
    maxWidth: '400px',
    margin: '100px auto',
  },
  header: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' },
  title: { fontSize: '32px', color: 'white', margin: 0, textShadow: '2px 2px 4px rgba(0,0,0,0.2)' },
  subtitle: { fontSize: '16px', color: 'rgba(255,255,255,0.9)', margin: '5px 0 0 0' },
  counterBadge: {
    background: 'rgba(255,255,255,0.2)',
    padding: '12px 24px',
    borderRadius: '10px',
    border: '2px solid white',
    fontSize: '18px',
    fontWeight: 'bold',
    color: 'white',
  },
  backBtn: {
    padding: '10px 18px',
    background: 'rgba(255,255,255,0.15)',
    color: 'white',
    border: '2px solid rgba(255,255,255,0.5)',
    borderRadius: '8px',
    fontWeight: '600',
    fontSize: '14px',
    cursor: 'pointer',
  },
  shipSelectorRow: { display: 'flex', gap: '12px', marginBottom: '16px', justifyContent: 'center', flexWrap: 'wrap' },
  shipBtn: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: '6px',
    padding: '14px 20px',
    borderRadius: '12px',
    fontSize: '14px',
    transition: 'all 0.15s',
    minWidth: '120px',
  },
  shipSizeBar: { display: 'flex', gap: '3px', margin: '4px 0' },
  shipCell: { width: '14px', height: '14px', borderRadius: '3px' },
  placedBadge: {
    fontSize: '12px',
    background: '#d1fae5',
    color: '#065f46',
    padding: '2px 8px',
    borderRadius: '20px',
    fontWeight: 'bold',
  },
  orientationRow: { display: 'flex', alignItems: 'center', gap: '16px', marginBottom: '16px', flexWrap: 'wrap' },
  orientBtn: {
    padding: '10px 20px',
    background: '#fbbf24',
    border: '2px solid #f59e0b',
    borderRadius: '8px',
    fontSize: '15px',
    fontWeight: 'bold',
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    color: '#1e1b4b',
    boxShadow: '0 2px 8px rgba(0,0,0,0.2)',
  },
  placingHint: {
    color: 'rgba(255,255,255,0.9)',
    fontSize: '15px',
    background: 'rgba(255,255,255,0.15)',
    padding: '8px 16px',
    borderRadius: '8px',
  },
  gridContainer: {
    background: 'white',
    padding: '20px',
    borderRadius: '12px',
    boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
    marginBottom: '16px',
    overflowX: 'auto',
  },
  grid: { display: 'grid', gap: '0', gridAutoRows: '40px', justifyContent: 'center' },
  cornerCell: { width: '40px', height: '40px' },
  headerCell: {
    width: '40px',
    height: '40px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontWeight: 'bold',
    color: '#667eea',
    fontSize: '13px',
  },
  cell: {
    width: '40px',
    height: '40px',
    boxSizing: 'border-box',
    border: '1px solid #d1d5db',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
    lineHeight: 1,
    transition: 'background-color 0.1s, box-shadow 0.1s',
    userSelect: 'none',
  },
  errorBox: {
    background: '#fee2e2',
    color: '#dc2626',
    padding: '12px',
    borderRadius: '8px',
    marginBottom: '12px',
    border: '1px solid #fecaca',
    fontSize: '14px',
  },
  summaryRow: { display: 'flex', gap: '10px', flexWrap: 'wrap', marginBottom: '16px' },
  summaryTag: {
    display: 'flex',
    alignItems: 'center',
    gap: '6px',
    border: '2px solid',
    padding: '6px 12px',
    borderRadius: '20px',
    fontSize: '13px',
    fontWeight: '600',
    background: 'white',
  },
  removeBtn: {
    background: 'none',
    border: 'none',
    cursor: 'pointer',
    fontSize: '14px',
    color: '#9ca3af',
    padding: '0 2px',
    lineHeight: 1,
  },
  actions: { display: 'flex', gap: '12px', justifyContent: 'center', marginBottom: '16px' },
  clearBtn: {
    padding: '14px 28px',
    background: '#6b7280',
    color: 'white',
    border: 'none',
    borderRadius: '8px',
    fontSize: '16px',
    fontWeight: 'bold',
    cursor: 'pointer',
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
  },
  waitingBox: {
    background: '#d1fae5',
    color: '#065f46',
    padding: '16px',
    borderRadius: '10px',
    textAlign: 'center',
    fontSize: '16px',
    fontWeight: '600',
    marginBottom: '16px',
    border: '2px solid #6ee7b7',
  },
  rosterBox: {
    background: 'rgba(255,255,255,0.15)',
    borderRadius: '12px',
    padding: '16px',
    marginBottom: '16px',
    border: '2px solid rgba(255,255,255,0.3)',
  },
  rosterTitle: {
    color: 'white',
    margin: '0 0 12px 0',
    fontSize: '16px',
    fontWeight: '700',
  },
  rosterList: {
    display: 'flex',
    flexDirection: 'column',
    gap: '8px',
  },
  rosterRow: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '10px 14px',
    borderRadius: '8px',
  },
  rosterName: {
    fontWeight: '600',
    color: '#374151',
    fontSize: '14px',
    display: 'flex',
    alignItems: 'center',
    gap: '6px',
  },
  youBadge: {
    fontSize: '10px',
    background: '#667eea',
    color: 'white',
    padding: '2px 6px',
    borderRadius: '4px',
    fontWeight: 'bold',
  },
  rosterStatus: {
    fontSize: '13px',
    fontWeight: '600',
  },
  instructions: {
    background: 'rgba(255,255,255,0.15)',
    padding: '12px 16px',
    borderRadius: '8px',
    fontSize: '13px',
    color: 'rgba(255,255,255,0.9)',
    textAlign: 'center',
  },
};

export default ShipPlacement;
