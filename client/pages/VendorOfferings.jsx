import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { client } from '../api/baseApi';

export default function VendorOfferings() {
  const { serviceId } = useParams();
  const [items, setItems] = useState([]);
  const [name, setName] = useState('');
  const [durationMinutes, setDurationMinutes] = useState(30);
  const [price, setPrice] = useState('');
  const [error, setError] = useState('');

  function load() {
    client.get(`/services/${serviceId}/offerings`).then((res) => setItems(res.data.items));
  }

  useEffect(() => {
    load();
  }, [serviceId]);

  async function createOffering(e) {
    e.preventDefault();
    setError('');
    try {
      await client.post(`/services/${serviceId}/offerings`, {
        name,
        durationMinutes: Number(durationMinutes),
        priceMinorUnits: Math.round(Number(price) * 100),
        currency: 'INR',
      });
      setName('');
      setPrice('');
      load();
    } catch (err) {
      setError(err.response?.data?.message || 'Could not create offering');
    }
  }

  async function toggleActive(offering) {
    setError('');
    try {
      await client.patch(`/services/offerings/${offering._id}`, { active: !offering.active });
      load();
    } catch (err) {
      setError(err.response?.data?.message || 'Could not update offering');
    }
  }

  return (
    <div className="container">
      <h2>Offerings</h2>

      <div className="card">
        <h3>Add an offering</h3>
        {error && <div className="error-banner">{error}</div>}
        <form onSubmit={createOffering}>
          <div className="form-group">
            <label>Name</label>
            <input value={name} onChange={(e) => setName(e.target.value)} required />
          </div>
          <div className="form-group">
            <label>Duration (minutes)</label>
            <input type="number" min="5" value={durationMinutes} onChange={(e) => setDurationMinutes(e.target.value)} required />
          </div>
          <div className="form-group">
            <label>Price (in main currency units, e.g. 400 for &#8377;400)</label>
            <input type="number" min="0" step="0.01" value={price} onChange={(e) => setPrice(e.target.value)} required />
          </div>
          <button type="submit">Add offering</button>
        </form>
      </div>

      {items.map((offering) => (
        <div className="card" key={offering._id}>
          <strong>{offering.name}</strong> - {offering.durationMinutes} min -{' '}
          {(offering.priceMinorUnits / 100).toFixed(2)} {offering.currency}
          <span className={`badge ${offering.active ? 'PUBLISHED' : 'SUSPENDED'}`} style={{ marginLeft: 10 }}>
            {offering.active ? 'active' : 'inactive'}
          </span>
          <div className="actions-row">
            <button className="secondary" onClick={() => toggleActive(offering)}>
              {offering.active ? 'Deactivate' : 'Activate'}
            </button>
          </div>
        </div>
      ))}
    </div>
  );
}