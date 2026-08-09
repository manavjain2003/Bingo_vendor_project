import { Routes, Route } from 'react-router-dom';
import Navbar from './components/Navbar';
import ProtectedRoute from './components/ProtectedRoute';
import Login from './pages/Login';
import SignUp from './pages/SignUp';
import Catalogue from './pages/Catalogue';
import ServiceDetail from './pages/ServiceDetail';
import MyBookings from './pages/MyBookings';
import VendorServices from './pages/VendorServices';
import VendorOfferings from './pages/VendorOfferings';
import VendorBookings from './pages/VendorBookings';
import AdminVendors from './pages/AdminVendors';
import AdminRoles from './pages/AdminRoles';
import VendorAvailability from './pages/VendorAvailability';

export default function App() {
  return (
    <div>
      <Navbar />
      <Routes>
        <Route path="/" element={<Catalogue />} />
        <Route path="/services/:id" element={<ServiceDetail />} />
        <Route path="/login" element={<Login />} />
        <Route path="/signup" element={<Signup />} />

        <Route
          path="/my-bookings"
          element={
            <ProtectedRoute allowedRoles={['CUSTOMER']}>
              <MyBookings />
            </ProtectedRoute>
          }
        />

        <Route
          path="/vendor/services"
          element={
            <ProtectedRoute allowedRoles={['VENDOR']}>
              <VendorServices />
            </ProtectedRoute>
          }
        />
        <Route
          path="/vendor/services/:serviceId/offerings"
          element={
            <ProtectedRoute allowedRoles={['VENDOR']}>
              <VendorOfferings />
            </ProtectedRoute>
          }
        />
          <Route
          path="/vendor/services/:serviceId/availability"
          element={
            <ProtectedRoute allowedRoles={['VENDOR']}>
              <VendorAvailability />
            </ProtectedRoute>
          }
        />
        <Route
          path="/vendor/bookings"
          element={
            <ProtectedRoute allowedRoles={['VENDOR']}>
              <VendorBookings />
            </ProtectedRoute>
          }
        />

        <Route
          path="/admin/vendors"
          element={
            <ProtectedRoute allowedRoles={['ADMIN']}>
              <AdminVendors />
            </ProtectedRoute>
          }
        />
        <Route
          path="/admin/roles"
          element={
            <ProtectedRoute allowedRoles={['ADMIN']}>
              <AdminRoles />
            </ProtectedRoute>
          }
        />
      </Routes>
    </div>
  );
}
