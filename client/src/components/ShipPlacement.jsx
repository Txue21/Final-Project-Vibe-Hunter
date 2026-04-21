import { useState, useEffect, useRef, Fragment } from 'react';
import { getGame, placeShips } from '../services/api';
import { getPlayer } from '../utils/localStorage';
import { formatCoordinate } from '../utils/gridHelpers';
import { validateShipPlacement } from '../utils/gameHelpers';

const SHIPS_CONFIG = [
  { id: 'ship3', size: 3, name: 'Submarine', color: '#3b82f6' },
  { id: 'ship4', size: 4, name: 'Destroyer',  color: '#8b5cf6' },
  { id: 'ship5', size: 5, name: 'Carrier',    color: '#f59e0b' },
];

function getShipCells(startRow, startCol, size, orientation) {
  return Array.from({ length: size }, (_, i) => ({
    row: orientation === 'vertical'   ? startRow + i : startRow,
    col: orientation === 'horizontal' ? startCol + i : startCol,
  }));
}

function ShipPlacement({ gameId, onPlacementComplete }) {
  const [game, setGame]             = useState(null);
  const [loading, setLoading]       = useState(true);
  const [error, setError]           = useState('');
  const [submitting, setSubmitting] = useState(false);

  // Each ship mirrors SHIPS_CONFIG plus placement state
  const [ships, setShips] = useState(
    SHIPS_CONFIG.map(s => ({ ...s, start_row: null, start_col: null, orientation: 'horizontal' }))
  );

  // dragging: { shipId, size, orientation, color }
  const [dragging, setDragging]       = useState(null);
  const [hoverCell, setHoverCell]     = useState(null);
  // selectedShipId: for tap-to-select + tap-to-place
  const [selectedShipId, setSelectedShipId] = useState(null);

  // grabOffset: which cell index within the ship's visual was mousedown'd
  const grabOffsetRef = useRef(0);

  const player = getPlayer();

  // ── Polling ────────────────────────────────────────────────────────────────
  useEffect(() => {
    fetchGameState();
    const interval = setInterval(fetchGameState, 3000);
    return () => clearInterval(interval);
  }, [gameId]);

  // ── R key rotates during drag OR rotates selected ship ─────────────────────
  useEffect(() => {
    const onKey = (e) => {
      if (e.key === 'r' || e.key === 'R') {
        if (dragging) {
          setDragging(d =>
            d ? { ...d, orientation: d.orientation === 'horizontal' ? 'vertical' : 'horizontal' } : d
          );
        } else if (selectedShipId) {
          setShips(prev =>
            prev.map(s =>
              s.id === selectedShipId
                ? { ...s, orientation: s.orientation === 'horizontal' ? 'vertical' : 'horizontal' }
                : s
            )
          );
        }
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [dragging, selectedShipId]);

  async function fetchGameState() {
    const { data, error: apiError } = await getGame(gameId);
    if (data) {
      setGame(data);
      setLoading(false);
      if (data.status === 'active') onPlacementComplete();
    } else {
      setError(apiError);
      setLoading(false);
    }
  }

  // ── Preview helpers ────────────────────────────────────────────────────────
  function getPreview() {
    if (!hoverCell || !game) return null;

    // During drag, use dragging ship; otherwise use selected ship
    let previewShipId, size, orientation;
    if (dragging) {
      previewShipId = dragging.shipId;
      size          = dragging.size;
      orientation   = dragging.orientation;
    } else if (selectedShipId) {
      const sel = ships.find(s => s.id === selectedShipId);
      if (!sel) return null;
      previewShipId = sel.id;
      size          = sel.size;
      orientation   = sel.orientation;
    } else {
      return null;
    }

    const offset = dragging ? grabOffsetRef.current : 0;

    const startRow = hoverCell.row - (orientation === 'vertical'   ? offset : 0);
    const startCol = hoverCell.col - (orientation === 'horizontal' ? offset : 0);

    const cells = getShipCells(startRow, startCol, size, orientation);

    const allInBounds = cells.every(
      c => c.row >= 0 && c.row < game.grid_size && c.col >= 0 && c.col < game.grid_size
    );

    const hasOverlap = cells.some(c =>
      ships.some(
        s =>
          s.id !== previewShipId &&
          s.start_row !== null &&
          getShipCells(s.start_row, s.start_col, s.size, s.orientation).some(
            sc => sc.row === c.row && sc.col === c.col
          )
      )
    );

    return { cells, isValid: allInBounds && !hasOverlap, startRow, startCol };
  }

  function getCellInfo(row, col) {
    for (const ship of ships) {
      if (ship.start_row === null) continue;
      const cells = getShipCells(ship.start_row, ship.start_col, ship.size, ship.orientation);
      if (cells.some(c => c.row === row && c.col === col)) {
        return { type: 'ship', ship };
      }
    }
    const preview = getPreview();
    if (preview && preview.cells.some(c => c.row === row && c.col === col)) {
      return { type: 'preview', valid: preview.isValid };
    }
    return { type: 'empty' };
  }

  // ── Drag handlers ──────────────────────────────────────────────────────────
  function handleDragStart(e, ship) {
    setSelectedShipId(null); // Clear tap selection when dragging starts
    // If ship was already placed, pick it back up
    if (ship.start_row !== null) {
      setShips(prev =>
        prev.map(s => s.id === ship.id ? { ...s, start_row: null, start_col: null } : s)
      );
    }
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/plain', ship.id);
    setDragging({ shipId: ship.id, size: ship.size, orientation: ship.orientation, color: ship.color });
  }

  function handleDragEnd() {
    setDragging(null);
    setHoverCell(null);
  }

  function handleCellDragOver(e, row, col) {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    setHoverCell({ row, col });
  }

  function handleCellDrop(e, row, col) {
    e.preventDefault();
    if (!dragging || !game) return;

    // Compute placement directly from drop coordinates (don't rely on hoverCell state)
    const { size, orientation, shipId } = dragging;
    const offset   = grabOffsetRef.current;
    const startRow = row - (orientation === 'vertical'   ? offset : 0);
    const startCol = col - (orientation === 'horizontal' ? offset : 0);
    const cells    = getShipCells(startRow, startCol, size, orientation);

    const allInBounds = cells.every(
      c => c.row >= 0 && c.row < game.grid_size && c.col >= 0 && c.col < game.grid_size
    );
    const hasOverlap = cells.some(c =>
      ships.some(
        s =>
          s.id !== shipId &&
          s.start_row !== null &&
          getShipCells(s.start_row, s.start_col, s.size, s.orientation).some(
            sc => sc.row === c.row && sc.col === c.col
          )
      )
    );
    if (!allInBounds || hasOverlap) return;

    setShips(prev =>
      prev.map(s =>
        s.id === shipId
          ? { ...s, start_row: startRow, start_col: startCol, orientation }
          : s
      )
    );
    setDragging(null);
    setHoverCell(null);
    setError('');
  }

  // ── Tap-to-select + tap-to-place ───────────────────────────────────────────
  function handleTrayShipClick(ship) {
    if (submitting) return;
    if (ship.start_row !== null) return; // Already placed; use Remove button instead
    setSelectedShipId(prev => prev === ship.id ? null : ship.id);
  }

  function handleCellTap(row, col) {
    if (!selectedShipId || !game || submitting) return;

    const sel = ships.find(s => s.id === selectedShipId);
    if (!sel) return;

    const { size, orientation } = sel;
    const cells = getShipCells(row, col, size, orientation);

    const allInBounds = cells.every(
      c => c.row >= 0 && c.row < game.grid_size && c.col >= 0 && c.col < game.grid_size
    );
    const hasOverlap = cells.some(c =>
      ships.some(
        s =>
          s.id !== selectedShipId &&
          s.start_row !== null &&
          getShipCells(s.start_row, s.start_col, s.size, s.orientation).some(
            sc => sc.row === c.row && sc.col === c.col
          )
      )
    );

    if (!allInBounds || hasOverlap) {
      setError('Cannot place ship there — out of bounds or overlapping.');
      setTimeout(() => setError(''), 2000);
      return;
    }

    setShips(prev =>
      prev.map(s =>
        s.id === selectedShipId
          ? { ...s, start_row: row, start_col: col }
          : s
      )
    );
    setSelectedShipId(null);
    setHoverCell(null);
    setError('');
  }

  // ── Tray controls ──────────────────────────────────────────────────────────
  function toggleOrientation(e, shipId) {
    e.stopPropagation(); // Don't trigger tray ship click
    setShips(prev =>
      prev.map(s =>
        s.id === shipId
          ? { ...s, orientation: s.orientation === 'horizontal' ? 'vertical' : 'horizontal' }
          : s
      )
    );
    if (dragging && dragging.shipId === shipId) {
      setDragging(d => ({
        ...d,
        orientation: d.orientation === 'horizontal' ? 'vertical' : 'horizontal',
      }));
    }
    if (selectedShipId === shipId) {
      // Keep selection, just update orientation (already done above)
    }
  }

  function removeShip(e, shipId) {
    e.stopPropagation(); // Don't trigger tray ship click
    setShips(prev => prev.map(s => s.id === shipId ? { ...s, start_row: null, start_col: null } : s));
  }

  // ── Submit ─────────────────────────────────────────────────────────────────
  async function handleSubmit() {
    const placed   = ships.filter(s => s.start_row !== null);
    const shipData = placed.map(s => ({
      start_row:   s.start_row,
      start_col:   s.start_col,
      size:        s.size,
      orientation: s.orientation,
    }));

    const validation = validateShipPlacement(shipData, game.grid_size);
    if (!validation.valid) { setError(validation.error); return; }

    setSubmitting(true);
    setError('');
    const { data, error: apiError } = await placeShips(gameId, player.playerId, shipData);
    if (!data) {
      setError(apiError);
      setSubmitting(false);
    }
    // On success keep submitting=true; polling redirects when game starts
  }

  // ── Render ─────────────────────────────────────────────────────────────────
  const placedCount = ships.filter(s => s.start_row !== null).length;

  if (loading) {
    return (
      <div style={styles.container}>
        <div style={styles.card}><h2>Loading game...</h2></div>
      </div>
    );
  }

  if (!game) {
    return (
      <div style={styles.container}>
        <div style={styles.card}>
          <h2 style={{ color: '#dc2626' }}>Game not found</h2>
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
            <h1 style={styles.title}>⚓ Place Your Fleet</h1>
            <p style={styles.subtitle}>Game #{gameId} · {game.grid_size}×{game.grid_size} Grid</p>
          </div>
          <div style={styles.counter}>
            <span style={styles.counterText}>{placedCount} / 3 Ships Placed</span>
          </div>
        </div>

        {/* Main two-column layout */}
        <div style={styles.mainLayout}>

          {/* ── Ship tray ── */}
          <div style={styles.tray}>
            <h3 style={styles.trayTitle}>Your Fleet</h3>

            {ships.map(ship => {
              const isPlaced   = ship.start_row !== null;
              const isSelected = selectedShipId === ship.id;
              return (
                <div
                  key={ship.id}
                  style={{
                    ...styles.shipCard,
                    opacity: isPlaced ? 0.55 : 1,
                    cursor: isPlaced || submitting ? 'default' : 'pointer',
                    boxShadow: isSelected
                      ? `0 0 0 3px ${ship.color}, 0 4px 12px rgba(0,0,0,0.15)`
                      : '0 1px 4px rgba(0,0,0,0.08)',
                    border: isSelected
                      ? `2px solid ${ship.color}`
                      : '2px solid #e5e7eb',
                  }}
                  draggable={!isPlaced && !submitting}
                  onDragStart={e => handleDragStart(e, ship)}
                  onDragEnd={handleDragEnd}
                  onClick={() => handleTrayShipClick(ship)}
                >
                  <div style={styles.shipCardHeader}>
                    <span style={styles.shipName}>{ship.name}</span>
                    <span style={styles.shipSizeBadge}>{ship.size}</span>
                  </div>

                  {/* Visual cells — mousedown records grab offset */}
                  <div style={{
                    display: 'flex',
                    flexDirection: ship.orientation === 'vertical' ? 'column' : 'row',
                    gap: '3px',
                    margin: '8px 0 6px 0',
                  }}>
                    {Array.from({ length: ship.size }, (_, i) => (
                      <div
                        key={i}
                        style={{
                          width: 22, height: 22, borderRadius: 4, flexShrink: 0,
                          backgroundColor: isPlaced ? '#9ca3af' : ship.color,
                          border: '1px solid rgba(0,0,0,0.2)',
                        }}
                        onMouseDown={() => { grabOffsetRef.current = i; }}
                      />
                    ))}
                  </div>

                  <div style={{ display: 'flex', gap: '6px' }}>
                    {!isPlaced ? (
                      <button
                        style={styles.rotateBtn}
                        onClick={e => toggleOrientation(e, ship.id)}
                        title="Toggle orientation (or press R)"
                      >
                        ↻ {ship.orientation === 'horizontal' ? 'H' : 'V'}
                      </button>
                    ) : (
                      <button
                        style={styles.removeBtn}
                        onClick={e => removeShip(e, ship.id)}
                        disabled={submitting}
                      >
                        ✕ Remove
                      </button>
                    )}
                  </div>
                </div>
              );
            })}

            <p style={styles.trayHint}>
              <strong>Drag</strong> ships to the grid,<br />
              or <strong>tap</strong> a ship then tap a cell.<br />
              Press <strong>R</strong> to rotate.
            </p>
          </div>

          {/* ── Grid ── */}
          <div style={styles.gridWrapper}>
            <div
              style={{
                ...styles.grid,
                gridTemplateColumns: `40px repeat(${game.grid_size}, 40px)`,
              }}
              onDragLeave={() => setHoverCell(null)}
              onMouseLeave={() => { if (!dragging) setHoverCell(null); }}
            >
              <div style={styles.cornerCell} />

              {Array.from({ length: game.grid_size }, (_, i) => (
                <div key={`ch-${i}`} style={styles.headerCell}>{i + 1}</div>
              ))}

              {Array.from({ length: game.grid_size }, (_, row) => (
                <Fragment key={row}>
                  <div key={`rh-${row}`} style={styles.headerCell}>
                    {String.fromCharCode(65 + row)}
                  </div>
                  {Array.from({ length: game.grid_size }, (_, col) => {
                    const info = getCellInfo(row, col);
                    let bg     = '#f3f4f6';
                    let border = '1px solid #d1d5db';
                    let cursor = 'default';

                    if (dragging) cursor = 'crosshair';
                    else if (selectedShipId) cursor = 'crosshair';

                    if (info.type === 'ship') {
                      bg     = info.ship.color;
                      border = '2px solid rgba(0,0,0,0.25)';
                      cursor = submitting ? 'default' : 'pointer';
                    } else if (info.type === 'preview') {
                      bg     = info.valid ? 'rgba(59,130,246,0.35)' : 'rgba(239,68,68,0.35)';
                      border = `2px solid ${info.valid ? '#3b82f6' : '#ef4444'}`;
                    }

                    return (
                      <div
                        key={`cell-${row}-${col}`}
                        style={{ ...styles.cell, backgroundColor: bg, border, cursor }}
                        onDragOver={e => handleCellDragOver(e, row, col)}
                        onDrop={e => handleCellDrop(e, row, col)}
                        onMouseEnter={() => setHoverCell({ row, col })}
                        onClick={() => {
                          if (info.type === 'ship' && !submitting) {
                            removeShip({ stopPropagation: () => {} }, info.ship.id);
                          } else {
                            handleCellTap(row, col);
                          }
                        }}
                        title={`${formatCoordinate(row, col)}${info.type === 'ship' ? ` — ${info.ship.name}` : ''}`}
                      />
                    );
                  })}
                </Fragment>
              ))}
            </div>
          </div>

        </div>{/* end mainLayout */}

        {error && <div style={styles.errorBox}>⚠️ {error}</div>}

        <div style={styles.actions}>
          <button
            onClick={() => {
              setShips(prev => prev.map(s => ({ ...s, start_row: null, start_col: null })));
              setSelectedShipId(null);
              setError('');
            }}
            disabled={placedCount === 0 || submitting}
            style={{ ...styles.clearBtn, opacity: placedCount === 0 || submitting ? 0.5 : 1 }}
          >
            🔄 Clear All
          </button>
          <button
            onClick={handleSubmit}
            disabled={placedCount !== 3 || submitting}
            style={{ ...styles.submitBtn, opacity: placedCount !== 3 || submitting ? 0.5 : 1 }}
          >
            {submitting ? '⏳ Waiting for others...' : '✅ Confirm Placement'}
          </button>
        </div>

      </div>
    </div>
  );
}

// ── Styles ─────────────────────────────────────────────────────────────────────
const styles = {
  container: {
    minHeight: '100vh',
    width: '100%',
    background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
    padding: '20px',
    boxSizing: 'border-box',
  },
  content: {
    maxWidth: '1100px',
    margin: '0 auto',
  },
  card: {
    background: 'white',
    padding: '40px',
    borderRadius: '12px',
    textAlign: 'center',
    marginTop: '100px',
  },
  header: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '20px',
  },
  title: {
    fontSize: '30px',
    color: 'white',
    margin: 0,
    textShadow: '2px 2px 4px rgba(0,0,0,0.2)',
  },
  subtitle: {
    fontSize: '15px',
    color: 'rgba(255,255,255,0.9)',
    margin: '4px 0 0 0',
  },
  counter: {
    background: 'rgba(255,255,255,0.2)',
    padding: '10px 20px',
    borderRadius: '10px',
    border: '2px solid white',
  },
  counterText: {
    fontSize: '17px',
    fontWeight: 'bold',
    color: 'white',
  },
  mainLayout: {
    display: 'flex',
    gap: '20px',
    alignItems: 'flex-start',
    marginBottom: '20px',
    flexWrap: 'wrap',
  },
  tray: {
    background: 'white',
    borderRadius: '12px',
    padding: '16px',
    minWidth: '160px',
    maxWidth: '190px',
    boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
    flex: '0 0 auto',
  },
  trayTitle: {
    margin: '0 0 12px 0',
    color: '#374151',
    fontSize: '16px',
    fontWeight: '700',
  },
  shipCard: {
    background: '#f9fafb',
    borderRadius: '10px',
    padding: '10px',
    marginBottom: '10px',
    transition: 'opacity 0.2s, box-shadow 0.15s, border-color 0.15s',
    userSelect: 'none',
  },
  shipCardHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  shipName: {
    fontWeight: '700',
    fontSize: '13px',
    color: '#111827',
  },
  shipSizeBadge: {
    fontSize: '11px',
    color: '#6b7280',
    background: '#f3f4f6',
    padding: '1px 6px',
    borderRadius: '10px',
    fontWeight: '600',
  },
  rotateBtn: {
    fontSize: '12px',
    padding: '4px 10px',
    background: '#e0e7ff',
    color: '#3730a3',
    border: '1px solid #a5b4fc',
    borderRadius: '6px',
    cursor: 'pointer',
    fontWeight: '600',
  },
  removeBtn: {
    fontSize: '12px',
    padding: '4px 10px',
    background: '#fee2e2',
    color: '#dc2626',
    border: '1px solid #fca5a5',
    borderRadius: '6px',
    cursor: 'pointer',
    fontWeight: '600',
  },
  trayHint: {
    fontSize: '11px',
    color: '#9ca3af',
    margin: '8px 0 0 0',
    lineHeight: '1.6',
  },
  gridWrapper: {
    background: 'white',
    padding: '16px',
    borderRadius: '12px',
    boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
    overflowX: 'auto',
  },
  grid: {
    display: 'grid',
    gap: '0',
  },
  cornerCell: {
    width: '40px',
    height: '40px',
  },
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
    transition: 'background-color 0.1s',
    boxSizing: 'border-box',
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
    padding: '13px 26px',
    background: '#6b7280',
    color: 'white',
    border: 'none',
    borderRadius: '8px',
    fontSize: '15px',
    fontWeight: 'bold',
    cursor: 'pointer',
  },
  submitBtn: {
    padding: '13px 26px',
    background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
    color: 'white',
    border: 'none',
    borderRadius: '8px',
    fontSize: '15px',
    fontWeight: 'bold',
    cursor: 'pointer',
  },
};

export default ShipPlacement;
