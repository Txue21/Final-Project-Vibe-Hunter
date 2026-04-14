// Grid coordinate conversion utilities for Battleship game

/**
 * Convert row index (0-14) to letter label (A-O)
 * @param {number} row - Row index (0-14)
 * @returns {string} Letter label (A-O)
 */
export const rowToLabel = (row) => {
  if (row < 0 || row > 14) return '';
  return String.fromCharCode(65 + row); // 65 = 'A'
};

/**
 * Convert column index (0-14) to number label (1-15)
 * @param {number} col - Column index (0-14)
 * @returns {number} Column number (1-15)
 */
export const colToNumber = (col) => {
  return col + 1;
};

/**
 * Convert letter label (A-O) to row index (0-14)
 * @param {string} label - Letter label (A-O)
 * @returns {number} Row index (0-14)
 */
export const labelToRow = (label) => {
  if (!label || label.length !== 1) return -1;
  const row = label.toUpperCase().charCodeAt(0) - 65;
  return row >= 0 && row <= 14 ? row : -1;
};

/**
 * Convert number label (1-15) to column index (0-14)
 * @param {number} num - Column number (1-15)
 * @returns {number} Column index (0-14)
 */
export const numberToCol = (num) => {
  const col = num - 1;
  return col >= 0 && col <= 14 ? col : -1;
};

/**
 * Check if coordinate is valid within grid
 * @param {number} row - Row index (0-14)
 * @param {number} col - Column index (0-14)
 * @param {number} gridSize - Grid size (5-15)
 * @returns {boolean} True if valid
 */
export const isValidCoordinate = (row, col, gridSize) => {
  return row >= 0 && row < gridSize && col >= 0 && col < gridSize;
};

/**
 * Format coordinate as human-readable string (e.g., "A5")
 * @param {number} row - Row index (0-14)
 * @param {number} col - Column index (0-14)
 * @returns {string} Formatted coordinate (e.g., "A5")
 */
export const formatCoordinate = (row, col) => {
  return `${rowToLabel(row)}${colToNumber(col)}`;
};

/**
 * Parse human-readable coordinate (e.g., "A5") to row/col indices
 * @param {string} coord - Coordinate string (e.g., "A5", "B12")
 * @returns {{row: number, col: number}} Row and column indices
 */
export const parseCoordinate = (coord) => {
  if (!coord || coord.length < 2) return { row: -1, col: -1 };
  
  const letter = coord.charAt(0);
  const number = parseInt(coord.slice(1));
  
  return {
    row: labelToRow(letter),
    col: numberToCol(number)
  };
};

/**
 * Check if two coordinates are the same
 * @param {Object} coord1 - First coordinate {row, col}
 * @param {Object} coord2 - Second coordinate {row, col}
 * @returns {boolean} True if same
 */
export const isSameCoordinate = (coord1, coord2) => {
  return coord1.row === coord2.row && coord1.col === coord2.col;
};

/**
 * Generate array of all coordinates for a grid
 * @param {number} gridSize - Grid size (5-15)
 * @returns {Array} Array of {row, col} objects
 */
export const getAllCoordinates = (gridSize) => {
  const coords = [];
  for (let row = 0; row < gridSize; row++) {
    for (let col = 0; col < gridSize; col++) {
      coords.push({ row, col });
    }
  }
  return coords;
};
