import { useEffect, useMemo, useState } from 'react';
import { PageHeader } from '../components/PageHeader';
import { DataTable } from '../components/DataTable';
import { getAuditLogs } from '../services/api';
import { useAuth } from '../context/AuthContext';

const ACTIONS = ['CREATE', 'UPDATE', 'DELETE', 'VIEW', 'LOGIN', 'LOGOUT'];

export function AuditLogsPage() {
  const { token, user } = useAuth();
  const [filters, setFilters] = useState({ action: '', entityType: '', userId: '' });
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const columns = useMemo(
    () => [
      { header: 'Timestamp', accessor: 'timestamp', cell: (row) => new Date(row.timestamp).toLocaleString() },
      { header: 'User', accessor: 'userId' },
      { header: 'Role', accessor: 'userRole' },
      { header: 'Action', accessor: 'action' },
      { header: 'Entity', accessor: 'entityType' },
      { header: 'Entity ID', accessor: 'entityId' },
      { header: 'IP Address', accessor: 'ipAddress' }
    ],
    []
  );

  const loadLogs = async (options = {}) => {
    if (!token) return;
    setLoading(true);
    setError(null);
    try {
      const params = {
        action: options.action ?? (filters.action || undefined),
        entityType: options.entityType ?? (filters.entityType || undefined),
        userId: options.userId ?? (filters.userId || undefined),
        pageSize: 100
      };
      const response = await getAuditLogs(params, token);
      setLogs(response?.data ?? []);
    } catch (err) {
      console.error('Failed to load audit logs', err);
      setError(err?.details?.message || err?.message || 'Failed to load audit logs');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadLogs();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token]);

  const handleFilterChange = (field, value) => {
    setFilters((prev) => ({ ...prev, [field]: value }));
    loadLogs({ [field]: value || undefined });
  };

  return (
    <div className="page-stack">
      <PageHeader
        title="Audit Logs"
        subtitle="System Activity"
        action={
          <div className="page-filters">
            <label>
              Action
              <select value={filters.action} onChange={(event) => handleFilterChange('action', event.target.value)}>
                <option value="">All</option>
                {ACTIONS.map((action) => (
                  <option key={action} value={action}>
                    {action}
                  </option>
                ))}
              </select>
            </label>
            <label>
              Entity
              <input
                type="text"
                placeholder="e.g. Patient"
                value={filters.entityType}
                onChange={(event) => handleFilterChange('entityType', event.target.value)}
              />
            </label>
            <label>
              User ID
              <input
                type="text"
                placeholder={user?.id}
                value={filters.userId}
                onChange={(event) => handleFilterChange('userId', event.target.value)}
              />
            </label>
          </div>
        }
      />

      {error ? (
        <div className="panel panel--error">
          <h2 className="panel__title">{error}</h2>
        </div>
      ) : null}

      <div className="panel">
        <DataTable columns={columns} rows={logs} isLoading={loading} />
      </div>
    </div>
  );
}
