/**
 * Location adapter — Phase E
 *
 * Wraps expo-location with a thin interface so the rest of the codebase
 * doesn't import it directly. When expo-location is not installed
 * (current state — add to package.json before shipping driver build),
 * the adapter falls back to a stub that emits a single Riyadh-center
 * point + a warning, so the UI still renders during development.
 *
 * To enable real GPS:
 *   npm install expo-location
 *   then redeploy the driver build with location permissions in app.json.
 */

export interface LocationSample {
  latitude: number;
  longitude: number;
  speed?: number;
  heading?: number;
  altitude?: number;
  accuracy?: number;
  timestamp: number;
}

type Subscriber = (sample: LocationSample) => void;

// Lazy-load expo-location so build doesn't fail when the dep is absent
let expoLocation: typeof import('expo-location') | null = null;
try {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  expoLocation = require('expo-location');
} catch {
  expoLocation = null;
}

class LocationServiceImpl {
  private subscribers = new Set<Subscriber>();
  private watcher: { remove: () => void } | null = null;
  private stubInterval: ReturnType<typeof setInterval> | null = null;
  private permissionGranted = false;

  isAvailable(): boolean {
    return expoLocation !== null;
  }

  async requestPermission(): Promise<boolean> {
    if (!expoLocation) {
      console.warn('[LocationService] expo-location is not installed — using stub');
      this.permissionGranted = true;
      return true;
    }
    const { status } = await expoLocation.requestForegroundPermissionsAsync();
    this.permissionGranted = status === 'granted';
    return this.permissionGranted;
  }

  async getCurrent(): Promise<LocationSample | null> {
    if (!this.permissionGranted) {
      const ok = await this.requestPermission();
      if (!ok) return null;
    }
    if (!expoLocation) {
      return {
        latitude: 24.7136,
        longitude: 46.6753,
        speed: 0,
        timestamp: Date.now(),
      };
    }
    const loc = await expoLocation.getCurrentPositionAsync({});
    return {
      latitude: loc.coords.latitude,
      longitude: loc.coords.longitude,
      speed: loc.coords.speed != null ? loc.coords.speed * 3.6 : undefined,
      heading: loc.coords.heading ?? undefined,
      altitude: loc.coords.altitude ?? undefined,
      accuracy: loc.coords.accuracy ?? undefined,
      timestamp: loc.timestamp,
    };
  }

  /** Subscribe to position updates. Returns an unsubscribe fn. */
  subscribe(cb: Subscriber, intervalMs = 10_000): () => void {
    this.subscribers.add(cb);
    void this.ensureWatcher(intervalMs);
    return () => {
      this.subscribers.delete(cb);
      if (this.subscribers.size === 0) this.stopWatcher();
    };
  }

  private async ensureWatcher(intervalMs: number) {
    if (this.watcher || this.stubInterval) return;
    if (!this.permissionGranted) {
      const ok = await this.requestPermission();
      if (!ok) return;
    }

    if (!expoLocation) {
      // Stub mode — emit Riyadh-center every interval
      this.stubInterval = setInterval(() => {
        this.broadcast({
          latitude: 24.7136 + (Math.random() - 0.5) * 0.001,
          longitude: 46.6753 + (Math.random() - 0.5) * 0.001,
          speed: Math.random() * 50,
          timestamp: Date.now(),
        });
      }, intervalMs);
      return;
    }

    this.watcher = await expoLocation.watchPositionAsync(
      {
        accuracy: expoLocation.Accuracy.High,
        timeInterval: intervalMs,
        distanceInterval: 10,
      },
      pos => {
        this.broadcast({
          latitude: pos.coords.latitude,
          longitude: pos.coords.longitude,
          speed: pos.coords.speed != null ? pos.coords.speed * 3.6 : undefined,
          heading: pos.coords.heading ?? undefined,
          altitude: pos.coords.altitude ?? undefined,
          accuracy: pos.coords.accuracy ?? undefined,
          timestamp: pos.timestamp,
        });
      },
    );
  }

  private stopWatcher() {
    this.watcher?.remove();
    this.watcher = null;
    if (this.stubInterval) {
      clearInterval(this.stubInterval);
      this.stubInterval = null;
    }
  }

  private broadcast(sample: LocationSample) {
    this.subscribers.forEach(s => {
      try {
        s(sample);
      } catch {
        /* one subscriber failure shouldn't kill others */
      }
    });
  }
}

const LocationService = new LocationServiceImpl();
export default LocationService;
