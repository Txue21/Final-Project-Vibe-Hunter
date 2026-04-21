import { useState, useEffect, useRef } from 'react';
import { getMoves } from '../services/api';
import { formatCoordinate } from '../utils/gridHelpers';

function MoveHistory({ gameId }) {
  const [moves, setMoves] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [displayLimit, setDisplayLimit] = useState(20);
  const scrollRef = useRef(null);
  const previousMoveCountRef = useRef(0);

  useEffect(() => {
    fetchMoves();
    const interval = setInterval(fetchMoves, 3000);
    return () => clearInterval(interval);
  }, [gameId]);

  // Auto-scroll to bottom when new moves arrive
  useEffect(() => {
    if (moves.length > previousMoveCountRef.current && scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
    previousMoveCountRef.current = moves.length;
  }, [moves]);

  const fetchMoves = async () => {
    const { data, error } = await getMoves(gameId);
    if (error) {
      setError(error);
      setLoading(false);
      return;
    }

    if (data) {
      // Sort by timestamp (newest last)
      const sortedMoves = [...data].sort((a, b) => 
        new Date(a.timestamp) - new Date(b.timestamp)
      );
      setMoves(sortedMoves);
      setError(null);
    }
    setLoading(false);
  };

  const formatTime = (timestamp) => {
    const date = new Date(timestamp);
    return date.toLocaleTimeString('en-US', { 
      hour: '2-digit', 
      minute: '2-digit',
      second: '2-digit'
    });
  };

  const getMoveIcon = (outcome) => {
    switch (outcome) {
      case 'hit': return '💥';
      case 'miss': return '✕';
      case 'sunk': return '💀';
      default: return '•';
    }
  };

  const getMoveColor = (outcome) => {
    switch (outcome) {
      case 'hit': return '#ef4444';
      case 'miss': return '#6b7280';
      case 'sunk': return '#7f1d1d';
      default: return '#9ca3af';
    }
  };

  const displayedMoves = moves.slice(-displayLimit);
  const hasMoreMoves = moves.length > displayLimit;

  if (loading && moves.length === 0) {
    return (
      <div style={{
        padding: '20px',
        textAlign: 'center',
        color: '#9ca3af',
      }}>
        Loading moves...
      </div>
    );
  }

  if (error) {
    return (
      <div style={{
        padding: '20px',
        background: '#fee2e2',
        border: '1px solid #fecaca',
        borderRadius: '8px',
        color: '#991b1b',
      }}>
        Error loading moves: {error}
      </div>
    );
  }

  return (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      height: '100%',
    }}>
      {/* Header */}
      <div style={{
        padding: '16px',
        borderBottom: '2px solid #e5e7eb',
        background: '#f9fafb',
      }}>
        <h3 style={{ margin: 0, fontSize: '18px', fontWeight: 'bold' }}>
          📋 Move History
        </h3>
        <p style={{ margin: '4px 0 0 0', fontSize: '14px', color: '#6b7280' }}>
          {moves.length} {moves.length === 1 ? 'move' : 'moves'} recorded
        </p>
      </div>

      {/* Load More Button (if needed) */}
      {hasMoreMoves && (
        <div style={{ padding: '12px', textAlign: 'center', borderBottom: '1px solid #e5e7eb' }}>
          <button
            onClick={() => setDisplayLimit(prev => prev + 20)}
            style={{
              padding: '8px 16px',
              background: '#f3f4f6',
              border: '1px solid #d1d5db',
              borderRadius: '6px',
              cursor: 'pointer',
              fontSize: '14px',
              fontWeight: '500',
            }}
          >
            Load {Math.min(20, moves.length - displayLimit)} More
          </button>
        </div>
      )}

      {/* Moves List */}
      <div 
        ref={scrollRef}
        style={{
          flex: 1,
          overflowY: 'auto',
          padding: '12px',
        }}
      >
        {displayedMoves.length === 0 ? (
          <div style={{
            padding: '40px 20px',
            textAlign: 'center',
            color: '#9ca3af',
          }}>
            <p style={{ fontSize: '40px', margin: '0 0 10px 0' }}>🎯</p>
            <p style={{ margin: 0 }}>No moves yet. Fire when ready!</p>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {displayedMoves.map((move, index) => {
              // Defensive checks for row and col
              const hasValidCoords = move.row !== undefined && move.col !== undefined && 
                                    move.row !== null && move.col !== null &&
                                    !isNaN(move.row) && !isNaN(move.col);
              
              const coord = hasValidCoords ? formatCoordinate(move.row, move.col) : '??';
              const outcome = move.result || 'unknown';
              const icon = getMoveIcon(outcome);
              const color = getMoveColor(outcome);
              
              // Use usernames if available, fallback to player IDs
              // Ensure we always show something meaningful
              const playerName = move.player_username || (move.player_id ? `Player ${move.player_id}` : 'Unknown');
              const targetName = move.target_username || (move.target_player_id ? `Player ${move.target_player_id}` : 'Unknown');

              return (
                <div 
                  key={move.move_id || index}
                  style={{
                    padding: '12px',
                    background: '#f9fafb',
                    border: '1px solid #e5e7eb',
                    borderRadius: '6px',
                    fontSize: '14px',
                    transition: 'all 0.2s',
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    {/* Move Description */}
                    <div style={{ flex: 1 }}>
                      <span style={{ fontWeight: 'bold' }}>{playerName}</span>
                      {' '}fired at{' '}
                      <span style={{ 
                        fontWeight: 'bold', 
                        fontFamily: 'monospace',
                        background: '#e5e7eb',
                        padding: '2px 6px',
                        borderRadius: '4px',
                      }}>
                        {coord}
                      </span>
                      {' '}on{' '}
                      <span style={{ fontWeight: 'bold' }}>{targetName}</span>
                    </div>

                    {/* Outcome Badge */}
                    <div style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '6px',
                      marginLeft: '12px',
                    }}>
                      <span style={{ fontSize: '18px' }}>{icon}</span>
                      <span style={{
                        fontWeight: 'bold',
                        color: color,
                        textTransform: 'uppercase',
                        fontSize: '12px',
                      }}>
                        {outcome}
                      </span>
                    </div>
                  </div>

                  {/* Timestamp */}
                  <div style={{
                    marginTop: '6px',
                    fontSize: '12px',
                    color: '#9ca3af',
                  }}>
                    🕐 {formatTime(move.timestamp)}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

export default MoveHistory;
