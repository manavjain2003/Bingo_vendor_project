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
        Bingo Services
      </Link>
      <nav>
        {user && user.baseRole === 'ADMIN' && <Link to="/admin/roles">Roles</Link>}
        {user && user.baseRole === 'ADMIN' && <Link to="/admin/vendors">Vendors</Link>}
        {!user && <Link to="/login">Login</Link>}
        {!user && <Link to="/signup">Sign up</Link>}
        {user && (
          <button className="secondary" style={{ marginLeft: 12 }} onClick={handleLogout}>
            Logout
          </button>
        )}
      </nav>
    </div>
  );
}
