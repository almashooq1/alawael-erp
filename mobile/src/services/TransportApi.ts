/**
 * Smart Transport API client for mobile — Phase E
 *
 * Hits the backend mongoose transport-module surface. Returns a typed
 * driver-trip payload + helpers for tap-to-pickup, GPS push (single + batch).
 */
import ApiService from './ApiService';

export interface TransportGpsPoint {
  latitude: number;
  longitude: number;
  speed?: number;
  heading?: number;
  altitude?: number;
  accuracy?: number;
  timestamp?: string;
}

export interface DriverTripResponse {
  trip: {
    _id: string;
    trip_number: string;
    trip_type: 'morning_pickup' | 'afternoon_dropoff' | 'special';
    status: 'scheduled' | 'in_progress' | 'completed' | 'delayed' | 'cancelled';
    scheduled_departure?: string;
    actual_departure?: string;
    pre_trip_inspection_completed: boolean;
    total_passengers: number;
    picked_up_count: number;
    absent_count: number;
  };
  vehicle: {
    _id: string;
    license_plate: string;
    vehicle_type: string;
    make?: string;
    model?: string;
  } | null;
  route: {
    _id: string;
    route_number: string;
    route_name_ar: string;
    total_distance_km?: number;
    estimated_duration_minutes?: number;
    waypoints: Array<{
      order: number;
      lat: number;
      lng: number;
      address?: string;
      pickup_time?: string;
      beneficiary_id?: { _id: string; full_name_ar?: string; guardian_phone?: string } | string;
    }>;
  };
  passengers: Array<{
    beneficiary_id: { _id: string; full_name_ar?: string; guardian_phone?: string } | string;
    status: 'scheduled' | 'picked_up' | 'dropped_off' | 'absent' | 'cancelled';
    pickup_time_actual?: string;
  }>;
  gps: { latitude: number; longitude: number; speed?: number; timestamp: string } | null;
  nextStop: {
    waypoint: { order: number; lat: number; lng: number; beneficiary_id?: string };
    distanceMeters: number;
    withinGeofence: boolean;
  } | null;
  liveEta: Array<{
    order: number;
    beneficiary_id?: string;
    lat: number;
    lng: number;
    live_eta: string;
    scheduled_time: string | null;
    delay_minutes: number | null;
  }>;
  navigationLinks: Array<{
    order: number;
    waze: string;
    google: string;
    apple: string;
    geo: string;
  }>;
  fullRouteUrl: string | null;
  geofence_radius_meters: number;
}

export const TransportApi = {
  async myTripToday(): Promise<DriverTripResponse | null> {
    const result = await ApiService.get<{ success: boolean; data: DriverTripResponse | null }>('/transport-module/driver/my-trip-today');
    return result.data;
  },

  async pickupAt(tripId: string, lat: number, lng: number, beneficiary_id?: string, force = false) {
    return ApiService.post<{
      success: boolean;
      data?: { beneficiary_id: string; status: string; distanceMeters: number | null };
      message?: string;
    }>(`/transport-module/driver/trips/${tripId}/pickup-at`, {
      latitude: lat,
      longitude: lng,
      beneficiary_id,
      force,
    });
  },

  async dropoffAt(tripId: string, lat: number, lng: number, beneficiary_id: string) {
    return ApiService.post(`/transport-module/driver/trips/${tripId}/dropoff-at`, {
      latitude: lat,
      longitude: lng,
      beneficiary_id,
    });
  },

  async postGpsBatch(vehicle_id: string, points: TransportGpsPoint[], trip_id?: string) {
    return ApiService.post<{ success: boolean; inserted: number; rejected: number }>('/transport-module/gps/batch', {
      vehicle_id,
      trip_id,
      points,
    });
  },

  async postGpsPoint(point: TransportGpsPoint & { vehicle_id: string; trip_id?: string }) {
    return ApiService.post('/transport-module/gps', point);
  },
};
