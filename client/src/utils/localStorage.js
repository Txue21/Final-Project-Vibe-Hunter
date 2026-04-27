export const savePlayer = (playerId, username) => {
  const server = getActiveServer();
  localStorage.setItem(`player_id__${server}`, playerId);
  localStorage.setItem(`username__${server}`, username);
};

export const getPlayer = () => {
  const server = getActiveServer();
  let playerId = localStorage.getItem(`player_id__${server}`);
  let username = localStorage.getItem(`username__${server}`);

  // Legacy migration: if on default server and no server-scoped key yet, migrate old global keys
  if (!playerId && server === 'https://vibe-hunter.com') {
    playerId = localStorage.getItem('player_id');
    username = localStorage.getItem('username');
    if (playerId && username) {
      localStorage.setItem(`player_id__${server}`, playerId);
      localStorage.setItem(`username__${server}`, username);
    }
  }

  if (playerId && username) {
    return { playerId: parseInt(playerId), username };
  }
  return null;
};

export const clearPlayer = () => {
  const server = getActiveServer();
  localStorage.removeItem(`player_id__${server}`);
  localStorage.removeItem(`username__${server}`);
  // Also clear legacy keys
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

// ── Server switcher ──────────────────────────────────────────────────────────
const DEFAULT_SERVER = 'https://vibe-hunter.com';

export const getActiveServer = () =>
  localStorage.getItem('active_server') || DEFAULT_SERVER;

export const setActiveServer = (url) =>
  localStorage.setItem('active_server', url.replace(/\/$/, ''));

export const clearActiveServer = () =>
  localStorage.removeItem('active_server');
