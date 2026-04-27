import { getPlayer } from '../utils/localStorage';

function LeaderboardModal({ leaderboard, onClose }) {
  const handleOverlayClick = (e) => {
    if (e.target === e.currentTarget) {
      onClose();
    }
  };

  return (
    <div style={styles.overlay} onClick={handleOverlayClick}>
      <div style={styles.modal}>
        <div style={styles.header}>
          <h2 style={styles.title}>🏆 Leaderboard</h2>
          <button onClick={onClose} style={styles.closeBtn} aria-label="Close">
            ✕
          </button>
        </div>
        
        <div style={styles.content}>
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
    </div>
  );
}

const styles = {
  overlay: {
    position: 'fixed',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    background: 'rgba(0, 0, 0, 0.5)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 1000,
    padding: '20px',
  },
  modal: {
    background: 'white',
    borderRadius: '16px',
    boxShadow: '0 8px 32px rgba(0,0,0,0.3)',
    width: '100%',
    maxWidth: '600px',
    maxHeight: '80vh',
    display: 'flex',
    flexDirection: 'column',
  },
  header: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '24px 24px 16px 24px',
    borderBottom: '2px solid #e5e7eb',
  },
  title: {
    fontSize: '24px',
    color: '#667eea',
    margin: 0,
    fontWeight: '700',
  },
  closeBtn: {
    background: 'transparent',
    border: 'none',
    fontSize: '28px',
    color: '#9ca3af',
    cursor: 'pointer',
    padding: '0',
    width: '32px',
    height: '32px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: '4px',
    transition: 'background 0.2s, color 0.2s',
  },
  content: {
    padding: '24px',
    overflowY: 'auto',
  },
  leaderboardList: {
    display: 'flex',
    flexDirection: 'column',
    gap: '10px',
  },
  leaderboardItem: {
    display: 'flex',
    alignItems: 'center',
    padding: '16px',
    borderRadius: '10px',
    border: '1px solid #e5e7eb',
    gap: '16px',
    transition: 'transform 0.2s',
  },
  leaderboardRank: {
    fontSize: '24px',
    fontWeight: 'bold',
    minWidth: '50px',
    textAlign: 'center',
  },
  leaderboardName: {
    flex: 1,
    fontSize: '16px',
    fontWeight: '600',
    color: '#1f2937',
    display: 'flex',
    alignItems: 'center',
    gap: '10px',
  },
  youBadge: {
    fontSize: '11px',
    padding: '3px 8px',
    background: '#667eea',
    color: 'white',
    borderRadius: '4px',
    fontWeight: 'bold',
  },
  leaderboardStats: {
    display: 'flex',
    gap: '16px',
    fontSize: '15px',
    fontWeight: '600',
  },
  leaderboardWins: {
    color: '#10b981',
  },
  leaderboardAccuracy: {
    color: '#667eea',
  },
  noStats: {
    color: '#6b7280',
    textAlign: 'center',
    padding: '60px 20px',
    fontSize: '16px',
  },
};

export default LeaderboardModal;
