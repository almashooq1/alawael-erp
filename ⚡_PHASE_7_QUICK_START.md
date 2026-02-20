⚡ **PHASE 7 - WebSocket Real-time Updates - QUICK START**

═══════════════════════════════════════════════════════════════════

## 🚀 QUICK START (3 Simple Steps)

### ✅ Step 1: Server Already Running

The WebSocket server is **already initialized** in `server.js`:

```javascript
const websocketService = require('./services/websocket.service');
websocketService.initialize(server);  // ✅ Already done!
```

**Status:** Server running on port **3001** ✅

---

### ✅ Step 2: Client Connection (React)

```javascript
import io from 'socket.io-client';

// Connect to WebSocket server
const socket = io('http://localhost:3001', {
  auth: {
    token: YOUR_JWT_TOKEN,
    userId: YOUR_USER_ID,
  },
});

// Handle connection
socket.on('connect', () => {
  console.log('✅ Connected to WebSocket server');
});

socket.on('disconnect', () => {
  console.log('❌ Disconnected from server');
});
```

---

### ✅ Step 3: Subscribe to Updates

#### **Vehicle Tracking**
```javascript
// Subscribe to specific vehicle
socket.emit('subscribe:vehicle', 'vehicle-123');

// Listen for location updates
socket.on('vehicle:location', (data) => {
  console.log('📍 Vehicle location:', data.location);
});

// Listen for status changes
socket.on('vehicle:updated', (data) => {
  console.log('🚗 Vehicle updated:', data);
});

// Unsubscribe when done
socket.emit('unsubscribe:vehicle', 'vehicle-123');
```

#### **Trip Tracking**
```javascript
// Subscribe to trip
socket.emit('subscribe:trip', 'trip-456');

// Listen for trip events
socket.on('trip:started', (data) => {
  console.log('🚀 Trip started:', data);
});

socket.on('trip:completed', (data) => {
  console.log('✅ Trip completed:', data);
});

// Unsubscribe
socket.emit('unsubscribe:trip', 'trip-456');
```

#### **Notifications**
```javascript
// Request notification count
socket.emit('notification:request-count');

// Listen for new notifications
socket.on('notification:new', (notification) => {
  console.log('📢 New notification:', notification);
});

socket.on('notification:count', ({count}) => {
  console.log(`You have ${count} unread notifications`);
});

// Mark as read
socket.emit('notification:mark-read', 'notification-789');
```

---

## 📋 Common Use Cases

### 1️⃣ **Real-time Fleet Dashboard**

```javascript
const FleetDashboard = () => {
  const [vehicles, setVehicles] = useState([]);
  const socket = io('http://localhost:3001', { auth: { token } });

  useEffect(() => {
    // Get active vehicles
    socket.emit('subscribe:tracking');

    // Listen for fleet updates
    socket.on('tracking:update', ({ vehicleId, location }) => {
      setVehicles(prev => 
        prev.map(v => v._id === vehicleId ? {...v, ...location} : v)
      );
    });

    return () => socket.emit('unsubscribe:tracking');
  }, []);

  return (
    <div className="fleet-map">
      {vehicles.map(v => (
        <Marker key={v._id} position={v.currentLocation} />
      ))}
    </div>
  );
};
```

### 2️⃣ **Live Trip Updates**

```javascript
const TripMonitor = ({ tripId }) => {
  const [tripStatus, setTripStatus] = useState(null);
  const socket = io('http://localhost:3001', { auth: { token } });

  useEffect(() => {
    socket.emit('subscribe:trip', tripId);

    socket.on('trip:updated', ({ data }) => {
      setTripStatus(data);
    });

    return () => socket.emit('unsubscribe:trip', tripId);
  }, [tripId]);

  return (
    <Card>
      <h3>Trip {tripId}</h3>
      <p>Status: {tripStatus?.status}</p>
      <p>Progress: {tripStatus?.progress}%</p>
      <p>ETA: {tripStatus?.eta}</p>
    </Card>
  );
};
```

### 3️⃣ **Notification Center**

```javascript
const NotificationCenter = () => {
  const [notifications, setNotifications] = useState([]);
  const socket = io('http://localhost:3001', { auth: { token } });

  useEffect(() => {
    // Get unread count
    socket.emit('notification:request-count');

    // Listen for new notifications
    socket.on('notification:new', (notif) => {
      setNotifications(prev => [notif, ...prev]);
    });

    // Mark as read
    const markAsRead = (id) => {
      socket.emit('notification:mark-read', id);
    };

    return () => socket.disconnect();
  }, []);

  return (
    <div className="notifications">
      {notifications.map(n => (
        <Notification 
          key={n._id} 
          notif={n}
          onRead={() => markAsRead(n._id)}
        />
      ))}
    </div>
  );
};
```

---

## 🔌 Server Broadcasting (Backend)

### Emit Vehicle Update
```javascript
const websocketService = require('./services/websocket.service');

// When vehicle location changes
websocketService.emitGPSUpdate(vehicleId, {
  lat: 24.7136,
  lng: 46.6753,
  speed: 45,
  timestamp: new Date(),
});
```

