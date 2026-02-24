import React from 'react';
import { Box, Typography, Button, Container, Paper } from '@material-ui/core';
import ErrorOutlineIcon from '@material-ui/icons/ErrorOutline';

class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null,
      errorCount: 0,
    };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true };
  }

  componentDidCatch(error, errorInfo) {
    console.error('Error caught by boundary:', error, errorInfo);
    this.setState((prevState) => ({
      error,
      errorInfo,
      errorCount: prevState.errorCount + 1,
    }));

    // Log to error reporting service in production
    if (process.env.REACT_APP_ENVIRONMENT === 'production') {
      // Example: Sentry.captureException(error);
    }
  }

  handleReset = () => {
    this.setState({
      hasError: false,
      error: null,
      errorInfo: null,
    });
  };

  render() {
    if (this.state.hasError) {
      return (
        <Container maxWidth="md">
          <Box
            display="flex"
            alignItems="center"
            justifyContent="center"
            minHeight="100vh"
            flexDirection="column"
          >
            <Paper style={{ padding: '40px', textAlign: 'center' }}>
              <ErrorOutlineIcon
                style={{
                  fontSize: '80px',
                  color: '#f56565',
                  marginBottom: '20px',
                }}
              />

              <Typography variant="h3" gutterBottom>
                Oops! Something went wrong
              </Typography>

              <Typography variant="body1" color="textSecondary" paragraph>
                We're sorry, but something unexpected happened. Our team has been notified.
              </Typography>

              {process.env.REACT_APP_DEBUG && this.state.error && (
                <Box
                  style={{
                    backgroundColor: '#f5f5f5',
                    padding: '20px',
                    borderRadius: '8px',
                    marginTop: '20px',
                    textAlign: 'left',
                    maxHeight: '300px',
                    overflowY: 'auto',
                    fontFamily: 'monospace',
                    fontSize: '12px',
                  }}
                >
                  <Typography variant="subtitle2" gutterBottom>
                    Error Details:
                  </Typography>
                  <Typography variant="body2" component="pre">
                    {this.state.error.toString()}
                  </Typography>
                  {this.state.errorInfo && (
                    <Typography variant="body2" component="pre">
                      {this.state.errorInfo.componentStack}
                    </Typography>
                  )}
                </Box>
              )}

              <Box marginTop="40px">
                <Button
                  variant="contained"
                  color="primary"
                  onClick={this.handleReset}
                  style={{ marginRight: '10px' }}
                >
                  Try Again
                </Button>
                <Button
                  variant="outlined"
                  color="primary"
                  onClick={() => (window.location.href = '/login')}
                >
                  Go to Login
                </Button>
              </Box>

              {this.state.errorCount > 3 && (
                <Typography
                  variant="caption"
                  color="error"
                  style={{ display: 'block', marginTop: '20px' }}
                >
                  Multiple errors detected. Please refresh the page or contact support.
                </Typography>
              )}
            </Paper>
          </Box>
        </Container>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;
