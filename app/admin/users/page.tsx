'use client';

import { useState, useEffect, useCallback } from 'react';
import { usePlans, type Plan } from '@/hooks/use-plans';
import { authFetch } from '@/lib/client-utils';

interface User {
  _id: string;
  name: string;
  phone: string;
  role: string;
  hotspotUsername?: string;
  hotspotProfile?: string;
  status: string;
  activatedAt?: string;
  expiresAt?: string;
  createdAt: string;
}

export default function AdminUsersPage() {
  const { plans } = usePlans();
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all');
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [createForm, setCreateForm] = useState({
    name: '',
    phone: '',
    password: '',
    profile: '1-day' as string,
    status: 'active' as 'active' | 'inactive',
  });
  const [createLoading, setCreateLoading] = useState(false);
  const [createError, setCreateError] = useState('');
  const [assignUser, setAssignUser] = useState<User | null>(null);
  const [assignPlan, setAssignPlan] = useState('');
  const [assignLoading, setAssignLoading] = useState(false);

  const fetchUsers = useCallback(async () => {
    try {
      const res = await authFetch(`/api/users?status=${filter}`);
      const data = await res.json();
      if (data.success) {
        setUsers(data.data);
      }
    } catch (error) {
      console.error('Error fetching users:', error);
    } finally {
      setLoading(false);
    }
  }, [filter]);

  useEffect(() => {
    fetchUsers();
  }, [fetchUsers]);

  const handleStatusChange = async (userId: string, newStatus: string) => {
    await authFetch(`/api/users/${userId}`, {
      method: 'PATCH',
      body: JSON.stringify({ status: newStatus }),
    });
    fetchUsers();
  };

  const handleDeleteUser = async (userId: string, userName: string) => {
    if (!confirm(`Are you sure you want to delete "${userName}"? This cannot be undone.`)) return;
    
    try {
      const res = await authFetch(`/api/users/${userId}`, {
        method: 'DELETE',
      });
      const data = await res.json();
      if (data.success) {
        fetchUsers();
      } else {
        alert(data.error || 'Failed to delete user');
      }
    } catch {
      alert('Network error');
    }
  };

  const handleAssignPlan = async () => {
    if (!assignUser || !assignPlan) return;
    setAssignLoading(true);
    try {
      const res = await authFetch('/api/hotspot/create-user', {
        method: 'POST',
        body: JSON.stringify({ userId: assignUser._id, profile: assignPlan }),
      });
      const data = await res.json();
      if (data.success) {
        setAssignUser(null);
        setAssignPlan('');
        fetchUsers();
      } else {
        alert(data.error || 'Failed to assign plan');
      }
    } catch {
      alert('Network error');
    } finally {
      setAssignLoading(false);
    }
  };

  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    setCreateLoading(true);
    setCreateError('');

    try {
      const res = await authFetch('/api/users', {
        method: 'POST',
        body: JSON.stringify(createForm),
      });
      const data = await res.json();

      if (data.success) {
        setShowCreateModal(false);
        setCreateForm({ name: '', phone: '', password: '', profile: '1-day', status: 'active' });
        fetchUsers();
      } else {
        setCreateError(data.error || 'Failed to create user');
      }
    } catch {
      setCreateError('Network error');
    } finally {
      setCreateLoading(false);
    }
  };

  const getStatusBadge = (status: string) => {
    const colors: Record<string, string> = {
      active: 'badge-success',
      inactive: 'badge-info',
      expired: 'badge-danger',
      suspended: 'badge-warning',
    };
    return colors[status] || 'badge-info';
  };

  const filteredUsers = filter === 'all' ? users : users.filter(u => u.status === filter);

  return (
    <div>
      <div className="flex items-center justify-between mb-8">
        <h1 className="text-2xl font-bold text-gray-900">Users</h1>
        <button onClick={() => setShowCreateModal(true)} className="btn-primary">
          + Create User
        </button>
      </div>

      {/* Filters */}
      <div className="flex gap-2 mb-6">
        {['all', 'active', 'inactive', 'expired', 'suspended'].map((f) => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              filter === f
                ? 'bg-primary-600 text-white'
                : 'bg-white text-gray-600 hover:bg-gray-50'
            }`}
          >
            {f.charAt(0).toUpperCase() + f.slice(1)}
          </button>
        ))}
      </div>

      {/* Users Table */}
      <div className="card">
        {loading ? (
          <div className="flex items-center justify-center h-64">
            <div className="animate-spin rounded-full h-8 w-8 border-4 border-primary-200 border-t-primary-600" />
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="text-left text-sm text-gray-500 border-b">
                  <th className="pb-3 pr-4">User</th>
                  <th className="pb-3 pr-4">Phone</th>
                  <th className="pb-3 pr-4">Plan</th>
                  <th className="pb-3 pr-4">Status</th>
                  <th className="pb-3 pr-4">Expires</th>
                  <th className="pb-3">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredUsers.map((user) => (
                  <tr key={user._id} className="border-b last:border-0">
                    <td className="py-4 pr-4">
                      <div>
                        <p className="font-medium text-gray-900">{user.name}</p>
                        {user.hotspotUsername && (
                          <p className="text-xs text-gray-500">{user.hotspotUsername}</p>
                        )}
                      </div>
                    </td>
                    <td className="py-4 pr-4 text-sm">{user.phone}</td>
                    <td className="py-4 pr-4">
                      {user.hotspotProfile ? (
                        <span className="text-sm font-medium">
                          {plans.find(p => p.planId === user.hotspotProfile)?.name || user.hotspotProfile}
                        </span>
                      ) : (
                        <span className="text-sm text-gray-400">—</span>
                      )}
                    </td>
                    <td className="py-4 pr-4">
                      <span className={getStatusBadge(user.status)}>
                        {user.status}
                      </span>
                    </td>
                    <td className="py-4 pr-4 text-sm text-gray-500">
                      {user.expiresAt ? new Date(user.expiresAt).toLocaleDateString() : '—'}
                    </td>
                    <td className="py-4">
                      <div className="flex gap-2">
                        <button
                          onClick={() => { setAssignUser(user); setAssignPlan(user.hotspotProfile || ''); }}
                          className="text-sm text-primary-600 hover:text-primary-800 font-medium"
                        >
                          Assign Plan
                        </button>
                        {user.status !== 'active' && (
                          <button
                            onClick={() => handleStatusChange(user._id, 'active')}
                            className="text-sm text-green-600 hover:text-green-800"
                          >
                            Activate
                          </button>
                        )}
                        {user.status === 'active' && (
                          <button
                            onClick={() => handleStatusChange(user._id, 'suspended')}
                            className="text-sm text-yellow-600 hover:text-yellow-800"
                          >
                            Suspend
                          </button>
                        )}
                        <button
                          onClick={() => handleDeleteUser(user._id, user.name)}
                          className="text-sm text-red-600 hover:text-red-800"
                        >
                          Delete
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
                {filteredUsers.length === 0 && (
                  <tr>
                    <td colSpan={6} className="py-12 text-center text-gray-500">
                      No users found
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Assign Plan Modal */}
      {assignUser && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 px-4">
          <div className="card max-w-md w-full">
            <h3 className="text-xl font-bold text-gray-900 mb-2">Assign Plan</h3>
            <p className="text-sm text-gray-500 mb-4">
              Assign a plan to <strong>{assignUser.name}</strong> ({assignUser.phone})
            </p>

            <div className="mb-4">
              <label className="label">Select Plan</label>
              <select
                value={assignPlan}
                onChange={(e) => setAssignPlan(e.target.value)}
                className="input-field"
              >
                <option value="">— Choose a plan —</option>
                {plans.map((plan) => (
                  <option key={plan.planId} value={plan.planId}>
                    {plan.name} — GH₵{plan.price.toLocaleString()} ({plan.duration})
                  </option>
                ))}
              </select>
            </div>

            {assignPlan && (
              <div className="bg-gray-50 rounded-lg p-3 mb-4 text-sm">
                <p className="font-medium">{plans.find(p => p.planId === assignPlan)?.name}</p>
                <p className="text-gray-500">
                  {plans.find(p => p.planId === assignPlan)?.dataLimit} · {plans.find(p => p.planId === assignPlan)?.duration}
                </p>
                <p className="text-primary-600 font-bold mt-1">
                  GH₵{plans.find(p => p.planId === assignPlan)?.price.toLocaleString()}
                </p>
              </div>
            )}

            <div className="flex gap-3">
              <button onClick={() => { setAssignUser(null); setAssignPlan(''); }} className="btn-secondary flex-1">
                Cancel
              </button>
              <button
                onClick={handleAssignPlan}
                disabled={!assignPlan || assignLoading}
                className="btn-primary flex-1"
              >
                {assignLoading ? 'Assigning...' : 'Assign Plan'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Create User Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 px-4">
          <div className="card max-w-md w-full">
            <h3 className="text-xl font-bold text-gray-900 mb-4">Create Hotspot User</h3>
            <form onSubmit={handleCreateUser} className="space-y-4">
              {createError && (
                <div className="bg-red-50 text-red-700 p-3 rounded-lg text-sm">{createError}</div>
              )}

              <div>
                <label className="label">Full Name</label>
                <input
                  type="text"
                  value={createForm.name}
                  onChange={(e) => setCreateForm({ ...createForm, name: e.target.value })}
                  className="input-field"
                  required
                />
              </div>

              <div>
                <label className="label">Phone Number</label>
                <input
                  type="tel"
                  value={createForm.phone}
                  onChange={(e) => setCreateForm({ ...createForm, phone: e.target.value })}
                  className="input-field"
                  placeholder="0241234567"
                  required
                />
              </div>

              <div>
                <label className="label">Password</label>
                <input
                  type="password"
                  value={createForm.password}
                  onChange={(e) => setCreateForm({ ...createForm, password: e.target.value })}
                  className="input-field"
                  required
                  minLength={4}
                />
              </div>

              <div>
                <label className="label">Plan</label>
                <select
                  value={createForm.profile}
                  onChange={(e) => setCreateForm({ ...createForm, profile: e.target.value as string })}
                  className="input-field"
                >
                  {plans.map((plan) => (
                    <option key={plan.planId} value={plan.planId}>
                      {plan.name} — GH₵{plan.price.toLocaleString()}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="label">Initial Status</label>
                <select
                  value={createForm.status}
                  onChange={(e) => setCreateForm({ ...createForm, status: e.target.value as 'active' | 'inactive' })}
                  className="input-field"
                >
                  <option value="active">Active</option>
                  <option value="inactive">Inactive (pending activation)</option>
                </select>
              </div>

              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  className="btn-secondary flex-1"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={createLoading}
                  className="btn-primary flex-1"
                >
                  {createLoading ? 'Creating...' : 'Create User'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
