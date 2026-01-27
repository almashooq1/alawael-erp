"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.NotificationCenter = void 0;
const notifications = [];
function generateId() {
    return 'N' + Math.random().toString(36).slice(2, 10);
}
class NotificationCenter {
    // Send maintenance alerts for assets
    sendMaintenanceAlerts(assets, channel = 'in-app') {
        const alerts = [];
        for (const asset of assets) {
            const notif = {
                id: generateId(),
                userId: asset.owner || 'admin',
                title: `Maintenance Alert: ${asset.name}`,
                message: asset.aiRecommendation || 'Asset requires maintenance soon.',
                channel,
                sent: true,
                sentAt: new Date().toISOString(),
                metadata: { assetId: asset.id, nextMaintenanceDue: asset.nextMaintenanceDue },
            };
            notifications.push(notif);
            alerts.push(notif);
        }
        return alerts;
    }
    listNotifications(userId) {
        return userId ? notifications.filter(n => n.userId === userId) : notifications;
    }
    sendNotification(data) {
        const notif = {
            id: generateId(),
            sent: true,
            sentAt: new Date().toISOString(),
            ...data,
        };
        notifications.push(notif);
        return notif;
    }
    // Simulate multi-channel delivery
    resendNotification(id) {
        const n = notifications.find(n => n.id === id);
        if (!n)
            return null;
        n.sent = true;
        n.sentAt = new Date().toISOString();
        return n;
    }
}
exports.NotificationCenter = NotificationCenter;
