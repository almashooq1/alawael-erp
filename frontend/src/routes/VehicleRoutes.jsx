import React from 'react';
import { Routes, Route } from 'react-router-dom';

// Vehicle Components
import {
  VehicleList,
  VehicleForm,
  VehicleDetails,
  VehicleTracking
} from '../components/vehicles';

// Trip Components
import { TripList, TripForm, TripDetails } from '../components/trips';

const VehicleRoutes = () => {
  return (
    <Routes>
      {/* Vehicle Routes */}
      <Route path="/vehicles" element={<VehicleList />} />
      <Route path="/vehicles/new" element={<VehicleForm />} />
      <Route path="/vehicles/:id" element={<VehicleDetails />} />
      <Route path="/vehicles/:id/edit" element={<VehicleForm />} />
      <Route path="/vehicles/:id/tracking" element={<VehicleTracking />} />

      {/* Trip Routes */}
      <Route path="/trips" element={<TripList />} />
      <Route path="/trips/new" element={<TripForm />} />
      <Route path="/trips/:id" element={<TripDetails />} />
      <Route path="/trips/:id/edit" element={<TripForm />} />
    </Routes>
  );
};

export default VehicleRoutes;
