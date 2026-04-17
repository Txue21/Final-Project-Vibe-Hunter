import axios from 'axios';

// Base URL - automatically uses proxy in dev, direct URL in production
const API_BASE = import.meta.env.DEV 
  ? '/api'  // Development: uses Vite proxy (localhost:5174/api → vibe-hunter.com/api)
  : 'https://vibe-hunter.com/api';  // Production: direct API calls

const handleResponse = (response) => ({ data: response.data, error: null });
const handleError = (error) => ({
  data: null,
  error: error.response?.data?.error || error.message || 'Network error'
});

export const createPlayer = async (username) => {
  try {
    const response = await axios.post(`${API_BASE}/players`, { username });
    return handleResponse(response);
  } catch (error) {
    return handleError(error);
  }
};

export const getPlayerStats = async (playerId) => {
  try {
    const response = await axios.get(`${API_BASE}/players/${playerId}/stats`);
    return handleResponse(response);
  } catch (error) {
    return handleError(error);
  }
};

export const getAllGames = async () => {
  try {
    const response = await axios.get(`${API_BASE}/games`);
    return handleResponse(response);
  } catch (error) {
    return handleError(error);
  }
};

export const getGame = async (gameId) => {
  try {
    const response = await axios.get(`${API_BASE}/games/${gameId}`);
    return handleResponse(response);
  } catch (error) {
    return handleError(error);
  }
};

export const createGame = async (gridSize, maxPlayers, creatorId) => {
  try {
    const response = await axios.post(`${API_BASE}/games`, {
      grid_size: gridSize,
      max_players: maxPlayers,
      creator_id: creatorId
    });
    return handleResponse(response);
  } catch (error) {
    return handleError(error);
  }
};

export const joinGame = async (gameId, playerId) => {
  try {
    const response = await axios.post(`${API_BASE}/games/${gameId}/join`, {
      player_id: playerId
    });
    return handleResponse(response);
  } catch (error) {
    return handleError(error);
  }
};

export const placeShips = async (gameId, playerId, ships) => {
  try {
    const response = await axios.post(`${API_BASE}/games/${gameId}/place`, {
      player_id: playerId,
      ships
    });
    return handleResponse(response);
  } catch (error) {
    return handleError(error);
  }
};

export const fireMissile = async (gameId, playerId, row, col) => {
  try {
    const response = await axios.post(`${API_BASE}/games/${gameId}/fire`, {
      player_id: playerId,
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
    const response = await axios.get(`${API_BASE}/games/${gameId}/moves`);
    return handleResponse(response);
  } catch (error) {
    return handleError(error);
  }
};

export const getAllPlayers = async () => {
  try {
    const response = await axios.get(`${API_BASE}/players`);
    return handleResponse(response);
  } catch (error) {
    return handleError(error);
  }
};