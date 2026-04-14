// Game state and logic utilities for Battleship

/**
 * Check if it's the current player's turn
 * @param {number} currentTurnIndex - Current turn index from game state
 * @param {number} playerTurnOrder - Player's turn order
 * @returns {boolean} True if it's this player's turn
 */
export const isPlayersTurn = (currentTurnIndex, playerTurnOrder) => {
  return currentTurnIndex === playerTurnOrder;
};

/**
 * Check if a player is eliminated
 * @param {Object} gameState - Game state object
 * @param {number} playerId - Player ID to check
 * @returns {boolean} True if player is eliminated
 */
export const isPlayerEliminated = (gameState, playerId) => {
  // If gameState has players array with is_eliminated property
  if (gameState.players && Array.isArray(gameState.players)) {
    const player = gameState.players.find(p => p.player_id === playerId);
    return player ? player.is_eliminated : false;
  }
  return false;
};

/**
 * Count number of alive (non-eliminated) players
 * @param {Object} gameState - Game state object
 * @returns {number} Number of alive players
 */
export const countAlivePlayers = (gameState) => {
  if (gameState.active_players !== undefined) {
    return gameState.active_players;
  }
  
  if (gameState.players && Array.isArray(gameState.players)) {
    return gameState.players.filter(p => !p.is_eliminated).length;
  }
  
  return 0;
};

/**
 * Get winner ID if game is finished
 * @param {Object} gameState - Game state object
 * @returns {number|null} Winner player ID or null if no winner yet
 */
export const getWinner = (gameState) => {
  if (gameState.status === 'finished' && gameState.winner_id) {
    return gameState.winner_id;
  }
  return null;
};

/**
 * Calculate accuracy percentage
 * @param {number} hits - Number of hits
 * @param {number} totalShots - Total number of shots
 * @returns {number} Accuracy as decimal (0-1)
 */
export const calculateAccuracy = (hits, totalShots) => {
  if (totalShots === 0) return 0;
  return hits / totalShots;
};

/**
 * Format accuracy as percentage string
 * @param {number} accuracy - Accuracy as decimal (0-1)
 * @returns {string} Formatted percentage (e.g., "45.2%")
 */
export const formatAccuracy = (accuracy) => {
  return `${(accuracy * 100).toFixed(1)}%`;
};

/**
 * Get color for accuracy display
 * @param {number} accuracy - Accuracy as decimal (0-1)
 * @returns {string} Color code (green/yellow/red)
 */
export const getAccuracyColor = (accuracy) => {
  if (accuracy >= 0.6) return '#10b981'; // green
  if (accuracy >= 0.4) return '#f59e0b'; // yellow
  return '#ef4444'; // red
};

/**
 * Get game status badge color
 * @param {string} status - Game status (waiting/active/finished)
 * @returns {string} Color code
 */
export const getStatusColor = (status) => {
  switch (status) {
    case 'waiting': return '#f59e0b'; // yellow/orange
    case 'active': return '#10b981'; // green
    case 'finished': return '#6b7280'; // gray
    default: return '#6b7280';
  }
};

/**
 * Check if coordinate has been fired at
 * @param {Array} moves - Array of move objects
 * @param {number} row - Row coordinate
 * @param {number} col - Column coordinate
 * @param {number} targetPlayerId - Target player ID
 * @returns {Object|null} Move object if found, null otherwise
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
 * Check if a ship is placed at coordinate
 * @param {Array} ships - Array of ship objects
 * @param {number} row - Row coordinate
 * @param {number} col - Column coordinate
 * @returns {Object|null} Ship object if found, null otherwise
 */
export const findShipAt = (ships, row, col) => {
  if (!ships || !Array.isArray(ships)) return null;
  
  return ships.find(ship => ship.row === row && ship.col === col) || null;
};

/**
 * Get cell state for rendering
 * @param {number} row - Row coordinate
 * @param {number} col - Column coordinate
 * @param {Array} ships - Ships array (player's own ships)
 * @param {Array} moves - Moves array (all moves)
 * @param {number} playerId - Player ID (whose board is this)
 * @param {boolean} isOwnBoard - Whether this is the current player's board
 * @returns {string} Cell state: 'empty', 'ship', 'hit', 'miss', 'sunk'
 */
export const getCellState = (row, col, ships, moves, playerId, isOwnBoard) => {
  // Find if there's a move at this coordinate
  const move = findMoveAt(moves, row, col, playerId);
  
  // Find if there's a ship at this coordinate
  const ship = findShipAt(ships, row, col);
  
  // If there's a move (someone fired here)
  if (move) {
    if (move.result === 'hit') {
      // Check if ship is sunk
      if (ship && ship.is_sunk) {
        return 'sunk';
      }
      return 'hit';
    }
    return 'miss';
  }
  
  // No move at this coordinate
  // Show ship only if it's the player's own board
  if (isOwnBoard && ship) {
    return 'ship';
  }
  
  return 'empty';
};

/**
 * Validate ship placement
 * @param {Array} ships - Array of ship coordinates [{row, col}, ...]
 * @param {number} gridSize - Grid size
 * @returns {{valid: boolean, error: string}} Validation result
 */
export const validateShipPlacement = (ships, gridSize) => {
  if (!ships || ships.length !== 3) {
    return { valid: false, error: 'Must place exactly 3 ships' };
  }
  
  // Check for duplicates
  const positions = new Set();
  for (const ship of ships) {
    const key = `${ship.row},${ship.col}`;
    if (positions.has(key)) {
      return { valid: false, error: 'Ships cannot overlap' };
    }
    positions.add(key);
    
    // Check bounds
    if (ship.row < 0 || ship.row >= gridSize || ship.col < 0 || ship.col >= gridSize) {
      return { valid: false, error: 'Ships must be within grid bounds' };
    }
  }
  
  return { valid: true, error: '' };
};
