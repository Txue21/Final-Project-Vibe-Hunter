import { useState, useEffect } from 'react';
import { getAllGames, createGame, joinGame, getPlayerStats, getAllPlayers, updatePlayer } from '../services/api';
import { getPlayer, clearPlayer } from '../utils/localStorage';

function Lobby({ onJoinGame, onViewGame, onRejoinGame, myGames = [] }) {
  const [games, setGames] = useState([]);
  const [stats, setStats] = useState(null);
  const [leaderboard, setLeaderboard] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [gridSize, setGridSize] = useState(8);
  const [maxPlayers, setMaxPlayers] = useState(3);
  const [hideUsername, setHideUsername] = useState(false);
  
  const player = getPlayer();

  useEffect(() => {
    fetchGames();
    fetchStats();
    fetchLeaderboard();
    const interval = setInterval(() => {
      fetchGames();
      fetchLeaderboard();
    }, 3000);
    return () => clearInterval(interval);
  }, []);

  const fetchGames = async () => {
    const { data } = await getAllGames();
    if (data) setGames(data);
  };

  const fetchStats = async () => {
    if (!player) return;
    const { data } = await getPlayerStats(player.playerId);
    if (data) {
      setStats(data);
      setHideUsername(data.hide_username || false);
    }
  };

  const fetchLeaderboard = async () => {
    const { data } = await getAllPlayers();
    if (data && Array.isArray(data)) {
      // Sort by wins (descending), then by accuracy
      const sorted = [...data]
        .filter(p => p.games_played > 0)
        .sort((a, b) => {
          if (b.wins !== a.wins) return b.wins - a.wins;
          return (b.accuracy || 0) - (a.accuracy || 0);
        })
        .slice(0, 10); // Top 10 only
      setLeaderboard(sorted);
    }
  };

  const handleToggleAnonymity = async (newValue) => {
    setHideUsername(newValue);
    await updatePlayer(player.playerId, { hide_username: newValue });
    fetchLeaderboard();
  };

  const handleCreateGame = async (e) => {
    e.preventDefault();
    if (maxPlayers < 2) {
      setError('At least 2 players are required to start a game.');
      return;
    }
    setLoading(true);
    setError('');

    // Fixed: Pass creator_id to API
    const { data, error: apiError } = await createGame(gridSize, maxPlayers, player.playerId);

    if (data) {
      fetchGames();
      // Creator is automatically added, so navigate to ship placement
      setTimeout(() => onJoinGame(data.game_id), 300);
    } else {
      setError(apiError);
    }
    setLoading(false);
  };

  const handleJoinGame = async (gameId) => {
    setLoading(true);
    setError('');
    const { data, error: apiError } = await joinGame(gameId, player.playerId);
    if (data) {
      fetchGames();
      setTimeout(() => onJoinGame(gameId), 300);
    } else if (apiError && apiError.toLowerCase().includes('already in this game')) {
      // Player is already registered in this game — treat as a rejoin
      setTimeout(() => onJoinGame(gameId), 300);
    } else {
      setError(apiError);
    }
    setLoading(false);
  };

  const handleLogout = () => {
    clearPlayer();
    window.location.reload();
  };

  return (
    <div style={styles.container}>
      <div style={styles.innerContainer}>
        {/* Header */}
        <div style={styles.header}>
          <div>
            <h1 style={styles.title}>🎮 Battleship Lobby</h1>
            <p style={styles.welcomeText}>Welcome, <strong>{player?.username}</strong>!</p>
          </div>
          <button
            onClick={handleLogout}
            style={styles.logoutBtn}
            onMouseEnter={e => { e.currentTarget.style.background = 'white'; e.currentTarget.style.color = '#667eea'; }}
            onMouseLeave={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.2)'; e.currentTarget.style.color = 'white'; }}
          >
            Logout
          </button>
        </div>

        {/* Rejoin Banner */}
        {myGames.length > 0 && (
          <div style={styles.rejoinBanner}>
            <span style={{ fontWeight: '700', marginRight: '12px' }}>🎯 Your active games:</span>
            {myGames.map(g => (
              <button
                key={g.gameId}
                onClick={() => onRejoinGame(g.gameId, g.view)}
                style={styles.rejoinBtn}
              >
                ↩ Rejoin Game #{g.gameId}
              </button>
            ))}
          </div>
        )}

        {/* Main Content Grid */}
        <div style={styles.mainGrid}>
          {/* Left Column - Create Game & Stats */}
          <div style={styles.leftColumn}>
            {/* Create Game Card */}
            <div style={styles.card}>
              <h2 style={styles.cardTitle}>🎯 Create New Game</h2>
              <form onSubmit={handleCreateGame}>
                <div style={styles.formGroup}>
                  <label style={styles.label}>Grid Size (5-15):</label>
                  <input
                    type="number"
                    min="5"
                    max="15"
                    value={gridSize}
                    onChange={(e) => setGridSize(parseInt(e.target.value))}
                    style={styles.input}
                    disabled={loading}
                  />
                  <small style={styles.hint}>A {gridSize}×{gridSize} grid with 3 ships</small>
                </div>

                <div style={styles.formGroup}>
                  <label style={styles.label}>Max Players (2-10):</label>
                  <input
                    type="number"
                    min="2"
                    max="10"
                    value={maxPlayers}
                    onChange={(e) => setMaxPlayers(parseInt(e.target.value))}
                    style={styles.input}
                    disabled={loading}
                  />
                  <small style={styles.hint}>Battle with up to {maxPlayers} players</small>
                </div>

                {error && <div style={styles.errorBox}>⚠️ {error}</div>}

                <button 
                  type="submit" 
                  disabled={loading}
                  style={{
                    ...styles.createBtn,
                    opacity: loading ? 0.6 : 1,
                    cursor: loading ? 'not-allowed' : 'pointer'
                  }}
                >
                  {loading ? '⏳ Creating...' : '➕ Create Game'}
                </button>
              </form>
            </div>

            {/* Stats Card */}
            <div style={styles.card}>
              <h2 style={styles.cardTitle}>📊 Your Stats</h2>
              {stats ? (
                <div style={styles.statsGrid}>
                  <div style={styles.statBox}>
                    <div style={styles.statValue}>{stats.games_played || 0}</div>
                    <div style={styles.statLabel}>Games</div>
                  </div>
                  <div style={styles.statBox}>
                    <div style={{...styles.statValue, color: '#10b981'}}>{stats.wins || 0}</div>
                    <div style={styles.statLabel}>Wins</div>
                  </div>
                  <div style={styles.statBox}>
                    <div style={{...styles.statValue, color: '#ef4444'}}>{stats.losses || 0}</div>
                    <div style={styles.statLabel}>Losses</div>
                  </div>
                  <div style={styles.statBox}>
                    <div style={{
                      ...styles.statValue,
                      color: (stats.accuracy ?? 0) >= 0.6 ? '#10b981' : (stats.accuracy ?? 0) >= 0.4 ? '#f59e0b' : '#6b7280'
                    }}>
                      {stats.accuracy != null ? (stats.accuracy * 100).toFixed(1) : '0.0'}%
                    </div>
                    <div style={styles.statLabel}>Accuracy</div>
                  </div>
                </div>
              ) : (
                <p style={styles.noStats}>🎲 No stats yet - create your first game!</p>
              )}

              {stats && (
                <div style={{ marginTop: '16px', borderTop: '1px solid #e5e7eb', paddingTop: '16px' }}>
                  <div style={{ fontSize: '13px', color: '#6b7280', marginBottom: '8px', fontWeight: '600' }}>
                    Leaderboard display:
                  </div>
                  <div style={{ display: 'flex', gap: '8px' }}>
                    <button
                      onClick={() => hideUsername && handleToggleAnonymity(false)}
                      style={{
                        padding: '6px 14px', borderRadius: '20px', border: 'none',
                        cursor: hideUsername ? 'pointer' : 'default',
                        background: !hideUsername ? '#667eea' : '#e5e7eb',
                        color: !hideUsername ? 'white' : '#6b7280',
                        fontWeight: '600', fontSize: '13px',
                      }}
                    >
                      👤 My Username
                    </button>
                    <button
                      onClick={() => !hideUsername && handleToggleAnonymity(true)}
                      style={{
                        padding: '6px 14px', borderRadius: '20px', border: 'none',
                        cursor: !hideUsername ? 'pointer' : 'default',
                        background: hideUsername ? '#667eea' : '#e5e7eb',
                        color: hideUsername ? 'white' : '#6b7280',
                        fontWeight: '600', fontSize: '13px',
                      }}
                    >
                      🕵️ Anonymous
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* Leaderboard Card */}
            <div style={styles.card}>
              <h2 style={styles.cardTitle}>🏆 Leaderboard</h2>
              {leaderboard.length > 0 ? (
                <div style={styles.leaderboardList}>
                  {leaderboard.map((player, index) => (
                    <div 
                      key={player.player_id} 
                      style={{
                        ...styles.leaderboardItem,
                        background: index === 0 ? '#fef3c7' : index === 1 ? '#e5e7eb' : index === 2 ? '#fde68a' : 'white'
                      }}
                    >
                      <div style={styles.leaderboardRank}>
                        {index === 0 ? '🥇' : index === 1 ? '🥈' : index === 2 ? '🥉' : `#${index + 1}`}
                      </div>
                      <div style={styles.leaderboardName}>
                        {player.username}
                        {player.player_id === getPlayer()?.playerId && (
                          <span style={styles.youBadge}>YOU</span>
                        )}
                      </div>
                      <div style={styles.leaderboardStats}>
                        <span style={styles.leaderboardWins}>{player.wins}W</span>
                        <span style={styles.leaderboardAccuracy}>
                          {player.accuracy ? (player.accuracy * 100).toFixed(0) : 0}%
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p style={styles.noStats}>🎯 No players yet - be the first!</p>
              )}
            </div>
          </div>

          {/* Right Column - Games List */}
          <div style={styles.rightColumn}>
            <div style={styles.card}>
              <h2 style={styles.cardTitle}>🎮 Available Games ({games.length})</h2>
              
              {games.length === 0 ? (
                <div style={styles.emptyState}>
                  <div style={styles.emptyIcon}>🎯</div>
                  <p>No games available yet</p>
                  <p style={{fontSize: '14px', color: '#9ca3af'}}>Create the first game!</p>
                </div>
              ) : (
                <div style={styles.gamesList}>
                  {games.map(game => {
                    // Normalize status - handle any case variations
                    const normalizedStatus = game.status?.toLowerCase() || 'waiting';
                    const isWaiting = normalizedStatus.includes('waiting');
                    const isActive = normalizedStatus === 'active' || normalizedStatus === 'playing';
                    const isFinished = normalizedStatus === 'finished';
                    
                    // Format status for display
                    const displayStatus = isWaiting ? 'WAITING' : 
                                        isActive ? 'ACTIVE' : 
                                        isFinished ? 'FINISHED' : 
                                        normalizedStatus.toUpperCase();
                    
                    return (
                      <div key={game.game_id} style={{
                        ...styles.gameCard,
                        border: myGames.some(g => g.gameId === game.game_id) ? '2px solid #f59e0b' : '2px solid #e5e7eb',
                        background: myGames.some(g => g.gameId === game.game_id) ? '#fffbeb' : '#f9fafb',
                      }}>
                        <div style={styles.gameCardHeader}>
                          <div>
                            <h3 style={styles.gameTitle}>
                              Game #{game.game_id}
                              {myGames.some(g => g.gameId === game.game_id) && (
                                <span style={styles.yourGameBadge}>YOUR GAME</span>
                              )}
                            </h3>
                            <p style={styles.gameInfo}>
                              📏 {game.grid_size}×{game.grid_size} | 
                              👥 {game.active_players || 0}/{game.max_players} players
                            </p>
                          </div>
                          <span style={{
                            ...styles.badge,
                            backgroundColor: 
                              isWaiting ? '#f59e0b' :
                              isActive ? '#10b981' : '#6b7280'
                          }}>
                            {displayStatus}
                          </span>
                        </div>

                        {isWaiting && (
                          <button
                            onClick={() => handleJoinGame(game.game_id)}
                            disabled={loading}
                            style={styles.joinBtn}
                          >
                            ➡️ Join Game
                          </button>
                        )}

                        {isActive && (
                          <button
                            onClick={() => onViewGame(game.game_id)}
                            style={styles.viewBtn}
                          >
                            👁️ View Game
                          </button>
                        )}

                        {isFinished && (
                          <button style={styles.finishedBtn} disabled>
                            ✅ Game Over
                          </button>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

const styles = {
  container: {
    minHeight: '100vh',
    width: '100%',
    background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
    padding: '20px',
    boxSizing: 'border-box',
  },
  innerContainer: {
    maxWidth: '1400px',
    margin: '0 auto',
    width: '100%',
  },
  header: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '30px',
    flexWrap: 'wrap',
    gap: '10px',
  },
  title: {
    fontSize: '36px',
    color: 'white',
    margin: 0,
    textShadow: '2px 2px 4px rgba(0,0,0,0.2)',
  },
  welcomeText: {
    fontSize: '18px',
    color: 'rgba(255,255,255,0.95)',
    margin: '5px 0 0 0',
  },
  logoutBtn: {
    padding: '10px 24px',
    background: 'rgba(255,255,255,0.2)',
    color: 'white',
    border: '2px solid white',
    borderRadius: '8px',
    cursor: 'pointer',
    fontSize: '16px',
    fontWeight: '600',
    transition: 'background 0.2s, color 0.2s',
  },
  mainGrid: {
    display: 'grid',
    gridTemplateColumns: '420px 1fr',
    gap: '20px',
    alignItems: 'start',
  },
  leftColumn: {
    display: 'flex',
    flexDirection: 'column',
    gap: '20px',
  },
  rightColumn: {
    minHeight: '600px',
  },
  card: {
    background: 'white',
    borderRadius: '12px',
    padding: '24px',
    boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
  },
  cardTitle: {
    fontSize: '20px',
    color: '#667eea',
    marginTop: 0,
    marginBottom: '20px',
    fontWeight: '700',
  },
  formGroup: {
    marginBottom: '20px',
  },
  label: {
    display: 'block',
    marginBottom: '8px',
    color: '#374151',
    fontWeight: '600',
    fontSize: '14px',
  },
  input: {
    width: '100%',
    padding: '12px',
    fontSize: '16px',
    border: '2px solid #e5e7eb',
    borderRadius: '8px',
    boxSizing: 'border-box',
    transition: 'border-color 0.3s',
  },
  hint: {
    display: 'block',
    marginTop: '4px',
    fontSize: '12px',
    color: '#6b7280',
  },
  errorBox: {
    background: '#fee2e2',
    color: '#dc2626',
    padding: '12px',
    borderRadius: '8px',
    marginBottom: '16px',
    border: '1px solid #fecaca',
    fontSize: '14px',
  },
  createBtn: {
    width: '100%',
    padding: '14px',
    background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
    color: 'white',
    border: 'none',
    borderRadius: '8px',
    fontSize: '16px',
    fontWeight: 'bold',
    cursor: 'pointer',
    transition: 'transform 0.2s',
  },
  statsGrid: {
    display: 'grid',
    gridTemplateColumns: '1fr 1fr',
    gap: '12px',
  },
  statBox: {
    textAlign: 'center',
    padding: '16px',
    background: '#f9fafb',
    borderRadius: '8px',
    border: '1px solid #e5e7eb',
  },
  statValue: {
    fontSize: '28px',
    fontWeight: 'bold',
    color: '#667eea',
  },
  statLabel: {
    fontSize: '12px',
    color: '#6b7280',
    marginTop: '4px',
    textTransform: 'uppercase',
    letterSpacing: '0.5px',
  },
  noStats: {
    color: '#6b7280',
    textAlign: 'center',
    padding: '30px 20px',
    fontSize: '14px',
  },
  emptyState: {
    textAlign: 'center',
    padding: '60px 20px',
    color: '#6b7280',
  },
  emptyIcon: {
    fontSize: '64px',
    marginBottom: '16px',
  },
  gamesList: {
    display: 'flex',
    flexDirection: 'column',
    gap: '12px',
    maxHeight: '650px',
    overflowY: 'auto',
    paddingRight: '8px',
  },
  gameCard: {
    background: '#f9fafb',
    borderRadius: '10px',
    padding: '16px',
    border: '2px solid #e5e7eb',
    transition: 'transform 0.2s, border-color 0.2s',
  },
  gameCardHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: '12px',
  },
  gameTitle: {
    fontSize: '18px',
    margin: '0 0 6px 0',
    color: '#111827',
    fontWeight: '600',
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    flexWrap: 'wrap',
  },
  yourGameBadge: {
    fontSize: '10px',
    padding: '2px 8px',
    background: '#f59e0b',
    color: 'white',
    borderRadius: '4px',
    fontWeight: 'bold',
    letterSpacing: '0.5px',
  },
  rejoinBanner: {
    background: 'rgba(255,255,255,0.15)',
    border: '2px solid rgba(255,255,255,0.4)',
    borderRadius: '10px',
    padding: '12px 20px',
    marginBottom: '20px',
    display: 'flex',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: '10px',
    color: 'white',
    fontSize: '15px',
  },
  rejoinBtn: {
    padding: '8px 16px',
    background: '#f59e0b',
    color: '#1e1b4b',
    border: 'none',
    borderRadius: '8px',
    fontWeight: '700',
    fontSize: '14px',
    cursor: 'pointer',
  },
  gameInfo: {
    fontSize: '14px',
    color: '#6b7280',
    margin: 0,
  },
  badge: {
    padding: '6px 14px',
    borderRadius: '20px',
    color: 'white',
    fontSize: '11px',
    fontWeight: 'bold',
    textTransform: 'uppercase',
    letterSpacing: '0.5px',
  },
  joinBtn: {
    width: '100%',
    padding: '12px',
    background: '#10b981',
    color: 'white',
    border: 'none',
    borderRadius: '8px',
    cursor: 'pointer',
    fontWeight: '600',
    fontSize: '15px',
    transition: 'background-color 0.3s',
  },
  viewBtn: {
    width: '100%',
    padding: '12px',
    background: '#667eea',
    color: 'white',
    border: 'none',
    borderRadius: '8px',
    cursor: 'pointer',
    fontWeight: '600',
    fontSize: '15px',
    transition: 'background-color 0.3s',
  },
  finishedBtn: {
    width: '100%',
    padding: '12px',
    background: '#e5e7eb',
    color: '#6b7280',
    border: 'none',
    borderRadius: '8px',
    cursor: 'not-allowed',
    fontWeight: '600',
    fontSize: '15px',
  },
  leaderboardList: {
    display: 'flex',
    flexDirection: 'column',
    gap: '8px',
  },
  leaderboardItem: {
    display: 'flex',
    alignItems: 'center',
    padding: '12px',
    borderRadius: '8px',
    border: '1px solid #e5e7eb',
    gap: '12px',
  },
  leaderboardRank: {
    fontSize: '20px',
    fontWeight: 'bold',
    minWidth: '40px',
    textAlign: 'center',
  },
  leaderboardName: {
    flex: 1,
    fontSize: '15px',
    fontWeight: '600',
    color: '#1f2937',
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
  },
  youBadge: {
    fontSize: '10px',
    padding: '2px 6px',
    background: '#667eea',
    color: 'white',
    borderRadius: '4px',
    fontWeight: 'bold',
  },
  leaderboardStats: {
    display: 'flex',
    gap: '12px',
    fontSize: '14px',
    fontWeight: '600',
  },
  leaderboardWins: {
    color: '#10b981',
  },
  leaderboardAccuracy: {
    color: '#667eea',
  },
};

export default Lobby;