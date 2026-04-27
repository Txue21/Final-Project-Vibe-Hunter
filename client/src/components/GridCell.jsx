// Reusable Grid Cell component for Battleship game
import { useEffect, useState } from 'react';

function GridCell({ 
  row, 
  col, 
  state, 
  size = 40, 
  onClick, 
  disabled = false,
  showCoordinate = false,
  sonarResult = null,  // null | 'signal' | 'scanned' | 'ship' | 'preview-center' | 'preview'
  onCellHover = null,  // (row, col) | (null, null) — used in sonar mode for shape preview
}) {
  // state can be: 'empty', 'ship', 'hit', 'miss', 'sunk'
  const [prevState, setPrevState] = useState(state);
  const [animationClass, setAnimationClass] = useState('');

  // Trigger animation when state changes to hit or miss
  useEffect(() => {
    if (state !== prevState) {
      if (state === 'hit') {
        setAnimationClass('cell-hit-animation');
        setTimeout(() => setAnimationClass(''), 600);
      } else if (state === 'miss') {
        setAnimationClass('cell-miss-animation');
        setTimeout(() => setAnimationClass(''), 600);
      } else if (state === 'sunk') {
        setAnimationClass('cell-sunk-animation');
        setTimeout(() => setAnimationClass(''), 800);
      }
      setPrevState(state);
    }
  }, [state, prevState]);
  
  const getCellStyle = () => {
    const baseStyle = {
      width: `${size}px`,
      height: `${size}px`,
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      border: '1px solid #d1d5db',
      cursor: disabled ? 'default' : onClick ? 'pointer' : 'default',
      transition: 'all 0.3s ease',
      fontSize: `${size * 0.5}px`,
      fontWeight: 'bold',
      userSelect: 'none',
      position: 'relative',
    };

    switch (state) {
      case 'ship':
        return {
          ...baseStyle,
          backgroundColor: '#3b82f6',
        };
      case 'hit':
        return {
          ...baseStyle,
          backgroundColor: '#ef4444',
          color: 'white',
        };
      case 'miss':
        return {
          ...baseStyle,
          backgroundColor: '#e5e7eb',
          color: '#6b7280',
        };
      case 'sunk':
        return {
          ...baseStyle,
          backgroundColor: '#7f1d1d',
          color: 'white',
        };
      case 'empty':
      default:
        return {
          ...baseStyle,
          backgroundColor: '#f3f4f6',
        };
    }
  };

  const getCellContent = () => {
    switch (state) {
      case 'ship':
        return '🚢';
      case 'hit':
        return '💥';
      case 'miss':
        return '✕';
      case 'sunk':
        return '💀';
      default:
        return showCoordinate ? `${String.fromCharCode(65 + row)}${col + 1}` : '';
    }
  };

  const handleClick = () => {
    if (!disabled && onClick) {
      onClick(row, col);
    }
  };

  const handleMouseEnter = (e) => {
    if (onCellHover) {
      onCellHover(row, col);
    } else if (!disabled && onClick && state === 'empty') {
      e.currentTarget.style.backgroundColor = '#e0e7ff';
      e.currentTarget.style.transform = 'scale(1.05)';
    }
  };

  const handleMouseLeave = (e) => {
    if (onCellHover) {
      onCellHover(null, null);
    } else if (!disabled && onClick && state === 'empty') {
      e.currentTarget.style.transform = 'scale(1)';
      e.currentTarget.style.backgroundColor = '#f3f4f6';
    }
  };

  return (
    <div
      style={getCellStyle()}
      onClick={handleClick}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      title={`${String.fromCharCode(65 + row)}${col + 1}`}
    >
      {getCellContent()}
      {sonarResult === 'signal' && (
        <div style={{
          position: 'absolute', inset: 0,
          background: 'rgba(16,185,129,0.45)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: `${size * 0.4}px`, pointerEvents: 'none',
          borderRadius: '2px',
        }}>📡</div>
      )}
      {sonarResult === 'scanned' && (
        <div style={{
          position: 'absolute', inset: 0,
          background: 'rgba(107,114,128,0.3)',
          pointerEvents: 'none',
          borderRadius: '2px',
        }} />
      )}
      {sonarResult === 'ship' && (
        <div style={{
          position: 'absolute', inset: 0,
          background: 'rgba(245,158,11,0.75)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: `${size * 0.5}px`, pointerEvents: 'none',
          borderRadius: '2px',
          outline: '2px solid #f59e0b',
        }}>🚢</div>
      )}
      {sonarResult === 'preview-center' && (
        <div style={{
          position: 'absolute', inset: 0,
          background: 'rgba(6,182,212,0.55)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: `${size * 0.45}px`, pointerEvents: 'none',
          borderRadius: '2px',
          outline: '2px solid #06b6d4',
        }}>🎯</div>
      )}
      {sonarResult === 'preview' && (
        <div style={{
          position: 'absolute', inset: 0,
          background: 'rgba(6,182,212,0.38)',
          pointerEvents: 'none',
          borderRadius: '2px',
          outline: '1px solid rgba(6,182,212,0.6)',
        }} />
      )}
    </div>
  );
}

export default GridCell;
