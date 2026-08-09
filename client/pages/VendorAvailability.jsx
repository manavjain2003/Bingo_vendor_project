import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { client } from '../api/baseApi';

const WEEKDAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

export default function VendorAvailability() {
  const { serviceId } = useParams();
  const [rules, setRules] = useState([]);
  const [exceptions, setExceptions] = useState([]);
  const [weekday, setWeekday] = useState(1);
  const [startTime, setStartTime] = useState('09:00');
  const [endTime, setEndTime] = useState('17:00');
  const [capacity, setCapacity] = useState(1);
  const [exceptionDate, setExceptionDate] = useState('');
  const [exceptionClosed, setExceptionClosed] = useState(true);
  const [error, setError] = useState('');

  function load() {
    client.get(`/services/${serviceId}/rules`).then((res) => setRules(res.data.items));
    client.get(`/services/${serviceId}/exceptions`).then((res) => setExceptions(res.data.items));
  }

  useEffect(() => {
    load();
  }, [serviceId]);

  async function addRule(e) {
    e.preventDefault();
    setError('');
    try {
      await client.post(`/services/${serviceId}/rules`, {
        weekday: Number(weekday),
        startTime,
        endTime,
        capacity: Number(capacity),
      });
      load();
    } catch (err) {
      setError(err.response?.data?.error?.message || 'Could not add rule');
    }
  }

  async function deleteRule(id) {
    await client.delete(`/services/rules/${id}`);
    load();
  }

  async function addException(e) {
    e.preventDefault();
    setError('');
    try {
      await client.put(`/services/${serviceId}/exceptions`, {
        date: exceptionDate,
        closed: exceptionClosed,
        windows: [],
      });
      load();
    } catch (err) {
      setError(err.response?.data?.error?.message || 'Could not add exception');
    }
  }

  async function deleteException(id) {
    await client.delete(`/services/exceptions/${id}`);
    load();
  }

  return (
    <div className="container">
      <h2>Availability</h2>
      {error && <div className="error-banner">{error}</div>}

      <div className="card">
        <h3>Weekly opening hours</h3>
        <form onSubmit={addRule}>
          <div className="form-group">
            <label>Day of week</label>
            <select value={weekday} onChange={(e) => setWeekday(e.target.value)}>
              {WEEKDAYS.map((day, idx) => (
                <option key={idx} value={idx}>
                  {day}
                </option>
              ))}
            </select>
          </div>
          <div className="form-group">
            <label>Start time</label>
            <input type="time" value={startTime} onChange={(e) => setStartTime(e.target.value)} />
          </div>
          <div className="form-group">
            <label>End time</label>
            <input type="time" value={endTime} onChange={(e) => setEndTime(e.target.value)} />
          </div>
          <div className="form-group">
            <label>Capacity per slot</label>
            <input type="number" min="1" value={capacity} onChange={(e) => setCapacity(e.target.value)} />
          </div>
          <button type="submit">Add window</button>
        </form>

        <table style={{ marginTop: 14 }}>
          <thead>
            <tr>
              <th>Day</th>
              <th>Window</th>
              <th>Capacity</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {rules.map((rule) => (
              <tr key={rule._id}>
                <td>{WEEKDAYS[rule.weekday]}</td>
                <td>{rule.startTime} - {rule.endTime}</td>
                <td>{rule.capacity}</td>
                <td>
                  <button className="secondary" onClick={() => deleteRule(rule._id)}>
                    Remove
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="card">
        <h3>Date exceptions (holidays, closures)</h3>
        <form onSubmit={addException}>
          <div className="form-group">
            <label>Date</label>
            <input type="date" value={exceptionDate} onChange={(e) => setExceptionDate(e.target.value)} required />
          </div>
          <div className="form-group">
            <label>
              <input
                type="checkbox"
                style={{ width: 'auto', marginRight: 6 }}
                checked={exceptionClosed}
                onChange={(e) => setExceptionClosed(e.target.checked)}
              />
              Closed all day
            </label>
          </div>
          <button type="submit">Add exception</button>
        </form>

        <table style={{ marginTop: 14 }}>
          <thead>
            <tr>
              <th>Date</th>
              <th>Closed</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {exceptions.map((ex) => (
              <tr key={ex._id}>
                <td>{ex.date}</td>
                <td>{ex.closed ? 'Yes' : 'No'}</td>
                <td>
                  <button className="secondary" onClick={() => deleteException(ex._id)}>
                    Remove
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
