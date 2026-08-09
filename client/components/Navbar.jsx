import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export default function Navbar() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  async function handleLogout() {
    await logout();
    navigate('/login');
  }

  return (
    <div className="navbar">
      <Link className="brand" to="/">
        Services Marketplace
      </Link>
      <nav>
        {!user && <Link to="/login">Login</Link>}
        {!user && <Link to="/signup">Sign up</Link>}

        {user && user.baseRole === 'CUSTOMER' && <Link to="/">Browse</Link>}
        {user && user.baseRole === 'CUSTOMER' && <Link to="/my-bookings">My Bookings</Link>}

        {user && user.baseRole === 'VENDOR' && <Link to="/vendor/services">My Services</Link>}
        {user && user.baseRole === 'VENDOR' && <Link to="/vendor/bookings">Bookings</Link>}

        {user && user.baseRole === 'ADMIN' && <Link to="/admin/vendors">Vendors</Link>}
        {user && user.baseRole === 'ADMIN' && <Link to="/admin/roles">Roles</Link>}

        {user && <span className="user-info">{user.name} ({user.baseRole})</span>}
        {user && (
          <button className="secondary" style={{ marginLeft: 12 }} onClick={handleLogout}>
            Logout
          </button>
        )}
      </nav>
    </div>
  );
}
