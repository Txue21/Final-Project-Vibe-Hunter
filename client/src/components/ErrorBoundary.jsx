import { Component } from 'react';

class ErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null, errorInfo: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true };
  }

  componentDidCatch(error, errorInfo) {
    console.error('ErrorBoundary caught an error:', error, errorInfo);
    this.setState({
      error: error,
      errorInfo: errorInfo
    });
  }

  handleReset = () => {
    this.setState({ hasError: false, error: null, errorInfo: null });
    // Reload the page to reset the app state
    window.location.reload();
  };

  render() {
    if (this.state.hasError) {
      return (
        <div style={{
          minHeight: '100vh',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          background: 'linear-gradient(135deg, #ef4444 0%, #dc2626 100%)',
          padding: '20px',
        }}>
          <div style={{
            background: 'white',
            padding: '40px',
            borderRadius: '16px',
            maxWidth: '600px',
            width: '100%',
            boxShadow: '0 20px 60px rgba(0,0,0,0.3)',
          }}>
            <div style={{
              fontSize: '64px',
              textAlign: 'center',
              marginBottom: '20px',
            }}>
              💥
            </div>

            <h1 style={{
              fontSize: '32px',
              margin: '0 0 10px 0',
              color: '#ef4444',
              fontWeight: 'bold',
              textAlign: 'center',
            }}>
              Oops! Something went wrong
            </h1>

            <p style={{
              fontSize: '16px',
              color: '#6b7280',
              textAlign: 'center',
              marginBottom: '30px',
            }}>
              The application encountered an unexpected error.
            </p>

            {/* Error Details (Collapsible) */}
            {this.state.error && (
              <details style={{
                background: '#f9fafb',
                padding: '15px',
                borderRadius: '8px',
                marginBottom: '20px',
                border: '1px solid #e5e7eb',
              }}>
                <summary style={{
                  cursor: 'pointer',
                  fontWeight: 'bold',
                  color: '#374151',
                  marginBottom: '10px',
                }}>
                  Technical Details
                </summary>
                <div style={{
                  marginTop: '10px',
                  fontSize: '14px',
                  fontFamily: 'monospace',
                  color: '#ef4444',
                  whiteSpace: 'pre-wrap',
                  wordBreak: 'break-word',
                }}>
                  {this.state.error.toString()}
                </div>
                {this.state.errorInfo && (
                  <div style={{
                    marginTop: '10px',
                    fontSize: '12px',
                    fontFamily: 'monospace',
                    color: '#6b7280',
                    whiteSpace: 'pre-wrap',
                    maxHeight: '200px',
                    overflow: 'auto',
                  }}>
                    {this.state.errorInfo.componentStack}
                  </div>
                )}
              </details>
            )}

            {/* Action Buttons */}
            <div style={{
              display: 'flex',
              gap: '10px',
              justifyContent: 'center',
            }}>
              <button
                onClick={this.handleReset}
                style={{
                  padding: '14px 28px',
                  background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                  color: 'white',
                  border: 'none',
                  borderRadius: '8px',
                  fontSize: '16px',
                  fontWeight: 'bold',
                  cursor: 'pointer',
                  boxShadow: '0 4px 12px rgba(102, 126, 234, 0.4)',
                }}
              >
                🔄 Reload Application
              </button>

              <button
                onClick={() => window.history.back()}
                style={{
                  padding: '14px 28px',
                  background: '#f3f4f6',
                  color: '#374151',
                  border: '1px solid #d1d5db',
                  borderRadius: '8px',
                  fontSize: '16px',
                  fontWeight: 'bold',
                  cursor: 'pointer',
                }}
              >
                ← Go Back
              </button>
            </div>

            {/* Help Text */}
            <p style={{
              marginTop: '30px',
              fontSize: '14px',
              color: '#9ca3af',
              textAlign: 'center',
            }}>
              If this problem persists, please contact support or try clearing your browser cache.
            </p>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;
