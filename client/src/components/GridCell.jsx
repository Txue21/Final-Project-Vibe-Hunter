// Reusable Grid Cell component for Battleship game

function GridCell({ 
  row, 
  col, 
  state, 
  size = 40, 
  onClick, 
  disabled = false,
  showCoordinate = false 
}) {
  // state can be: 'empty', 'ship', 'hit', 'miss', 'sunk'
  
  const getCellStyle = () => {
    const baseStyle = {
      width: `${size}px`,
      height: `${size}px`,
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      border: '1px solid #d1d5db',
      cursor: disabled ? 'default' : onClick ? 'pointer' : 'default',
      transition: 'all 0.2s',
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
          border: '2px solid #1d4ed8',
        };
      case 'hit':
        return {
          ...baseStyle,
          backgroundColor: '#ef4444',
          border: '2px solid #991b1b',
          color: 'white',
        };
      case 'miss':
        return {
          ...baseStyle,
          backgroundColor: '#ffffff',
          border: '1px solid #9ca3af',
          color: '#6b7280',
        };
      case 'sunk':
        return {
          ...baseStyle,
          backgroundColor: '#7f1d1d',
          border: '2px solid #450a0a',
          color: 'white',
        };
      case 'empty':
      default:
        return {
          ...baseStyle,
          backgroundColor: '#f3f4f6',
          border: '1px solid #d1d5db',
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
    if (!disabled && onClick) {
      e.currentTarget.style.backgroundColor = state === 'empty' ? '#e0e7ff' : '';
      e.currentTarget.style.transform = 'scale(1.05)';
    }
  };

  const handleMouseLeave = (e) => {
    if (!disabled && onClick) {
      e.currentTarget.style.transform = 'scale(1)';
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
    </div>
  );
}

export default GridCell;
