import { useEffect, useState } from 'react';
import { client } from '../api/baseApi';

export default function AdminVendors() {
  const [items, setItems] = useState([]);
  const [statusFilter, setStatusFilter] = useState('PENDING');
  const [error, setError] = useState('');

  function load() {
    client.get('/vendors', { params: { status: statusFilter || undefined } }).then((res) => setItems(res.data.items));
  }

  useEffect(() => {
    load();
  }, [statusFilter]);

  async function approve(id) {
    setError('');
    try {
      await client.patch(`/vendors/${id}/approve`);
      load();
    } catch (err) {
      setError(err.response?.data?.error?.message || 'Could not approve');
    }
  }

  async function reject(id) {
    const reason = window.prompt('Reason for rejection:');
    if (!reason) return;
    setError('');
    try {
      await client.patch(`/vendors/${id}/reject`, { reason });
      load();
    } catch (err) {
      setError(err.response?.data?.error?.message || 'Could not reject');
    }
  }

  return (
    <div className="container">
      <h2>Vendor applications</h2>

      <div className="tabs">
        {['PENDING', 'APPROVED', 'REJECTED', ''].map((s) => (
          <button key={s} className={statusFilter === s ? 'active' : ''} onClick={() => setStatusFilter(s)}>
            {s || 'All'}
          </button>
        ))}
      </div>

      {error && <div className="error-banner">{error}</div>}
      {items.length === 0 && <div className="empty-state">No vendors in this state.</div>}

      {items.map((profile) => (
        <div className="card" key={profile._id}>
          <strong>{profile.businessName}</strong> <span className={`badge ${profile.status}`}>{profile.status}</span>
          <p style={{ color: '#6b7280', fontSize: 14 }}>
            {profile.user?.name} - {profile.user?.email}
          </p>
          <p style={{ fontSize: 13 }}>{profile.address}</p>
          {profile.rejectionReason && <p style={{ color: '#991b1b', fontSize: 13 }}>Reason: {profile.rejectionReason}</p>}
          {profile.status === 'PENDING' && (
            <div className="actions-row">
              <button onClick={() => approve(profile._id)}>Approve</button>
              <button className="danger" onClick={() => reject(profile._id)}>
                Reject
              </button>
            </div>
          )}
        </div>
      ))}
    </div>
  );
}