import { useState, useEffect } from 'react';
import { createPlayer } from '../services/api';
import { savePlayer, getPlayer } from '../utils/localStorage';

function RegisterPlayer({ onRegisterSuccess }) {
  const [username, setUsername] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const player = getPlayer();
    if (player) {
      onRegisterSuccess(player);
    }
  }, [onRegisterSuccess]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!username.trim()) {
      setError('Username is required');
      return;
    }

    if (username.length < 3) {
      setError('Username must be at least 3 characters');
      return;
    }

    setLoading(true);
    setError('');

    const { data, error: apiError } = await createPlayer(username.trim());

    if (data) {
      savePlayer(data.player_id, username.trim());
      onRegisterSuccess({ playerId: data.player_id, username: username.trim() });
    } else {
      setError(apiError);
    }

    setLoading(false);
  };

  return (
    <div style={styles.container}>
      <div style={styles.card}>
        <h1 style={styles.title}>🎮 Battleship</h1>
        <h2 style={styles.subtitle}>Register to Play</h2>

        <form onSubmit={handleSubmit}>
          <div style={styles.formGroup}>
            <label style={styles.label}>Username:</label>
            <input
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="Enter your username"
              style={styles.input}
              disabled={loading}
            />
          </div>

          {error && (
            <div style={styles.error}>
              ⚠️ {error}
            </div>
          )}

          <button 
            type="submit" 
            disabled={loading}
            style={{
              ...styles.button,
              opacity: loading ? 0.6 : 1,
              cursor: loading ? 'not-allowed' : 'pointer'
            }}
          >
            {loading ? 'Registering...' : 'Start Playing'}
          </button>
        </form>
      </div>
    </div>
  );
}

const styles = {
  container: {
    minHeight: '100vh',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
  },
  card: {
    background: 'white',
    padding: '40px',
    borderRadius: '10px',
    boxShadow: '0 10px 25px rgba(0,0,0,0.2)',
    width: '100%',
    maxWidth: '400px',
  },
  title: {
    fontSize: '36px',
    textAlign: 'center',
    margin: '0 0 10px 0',
    color: '#667eea',
  },
  subtitle: {
    fontSize: '20px',
    textAlign: 'center',
    margin: '0 0 30px 0',
    color: '#666',
  },
  formGroup: {
    marginBottom: '20px',
  },
  label: {
    display: 'block',
    marginBottom: '8px',
    color: '#333',
    fontWeight: '500',
  },
  input: {
    width: '100%',
    padding: '12px',
    fontSize: '16px',
    border: '2px solid #ddd',
    borderRadius: '5px',
    boxSizing: 'border-box',
  },
  button: {
    width: '100%',
    padding: '12px',
    fontSize: '18px',
    fontWeight: 'bold',
    color: 'white',
    background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
    border: 'none',
    borderRadius: '5px',
  },
  error: {
    background: '#fee',
    color: '#c33',
    padding: '10px',
    borderRadius: '5px',
    marginBottom: '15px',
    border: '1px solid #fcc',
  },
};

export default RegisterPlayer;