import { useEffect, useState } from 'react';
import { client } from '../api/baseApi';
import BookingCard from '../components/BookingCard';

export default function VendorBookings() {
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

  async function act(id, action) {
    setError('');
    try {
      await client.patch(`/bookings/${id}/${action}`, {});
      load();
    } catch (err) {
      setError(err.response?.data?.message || `Could not ${action}`);
    }
  }

  async function markCollected(id) {
    setError('');
    try {
      await client.patch(`/bookings/${id}/payment-collected`, {});
      load();
    } catch (err) {
      setError(err.response?.data?.message || 'Could not mark collected');
    }
  }

  function actionsFor(booking) {
    const buttons = [];
    if (booking.status === 'PENDING') {
      buttons.push(
        <button key="confirm" onClick={() => act(booking._id, 'confirm')}>
          Confirm
        </button>
      );
      buttons.push(
        <button key="reject" className="secondary" onClick={() => act(booking._id, 'reject')}>
          Reject
        </button>
      );
    }
    if (booking.status === 'CONFIRMED') {
      buttons.push(
        <button key="complete" onClick={() => act(booking._id, 'complete')}>
          Mark complete
        </button>
      );
      buttons.push(
        <button key="noshow" className="secondary" onClick={() => act(booking._id, 'no-show')}>
          Mark no-show
        </button>
      );
    }
    if (['PENDING', 'CONFIRMED'].includes(booking.status)) {
      buttons.push(
        <button key="cancel" className="danger" onClick={() => act(booking._id, 'cancel')}>
          Cancel
        </button>
      );
    }
    if (booking.paymentMode === 'PAY_AFTER' && !booking.paymentCollected) {
      buttons.push(
        <button key="collected" className="secondary" onClick={() => markCollected(booking._id)}>
          Mark payment collected
        </button>
      );
    }
    return buttons;
  }

  return (
    <div className="container">
      <h2>Bookings for my services</h2>

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
        <BookingCard key={booking._id} booking={booking} actions={actionsFor(booking)} />
      ))}
    </div>
  );
}