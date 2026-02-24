/**
 * 🔌 Connection Status Component
 * مكون عرض حالة الاتصال
 */

import connectionManager from '../utils/connection-manager.js';

class ConnectionStatus {
  constructor() {
    this.container = null;
    this.statusIndicator = null;
    this.init();
  }

  /**
   * Initialize connection status component
   */
  init() {
    // Create container
    this.container = document.createElement('div');
    this.container.id = 'connection-status';
    this.container.className = 'connection-status';
    this.container.innerHTML = this.render();

    // Get status indicator
    this.statusIndicator = this.container.querySelector('.status-indicator');

    // Listen to connection events
    connectionManager.on('online', () => this.updateStatus());
    connectionManager.on('offline', () => this.updateStatus());
    connectionManager.on('health-check', () => this.updateStatus());
    connectionManager.on('ws-connected', () => this.updateStatus());
    connectionManager.on('ws-disconnected', () => this.updateStatus());

    // Initial update
    this.updateStatus();

    // Update every 5 seconds
    setInterval(() => this.updateStatus(), 5000);
  }

  /**
   * Render component
   */
  render() {
    return `
      <div class="connection-status-container">
        <div class="status-indicator" title="حالة الاتصال">
          <span class="status-dot"></span>
          <span class="status-text">جاري التحقق...</span>
        </div>
        <div class="status-details" style="display: none;">
          <div class="status-item">
            <span class="status-label">API:</span>
            <span class="status-value" id="api-status">-</span>
          </div>
          <div class="status-item">
            <span class="status-label">WebSocket:</span>
            <span class="status-value" id="ws-status">-</span>
          </div>
        </div>
      </div>
    `;
  }

  /**
   * Update status display
   */
  updateStatus() {
    if (!this.statusIndicator) return;

    const status = connectionManager.getStatus();
    const statusDot = this.statusIndicator.querySelector('.status-dot');
    const statusText = this.statusIndicator.querySelector('.status-text');
    const apiStatus = document.getElementById('api-status');
    const wsStatus = document.getElementById('ws-status');

    // Update main indicator
    if (status.isOnline && status.apiConnected && status.wsConnected) {
      statusDot.className = 'status-dot connected';
      statusText.textContent = 'متصل';
      this.statusIndicator.className = 'status-indicator connected';
    } else if (status.isOnline && status.apiConnected) {
      statusDot.className = 'status-dot partial';
      statusText.textContent = 'اتصال جزئي';
      this.statusIndicator.className = 'status-indicator partial';
    } else if (status.isOnline) {
      statusDot.className = 'status-dot disconnected';
      statusText.textContent = 'غير متصل';
      this.statusIndicator.className = 'status-indicator disconnected';
    } else {
      statusDot.className = 'status-dot offline';
      statusText.textContent = 'غير متصل بالإنترنت';
      this.statusIndicator.className = 'status-indicator offline';
    }

    // Update details
    if (apiStatus) {
      apiStatus.textContent = status.apiConnected ? '✅ متصل' : '❌ غير متصل';
      apiStatus.className = `status-value ${status.apiConnected ? 'connected' : 'disconnected'}`;
    }

    if (wsStatus) {
      wsStatus.textContent = status.wsConnected ? '✅ متصل' : '❌ غير متصل';
      wsStatus.className = `status-value ${status.wsConnected ? 'connected' : 'disconnected'}`;
    }
  }

  /**
   * Show details on hover
   */
  showDetails() {
    const details = this.container.querySelector('.status-details');
    if (details) {
      details.style.display = 'block';
    }
  }

  /**
   * Hide details
   */
  hideDetails() {
    const details = this.container.querySelector('.status-details');
    if (details) {
      details.style.display = 'none';
    }
  }

  /**
   * Mount to DOM
   */
  mount(selector) {
    const parent = document.querySelector(selector);
    if (parent) {
      parent.appendChild(this.container);

      // Add hover events
      this.statusIndicator.addEventListener('mouseenter', () => this.showDetails());
      this.statusIndicator.addEventListener('mouseleave', () => this.hideDetails());
    }
  }

  /**
   * Unmount from DOM
   */
  unmount() {
    if (this.container && this.container.parentNode) {
      this.container.parentNode.removeChild(this.container);
    }
  }
}

// Create and export singleton
const connectionStatus = new ConnectionStatus();

export default connectionStatus;
