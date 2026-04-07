import React, { Component } from 'react';

/**
 * ErrorBoundary — يلتقط أخطاء React ويعرض واجهة بديلة
 * Catches JS errors in child components and shows fallback UI
 */
class ErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    // يمكن إرسال الخطأ لنظام مراقبة (Sentry, etc.)
    console.error('ErrorBoundary caught:', error, errorInfo);
  }

  handleReset = () => {
    this.setState({ hasError: false, error: null });
  };

  render() {
    if (this.state.hasError) {
      return (
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            minHeight: '60vh',
            fontFamily: 'Tajawal, sans-serif',
            direction: 'rtl',
            padding: 32,
          }}
        >
          <h2 style={{ color: '#dc3545', marginBottom: 16 }}>⚠️ حدث خطأ غير متوقع</h2>
          <p style={{ color: '#666', marginBottom: 24, textAlign: 'center', maxWidth: 480 }}>
            عذراً، حدث خطأ أثناء عرض هذا القسم. يمكنك المحاولة مرة أخرى أو الانتقال للصفحة
            الرئيسية.
          </p>
          <div style={{ display: 'flex', gap: 12 }}>
            <button
              onClick={this.handleReset}
              style={{
                padding: '10px 24px',
                background: '#0d6efd',
                color: '#fff',
                border: 'none',
                borderRadius: 6,
                cursor: 'pointer',
                fontSize: 14,
              }}
            >
              إعادة المحاولة
            </button>
            <button
              onClick={() => (window.location.href = '/')}
              style={{
                padding: '10px 24px',
                background: '#6c757d',
                color: '#fff',
                border: 'none',
                borderRadius: 6,
                cursor: 'pointer',
                fontSize: 14,
              }}
            >
              الصفحة الرئيسية
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;
