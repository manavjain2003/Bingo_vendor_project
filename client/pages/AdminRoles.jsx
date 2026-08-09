import { useEffect, useState } from 'react';
import { client } from '../api/client';

export default function AdminRoles() {
  const [roles, setRoles] = useState([]);
  const [availablePermissions, setAvailablePermissions] = useState([]);
  const [name, setName] = useState('');
  const [selectedPermissions, setSelectedPermissions] = useState([]);
  const [error, setError] = useState('');

  function load() {
    client.get('/roles').then((res) => {
      setRoles(res.data.items);
      setAvailablePermissions(res.data.availablePermissions);
    });
  }

  useEffect(() => {
    load();
  }, []);

  function togglePermission(perm) {
    setSelectedPermissions((prev) => (prev.includes(perm) ? prev.filter((p) => p !== perm) : [...prev, perm]));
  }

  async function createRole(e) {
    e.preventDefault();
    setError('');
    try {
      await client.post('/roles', { name, permissions: selectedPermissions });
      setName('');
      setSelectedPermissions([]);
      load();
    } catch (err) {
      setError(err.response?.data?.error?.message || 'Could not create role');
    }
  }

  return (
    <div className="container">
      <h2>Roles & permissions</h2>

      <div className="card">
        <h3>Create a new role</h3>
        {error && <div className="error-banner">{error}</div>}
        <form onSubmit={createRole}>
          <div className="form-group">
            <label>Role name</label>
            <input value={name} onChange={(e) => setName(e.target.value)} required />
          </div>
          <div className="form-group">
            <label>Permissions</label>
            <div style={{ maxHeight: 220, overflowY: 'auto', border: '1px solid #e5e7eb', borderRadius: 6, padding: 10 }}>
              {availablePermissions.map((perm) => (
                <label key={perm} style={{ display: 'block', fontWeight: 400, fontSize: 13 }}>
                  <input
                    type="checkbox"
                    style={{ width: 'auto', marginRight: 6 }}
                    checked={selectedPermissions.includes(perm)}
                    onChange={() => togglePermission(perm)}
                  />
                  {perm}
                </label>
              ))}
            </div>
          </div>
          <button type="submit">Create role</button>
        </form>
      </div>

      {roles.map((role) => (
        <div className="card" key={role._id}>
          <strong>{role.name}</strong> {role.isSystem && <span className="badge SUSPENDED">system</span>}
          <p style={{ fontSize: 13, color: '#6b7280' }}>{role.permissions.join(', ')}</p>
        </div>
      ))}
    </div>
  );
}
