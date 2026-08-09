import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { client } from '../api/baseApi';
import { useAuth } from '../context/AuthContext';

function formatDate(date) {
  return new Date(date).toLocaleDateString();
}

function formatTime(date) {
  return new Date(date).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

export default function ServiceDetail() {
  const { id } = useParams();
  const { user } = useAuth();
  const navigate = useNavigate();

  const [service, setService] = useState(null);
  const [offerings, setOfferings] = useState([]);
  const [selectedOffering, setSelectedOffering] = useState('');
  const [slots, setSlots] = useState([]);
  const [selectedSlot, setSelectedSlot] = useState(null);
  const [paymentMode, setPaymentMode] = useState('PAY_AFTER');
  const [paymentToken, setPaymentToken] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [booking, setBooking] = useState(false);

  useEffect(() => {
    client.get(`/services/${id}`).then((res) => {
      setService(res.data.service);
      setOfferings(res.data.offerings);
      if (res.data.offerings.length) setSelectedOffering(res.data.offerings[0]._id);
    });
  }, [id]);

  useEffect(() => {
    if (!selectedOffering) return;
    const from = new Date().toISOString().slice(0, 10);
    const to = new Date(Date.now() + 14 * 86400000).toISOString().slice(0, 10);
    client
      .get(`/services/${id}/slots`, { params: { offeringId: selectedOffering, from, to } })
      .then((res) => setSlots(res.data.items));
  }, [selectedOffering, id]);

  async function handleBook() {
    if (!user) {
      navigate('/login');
      return;
    }
    setError('');
    setSuccess('');
    setBooking(true);
    try {
      const res = await client.post('/bookings', {
        slotId: selectedSlot,
        offeringId: selectedOffering,
        paymentMode,
        paymentToken: paymentMode === 'PAY_NOW' ? paymentToken : undefined,
      });
      setSuccess('Booking created.');
      setTimeout(() => navigate(`/my-bookings`), 900);
    } catch (err) {
      setError(err.response?.data?.error?.message || 'Booking failed');
    } finally {
      setBooking(false);
    }
  }

  if (!service) return <div className="container">Loading...</div>;

  const offering = offerings.find((o) => o._id === selectedOffering);

  return (
    <div className="container">
      <h2>{service.title}</h2>
      <p style={{ color: '#6b7280' }}>{service.description}</p>

      <div className="card">
        <h3>Choose an offering</h3>
        <select value={selectedOffering} onChange={(e) => setSelectedOffering(e.target.value)}>
          {offerings.map((o) => (
            <option key={o._id} value={o._id}>
              {o.name} - {o.durationMinutes} min - {(o.priceMinorUnits / 100).toFixed(2)} {o.currency}
            </option>
          ))}
        </select>
      </div>

      <div className="card">
        <h3>Available slots (next 14 days)</h3>
        {slots.length === 0 && <p style={{ color: '#6b7280' }}>No slots available in this window.</p>}
        <div className="slot-list">
          {slots.map((slot) => (
            <button
              key={slot.id}
              className={`slot-button ${selectedSlot === slot.id ? 'selected' : ''}`}
              onClick={() => setSelectedSlot(slot.id)}
            >
              {formatDate(slot.startTime)} {formatTime(slot.startTime)} ({slot.remaining} left)
            </button>
          ))}
        </div>
      </div>

      {selectedSlot && (
        <div className="card">
          <h3>Payment</h3>
          <div className="form-group">
            <label>Payment mode</label>
            <select value={paymentMode} onChange={(e) => setPaymentMode(e.target.value)}>
              <option value="PAY_AFTER">Pay after service (cash/settle later)</option>
              <option value="PAY_NOW">Pay now (mock gateway)</option>
            </select>
          </div>

          {paymentMode === 'PAY_NOW' && (
            <div className="form-group">
              <label>Mock payment token (optional)</label>
              <select value={paymentToken} onChange={(e) => setPaymentToken(e.target.value)}>
                <option value="">Success (default)</option>
                <option value="tok_fail">tok_fail - simulate failure</option>
                <option value="tok_delay">tok_delay - stays pending</option>
              </select>
            </div>
          )}

          {error && <div className="error-banner">{error}</div>}
          {success && <div className="card" style={{ background: '#d1fae5' }}>{success}</div>}

          <button onClick={handleBook} disabled={booking}>
            {booking ? 'Booking...' : `Book for ${(offering?.priceMinorUnits / 100).toFixed(2)} ${offering?.currency}`}
          </button>
        </div>
      )}
    </div>
  );
}
