# Mobile API Modules — 2026-04-17/18 Sprint

Typed TypeScript clients for the backend routes shipped this sprint.
All modules sit on top of `src/services/ApiService.ts` so they inherit:

- Automatic `Authorization: Bearer <token>` injection (from `expo-secure-store`)
- Token refresh on 401 with retry
- Offline request queueing

## Modules

| Module               | Backend route                | Typical caller |
| -------------------- | ---------------------------- | -------------- |
| `parentPortal`       | `/api/parent-v2/*`           | Guardian app   |
| `therapistWorkbench` | `/api/therapist-workbench/*` | Therapist app  |
| `telehealth`         | `/api/telehealth-v2/*`       | Both           |
| `chat`               | `/api/chat-v2/*`             | Both           |
| `nafath`             | `/api/auth/nafath/*`         | Login flow     |
| `notify`             | `/api/notify/*`              | Staff          |

## Quick examples

### Parent dashboard — load my children

```ts
import { parentPortal } from '@/services/modules';

const children = await parentPortal.myChildren();
const overview = await parentPortal.childOverview(children[0]._id);
console.log(overview.summary.sessionsUpcomingWeek);
```

### Therapist — today's schedule + quick SOAP save

```ts
import { therapistWorkbench } from '@/services/modules';

const { items, totals } = await therapistWorkbench.today();
await therapistWorkbench.checkIn(items[0]._id);
await therapistWorkbench.saveNotes(items[0]._id, {
  notes: { subjective: '...', objective: '...', assessment: '...', plan: '...' },
  rating: 4,
});
```

### Telehealth — join a Jitsi session

```ts
import { telehealth } from '@/services/modules';

const upcoming = await telehealth.myUpcoming();
const joinInfo = await telehealth.join(upcoming[0]._id);
// Open joinInfo.roomUrl in WebView / Linking / react-native-jitsi-meet
```

### Nafath SSO login

```ts
import { nafath } from '@/services/modules';
import * as SecureStore from 'expo-secure-store';

const init = await nafath.initiate('1234567890');
// Show init.randomNumber on screen. User taps it in Nafath app.

const poll = setInterval(async () => {
  const res = await nafath.pollStatus(init.requestId);
  if (res.status === 'APPROVED' && res.token) {
    clearInterval(poll);
    await SecureStore.setItemAsync('authToken', res.token);
    navigate(res.user?.role === 'parent' ? 'MyChildren' : 'Dashboard');
  } else if (['REJECTED', 'EXPIRED', 'ERROR'].includes(res.status)) {
    clearInterval(poll);
    showError(res.message);
  }
}, 2000);
```

### Chat — open or resume a conversation

```ts
import { chat } from '@/services/modules';

const contacts = await chat.contacts();
const conv = await chat.findOrCreate(contacts[0]._id);
const history = await chat.messages(conv._id);
await chat.send(conv._id, 'مرحباً');
await chat.markRead(conv._id);
```

## Screens shipped this sprint

Six production-ready screens consume these clients:

| Screen                                       | Client             | Purpose                   |
| -------------------------------------------- | ------------------ | ------------------------- |
| `screens/auth/NafathLoginScreen`             | nafath             | National ID SSO login     |
| `screens/parent/MyChildrenScreen`            | parentPortal       | Parent dashboard          |
| `screens/therapist/TherapistWorkbenchScreen` | therapistWorkbench | Today/week/caseload       |
| `screens/telehealth/TelehealthScreen`        | telehealth         | Upcoming video sessions   |
| `screens/chat/ChatListScreen`                | chat               | Conversations list        |
| `screens/chat/ChatThreadScreen`              | chat               | Message thread + composer |

Wire them via `src/navigation/SprintAppNavigator.tsx` — a role-aware
native-stack + bottom-tabs tree that shows the right tabs based on
the user's role (parent → MyChildren/Telehealth/Chat; therapist →
Workbench/Telehealth/Chat). Handles auth state via SecureStore.

```tsx
import SprintAppNavigator from './navigation/SprintAppNavigator';

export default function App() {
  return <SprintAppNavigator />;
}
```

## Environment

The base URL is controlled by `EXPO_PUBLIC_API_URL` (see `ApiService.ts`).
Default: `https://api.alawael.com/api/v1`.

## Mock backend for local dev

Spin up the backend with the demo-showcase seed so every endpoint has
realistic data:

```bash
cd backend
npm run seed:demo:reset
npm run dev
```

Then set `EXPO_PUBLIC_API_URL=http://localhost:3001/api` in the mobile
app's `.env` before running `expo start`.

Seeded parent account:

- Email: `parent.mohammed@demo.alawael.com`
- Password: `Demo@2026`

Seeded therapist account:

- Email: `therapist.ahmed@demo.alawael.com`
- Password: `Demo@2026`

## Testing the state machines

All 10 Saudi government adapters have deterministic mock branches you
can hit from the mobile app by passing specific IDs:

- **GOSI** (`/nationalId` suffix): `00` → not_found · `11` → inactive
- **SCFHS** (license suffix): `0` → expired · `9` → suspended · `999` → not_found
- **Qiwa** (`/nationalId` suffix): `55` → no_contract · `66` → wps_violation
- **Muqeem** (iqama suffix): `00` → not_found · `11` → cancelled · `22` → expired
- **Nafath** (`/nationalId` suffix): `99` → rejected · `88` → expired

Everything else returns the success path (ACTIVE / ELIGIBLE / MATCH /
etc.) so demo screens always show something meaningful.