### Emit Trip Event
```javascript
// When trip starts
websocketService.emitTripStarted(tripId, {
  vehicleId,
  driverId,
  startTime: new Date(),
});

// When trip completes
websocketService.emitTripCompleted(tripId, {
  vehicleId,
  endTime: new Date(),
  distance: 150,
  duration: 3600,
});
```

### Send Notification
```javascript
// To specific user
await websocketService.sendNotificationToUser(userId, {
  title: 'Trip Started',
  message: 'Your trip to Riyadh has started',
  type: 'info',
});

// Broadcast to all users
websocketService.broadcastNotification({
  message: 'System maintenance starting in 5 minutes',
  type: 'warning',
});
```

---

## 🧪 Testing

### Run Tests
```bash
cd backend
node test-phase-7.js
```

### Expected Output
```
✅ Total Tests: 43
   ✓ Passed: 43
   ❌ Failed: 0
   📈 Success Rate: 100.0%

✅ Overall Status: 100% Complete - READY FOR PRODUCTION
```

---

## 🔍 Debugging

### Check WebSocket Connection
```javascript
socket.on('connect', () => console.log('✅ Connected'));
socket.on('connect_error', (error) => {
  console.error('Connection error:', error);
});
socket.on('disconnect', () => console.log('❌ Disconnected'));
```

### Browser DevTools
```javascript
// In browser console
socket.emit('subscribe:vehicle', 'vehicle-123');
socket.on('vehicle:location', (data) => console.log('Update:', data));

// Monitor all events
socket.onAny((event, ...args) => {
  console.log('📡 Event:', event, args);
});
```

### Server Logging
```javascript
const connections = websocketService.getActiveConnections();
console.log(`Active connections: ${connections.length}`);
connections.forEach(c => {
  console.log(`  - User: ${c.userId}, Role: ${c.userRole}`);
});
```

---

## ⚠️ Common Issues & Fixes

### ❌ "Authentication token required"
**Issue:** Token not sent in connection
```javascript
// ✅ Fix: Include token in auth
const socket = io(url, {
  auth: {
    token: YOUR_TOKEN,  // ← Add this!
  },
});
```

### ❌ "vehicle:location not emitting"
**Issue:** Not subscribed to vehicle
```javascript
// ✅ Fix: Subscribe first
socket.emit('subscribe:vehicle', vehicleId);
socket.on('vehicle:location', handler);
```

### ❌ CORS Error
**Issue:** Frontend and backend different origins
```javascript
// ✅ Fix: Update .env
FRONTEND_URL=http://localhost:3002  # Your frontend URL
# Server will use this for CORS
```

---

## 📦 Dependencies

```json
{
  "socket.io": "^4.8.3",
  "socket.io-client": "^4.8.3",
  "jwt-simple": "^0.5.6"
}
```

**Installation:**
```bash
npm install socket.io socket.io-client jwt-simple
```

---

## 🔧 Configuration

### Server Config (backend/.env)
```
PORT=3001
NODE_ENV=development
JWT_SECRET=your_secret_key
FRONTEND_URL=http://localhost:3002
```

### Client Config
```javascript
const WEBSOCKET_URL = 'http://localhost:3001';
const JWT_TOKEN = localStorage.getItem('token');
```

---

## 📊 Performance Tips

1. **Unsubscribe when component unmounts**
   ```javascript
   useEffect(() => {
     return () => socket.emit('unsubscribe:vehicle', id);
   }, []);
   ```

2. **Use socket.io-client v4.x for better performance**
   ```bash
   npm install socket.io-client@^4.8.3
   ```

3. **Implement message batching for high frequency data**
   ```javascript
   setInterval(() => {
     socket.emit('batch:gps-updates', updates);
   }, 100);  // Batch every 100ms
   ```

4. **Add reconnection handling**
   ```javascript
   socket.io.reconnectionDelay = 1000;
   socket.io.reconnectionDelayMax = 5000;
   socket.io.reconnectionAttempts = 5;
   ```

---

## 📚 Quick Reference

| Action | Code |
|--------|------|
| Connect | `io(url, { auth: {token} })` |
| Subscribe | `socket.emit('subscribe:vehicle', id)` |
| Listen | `socket.on('vehicle:updated', handler)` |
| Send Data | `socket.emit('event-name', data)` |
| Disconnect | `socket.disconnect()` |

---

## 🎯 Next Steps

1. ✅ Review client integration examples above
2. ✅ Copy examples to your React components
3. ✅ Run test suite to verify (`node test-phase-7.js`)
4. ✅ Test in browser DevTools
5. ✅ Deploy to production

---

## 📞 Support

### Documentation
- [Full Phase 7 Guide](./📋_PHASE_7_COMPLETE.md)
- [Socket.IO Docs](https://socket.io/docs/)

### Troubleshooting
- Check server is running: `http://localhost:3001/health`
- Verify token is valid
- Check browser console for errors
- Review server logs in terminal

---

**Phase 7 Quick Start Complete!** 🎉

**Next:** Phase 8 - Payment Integration (90 minutes)

---

*Last Updated: Feb 19, 2026*
