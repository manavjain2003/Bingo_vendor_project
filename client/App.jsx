import { Routes, Route } from 'react-router-dom';
import Navbar from './component/Navbar';
import Login from './pages/Login';
import Signup from './pages/SignUp';
import Catalogue from './pages/Catalogue';
import ProtectedRoute from './component/ProtectedRoute';
import AdminRoles from './pages/AdminRoles';
import AdminVendors from './pages/AdminVendors';


export default function App() {
  return (
    <div>
      <Navbar />
      <Routes>
        <Route path="/" element={<Catalogue />} />
        <Route path="/login" element={<Login />} />
        <Route path="/signup" element={<Signup />} />
        <Route
          path="/admin/roles"
          element={
            <ProtectedRoute allowedRoles={['ADMIN']}>
              <AdminRoles />
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
      </Routes>
    </div>
  );
}