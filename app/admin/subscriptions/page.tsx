'use client';

import { useState, useEffect, useCallback } from 'react';
import { usePlans } from '@/hooks/use-plans';
import { authFetch } from '@/lib/client-utils';

interface Subscription {
  _id: string;
  userId: {
    _id: string;
    name: string;
    phone: string;
    hotspotUsername?: string;
    hotspotProfile?: string;
    status: string;
  };
  planId: string;
  status: 'pending' | 'confirmed' | 'rejected';
  confirmedBy?: { name: string };
  confirmedAt?: string;
  createdAt: string;
}

export default function AdminSubscriptionsPage() {
  const [subscriptions, setSubscriptions] = useState<Subscription[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('pending');
  const [processing, setProcessing] = useState<string | null>(null);
  const [deleting, setDeleting] = useState<string | null>(null);
  const [clearing, setClearing] = useState(false);
  const [pendingCount, setPendingCount] = useState(0);
  const { plans } = usePlans();

  const fetchSubscriptions = useCallback(async () => {
    try {
      const res = await authFetch(`/api/subscriptions?status=${filter}`);
      const data = await res.json();
      if (data.success) {
        setSubscriptions(data.data);
      }
    } catch (error) {
      console.error('Error fetching subscriptions:', error);
    } finally {
      setLoading(false);
    }
  }, [filter]);

  const fetchPendingCount = useCallback(async () => {
    try {
      const res = await authFetch('/api/subscriptions?status=pending');
      const data = await res.json();
      if (data.success) setPendingCount(data.data.length);
    } catch { /* ignore */ }
  }, []);

  useEffect(() => {
    fetchSubscriptions();
    fetchPendingCount();
  }, [fetchSubscriptions, fetchPendingCount]);

  const handleAction = async (id: string, action: 'confirm' | 'reject') => {
    const label = action === 'confirm' ? 'confirm and activate' : 'reject';
    if (!confirm(`Are you sure you want to ${label} this request?`)) return;

    setProcessing(id);
    try {
      const res = await authFetch(`/api/subscriptions/${id}`, {
        method: 'PATCH',
        body: JSON.stringify({ action }),
      });
      const data = await res.json();
      if (data.success) {
        fetchSubscriptions();
        fetchPendingCount();
      } else {
        alert(data.error || `Failed to ${action}`);
      }
    } catch {
      alert('Network error');
    } finally {
      setProcessing(null);
    }
  };

  const handleDelete = async (id: string, name: string) => {
    if (!confirm(`Delete subscription from "${name}"? This cannot be undone.`)) return;
    setDeleting(id);
    try {
      const res = await authFetch(`/api/subscriptions/${id}`, { method: 'DELETE' });
      const data = await res.json();
      if (data.success) {
        fetchSubscriptions();
        fetchPendingCount();
      } else {
        alert(data.error || 'Failed to delete');
      }
    } catch {
      alert('Network error');
    } finally {
      setDeleting(null);
    }
  };

  const handleClearAll = async () => {
    const statusLabel = filter === 'all' ? 'ALL' : filter;
    if (!confirm(`Delete all ${statusLabel} subscriptions? This cannot be undone.`)) return;
    setClearing(true);
    try {
      const url = filter === 'all'
        ? '/api/subscriptions'
        : `/api/subscriptions?status=${filter}`;
      const res = await authFetch(url, { method: 'DELETE' });
      const data = await res.json();
      if (data.success) {
        fetchSubscriptions();
        fetchPendingCount();
        alert(`Deleted ${data.data.deletedCount} subscription(s)`);
      } else {
        alert(data.error || 'Failed to clear');
      }
    } catch {
      alert('Network error');
    } finally {
      setClearing(false);
    }
  };

  const handleClearOlderThan = async (days: number) => {
    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() - days);
    if (!confirm(`Delete all subscriptions older than ${days} days?`)) return;
    setClearing(true);
    try {
      const res = await authFetch(
        `/api/subscriptions?olderThan=${cutoff.toISOString()}`,
        { method: 'DELETE' }
      );
      const data = await res.json();
      if (data.success) {
        fetchSubscriptions();
        fetchPendingCount();
        alert(`Deleted ${data.data.deletedCount} subscription(s)`);
      } else {
        alert(data.error || 'Failed to clear');
      }
    } catch {
      alert('Network error');
    } finally {
      setClearing(false);
    }
  };

  const getPlanName = (planId: string) => {
    return plans.find(p => p.planId === planId)?.name || planId;
  };

  const getPlanPrice = (planId: string) => {
    return plans.find(p => p.planId === planId)?.price || 0;
  };

  const statusFilters = [
    { key: 'pending', label: 'Pending' },
    { key: 'confirmed', label: 'Confirmed' },
    { key: 'rejected', label: 'Rejected' },
    { key: 'all', label: 'All' },
  ];

  return (
    <div>
      <div className="flex items-center justify-between mb-8">
        <h1 className="text-2xl font-bold text-gray-900">Subscriptions</h1>
        <div className="flex gap-2">
          <button
            onClick={() => handleClearOlderThan(30)}
            disabled={clearing}
            className="text-sm text-gray-500 hover:text-gray-700 px-3 py-2 rounded-lg hover:bg-gray-100 transition-colors"
          >
            Clear older than 30 days
          </button>
          <button
            onClick={handleClearAll}
            disabled={clearing}
            className="text-sm text-red-500 hover:text-red-700 px-3 py-2 rounded-lg hover:bg-red-50 transition-colors font-medium"
          >
            {clearing ? 'Clearing...' : `Clear ${filter === 'all' ? 'All' : filter}`}
          </button>
        </div>
      </div>

      {/* Filters */}
      <div className="flex gap-2 mb-6">
        {statusFilters.map((f) => (
          <button
            key={f.key}
            onClick={() => { setFilter(f.key); setLoading(true); }}
            className={`px-4 py-2 rounded-xl text-sm font-medium transition-all ${
              filter === f.key
                ? 'bg-primary-600 text-white shadow-lg shadow-primary-500/25'
                : 'bg-white/60 backdrop-blur-sm text-gray-600 hover:bg-white/80 border border-white/40'
            }`}
          >
            {f.label}
            {f.key === 'pending' && pendingCount > 0 && (
              <span className="ml-2 bg-red-500 text-white text-xs font-bold px-2 py-0.5 rounded-full">
                {pendingCount}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* Requests List */}
      <div className="space-y-4">
        {loading ? (
          <div className="flex items-center justify-center h-64">
            <div className="animate-spin rounded-full h-8 w-8 border-4 border-primary-200 border-t-primary-600" />
          </div>
        ) : subscriptions.length === 0 ? (
          <div className="card py-16 text-center text-gray-500">
            <p className="text-4xl mb-3">📋</p>
            <p className="font-medium">No {filter !== 'all' ? filter : ''} requests</p>
          </div>
        ) : (
          subscriptions.map((sub) => (
            <div key={sub._id} className="card">
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-2">
                    <h3 className="font-bold text-gray-900">{sub.userId?.name || 'Unknown'}</h3>
                    <span className={`text-xs px-2 py-1 rounded-full font-medium ${
                      sub.status === 'pending' ? 'bg-yellow-100 text-yellow-800' :
                      sub.status === 'confirmed' ? 'bg-green-100 text-green-800' :
                      'bg-red-100 text-red-800'
                    }`}>
                      {sub.status}
                    </span>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-4 gap-4 text-sm">
                    <div>
                      <p className="text-gray-500">Phone</p>
                      <p className="font-medium">{sub.userId?.phone || '—'}</p>
                    </div>
                    <div>
                      <p className="text-gray-500">Plan</p>
                      <p className="font-medium">{getPlanName(sub.planId)}</p>
                      <p className="text-primary-600 font-bold">GH₵{getPlanPrice(sub.planId).toLocaleString()}</p>
                    </div>
                    <div>
                      <p className="text-gray-500">Account</p>
                      <p className="font-medium">{sub.userId?.hotspotUsername || 'No account'}</p>
                      <span className={`text-xs px-2 py-0.5 rounded ${
                        sub.userId?.status === 'active' ? 'bg-green-100 text-green-700' :
                        sub.userId?.status === 'inactive' ? 'bg-gray-100 text-gray-600' :
                        'bg-red-100 text-red-700'
                      }`}>
                        {sub.userId?.status || 'unknown'}
                      </span>
                    </div>
                    <div>
                      <p className="text-gray-500">Date</p>
                      <p className="font-medium">{new Date(sub.createdAt).toLocaleDateString()}</p>
                      {sub.confirmedAt && (
                        <p className="text-xs text-gray-500">
                          by {sub.confirmedBy?.name}
                        </p>
                      )}
                    </div>
                  </div>
                </div>

                <div className="flex gap-2 ml-4 flex-shrink-0">
                  {sub.status === 'pending' && (
                    <>
                      <button
                        onClick={() => handleAction(sub._id, 'confirm')}
                        disabled={processing === sub._id}
                        className="btn-primary text-sm px-4 py-2"
                      >
                        {processing === sub._id ? '...' : 'Confirm'}
                      </button>
                      <button
                        onClick={() => handleAction(sub._id, 'reject')}
                        disabled={processing === sub._id}
                        className="btn-secondary text-sm px-4 py-2 text-red-600"
                      >
                        Reject
                      </button>
                    </>
                  )}
                  <button
                    onClick={() => handleDelete(sub._id, sub.userId?.name || 'Unknown')}
                    disabled={deleting === sub._id}
                    className="text-gray-300 hover:text-red-500 p-2 rounded-lg hover:bg-red-50 transition-colors"
                    title="Delete"
                  >
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                    </svg>
                  </button>
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
