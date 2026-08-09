import { useState } from 'react';

function formatDateTime(date) {
  return new Date(date).toLocaleString();
}

export default function BookingCard({ booking, actions, onReschedule }) {
  const [showTimeline, setShowTimeline] = useState(false);

  return (
    <div className="card">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <strong>Booking #{booking._id.slice(-6)}</strong>{' '}
          <span className={`badge ${booking.status}`}>{booking.status}</span>
        </div>
        <div>{(booking.priceMinorUnits / 100).toFixed(2)} {booking.currency}</div>
      </div>

      <p style={{ color: '#6b7280', fontSize: 13, marginBottom: 4 }}>
        Payment: {booking.paymentMode} {booking.paymentCollected ? '(collected)' : ''}
      </p>

      <div className="actions-row">{actions}</div>

      <button className="secondary" style={{ marginTop: 10 }} onClick={() => setShowTimeline(!showTimeline)}>
        {showTimeline ? 'Hide timeline' : 'Show timeline'}
      </button>

      {showTimeline && (
        <div className="timeline">
          {booking.history.map((entry, idx) => (
            <div className="timeline-entry" key={idx}>
              <div>
                {entry.from || 'created'} &rarr; {entry.to} by {entry.actorRole}
                {entry.reason ? ` (${entry.reason})` : ''}
              </div>
              <div className="time">{formatDateTime(entry.at)}</div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
