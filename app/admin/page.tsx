'use client';

import { useState, useEffect } from 'react';
import { authFetch } from '@/lib/client-utils';

interface DashboardStats {
  users: {
    total: number;
    active: number;
    inactive: number;
    expired: number;
    suspended: number;
  };
  hotspot: {
    currentlyActive: number;
    totalCreated: number;
  };
  vouchers: {
    total: number;
    unused: number;
  };
}

export default function AdminDashboard() {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchStats();
  }, []);

  const fetchStats = async () => {
    try {
      const res = await authFetch('/api/dashboard');
      const data = await res.json();
      if (data.success) {
        setStats(data.data);
      }
    } catch (error) {
      console.error('Error fetching stats:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-4 border-primary-200 border-t-primary-600" />
      </div>
    );
  }

  const statCards = [
    {
      label: 'Total Users',
      value: stats?.users?.total || 0,
      icon: '👥',
      color: 'bg-blue-500',
    },
    {
      label: 'Active Users',
      value: stats?.users?.active || 0,
      icon: '✅',
      color: 'bg-green-500',
    },
    {
      label: 'Inactive',
      value: stats?.users?.inactive || 0,
      icon: '⏸️',
      color: 'bg-yellow-500',
    },
    {
      label: 'Expired',
      value: stats?.users?.expired || 0,
      icon: '⏰',
      color: 'bg-red-500',
    },
    {
      label: 'Active Sessions',
      value: stats?.hotspot?.currentlyActive || 0,
      icon: '📡',
      color: 'bg-purple-500',
    },
    {
      label: 'Vouchers',
      value: stats?.vouchers?.unused || 0,
      icon: '🎟️',
      color: 'bg-indigo-500',
    },
  ];

  return (
    <div>
      <h1 className="text-2xl font-bold text-gray-900 mb-8">Dashboard Overview</h1>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
        {statCards.map((card) => (
          <div key={card.label} className="card">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500">{card.label}</p>
                <p className="text-2xl font-bold text-gray-900 mt-1">{card.value}</p>
              </div>
              <div className={`w-12 h-12 ${card.color} rounded-lg flex items-center justify-center text-2xl`}>
                {card.icon}
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Quick Summary */}
      {stats && (
        <div className="card">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Quick Summary</h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
            <div>
              <p className="text-gray-500">Total Users</p>
              <p className="font-bold text-gray-900">{stats.users.total}</p>
            </div>
            <div>
              <p className="text-gray-500">Suspended</p>
              <p className="font-bold text-gray-900">{stats.users.suspended}</p>
            </div>
            <div>
              <p className="text-gray-500">Hotspot Users</p>
              <p className="font-bold text-gray-900">{stats.hotspot.totalCreated}</p>
            </div>
            <div>
              <p className="text-gray-500">Total Vouchers</p>
              <p className="font-bold text-gray-900">{stats.vouchers.total}</p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
