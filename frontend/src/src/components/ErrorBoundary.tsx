import React, { Component, ErrorInfo, ReactNode } from 'react';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
  onError?: (error: Error, errorInfo: ErrorInfo) => void;
}

interface State {
  hasError: boolean;
  error?: Error;
}

/**
 * Error Boundary لالتقاط الأخطاء في React components
 */
class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('ErrorBoundary caught an error:', error, errorInfo);

    // استدعاء callback إذا كان موجوداً
    if (this.props.onError) {
      this.props.onError(error, errorInfo);
    }

    // إرسال الخطأ إلى خدمة monitoring
    if (process.env.NODE_ENV === 'production') {
      // TODO: إرسال إلى Sentry أو خدمة مشابهة
      console.error('Production error:', {
        error: error.toString(),
        componentStack: errorInfo.componentStack,
        timestamp: new Date().toISOString(),
      });
    }
  }

  handleReset = () => {
    this.setState({ hasError: false, error: undefined });
  };

  render() {
    if (this.state.hasError) {
      // عرض fallback UI مخصص أو افتراضي
      if (this.props.fallback) {
        return this.props.fallback;
      }

      return (
        <div style={{
          padding: '20px',
          textAlign: 'center',
          backgroundColor: '#f8f9fa',
          border: '1px solid #dee2e6',
          borderRadius: '8px',
          margin: '20px',
        }}>
          <h2 style={{ color: '#dc3545' }}>⚠️ حدث خطأ</h2>
          <p style={{ color: '#6c757d' }}>
            عذراً، حدث خطأ غير متوقع. يرجى تحديث الصفحة والمحاولة مرة أخرى.
          </p>
          {process.env.NODE_ENV === 'development' && this.state.error && (
            <details style={{
              marginTop: '20px',
              textAlign: 'left',
              backgroundColor: '#fff',
              padding: '15px',
              borderRadius: '4px',
              border: '1px solid #dee2e6',
            }}>
              <summary style={{ cursor: 'pointer', fontWeight: 'bold', marginBottom: '10px' }}>
                تفاصيل الخطأ (Development Only)
              </summary>
              <pre style={{
                fontSize: '12px',
                color: '#dc3545',
                overflow: 'auto',
                maxHeight: '300px',
              }}>
                {this.state.error.toString()}
                {'\n\n'}
                {this.state.error.stack}
              </pre>
            </details>
          )}
          <button
            onClick={this.handleReset}
            style={{
              marginTop: '20px',
              padding: '10px 20px',
              backgroundColor: '#007bff',
              color: 'white',
              border: 'none',
              borderRadius: '4px',
              cursor: 'pointer',
              fontSize: '16px',
            }}
            onMouseOver={(e) => e.currentTarget.style.backgroundColor = '#0056b3'}
            onMouseOut={(e) => e.currentTarget.style.backgroundColor = '#007bff'}
          >
            إعادة المحاولة
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;
