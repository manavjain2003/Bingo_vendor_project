import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export default function Signup() {
  const [baseRole, setBaseRole] = useState('CUSTOMER');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [businessName, setBusinessName] = useState('');
  const [contact, setContact] = useState('');
  const [address, setAddress] = useState('');
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const { signup } = useAuth();
  const navigate = useNavigate();

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');
    setSubmitting(true);
    try {
      const payload = { name, email, password, baseRole };
      if (baseRole === 'VENDOR') {
        payload.vendorProfile = { businessName, contact, address, documents: [] };
      }
      await signup(payload);
      navigate('/');
    } catch (err) {
      setError(err.response?.data?.error?.message || 'Signup failed');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="container" style={{ maxWidth: 460 }}>
      <h2>Create an account</h2>
      {error && <div className="error-banner">{error}</div>}
      <form onSubmit={handleSubmit}>
        <div className="form-group">
          <label>I am a</label>
          <select value={baseRole} onChange={(e) => setBaseRole(e.target.value)}>
            <option value="CUSTOMER">Customer</option>
            <option value="VENDOR">Vendor</option>
          </select>
        </div>
        <div className="form-group">
          <label>Name</label>
          <input value={name} onChange={(e) => setName(e.target.value)} required />
        </div>
        <div className="form-group">
          <label>Email</label>
          <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
        </div>
        <div className="form-group">
          <label>Password</label>
          <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} minLength={8} required />
        </div>

        {baseRole === 'VENDOR' && (
          <>
            <div className="form-group">
              <label>Business name</label>
              <input value={businessName} onChange={(e) => setBusinessName(e.target.value)} required />
            </div>
            <div className="form-group">
              <label>Contact number</label>
              <input value={contact} onChange={(e) => setContact(e.target.value)} required />
            </div>
            <div className="form-group">
              <label>Address</label>
              <input value={address} onChange={(e) => setAddress(e.target.value)} required />
            </div>
            <p style={{ fontSize: 13, color: '#6b7280' }}>
              Your vendor account will stay pending until an admin approves it.
            </p>
          </>
        )}

        <button type="submit" disabled={submitting}>
          {submitting ? 'Creating account...' : 'Sign up'}
        </button>
      </form>
      <p style={{ marginTop: 14 }}>
        Already have an account? <Link to="/login">Log in</Link>
      </p>
    </div>
  );
}
