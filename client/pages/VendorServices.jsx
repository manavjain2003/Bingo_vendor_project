import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { client } from '../api/baseApi';

export default function VendorServices() {
  const [items, setItems] = useState([]);
  const [categories, setCategories] = useState([]);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState('');
  const [error, setError] = useState('');
  const [vendorStatus, setVendorStatus] = useState(null);

  function load() {
    client.get('/services/mine/list').then((res) => setItems(res.data.items));
  }

  useEffect(() => {
    load();
    client.get('/categories').then((res) => setCategories(res.data.items));
    client
      .get('/vendors/me')
      .then((res) => setVendorStatus(res.data.status))
      .catch(() => setVendorStatus('UNKNOWN'));
  }, []);

  async function createService(e) {
    e.preventDefault();
    setError('');
    try {
      await client.post('/services', { title, description, category });
      setTitle('');
      setDescription('');
      setCategory('');
      load();
    } catch (err) {
      setError(err.response?.data?.message || 'Could not create service');
    }
  }

  async function publish(id) {
    setError('');
    try {
      await client.patch(`/services/${id}/publish`);
      load();
    } catch (err) {
      setError(err.response?.data?.message || 'Could not publish');
    }
  }

  const isApproved = vendorStatus === 'APPROVED';

  return (
    <div className="container">
      <h2>My services</h2>

      {vendorStatus && !isApproved && (
        <div className="error-banner">
          Your vendor account is {vendorStatus}. You'll be able to create and publish services once an admin
          approves your account.
        </div>
      )}

      {isApproved && (
        <div className="card">
          <h3>Create a new service</h3>
          {error && <div className="error-banner">{error}</div>}
          <form onSubmit={createService}>
            <div className="form-group">
              <label>Title</label>
              <input value={title} onChange={(e) => setTitle(e.target.value)} required />
            </div>
            <div className="form-group">
              <label>Description</label>
              <textarea value={description} onChange={(e) => setDescription(e.target.value)} />
            </div>
            <div className="form-group">
              <label>Category</label>
              <select value={category} onChange={(e) => setCategory(e.target.value)} required>
                <option value="">Select a category</option>
                {categories.map((c) => (
                  <option key={c._id} value={c._id}>
                    {c.parent ? `${c.parent.name} / ${c.name}` : c.name}
                  </option>
                ))}
              </select>
            </div>
            <button type="submit">Create service</button>
          </form>
        </div>
      )}

      <div className="grid">
        {items.map((service) => (
          <div className="card" key={service._id}>
            <h3>{service.title}</h3>
            <span className={`badge ${service.status}`}>{service.status}</span>
            <p style={{ color: '#6b7280', fontSize: 14 }}>{service.description}</p>
            <div className="actions-row">
              <Link to={`/vendor/services/${service._id}/offerings`}>
                <button className="secondary">Offerings</button>
              </Link>
              <Link to={`/vendor/services/${service._id}/availability`}>
                <button className="secondary">Availability</button>
              </Link>
              {service.status === 'DRAFT' && isApproved && (
                <button onClick={() => publish(service._id)}>Publish</button>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}