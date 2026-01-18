# Smart Secretary Node Backend

Proxy REST API that forwards requests to the local Python Smart Secretary API.

## Prerequisites

- Python available to run `secretary_ai/server.py`
- Node.js 18+

## Setup

```powershell
cd backend_node
npm install
```

## Run

- In Terminal A (Python):

```powershell
python ../secretary_ai/server.py
```

- In Terminal B (Node):

```powershell
cd backend_node
npm start
```

## Test (via Node)

```powershell
$base = "http://localhost:3000"
Invoke-RestMethod -Uri "$base/health" -Method GET
Invoke-RestMethod -Uri "$base/api/secretary/suggestions" -Method POST -ContentType "application/json" -Body (Get-Content -Raw ../data/tasks_sample.json)
```

## Events

- Publish events using `eventBus.publish(type, data)`
  - `secretary.task.created` → triggers suggestions and publishes `secretary.notifications.push`
  - `secretary.appointment.created` → composes invite and publishes `secretary.notifications.push`

## WebSocket Notifications

- Open `backend_node/client.html` in a browser.
- With both servers running, publish a test event (Node REPL in `backend_node`):

```javascript
import { eventBus } from './eventBus.js';
eventBus.publish('secretary.notifications.push', { message: 'Test notification', when: new Date().toISOString() });
```

Clients connected to `http://localhost:3000` will receive messages on `secretary.notifications.push`.
