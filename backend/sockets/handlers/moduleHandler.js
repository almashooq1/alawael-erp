/**
 * Module KPI Handler
 * معالج مؤشرات الأداء للوحدات
 */

const { getModuleKPIs } = require('../../utils/kpiCalculator');

/**
 * Handle module subscription events
 * معالجة أحداث الاشتراك في الوحدات
 */
function moduleHandler(socket, io, activeSubscriptions) {
  // Subscribe to module KPIs
  socket.on('module:subscribe', ({ moduleKey }) => {
    if (!moduleKey) {
      socket.emit('error', { message: 'Module key is required' });
      return;
    }

    const room = `module:${moduleKey}`;
    socket.join(room);

    // Store subscription
    activeSubscriptions.set(socket.id, {
      type: 'module',
      moduleKey,
      subscribedAt: new Date(),
    });

    console.log(`[Module] ${socket.id} subscribed to ${moduleKey}`);

    // Send initial KPI data
    try {
      const moduleKPIs = getModuleKPIs(moduleKey);
      socket.emit(`kpi:update:${moduleKey}`, {
        moduleKey,
        data: moduleKPIs,
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      console.error(`[Module] Error fetching KPIs for ${moduleKey}:`, error);
      socket.emit('error', {
        message: `فشل جلب بيانات ${moduleKey}`,
        moduleKey,
      });
    }

    // Setup periodic updates (every 15 seconds)
    const interval = setInterval(() => {
      if (!socket.connected) {
        clearInterval(interval);
        return;
      }

      try {
        const moduleKPIs = getModuleKPIs(moduleKey);
        socket.emit(`kpi:update:${moduleKey}`, {
          moduleKey,
          data: moduleKPIs,
          timestamp: new Date().toISOString(),
        });
      } catch (error) {
        console.error(`[Module] Periodic update error for ${moduleKey}:`, error);
        clearInterval(interval);
      }
    }, 15000);

    // Store interval for cleanup
    if (!socket.intervals) socket.intervals = [];
    socket.intervals.push(interval);
  });

  // Unsubscribe from module
  socket.on('module:unsubscribe', ({ moduleKey }) => {
    if (!moduleKey) return;

    const room = `module:${moduleKey}`;
    socket.leave(room);

    // Remove subscription if it matches
    const sub = activeSubscriptions.get(socket.id);
    if (sub && sub.type === 'module' && sub.moduleKey === moduleKey) {
      activeSubscriptions.delete(socket.id);
    }

    console.log(`[Module] ${socket.id} unsubscribed from ${moduleKey}`);

    socket.emit('module:unsubscribed', { moduleKey });
  });

  // Request immediate update
  socket.on('module:refresh', ({ moduleKey }) => {
    if (!moduleKey) return;

    try {
      const moduleKPIs = getModuleKPIs(moduleKey);
      socket.emit(`kpi:update:${moduleKey}`, {
        moduleKey,
        data: moduleKPIs,
        timestamp: new Date().toISOString(),
        refreshed: true,
      });
    } catch (error) {
      socket.emit('error', {
        message: `فشل تحديث بيانات ${moduleKey}`,
        moduleKey,
      });
    }
  });
}

module.exports = moduleHandler;
