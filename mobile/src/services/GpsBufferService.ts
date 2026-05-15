/**
 * GPS Buffer Service — Phase E
 *
 * Buffers GPS points in AsyncStorage so the driver can drive through
 * coverage holes without losing position history. Flushes the buffer
 * via /transport-module/gps/batch (≤100 points/batch) whenever:
 *  - The buffer reaches 50 points (~ 8 min @ 10s cadence), or
 *  - flush() is called explicitly (foreground tick / app resume), or
 *  - The previous flush failed and ≥ 60s have passed.
 *
 * Persists across app restarts. No memory leak — keeps ≤ 1000 points
 * total (drops oldest if backlog grows that big offline).
 */
import AsyncStorage from '@react-native-async-storage/async-storage';
import { TransportApi, TransportGpsPoint } from './TransportApi';

const STORAGE_KEY = '@alawael/gps-buffer-v1';
const FLUSH_THRESHOLD = 50;
const BATCH_MAX = 100;
const MAX_BUFFER_SIZE = 1000;
const MIN_RETRY_INTERVAL_MS = 60_000;

type BufferedPoint = TransportGpsPoint & { trip_id?: string };

class GpsBufferServiceImpl {
  private vehicleId: string | null = null;
  private tripId: string | null = null;
  private buffer: BufferedPoint[] = [];
  private lastFlushAttempt = 0;
  private flushInFlight = false;
  private loaded = false;

  async configure(vehicleId: string, tripId?: string) {
    this.vehicleId = vehicleId;
    this.tripId = tripId ?? null;
    if (!this.loaded) await this.loadFromStorage();
  }

  /** Add one GPS sample. Auto-flushes when threshold reached. */
  async add(point: TransportGpsPoint): Promise<void> {
    if (!this.vehicleId) return;
    this.buffer.push({ ...point, trip_id: this.tripId ?? undefined });

    // Cap buffer size — drop oldest if we've been offline too long
    if (this.buffer.length > MAX_BUFFER_SIZE) {
      this.buffer = this.buffer.slice(-MAX_BUFFER_SIZE);
    }

    await this.persist();

    if (this.buffer.length >= FLUSH_THRESHOLD) {
      void this.flush();
    }
  }

  /**
   * Try to send everything we have. Safe to call from anywhere.
   * Returns the number of points successfully flushed.
   */
  async flush(): Promise<number> {
    if (!this.vehicleId || this.flushInFlight || this.buffer.length === 0) return 0;
    if (Date.now() - this.lastFlushAttempt < MIN_RETRY_INTERVAL_MS && this.lastFlushAttempt > 0) {
      return 0;
    }

    this.flushInFlight = true;
    this.lastFlushAttempt = Date.now();
    let sent = 0;

    try {
      // Send in chunks of BATCH_MAX
      while (this.buffer.length > 0) {
        const chunk = this.buffer.slice(0, BATCH_MAX);
        const result = await TransportApi.postGpsBatch(
          this.vehicleId,
          chunk.map(({ trip_id: _trip_id, ...p }) => p),
          this.tripId ?? undefined,
        );
        if (!result.success) break;
        this.buffer = this.buffer.slice(chunk.length);
        sent += result.inserted;
        await this.persist();
      }
    } catch {
      // Keep buffer; we'll retry on the next add() or flush()
    } finally {
      this.flushInFlight = false;
    }

    return sent;
  }

  pendingCount(): number {
    return this.buffer.length;
  }

  async clear(): Promise<void> {
    this.buffer = [];
    await this.persist();
  }

  private async loadFromStorage() {
    try {
      const raw = await AsyncStorage.getItem(STORAGE_KEY);
      if (raw) this.buffer = JSON.parse(raw);
    } catch {
      this.buffer = [];
    }
    this.loaded = true;
  }

  private async persist() {
    try {
      await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(this.buffer));
    } catch {
      // Quota exceeded — drop oldest half rather than crash
      this.buffer = this.buffer.slice(-Math.floor(MAX_BUFFER_SIZE / 2));
    }
  }
}

const GpsBufferService = new GpsBufferServiceImpl();
export default GpsBufferService;
