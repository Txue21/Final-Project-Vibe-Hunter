import axios from 'axios';
import { getActiveServer } from '../utils/localStorage';

// Dynamic base URL — reads the active server from localStorage at call time.
// In dev mode with the default server we use the Vite proxy (/api) to avoid
// CORS preflight issues; for any other server we call it directly.
const getApiBase = () => {
  const server = getActiveServer();
  if (import.meta.env.DEV && server === 'https://vibe-hunter.com') {
    return '/api'; // Vite proxy: localhost/api → vibe-hunter.com/api
  }
  return `${server}/api`;
};

const handleResponse = (response) => ({ data: response.data, error: null });
const handleError = (error) => ({
  data: null,
  error: error.response?.data?.error || error.message || 'Network error'
});

export const createPlayer = async (username) => {
  try {
    const response = await axios.post(`${getApiBase()}/players`, { username });
    return handleResponse(response);
  } catch (error) {
    return handleError(error);
  }
};

export const getPlayerStats = async (playerId) => {
  try {
    const response = await axios.get(`${getApiBase()}/players/${playerId}/stats`);
    return handleResponse(response);
  } catch (error) {
    return handleError(error);
  }
};

export const getAllGames = async () => {
  try {
    const response = await axios.get(`${getApiBase()}/games`);
    return handleResponse(response);
  } catch (error) {
    return handleError(error);
  }
};

export const getMyGames = async (playerId) => {
  try {
    const response = await axios.get(`${getApiBase()}/games?player_id=${playerId}`);
    return handleResponse(response);
  } catch (error) {
    return handleError(error);
  }
};

export const searchGameById = async (gameId) => {
  try {
    const response = await axios.get(`${getApiBase()}/games?game_id=${gameId}`);
    return handleResponse(response);
  } catch (error) {
    return handleError(error);
  }
};

export const getGame = async (gameId, playerId = null) => {
  try {
    const url = playerId
      ? `${getApiBase()}/games/${gameId}?player_id=${playerId}`
      : `${getApiBase()}/games/${gameId}`;
    const response = await axios.get(url);
    return handleResponse(response);
  } catch (error) {
    return handleError(error);
  }
};

export const createGame = async (gridSize, maxPlayers, creatorId, gameMode = 'standard') => {
  try {
    const response = await axios.post(`${getApiBase()}/games`, {
      grid_size: gridSize,
      max_players: maxPlayers,
      creator_id: creatorId,
      game_mode: gameMode,
    });
    return handleResponse(response);
  } catch (error) {
    return handleError(error);
  }
};

export const joinGame = async (gameId, playerId) => {
  try {
    const response = await axios.post(`${getApiBase()}/games/${gameId}/join`, {
      player_id: playerId
    });
    return handleResponse(response);
  } catch (error) {
    return handleError(error);
  }
};

export const placeShips = async (gameId, playerId, ships) => {
  try {
    const response = await axios.post(`${getApiBase()}/games/${gameId}/place`, {
      player_id: playerId,
      ships
    });
    return handleResponse(response);
  } catch (error) {
    return handleError(error);
  }
};

export const fireMissile = async (gameId, playerId, targetPlayerId, row, col) => {
  try {
    const response = await axios.post(`${getApiBase()}/games/${gameId}/fire`, {
      player_id: playerId,
      target_player_id: targetPlayerId,
      row,
      col
    });
    return handleResponse(response);
  } catch (error) {
    return handleError(error);
  }
};

export const getMoves = async (gameId) => {
  try {
    const response = await axios.get(`${getApiBase()}/games/${gameId}/moves`);
    return handleResponse(response);
  } catch (error) {
    return handleError(error);
  }
};

export const getAllPlayers = async () => {
  try {
    const response = await axios.get(`${getApiBase()}/players`);
    return handleResponse(response);
  } catch (error) {
    return handleError(error);
  }
};

export const updatePlayer = async (playerId, data) => {
  try {
    const response = await axios.patch(`${getApiBase()}/players/${playerId}`, data);
    return handleResponse(response);
  } catch (error) {
    return handleError(error);
  }
};

export const sonarScan = async (gameId, playerId, centerRow, centerCol) => {
  try {
    const response = await axios.post(`${getApiBase()}/games/${gameId}/sonar`, {
      player_id: playerId,
      center_row: centerRow,
      center_col: centerCol,
    });
    return handleResponse(response);
  } catch (error) {
    return handleError(error);
  }
};

export const surrenderGame = async (gameId, playerId) => {
  try {
    const response = await axios.post(`${getApiBase()}/games/${gameId}/surrender`, {
      player_id: playerId,
    });
    return handleResponse(response);
  } catch (error) {
    return handleError(error);
  }
};

export const testConnection = async (serverUrl) => {
  try {
    const cleanUrl = serverUrl.replace(/\/$/, '');
    const response = await axios.get(`${cleanUrl}/api/players`, { timeout: 5000 });
    return handleResponse(response);
  } catch (error) {
    return handleError(error);
  }
};