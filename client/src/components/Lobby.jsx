import { useState, useEffect } from 'react';
import { getAllGames, getMyGames, searchGameById, createGame, joinGame, getPlayerStats, getAllPlayers, updatePlayer, testConnection } from '../services/api';
import { getPlayer, clearPlayer, getActiveServer, setActiveServer } from '../utils/localStorage';
import LeaderboardModal from './LeaderboardModal';

const KNOWN_SERVERS = [
  { name: 'Team0x0D — Vibe Hunter (Ours)', url: 'https://vibe-hunter.com' },
  { name: 'Team0x00 — Team0x00', url: 'https://battleship-server-18q1.onrender.com' },
  { name: 'Team0x01 — Max Koon', url: 'https://battleship.koon.us' },
  { name: 'Team0x02 — Mir Patel', url: 'https://finalproject-virusoutbreak-3bwa.onrender.com' },
  { name: 'Team0x03 — Anthony Martino', url: 'https://finalproject3750.onrender.com' },
  { name: 'Team0x04 — Evan Racz', url: 'https://webdevgroupproj.onrender.com' },
  { name: 'Team0x05 — Mason McLaw Price', url: 'https://cpsc3720finalproject.onrender.com' },
  { name: 'Team0x06 — Jude Slade', url: 'https://three750final.onrender.com' },
  { name: 'Team0x07 — Owen Schuyler', url: 'https://persistent-waters.onrender.com' },
  { name: 'Team0x08 — Nathan Kitchens ✅', url: 'https://p01--backend--zm8jxh5c8bph.code.run' },
  { name: 'Team0x09 — Taylor Carter ✅', url: 'https://lightslategray-dogfish-869967.hostingersite.com' },
  { name: 'Team0x0A — Anabel Thompson', url: 'https://battleship-1-qpm6.onrender.com' },
  { name: 'Team0x0B — Bryce Dickson', url: 'https://cpsc.loosesocket.com' },
  { name: 'Team0x0C — Aryan Kapoor', url: 'https://battleship-advanced.onrender.com' },
  { name: 'Team0x0E — Andrew Hwang', url: 'https://cpsc3750-battleshipproject.onrender.com' },
  { name: 'Team0x0F — Anthony Frialde', url: 'https://cpsc-3750-battleship-final-project-phase1.onrender.com' },
  { name: 'Team0x10 — Justin Hooker', url: 'https://capstone3750-production.up.railway.app' },
  { name: 'Team0x11 — Ayden Sabol', url: 'https://battleship-cpsc3750.onrender.com' },
  { name: 'Team0x12 — Jack Stivers', url: 'https://final-project-7xwd.onrender.com' },
  { name: 'Custom / Other Team', url: '' },
];

