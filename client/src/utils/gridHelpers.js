// Grid coordinate conversion utilities for Battleship game

/**
 * Convert row index (0-14) to letter label (A-O)
 */
export const rowToLabel = (row) => {
  if (row < 0 || row > 14) return '';
  return String.fromCharCode(65 + row);
};

/**
 * Convert column index (0-14) to number label (1-15)
 */
export const colToNumber = (col) => {
  return col + 1;
};

/**
 * Format coordinate as human-readable string (e.g., "A5")
 */
export const formatCoordinate = (row, col) => {
  return `${rowToLabel(row)}${colToNumber(col)}`;
};
