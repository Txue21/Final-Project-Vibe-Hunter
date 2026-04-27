export const savePlayer = (playerId, username) => {
  localStorage.setItem('player_id', playerId);
  localStorage.setItem('username', username);
};

export const getPlayer = () => {
  const playerId = localStorage.getItem('player_id');
  const username = localStorage.getItem('username');

  if (playerId && username) {
    return { playerId: parseInt(playerId), username };
  }
  return null;
};

export const clearPlayer = () => {
  localStorage.removeItem('player_id');
  localStorage.removeItem('username');
};

export const saveGame = (gameId, view) => {
  localStorage.setItem('game_id', gameId);
  localStorage.setItem('game_view', view);
};

export const getSavedGame = () => {
  const gameId = localStorage.getItem('game_id');
  const view = localStorage.getItem('game_view');
  if (gameId && view) return { gameId: parseInt(gameId), view };
  return null;
};

export const clearGame = () => {
  localStorage.removeItem('game_id');
  localStorage.removeItem('game_view');
};

// Track all games the player has joined (for multi-game + rejoin support)
export const getMyGames = () => {
  try { return JSON.parse(localStorage.getItem('my_games') || '[]'); }
  catch { return []; }
};

export const addMyGame = (gameId, view) => {
  const list = getMyGames().filter(g => g.gameId !== gameId);
  list.push({ gameId, view });
  localStorage.setItem('my_games', JSON.stringify(list));
};

export const updateMyGame = (gameId, view) => addMyGame(gameId, view);

export const removeMyGame = (gameId) => {
  const list = getMyGames().filter(g => g.gameId !== gameId);
  localStorage.setItem('my_games', JSON.stringify(list));
};
