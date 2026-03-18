'use client';

import { useState, useEffect, useCallback } from 'react';
import { authFetch } from '@/lib/client-utils';

interface Plan {
  _id: string;
  planId: string;
  name: string;
  description: string;
  duration: string;
  dataLimit: string;
  price: number;
  currency: string;
  features: string[];
  popular: boolean;
  active: boolean;
  uptimeLimit?: string;
}

const emptyForm = {
  planId: '',
  name: '',
  description: '',
  duration: '',
  dataLimit: '',
  price: 0,
  currency: 'GHS',
  features: '',
  popular: false,
  active: true,
  uptimeLimit: '',
};

type PlanForm = typeof emptyForm;

export default function AdminPlansPage() {
  const [plans, setPlans] = useState<Plan[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [showCreate, setShowCreate] = useState(false);
  const [form, setForm] = useState<PlanForm>(emptyForm);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const fetchPlans = useCallback(async () => {
    try {
      const res = await authFetch('/api/plans');
      const data = await res.json();
      if (data.success) {
        setPlans(data.data);
      }
    } catch (err) {
      console.error('Error fetching plans:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchPlans();
  }, [fetchPlans]);

  const startEdit = (plan: Plan & { uptimeLimit?: string }) => {
    setEditingId(plan._id);
    setShowCreate(false);
    setForm({
      planId: plan.planId,
      name: plan.name,
      description: plan.description,
      duration: plan.duration,
      dataLimit: plan.dataLimit,
      price: plan.price,
      currency: plan.currency,
      features: plan.features.join(', '),
      popular: plan.popular,
      active: plan.active,
      uptimeLimit: plan.uptimeLimit || '',
    });
    setError('');
  };

  const startCreate = () => {
    setShowCreate(true);
    setEditingId(null);
    setForm(emptyForm);
    setError('');
  };

  const cancelEdit = () => {
    setEditingId(null);
    setShowCreate(false);
    setForm(emptyForm);
    setError('');
  };

  const handleSave = async () => {
    setSaving(true);
    setError('');

    const payload = {
      ...form,
      price: Number(form.price),
      uptimeLimit: form.uptimeLimit || '0s',
      features: form.features
        .split(',')
        .map((f) => f.trim())
        .filter(Boolean),
    };

    try {
      let res: Response;

      if (showCreate) {
        res = await authFetch('/api/plans', {
          method: 'POST',
          body: JSON.stringify(payload),
        });
      } else {
        res = await authFetch(`/api/plans/${editingId}`, {
          method: 'PATCH',
          body: JSON.stringify(payload),
        });
      }

      const data = await res.json();
      if (data.success) {
        cancelEdit();
        fetchPlans();
      } else {
        setError(data.error || 'Failed to save');
      }
    } catch {
      setError('Network error');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string, name: string) => {
    if (!confirm(`Delete plan "${name}"? This cannot be undone.`)) return;
    try {
      const res = await authFetch(`/api/plans/${id}`, {
        method: 'DELETE',
      });
      const data = await res.json();
      if (data.success) {
        fetchPlans();
      } else {
        alert(data.error || 'Failed to delete plan');
      }
    } catch {
      alert('Network error');
    }
  };

  const handleToggle = async (id: string, field: 'active' | 'popular', value: boolean) => {
    try {
      await authFetch(`/api/plans/${id}`, {
        method: 'PATCH',
        body: JSON.stringify({ [field]: value }),
      });
      fetchPlans();
    } catch {
      // silently fail
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-4 border-primary-200 border-t-primary-600" />
      </div>
    );
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-8">
        <h1 className="text-2xl font-bold text-gray-900">Subscription Plans</h1>
        {!showCreate && !editingId && (
          <button onClick={startCreate} className="btn-primary">
            + Add Plan
          </button>
        )}
      </div>

      {/* Create / Edit Form */}
      {(showCreate || editingId) && (
        <div className="card mb-8">
          <h2 className="text-lg font-bold text-gray-900 mb-4">
            {showCreate ? 'Create New Plan' : 'Edit Plan'}
          </h2>
          {error && <div className="bg-red-50 text-red-700 p-3 rounded-lg text-sm mb-4">{error}</div>}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
            {showCreate && (
              <div>
                <label className="label">Plan ID</label>
                <input
                  type="text"
                  value={form.planId}
                  onChange={(e) => setForm({ ...form, planId: e.target.value })}
                  className="input-field"
                  placeholder="e.g. 30-day"
                />
              </div>
            )}
            <div>
              <label className="label">Name</label>
              <input
                type="text"
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                className="input-field"
              />
            </div>
            <div>
              <label className="label">Price (GH₵)</label>
              <input
                type="number"
                min={0}
                value={form.price}
                onChange={(e) => setForm({ ...form, price: Number(e.target.value) })}
                className="input-field"
              />
            </div>
            <div>
              <label className="label">Duration</label>
              <input
                type="text"
                value={form.duration}
                onChange={(e) => setForm({ ...form, duration: e.target.value })}
                className="input-field"
                placeholder="e.g. 30 days"
              />
            </div>
            <div>
              <label className="label">Data Limit</label>
              <input
                type="text"
                value={form.dataLimit}
                onChange={(e) => setForm({ ...form, dataLimit: e.target.value })}
                className="input-field"
                placeholder="e.g. 100GB or Unlimited"
              />
            </div>
            <div>
              <label className="label">MikroTik Uptime Limit</label>
              <input
                type="text"
                value={form.uptimeLimit}
                onChange={(e) => setForm({ ...form, uptimeLimit: e.target.value })}
                className="input-field"
                placeholder="e.g. 1d0h, 7d0h, 0s for unlimited"
              />
            </div>
            <div className="md:col-span-2">
              <label className="label">Description</label>
              <input
                type="text"
                value={form.description}
                onChange={(e) => setForm({ ...form, description: e.target.value })}
                className="input-field"
              />
            </div>
            <div className="md:col-span-2">
              <label className="label">Features (comma-separated)</label>
              <input
                type="text"
                value={form.features}
                onChange={(e) => setForm({ ...form, features: e.target.value })}
                className="input-field"
                placeholder="e.g. 30-day access, 150GB data cap, 10Mbps speed"
              />
            </div>
            <div className="flex items-center gap-6">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={form.popular}
                  onChange={(e) => setForm({ ...form, popular: e.target.checked })}
                  className="w-4 h-4"
                />
                <span className="text-sm font-medium">Popular</span>
              </label>
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={form.active}
                  onChange={(e) => setForm({ ...form, active: e.target.checked })}
                  className="w-4 h-4"
                />
                <span className="text-sm font-medium">Active</span>
              </label>
            </div>
          </div>
          <div className="flex gap-3">
            <button onClick={cancelEdit} className="btn-secondary">
              Cancel
            </button>
            <button onClick={handleSave} disabled={saving} className="btn-primary">
              {saving ? 'Saving...' : showCreate ? 'Create Plan' : 'Save Changes'}
            </button>
          </div>
        </div>
      )}

      {/* Plans Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {plans.map((plan) => (
          <div key={plan._id} className={`card ${!plan.active ? 'opacity-50' : ''}`}>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-bold text-gray-900">{plan.name}</h3>
              <div className="flex items-center gap-2">
                {plan.popular && (
                  <span className="badge bg-yellow-100 text-yellow-800">Popular</span>
                )}
                {!plan.active && (
                  <span className="badge bg-gray-100 text-gray-600">Inactive</span>
                )}
              </div>
            </div>
            <p className="text-3xl font-extrabold text-primary-600 mb-2">
              GH₵{plan.price.toLocaleString()}
            </p>
            <p className="text-sm text-gray-500 mb-4">per {plan.duration}</p>
            <p className="text-sm text-gray-600 mb-4">{plan.description}</p>
            <ul className="space-y-2 mb-6">
              {plan.features.map((f, i) => (
                <li key={i} className="flex items-center gap-2 text-sm text-gray-600">
                  <svg className="w-4 h-4 text-green-500 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                  {f}
                </li>
              ))}
            </ul>
            <div className="border-t pt-4 flex items-center justify-between">
              <div className="flex gap-3">
                <button
                  onClick={() => startEdit(plan)}
                  className="text-sm text-primary-600 hover:text-primary-800 font-medium"
                >
                  Edit
                </button>
                <button
                  onClick={() => handleDelete(plan._id, plan.name)}
                  className="text-sm text-red-600 hover:text-red-800"
                >
                  Delete
                </button>
              </div>
              <span className="text-xs text-green-600" title="Synced to MikroTik">
                🔄 MikroTik
              </span>
            </div>
            <div className="flex gap-3 mt-3">
              <button
                onClick={() => handleToggle(plan._id, 'active', !plan.active)}
                className="text-xs text-gray-500 hover:text-gray-700"
                title={plan.active ? 'Deactivate' : 'Activate'}
              >
                {plan.active ? '🟢 Active' : '⚪ Inactive'}
              </button>
              <button
                onClick={() => handleToggle(plan._id, 'popular', !plan.popular)}
                className="text-xs text-gray-500 hover:text-gray-700"
                title={plan.popular ? 'Unmark popular' : 'Mark popular'}
              >
                {plan.popular ? '⭐ Popular' : '☆ Popular'}
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
