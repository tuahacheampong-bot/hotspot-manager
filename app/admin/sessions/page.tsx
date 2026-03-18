'use client';

import { useState, useEffect, useCallback } from 'react';
import { formatBytes, authFetch } from '@/lib/client-utils';

interface ActiveSession {
  id: string;
  username: string;
  ipAddress: string;
  macAddress: string;
  uptime: string;
  bytesIn: number;
  bytesOut: number;
  totalMB: string;
  loginBy: string;
  dbUser: {
    id: string;
    name: string;
    phone: string;
    profile: string;
    status: string;
    expiresAt: string;
  } | null;
}

export default function AdminSessionsPage() {
  const [sessions, setSessions] = useState<ActiveSession[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchSessions = useCallback(async () => {
    try {
      const res = await authFetch('/api/hotspot/sessions');
      const data = await res.json();
      if (data.success) {
        setSessions(data.data);
      }
    } catch (error) {
      console.error('Error fetching sessions:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchSessions();
    // Auto-refresh every 30 seconds
    const interval = setInterval(fetchSessions, 30000);
    return () => clearInterval(interval);
  }, [fetchSessions]);

  return (
    <div>
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Active Sessions</h1>
          <p className="text-sm text-gray-500 mt-1">
            Live from MikroTik — auto-refreshes every 30s
          </p>
        </div>
        <div className="flex items-center gap-3">
          <span className="flex items-center gap-2 text-sm text-green-600">
            <span className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
            {sessions.length} active
          </span>
          <button onClick={fetchSessions} className="btn-secondary text-sm">
            Refresh
          </button>
        </div>
      </div>

      {/* Sessions Table */}
      <div className="card">
        {loading ? (
          <div className="flex items-center justify-center h-64">
            <div className="animate-spin rounded-full h-8 w-8 border-4 border-primary-200 border-t-primary-600" />
          </div>
        ) : sessions.length === 0 ? (
          <div className="py-16 text-center text-gray-500">
            <p className="text-4xl mb-3">📡</p>
            <p className="font-medium">No active sessions</p>
            <p className="text-sm mt-1">Users will appear here when they connect to the hotspot</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="text-left text-sm text-gray-500 border-b">
                  <th className="pb-3 pr-4">User</th>
                  <th className="pb-3 pr-4">IP Address</th>
                  <th className="pb-3 pr-4">MAC Address</th>
                  <th className="pb-3 pr-4">Plan</th>
                  <th className="pb-3 pr-4">Uptime</th>
                  <th className="pb-3 pr-4">Data Used</th>
                  <th className="pb-3">Login</th>
                </tr>
              </thead>
              <tbody>
                {sessions.map((session) => (
                  <tr key={session.id} className="border-b last:border-0">
                    <td className="py-4 pr-4">
                      <div>
                        <p className="font-medium text-gray-900">
                          {session.dbUser?.name || session.username}
                        </p>
                        <p className="text-xs text-gray-500">
                          @{session.username}
                          {session.dbUser?.phone && ` · ${session.dbUser.phone}`}
                        </p>
                      </div>
                    </td>
                    <td className="py-4 pr-4 font-mono text-sm">{session.ipAddress}</td>
                    <td className="py-4 pr-4 font-mono text-sm text-gray-500">
                      {session.macAddress}
                    </td>
                    <td className="py-4 pr-4">
                      <span className="text-sm font-medium capitalize">
                        {session.dbUser?.profile || '—'}
                      </span>
                    </td>
                    <td className="py-4 pr-4 text-sm">{session.uptime}</td>
                    <td className="py-4 pr-4">
                      <div>
                        <p className="text-sm font-medium">{formatBytes(session.bytesIn + session.bytesOut)}</p>
                        <p className="text-xs text-gray-500">
                          ↓ {formatBytes(session.bytesIn)} ↑ {formatBytes(session.bytesOut)}
                        </p>
                      </div>
                    </td>
                    <td className="py-4">
                      <span className="text-xs px-2 py-1 bg-gray-100 rounded-full text-gray-600">
                        {session.loginBy || 'unknown'}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