function Lobby({ onJoinGame, onViewGame, onRejoinGame, onServerChange, myGames = [] }) {
  const [games, setGames] = useState([]);
  const [stats, setStats] = useState(null);
  const [leaderboard, setLeaderboard] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [gridSize, setGridSize] = useState(8);
  const [maxPlayers, setMaxPlayers] = useState(3);
  const [hideUsername, setHideUsername] = useState(false);
  const [showMyGamesOnly, setShowMyGamesOnly] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [copySuccess, setCopySuccess] = useState(null);
  const [showLeaderboard, setShowLeaderboard] = useState(false);
  const [showStats, setShowStats] = useState(false);
  // Game mode
  const [gameMode, setGameMode] = useState('standard');
  // Server switcher
  const [activeServer, setActiveServerState] = useState(getActiveServer());
  const [serverInput, setServerInput] = useState('');
  const [selectedKnown, setSelectedKnown] = useState(KNOWN_SERVERS[0].url);
  const [serverStatus, setServerStatus] = useState(null); // null | 'testing' | 'ok' | 'error'
  
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
  }, [showMyGamesOnly, searchQuery]);

  const toGamesArray = (data) => {
    if (Array.isArray(data)) return data;
    if (data && Array.isArray(data.games)) return data.games;
    if (data && Array.isArray(data.data)) return data.data;
    return [];
  };

  const fetchGames = async () => {
    // If searching by game ID
    if (searchQuery.trim()) {
      const gameId = parseInt(searchQuery.trim());
      if (!isNaN(gameId)) {
        const { data } = await searchGameById(gameId);
        if (data) setGames(toGamesArray(data));
      }
      return;
    }
    
    // If filtering to show only my games
    if (showMyGamesOnly && player) {
      const { data } = await getMyGames(player.playerId);
      if (data) setGames(toGamesArray(data));
    } else {
      // Default: show all games
      const { data } = await getAllGames();
      if (data) setGames(toGamesArray(data));
    }
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
    if (gameMode === 'sonar' && gridSize < 8) {
      setError('Sonar mode requires a grid size of at least 8.');
      return;
    }
    setLoading(true);
    setError('');

    // Fixed: Pass creator_id to API
    const { data, error: apiError } = await createGame(gridSize, maxPlayers, player.playerId, gameMode);

    if (data) {
      fetchGames();
      // Creator is automatically added, so navigate to ship placement
      setTimeout(() => onJoinGame(data.game_id), 300);
    } else {
      setError(apiError);
    }
    setLoading(false);
  };

  const handleTestServer = async () => {
    const url = serverInput.trim() || selectedKnown;
    if (!url) return;
    setServerStatus('testing');
    const { data, error } = await testConnection(url);
    setServerStatus(data ? 'ok' : 'error');
  };

  const handleConnectServer = () => {
    const url = serverInput.trim() || selectedKnown;
    if (!url) return;
    setActiveServer(url);
    setActiveServerState(url);
    setServerStatus(null);
    fetchGames();
    fetchLeaderboard();
    // Notify App to re-check if we have a player registered on this server
    onServerChange?.();
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

  const handleCopyGameId = async (gameId) => {
    try {
      await navigator.clipboard.writeText(gameId.toString());
      setCopySuccess(gameId);
      setTimeout(() => setCopySuccess(null), 2000);
    } catch (err) {
      console.error('Failed to copy game ID:', err);
    }
  };

  const handleSearchChange = (e) => {
    setSearchQuery(e.target.value);
  };

  const handleClearSearch = () => {
    setSearchQuery('');
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
          <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
            <button
              onClick={() => setShowLeaderboard(true)}
              style={styles.trophyBtn}
              onMouseEnter={e => { e.currentTarget.style.background = 'white'; e.currentTarget.style.color = '#667eea'; }}
              onMouseLeave={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.2)'; e.currentTarget.style.color = 'white'; }}
              title="View Leaderboard"
            >
              🏆 Leaderboard
            </button>
            <button
              onClick={() => setShowStats(true)}
              style={styles.trophyBtn}
              onMouseEnter={e => { e.currentTarget.style.background = 'white'; e.currentTarget.style.color = '#667eea'; }}
              onMouseLeave={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.2)'; e.currentTarget.style.color = 'white'; }}
              title="View My Stats"
            >
              📊 My Stats
            </button>
            <button
              onClick={handleLogout}
              style={styles.logoutBtn}
              onMouseEnter={e => { e.currentTarget.style.background = 'white'; e.currentTarget.style.color = '#667eea'; }}
              onMouseLeave={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.2)'; e.currentTarget.style.color = 'white'; }}
            >
              Logout
            </button>
          </div>
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

        {/* Search and Filter Bar */}
        <div style={styles.searchFilterBar}>
          <div style={styles.searchContainer}>
            <input
              type="text"
              placeholder="🔍 Search by Game ID..."
              value={searchQuery}
              onChange={handleSearchChange}
              style={styles.searchInput}
            />
            {searchQuery && (
              <button onClick={handleClearSearch} style={styles.clearSearchBtn}>
                ✕
              </button>
            )}
          </div>
          <button
            onClick={() => setShowMyGamesOnly(!showMyGamesOnly)}
            style={{
              ...styles.filterToggle,
              background: showMyGamesOnly ? '#667eea' : 'white',
              color: showMyGamesOnly ? 'white' : '#667eea',
            }}
          >
            {showMyGamesOnly ? '👤 My Games' : '🌐 All Games'}
          </button>
        </div>

        {/* Main Content Grid */}
        <div style={styles.mainGrid}>
          {/* Left Column - Create Game & Stats */}
          <div style={styles.leftColumn}>
            {/* Server Switcher Card */}
            <div style={styles.card}>
              <h2 style={styles.cardTitle}>🌐 Server</h2>
              <div style={{ marginBottom: '10px' }}>
                <label style={styles.label}>Known Servers:</label>
                <select
                  value={selectedKnown}
                  onChange={e => { setSelectedKnown(e.target.value); setServerInput(''); }}
                  style={{ ...styles.input, marginBottom: '8px' }}
                >
                  {KNOWN_SERVERS.map(s => (
                    <option key={s.url} value={s.url}>{s.name}</option>
                  ))}
                </select>
              </div>
              <div style={{ marginBottom: '10px' }}>
                <label style={styles.label}>Custom URL:</label>
                <input
                  type="text"
                  placeholder="https://other-team.com"
                  value={serverInput}
                  onChange={e => setServerInput(e.target.value)}
                  style={styles.input}
                />
              </div>
              <div style={{ display: 'flex', gap: '8px', marginBottom: '10px' }}>
                <button
                  onClick={handleTestServer}
                  disabled={serverStatus === 'testing'}
                  style={{ ...styles.createBtn, flex: 1, background: '#6b7280', padding: '10px' }}
                >
                  {serverStatus === 'testing' ? '⏳ Testing...' : '🔌 Test'}
                </button>
                <button
                  onClick={handleConnectServer}
                  style={{ ...styles.createBtn, flex: 1, padding: '10px' }}
                >
                  ✓ Connect
                </button>
              </div>
              {serverStatus === 'ok' && (
                <div style={{ color: '#10b981', fontWeight: '600', fontSize: '13px' }}>✅ Server reachable</div>
              )}
              {serverStatus === 'error' && (
                <div style={{ color: '#ef4444', fontWeight: '600', fontSize: '13px' }}>❌ Server unreachable</div>
              )}
              <div style={{ marginTop: '10px', fontSize: '12px', color: '#6b7280' }}>
                Active: <strong style={{ color: '#667eea' }}>{activeServer}</strong>
              </div>
            </div>

            {/* Create Game Card */}
            <div style={styles.card}>
              <h2 style={styles.cardTitle}>🎯 Create New Game</h2>
              <form onSubmit={handleCreateGame}>
                <div style={styles.formGroup}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: '10px' }}>
                    <label style={styles.label}>Grid Size:</label>
                    <span style={{ fontSize: '26px', fontWeight: '800', color: '#667eea', lineHeight: 1 }}>{gridSize}<span style={{ fontSize: '14px', color: '#9ca3af', fontWeight: '600' }}>×{gridSize}</span></span>
                  </div>
                  <input
                    type="range"
                    min={gameMode === 'sonar' ? 8 : 5}
                    max="15"
                    value={gridSize}
                    onChange={(e) => setGridSize(parseInt(e.target.value))}
                    disabled={loading}
                    style={{ width: '100%', accentColor: '#667eea', cursor: loading ? 'not-allowed' : 'pointer', height: '6px' }}
                  />
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', color: '#9ca3af', marginTop: '4px' }}>
                    <span>{gameMode === 'sonar' ? 8 : 5}</span>
                    <span>15</span>
                  </div>
                </div>

                <div style={styles.formGroup}>
                  <label style={styles.label}>Game Mode:</label>
                  <div style={{ display: 'flex', gap: '8px' }}>
                    <button
                      type="button"
                      onClick={() => setGameMode('standard')}
                      style={{
                        flex: 1, padding: '10px 8px', borderRadius: '8px', border: '2px solid',
                        borderColor: gameMode === 'standard' ? '#667eea' : '#9ca3af',
                        background: gameMode === 'standard' ? '#667eea' : '#f3f4f6',
                        color: gameMode === 'standard' ? 'white' : '#374151',
                        fontWeight: '600', fontSize: '14px', cursor: 'pointer',
                      }}
                    >⚔️ Standard</button>
                    <button
                      type="button"
                      onClick={() => { setGameMode('sonar'); if (gridSize < 8) setGridSize(8); }}
                      style={{
                        flex: 1, padding: '10px 8px', borderRadius: '8px', border: '2px solid',
                        borderColor: gameMode === 'sonar' ? '#f59e0b' : '#9ca3af',
                        background: gameMode === 'sonar' ? '#f59e0b' : '#f3f4f6',
                        color: gameMode === 'sonar' ? 'white' : '#374151',
                        fontWeight: '600', fontSize: '14px', cursor: 'pointer',
                      }}
                    >📡 Sonar</button>
                  </div>
                  {gameMode === 'sonar' && (
                    <small style={{ ...styles.hint, color: '#f59e0b' }}>Sonar requires grid ≥ 8. Each player gets one scan.</small>
                  )}
                </div>

                <div style={styles.formGroup}>
                  <label style={styles.label}>Max Players:</label>
                  <div style={{ display: 'flex', gap: '8px', marginTop: '8px' }}>
                    {[2, 3, 4].map(n => (
                      <button
                        key={n}
                        type="button"
                        onClick={() => setMaxPlayers(n)}
                        disabled={loading}
                        style={{
                          flex: 1, padding: '12px 0', borderRadius: '8px', border: '2px solid',
                          borderColor: maxPlayers === n ? '#667eea' : '#9ca3af',
                          background: maxPlayers === n ? '#667eea' : '#f3f4f6',
                          color: maxPlayers === n ? 'white' : '#374151',
                          fontWeight: '700', fontSize: '20px', cursor: loading ? 'not-allowed' : 'pointer',
                          transition: 'all 0.15s',
                        }}
                      >{n}</button>
                    ))}
                  </div>
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

          </div>

          <div style={styles.rightColumn}>
            <div style={styles.card}>
              <h2 style={styles.cardTitle}>
                🎮 {showMyGamesOnly ? 'My Games' : 'Available Games'} ({games.length})
              </h2>
              
              {copySuccess && (
                <div style={styles.copyNotification}>
                  ✓ Game ID #{copySuccess} copied to clipboard!
                </div>
              )}
              
              {games.length === 0 ? (
                <div style={styles.emptyState}>
                  <div style={styles.emptyIcon}>🎯</div>
                  <p>
                    {searchQuery 
                      ? `No game found with ID "${searchQuery}"`
                      : showMyGamesOnly 
                        ? "You're not in any games yet"
                        : "No games available yet"}
                  </p>
                  <p style={{fontSize: '14px', color: '#9ca3af'}}>
                    {searchQuery 
                      ? 'Check the number and try again'
                      : showMyGamesOnly 
                        ? 'Create or join one!'
                        : 'Create the first game!'}
                  </p>
                </div>
              ) : (
                <div style={styles.gamesList}>
                  {games.map(game => {
                    // Normalize status - handle any case variations
                    const normalizedStatus = game.status?.toLowerCase() || 'waiting';
                    const isWaiting = normalizedStatus.includes('waiting');
                    const isActive = normalizedStatus === 'active' || normalizedStatus === 'playing';
                    const isFinished = normalizedStatus === 'finished';
                    const isMyGame = myGames.some(g => g.gameId === game.game_id);
                    
                    // Format status for display
                    const displayStatus = isWaiting ? 'WAITING' : 
                                        isActive ? 'ACTIVE' : 
                                        isFinished ? 'FINISHED' : 
                                        normalizedStatus.toUpperCase();
                    
                    return (
                      <div key={game.game_id} style={{
                        ...styles.gameCard,
                        border: isMyGame ? '2px solid #f59e0b' : '2px solid #e5e7eb',
                        background: isMyGame ? '#fffbeb' : '#f9fafb',
                      }}>
                        <div style={styles.gameCardHeader}>
                          <div>
                            <h3 style={styles.gameTitle}>
                              Game #{game.game_id}
                              {isMyGame && (
                                <span style={styles.yourGameBadge}>YOUR GAME</span>
                              )}
                              {game.game_mode === 'sonar' && (
                                <span style={{ ...styles.yourGameBadge, background: '#f59e0b' }}>📡 SONAR</span>
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

                        <div style={styles.gameActions}>
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

                          {isMyGame && (
                            <button
                              onClick={() => handleCopyGameId(game.game_id)}
                              style={styles.copyBtn}
                              title="Copy Game ID to share with friends"
                            >
                              {copySuccess === game.game_id ? '✓ Copied!' : '📋 Share ID'}
                            </button>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Leaderboard Modal */}
      {showLeaderboard && (
        <LeaderboardModal 
          leaderboard={leaderboard} 
          onClose={() => setShowLeaderboard(false)} 
        />
      )}

      {/* Stats Modal */}
      {showStats && (
        <div
          style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}
          onClick={() => setShowStats(false)}
        >
          <div
            style={{ background: 'white', borderRadius: '16px', padding: '32px', width: '360px', maxWidth: '90vw', boxShadow: '0 20px 60px rgba(0,0,0,0.4)' }}
            onClick={e => e.stopPropagation()}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
              <h2 style={{ margin: 0, color: '#667eea', fontSize: '22px', fontWeight: '700' }}>📊 My Stats</h2>
              <button onClick={() => setShowStats(false)} style={{ background: 'none', border: 'none', fontSize: '22px', cursor: 'pointer', color: '#6b7280', lineHeight: 1 }}>✕</button>
            </div>
            {stats ? (
              <div style={styles.statsGrid}>
                <div style={styles.statBox}>
                  <div style={styles.statValue}>{stats.games_played || 0}</div>
                  <div style={styles.statLabel}>Games</div>
                </div>
                <div style={styles.statBox}>
                  <div style={{ ...styles.statValue, color: '#10b981' }}>{stats.wins || 0}</div>
                  <div style={styles.statLabel}>Wins</div>
                </div>
                <div style={styles.statBox}>
                  <div style={{ ...styles.statValue, color: '#ef4444' }}>{stats.losses || 0}</div>
                  <div style={styles.statLabel}>Losses</div>
                </div>
                <div style={styles.statBox}>
                  <div style={{ ...styles.statValue, color: (stats.accuracy ?? 0) >= 0.6 ? '#10b981' : (stats.accuracy ?? 0) >= 0.4 ? '#f59e0b' : '#6b7280' }}>
                    {stats.accuracy != null ? (stats.accuracy * 100).toFixed(1) : '0.0'}%
                  </div>
                  <div style={styles.statLabel}>Accuracy</div>
                </div>
              </div>
            ) : (
              <p style={{ color: '#9ca3af', textAlign: 'center' }}>🎲 No stats yet — create your first game!</p>
            )}
            {stats && (
              <div style={{ marginTop: '20px', borderTop: '1px solid #e5e7eb', paddingTop: '20px' }}>
                <div style={{ fontSize: '13px', color: '#6b7280', marginBottom: '10px', fontWeight: '600' }}>Leaderboard display:</div>
                <div style={{ display: 'flex', gap: '8px' }}>
                  <button
                    onClick={() => hideUsername && handleToggleAnonymity(false)}
                    style={{ flex: 1, padding: '8px 0', borderRadius: '20px', border: 'none', cursor: hideUsername ? 'pointer' : 'default', background: !hideUsername ? '#667eea' : '#e5e7eb', color: !hideUsername ? 'white' : '#6b7280', fontWeight: '600', fontSize: '13px' }}
                  >👤 My Username</button>
                  <button
                    onClick={() => !hideUsername && handleToggleAnonymity(true)}
                    style={{ flex: 1, padding: '8px 0', borderRadius: '20px', border: 'none', cursor: !hideUsername ? 'pointer' : 'default', background: hideUsername ? '#667eea' : '#e5e7eb', color: hideUsername ? 'white' : '#6b7280', fontWeight: '600', fontSize: '13px' }}
                  >🕵️ Anonymous</button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
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
  trophyBtn: {
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
  searchFilterBar: {
    display: 'flex',
    gap: '12px',
    marginBottom: '20px',
    alignItems: 'center',
    flexWrap: 'wrap',
  },
  searchContainer: {
    position: 'relative',
    flex: 1,
    minWidth: '280px',
  },
  searchInput: {
    width: '100%',
    padding: '12px 40px 12px 16px',
    fontSize: '15px',
    border: '2px solid rgba(255,255,255,0.4)',
    borderRadius: '10px',
    background: 'rgba(255,255,255,0.95)',
    boxSizing: 'border-box',
    color: '#374151',
    fontWeight: '500',
  },
  clearSearchBtn: {
    position: 'absolute',
    right: '8px',
    top: '50%',
    transform: 'translateY(-50%)',
    background: 'transparent',
    border: 'none',
    color: '#9ca3af',
    fontSize: '18px',
    cursor: 'pointer',
    padding: '4px 8px',
    borderRadius: '4px',
    lineHeight: 1,
  },
  filterToggle: {
    padding: '12px 24px',
    border: '2px solid white',
    borderRadius: '10px',
    fontSize: '15px',
    fontWeight: '700',
    cursor: 'pointer',
    transition: 'all 0.3s',
    whiteSpace: 'nowrap',
  },
  gameActions: {
    display: 'flex',
    gap: '8px',
    flexWrap: 'wrap',
  },
  copyBtn: {
    flex: 1,
    minWidth: '120px',
    padding: '12px',
    background: '#f59e0b',
    color: 'white',
    border: 'none',
    borderRadius: '8px',
    cursor: 'pointer',
    fontWeight: '600',
    fontSize: '14px',
    transition: 'background-color 0.3s',
  },
  copyNotification: {
    background: '#d1fae5',
    color: '#065f46',
    padding: '10px 16px',
    borderRadius: '8px',
    marginBottom: '16px',
    fontSize: '14px',
    fontWeight: '600',
    textAlign: 'center',
    border: '1px solid #10b981',
  },
};

export default Lobby;