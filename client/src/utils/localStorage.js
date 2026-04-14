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

export const isPlayerLoggedIn = () => {
  return getPlayer() !== null;
};