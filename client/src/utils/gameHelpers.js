// Game state and logic utilities for Battleship

/**
 * Check if it's the current player's turn
 */
export const isPlayersTurn = (currentTurnIndex, playerTurnOrder) => {
  return currentTurnIndex === playerTurnOrder;
};

/**
 * Get winner ID if game is finished
 */
export const getWinner = (gameState) => {
  if (gameState.status === 'finished' && gameState.winner_id) {
    return gameState.winner_id;
  }
  return null;
};

/**
 * Check if coordinate has been fired at
 */
export const findMoveAt = (moves, row, col, targetPlayerId) => {
  if (!moves || !Array.isArray(moves)) return null;
  return moves.find(move =>
    move.row === row &&
    move.col === col &&
    move.target_player_id === targetPlayerId
  ) || null;
};

/**
 * Check if a ship cell is placed at coordinate
 */
export const findShipAt = (ships, row, col) => {
  if (!ships || !Array.isArray(ships)) return null;
  return ships.find(ship => ship.row === row && ship.col === col) || null;
};

/**
 * Check whether every cell in a ship group is sunk
 */
export const isGroupSunk = (ships, groupId) => {
  if (!ships || !Array.isArray(ships)) return false;
  const groupCells = ships.filter(s => s.group_id === groupId);
  return groupCells.length > 0 && groupCells.every(s => s.is_sunk);
};

/**
 * Get cell state for rendering
 * @returns {string} 'empty' | 'ship' | 'hit' | 'miss' | 'sunk'
 */
export const getCellState = (row, col, ships, moves, playerId, isOwnBoard) => {
  const move = findMoveAt(moves, row, col, playerId);
  const ship = findShipAt(ships, row, col);

  if (move) {
    if (move.result === 'hit' || move.result === 'sunk') {
      // Show 'sunk' only when the entire ship group is destroyed
      if (ship && isGroupSunk(ships, ship.group_id)) {
        return 'sunk';
      }
      return 'hit';
    }
    return 'miss';
  }

  if (isOwnBoard && ship) {
    return 'ship';
  }

  return 'empty';
};

/**
 * Validate ship placement for multi-size ships.
 * @param {Array} ships - [{start_row, start_col, size, orientation}, ...]
 * @param {number} gridSize
 * @returns {{valid: boolean, error: string}}
 */
export const validateShipPlacement = (ships, gridSize) => {
  if (!ships || ships.length !== 3) {
    return { valid: false, error: 'Must place exactly 3 ships' };
  }

  const sizes = ships.map(s => s.size).sort((a, b) => a - b);
  if (sizes[0] !== 3 || sizes[1] !== 4 || sizes[2] !== 5) {
    return { valid: false, error: 'Must place ships of sizes 3, 4, and 5' };
  }

  const positions = new Set();
  for (const ship of ships) {
    const { start_row, start_col, size, orientation } = ship;

    for (let i = 0; i < size; i++) {
      const row = orientation === 'vertical' ? start_row + i : start_row;
      const col = orientation === 'horizontal' ? start_col + i : start_col;

      if (row < 0 || row >= gridSize || col < 0 || col >= gridSize) {
        return { valid: false, error: 'Ships must be within grid bounds' };
      }

      const key = `${row},${col}`;
      if (positions.has(key)) {
        return { valid: false, error: 'Ships cannot overlap' };
      }
      positions.add(key);
    }
  }

  return { valid: true, error: '' };
};
