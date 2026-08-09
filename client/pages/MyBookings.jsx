import { useEffect, useState } from 'react';
import { client } from '../api/baseApi';
import BookingCard from '../components/BookingCard';

export default function MyBookings() {
  const [items, setItems] = useState([]);
  const [statusFilter, setStatusFilter] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);

  function load() {
    setLoading(true);
    client
      .get('/bookings', { params: { status: statusFilter || undefined } })
      .then((res) => setItems(res.data.items))
      .finally(() => setLoading(false));
  }

  useEffect(() => {
    load();
  }, [statusFilter]);

  async function cancelBooking(id) {
    setError('');
    try {
      await client.patch(`/bookings/${id}/cancel`, { reason: 'Customer requested cancellation' });
      load();
    } catch (err) {
      setError(err.response?.data?.error?.message || 'Could not cancel');
    }
  }

  return (
    <div className="container">
      <h2>My bookings</h2>

      <div className="tabs">
        {['', 'PENDING', 'CONFIRMED', 'COMPLETED', 'CANCELLED', 'REJECTED', 'NO_SHOW'].map((s) => (
          <button key={s} className={statusFilter === s ? 'active' : ''} onClick={() => setStatusFilter(s)}>
            {s || 'All'}
          </button>
        ))}
      </div>

      {error && <div className="error-banner">{error}</div>}
      {loading && <p>Loading...</p>}
      {!loading && items.length === 0 && <div className="empty-state">No bookings yet.</div>}

      {items.map((booking) => (
        <BookingCard
          key={booking._id}
          booking={booking}
          actions={
            ['PENDING', 'CONFIRMED'].includes(booking.status) && (
              <button className="danger" onClick={() => cancelBooking(booking._id)}>
                Cancel booking
              </button>
            )
          }
        />
      ))}
    </div>
  );
}
