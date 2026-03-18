'use client';

import { useState, useEffect, useCallback } from 'react';
import { usePlans, type Plan } from '@/hooks/use-plans';
import { authFetch } from '@/lib/client-utils';

interface Voucher {
  _id: string;
  code: string;
  profile: string;
  status: string;
  createdAt: string;
  usedAt?: string;
}

export default function AdminVouchersPage() {
  const { plans } = usePlans();
  const [vouchers, setVouchers] = useState<Voucher[]>([]);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [form, setForm] = useState({ profile: '1-day' as string, quantity: 1 });
  const [error, setError] = useState('');

  const fetchVouchers = useCallback(async () => {
    try {
      const res = await authFetch('/api/vouchers');
      const data = await res.json();
      if (data.success) {
        setVouchers(data.data);
      }
    } catch (error) {
      console.error('Error fetching vouchers:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  const handleDelete = async (id: string, code: string) => {
    if (!confirm(`Delete voucher "${code}"? This cannot be undone.`)) return;
    try {
      const res = await authFetch(`/api/vouchers/${id}`, {
        method: 'DELETE',
      });
      const data = await res.json();
      if (data.success) {
        fetchVouchers();
      } else {
        alert(data.error || 'Failed to delete voucher');
      }
    } catch {
      alert('Network error');
    }
  };

  useEffect(() => {
    fetchVouchers();
  }, [fetchVouchers]);

  const handleGenerate = async (e: React.FormEvent) => {
    e.preventDefault();
    setGenerating(true);
    setError('');

    try {
      const res = await authFetch('/api/vouchers/generate', {
        method: 'POST',
        body: JSON.stringify(form),
      });
      const data = await res.json();

      if (data.success) {
        fetchVouchers();
      } else {
        setError(data.error || 'Failed to generate vouchers');
      }
    } catch {
      setError('Network error');
    } finally {
      setGenerating(false);
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'unused': return 'badge-success';
      case 'used': return 'badge-info';
      case 'expired': return 'badge-danger';
      default: return 'badge-warning';
    }
  };

  return (
    <div>
      <h1 className="text-2xl font-bold text-gray-900 mb-8">Voucher Management</h1>

      {/* Generate Vouchers */}
      <div className="card mb-8">
        <h2 className="text-lg font-bold text-gray-900 mb-4">Generate Vouchers</h2>
        <form onSubmit={handleGenerate} className="flex flex-wrap gap-4 items-end">
          <div>
            <label className="label">Plan</label>
            <select
              value={form.profile}
              onChange={(e) => setForm({ ...form, profile: e.target.value as string })}
              className="input-field"
            >
              {plans.map((p) => (
                <option key={p.planId} value={p.planId}>{p.name}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="label">Quantity</label>
            <input
              type="number"
              min={1}
              max={100}
              value={form.quantity}
              onChange={(e) => setForm({ ...form, quantity: parseInt(e.target.value) || 1 })}
              className="input-field w-24"
            />
          </div>
          <button type="submit" disabled={generating} className="btn-primary">
            {generating ? 'Generating...' : 'Generate'}
          </button>
        </form>
        {error && <p className="text-red-600 text-sm mt-3">{error}</p>}
      </div>

      {/* Vouchers Table */}
      <div className="card">
        <h2 className="text-lg font-bold text-gray-900 mb-4">All Vouchers</h2>
        {loading ? (
          <div className="flex items-center justify-center h-32">
            <div className="animate-spin rounded-full h-8 w-8 border-4 border-primary-200 border-t-primary-600" />
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="text-left text-sm text-gray-500 border-b">
                  <th className="pb-3 pr-4">Code</th>
                  <th className="pb-3 pr-4">Plan</th>
                  <th className="pb-3 pr-4">Status</th>
                  <th className="pb-3 pr-4">Created</th>
                  <th className="pb-3 pr-4">Used</th>
                  <th className="pb-3">Actions</th>
                </tr>
              </thead>
              <tbody>
                {vouchers.map((v) => (
                  <tr key={v._id} className="border-b last:border-0">
                    <td className="py-3 pr-4">
                      <code className="bg-gray-100 px-3 py-1 rounded font-mono text-sm font-bold">
                        {v.code}
                      </code>
                    </td>
                    <td className="py-3 pr-4 text-sm">
                      {plans.find(p => p.planId === v.profile)?.name || v.profile}
                    </td>
                    <td className="py-3 pr-4">
                      <span className={getStatusBadge(v.status)}>{v.status}</span>
                    </td>
                    <td className="py-3 pr-4 text-sm text-gray-500">
                      {new Date(v.createdAt).toLocaleDateString()}
                    </td>
                    <td className="py-3 text-sm text-gray-500">
                      {v.usedAt ? new Date(v.usedAt).toLocaleDateString() : '—'}
                    </td>
                    <td className="py-3">
                      <button
                        onClick={() => handleDelete(v._id, v.code)}
                        className="text-sm text-red-600 hover:text-red-800"
                      >
                        Remove
                      </button>
                    </td>
                  </tr>
                ))}
                {vouchers.length === 0 && (
                  <tr>
                    <td colSpan={6} className="py-12 text-center text-gray-500">
                      No vouchers yet. Generate some above.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
