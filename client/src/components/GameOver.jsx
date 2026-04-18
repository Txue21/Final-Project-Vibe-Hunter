import { useState, useEffect } from 'react';
import { getPlayerStats, getGame } from '../services/api';
import { getPlayer } from '../utils/localStorage';

function GameOver({ winnerId, gameId, onBackToLobby }) {
  const [stats, setStats] = useState(null);
  const [gameData, setGameData] = useState(null);
  const [loading, setLoading] = useState(true);
  const player = getPlayer();
  const isWinner = winnerId === player?.playerId;

  useEffect(() => {
    // Wait 2 seconds before fetching stats to ensure database is fully updated
    const timer = setTimeout(() => {
      fetchStats();
      fetchGameData();
    }, 2000);
    
    return () => clearTimeout(timer);
  }, []);

  const fetchStats = async () => {
    if (!player) return;
    
    const { data, error } = await getPlayerStats(player.playerId);
    if (data) {
      setStats(data);
    }
    setLoading(false);
  };

  const fetchGameData = async () => {
    const { data } = await getGame(gameId);
    if (data) {
      setGameData(data);
    }
  };

  // Get winner username from game data
  const getWinnerName = () => {
    if (!gameData || !gameData.players) return `Player ${winnerId}`;
    const winnerPlayer = gameData.players.find(p => p.player_id === winnerId);
    return winnerPlayer ? winnerPlayer.username : `Player ${winnerId}`;
  };

  return (
    <div style={{
      minHeight: '100vh',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      background: isWinner 
        ? 'linear-gradient(135deg, #10b981 0%, #34d399 100%)'  // Green for win
        : 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)', // Purple for loss
      padding: '20px',
    }}>
      <div style={{
        background: 'white',
        padding: '60px',
        borderRadius: '20px',
        textAlign: 'center',
        maxWidth: '600px',
        width: '100%',
        boxShadow: '0 20px 60px rgba(0,0,0,0.2)',
        animation: 'slideIn 0.5s ease-out',
      }}>
        {/* Victory/Defeat Banner */}
        <div style={{
          fontSize: '80px',
          marginBottom: '20px',
          animation: 'bounce 1s ease-in-out infinite',
        }}>
          {isWinner ? '🏆' : '💔'}
        </div>

        <h1 style={{
          fontSize: '48px',
          margin: '0 0 10px 0',
          color: isWinner ? '#10b981' : '#667eea',
          fontWeight: 'bold',
        }}>
          {isWinner ? 'Victory!' : 'Defeated'}
        </h1>

        <p style={{
          fontSize: '20px',
          color: '#6b7280',
          marginBottom: '40px',
        }}>
          {isWinner 
            ? 'Congratulations! You sunk all enemy ships!' 
            : `${getWinnerName()} won this battle`}
        </p>

        {/* Debug Info */}
        {!loading && (
          <div style={{
            fontSize: '12px',
            color: '#9ca3af',
            marginBottom: '20px',
          }}>
            Winner ID: {winnerId} | Your ID: {player?.playerId} | Is Winner: {isWinner ? 'Yes' : 'No'}
          </div>
        )}

        {/* Stats Display */}
        {loading ? (
          <div style={{
            padding: '20px',
            color: '#9ca3af',
          }}>
            Loading your stats...
          </div>
        ) : stats ? (
          <div style={{
            background: '#f9fafb',
            padding: '30px',
            borderRadius: '12px',
            marginBottom: '30px',
          }}>
            <h3 style={{
              margin: '0 0 20px 0',
              fontSize: '18px',
              color: '#374151',
              fontWeight: 'bold',
            }}>
              📊 Your Battle Stats
            </h3>

            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(3, 1fr)',
              gap: '20px',
              textAlign: 'center',
            }}>
              <div>
                <div style={{
                  fontSize: '32px',
                  fontWeight: 'bold',
                  color: '#667eea',
                }}>
                  {stats.games_played || 0}
                </div>
                <div style={{
                  fontSize: '14px',
                  color: '#6b7280',
                  marginTop: '4px',
                }}>
                  Total Games
                </div>
              </div>

              <div>
                <div style={{
                  fontSize: '32px',
                  fontWeight: 'bold',
                  color: '#10b981',
                }}>
                  {stats.wins || 0}
                </div>
                <div style={{
                  fontSize: '14px',
                  color: '#6b7280',
                  marginTop: '4px',
                }}>
                  Wins
                </div>
              </div>

              <div>
                <div style={{
                  fontSize: '32px',
                  fontWeight: 'bold',
                  color: '#ef4444',
                }}>
                  {stats.losses || 0}
                </div>
                <div style={{
                  fontSize: '14px',
                  color: '#6b7280',
                  marginTop: '4px',
                }}>
                  Losses
                </div>
              </div>
            </div>

            {/* Win Rate */}
            {stats.games_played > 0 && (
              <div style={{ marginTop: '20px' }}>
                <div style={{
                  fontSize: '16px',
                  color: '#6b7280',
                  marginBottom: '8px',
                }}>
                  Win Rate
                </div>
                <div style={{
                  height: '30px',
                  background: '#e5e7eb',
                  borderRadius: '15px',
                  overflow: 'hidden',
                  position: 'relative',
                }}>
                  <div style={{
                    height: '100%',
                    background: 'linear-gradient(90deg, #10b981, #34d399)',
                    width: `${((stats.wins / stats.games_played) * 100).toFixed(1)}%`,
                    transition: 'width 1s ease-out',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}>
                    <span style={{
                      color: 'white',
                      fontSize: '14px',
                      fontWeight: 'bold',
                    }}>
                      {((stats.wins / stats.games_played) * 100).toFixed(1)}%
                    </span>
                  </div>
                </div>
              </div>
            )}

            {/* Accuracy */}
            {stats.accuracy !== undefined && (
              <div style={{ marginTop: '20px' }}>
                <div style={{
                  fontSize: '16px',
                  color: '#6b7280',
                  marginBottom: '8px',
                }}>
                  Overall Accuracy
                </div>
                <div style={{
                  height: '30px',
                  background: '#e5e7eb',
                  borderRadius: '15px',
                  overflow: 'hidden',
                  position: 'relative',
                }}>
                  <div style={{
                    height: '100%',
                    background: 'linear-gradient(90deg, #667eea, #764ba2)',
                    width: `${(stats.accuracy * 100).toFixed(1)}%`,
                    transition: 'width 1s ease-out',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}>
                    <span style={{
                      color: 'white',
                      fontSize: '14px',
                      fontWeight: 'bold',
                    }}>
                      {(stats.accuracy * 100).toFixed(1)}%
                    </span>
                  </div>
                </div>
              </div>
            )}
          </div>
        ) : null}

        {/* Action Buttons */}
        <div style={{
          display: 'flex',
          gap: '15px',
          justifyContent: 'center',
        }}>
          <button
            onClick={onBackToLobby}
            style={{
              padding: '16px 32px',
              background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
              color: 'white',
              border: 'none',
              borderRadius: '10px',
              fontSize: '18px',
              fontWeight: 'bold',
              cursor: 'pointer',
              boxShadow: '0 4px 12px rgba(102, 126, 234, 0.4)',
              transition: 'all 0.2s',
            }}
            onMouseEnter={(e) => {
              e.target.style.transform = 'translateY(-2px)';
              e.target.style.boxShadow = '0 6px 16px rgba(102, 126, 234, 0.5)';
            }}
            onMouseLeave={(e) => {
              e.target.style.transform = 'translateY(0)';
              e.target.style.boxShadow = '0 4px 12px rgba(102, 126, 234, 0.4)';
            }}
          >
            🏠 Back to Lobby
          </button>
        </div>

        {/* Game ID */}
        <p style={{
          marginTop: '30px',
          fontSize: '14px',
          color: '#9ca3af',
        }}>
          Game #{gameId}
        </p>
      </div>

      {/* CSS Animation Keyframes */}
      <style>{`
        @keyframes slideIn {
          from {
            opacity: 0;
            transform: translateY(30px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }

        @keyframes bounce {
          0%, 100% {
            transform: translateY(0);
          }
          50% {
            transform: translateY(-10px);
          }
        }
      `}</style>
    </div>
  );
}

export default GameOver;
