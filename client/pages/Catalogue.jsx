import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { client } from '../api/baseApi';

export default function Catalogue() {
  const [items, setItems] = useState([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [q, setQ] = useState('');
  const [categories, setCategories] = useState([]);
  const [category, setCategory] = useState('');
  const [loading, setLoading] = useState(true);
  const limit = 9;

  useEffect(() => {
    client.get('/categories').then((res) => setCategories(res.data.items));
  }, []);

  useEffect(() => {
    setLoading(true);
    client
      .get('/services', { params: { q: q || undefined, category: category || undefined, page, limit } })
      .then((res) => {
        setItems(res.data.items);
        setTotal(res.data.total);
      })
      .finally(() => setLoading(false));
  }, [q, category, page]);

  const totalPages = Math.max(1, Math.ceil(total / limit));

  return (
    <div className="container">
      <h2>Browse services</h2>

      <div className="card" style={{ display: 'flex', gap: 10 }}>
        <input
          placeholder="Search services..."
          value={q}
          onChange={(e) => {
            setPage(1);
            setQ(e.target.value);
          }}
        />
        <select
          value={category}
          onChange={(e) => {
            setPage(1);
            setCategory(e.target.value);
          }}
        >
          <option value="">All categories</option>
          {categories.map((c) => (
            <option key={c._id} value={c._id}>
              {c.parent ? `${c.parent.name} / ${c.name}` : c.name}
            </option>
          ))}
        </select>
      </div>

      {loading && <p>Loading...</p>}
      {!loading && items.length === 0 && <div className="empty-state">No services found.</div>}

      <div className="grid">
        {items.map((service) => (
          <div className="card" key={service._id}>
            <h3>{service.title}</h3>
            <p style={{ color: '#6b7280', fontSize: 14 }}>{service.description}</p>
            <span className="badge PUBLISHED">{service.category?.name}</span>
            <div style={{ marginTop: 12 }}>
              <Link to={`/services/${service._id}`}>
                <button>View & book</button>
              </Link>
            </div>
          </div>
        ))}
      </div>

      {totalPages > 1 && (
        <div className="pagination">
          <button className="secondary" disabled={page <= 1} onClick={() => setPage(page - 1)}>
            Previous
          </button>
          <span>
            Page {page} of {totalPages}
          </span>
          <button className="secondary" disabled={page >= totalPages} onClick={() => setPage(page + 1)}>
            Next
          </button>
        </div>
      )}
    </div>
  );
}
