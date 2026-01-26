/**
 * Dashboard Handler
 * معالج لوحة القيادة
 */

const { getSummarySystems, getTopKPIs } = require('../../utils/kpiCalculator');

/**
 * Handle dashboard subscription events
 * معالجة أحداث الاشتراك في لوحة القيادة
 */
function dashboardHandler(socket, io, activeSubscriptions) {
  // Subscribe to dashboard updates
  socket.on('dashboard:subscribe', () => {
    socket.join('dashboard');

    // Store subscription
    activeSubscriptions.set(socket.id, {
      type: 'dashboard',
      subscribedAt: new Date(),
    });

    console.log(`[Dashboard] ${socket.id} subscribed to dashboard`);

    // Send initial dashboard data
    try {
      const dashboardData = {
        summaryCards: getSummarySystems(),
        topKPIs: getTopKPIs(4),
        timestamp: new Date().toISOString(),
      };
      socket.emit('dashboard:update', dashboardData);
    } catch (error) {
      console.error('[Dashboard] Error fetching initial data:', error);
      socket.emit('error', { message: 'فشل جلب بيانات لوحة القيادة' });
    }

    // Setup periodic updates (every 30 seconds)
    const interval = setInterval(() => {
      if (!socket.connected) {
        clearInterval(interval);
        return;
      }

      try {
        const dashboardData = {
          summaryCards: getSummarySystems(),
          topKPIs: getTopKPIs(4),
          timestamp: new Date().toISOString(),
        };
        socket.emit('dashboard:update', dashboardData);
      } catch (error) {
        console.error('[Dashboard] Periodic update error:', error);
        clearInterval(interval);
      }
    }, 30000);

    // Store interval for cleanup
    if (!socket.intervals) socket.intervals = [];
    socket.intervals.push(interval);
  });

  // Unsubscribe from dashboard
  socket.on('dashboard:unsubscribe', () => {
    socket.leave('dashboard');

    const sub = activeSubscriptions.get(socket.id);
    if (sub && sub.type === 'dashboard') {
      activeSubscriptions.delete(socket.id);
    }

    console.log(`[Dashboard] ${socket.id} unsubscribed from dashboard`);
    socket.emit('dashboard:unsubscribed');
  });

  // Request immediate refresh
  socket.on('dashboard:refresh', () => {
    try {
      const dashboardData = {
        summaryCards: getSummarySystems(),
        topKPIs: getTopKPIs(4),
        timestamp: new Date().toISOString(),
        refreshed: true,
      };
      socket.emit('dashboard:update', dashboardData);
    } catch (error) {
      socket.emit('error', { message: 'فشل تحديث لوحة القيادة' });
    }
  });

  // Get specific module summary
  socket.on('dashboard:module:get', ({ moduleKey }) => {
    if (!moduleKey) return;

    try {
      const summaryCards = getSummarySystems();
      const moduleData = summaryCards.find(card => card.key === moduleKey);

      socket.emit('dashboard:module:data', {
        moduleKey,
        data: moduleData || null,
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      socket.emit('error', {
        message: `فشل جلب بيانات ${moduleKey}`,
        moduleKey,
      });
    }
  });
}

module.exports = dashboardHandler;
