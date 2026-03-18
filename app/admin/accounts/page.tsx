'use client';

import { useState, useEffect, useCallback } from 'react';
import { usePlans } from '@/hooks/use-plans';
import { authFetch } from '@/lib/client-utils';

interface ConfirmedSub {
  _id: string;
  userId: { name: string; phone: string; hotspotUsername?: string };
  planId: string;
  confirmedAt: string;
  createdAt: string;
}

export default function AdminAccountsPage() {
  const { plans } = usePlans();
  const [subs, setSubs] = useState<ConfirmedSub[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchData = useCallback(async () => {
    try {
      const res = await authFetch('/api/subscriptions?status=confirmed');
      const data = await res.json();
      if (data.success) setSubs(data.data);
    } catch { /* ignore */ }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  const getPlan = (planId: string) => plans.find(p => p.planId === planId);

  // Total income
  const totalIncome = subs.reduce((sum, s) => sum + (getPlan(s.planId)?.price || 0), 0);

  // Income by plan
  const incomeByPlan = plans.map(plan => {
    const count = subs.filter(s => s.planId === plan.planId).length;
    return { ...plan, count, total: count * plan.price };
  }).filter(p => p.count > 0).sort((a, b) => b.total - a.total);

  // Income by month
  const monthMap = new Map<string, { count: number; total: number }>();
  subs.forEach(s => {
    const month = new Date(s.confirmedAt || s.createdAt).toLocaleDateString('en-US', { year: 'numeric', month: 'short' });
    const plan = getPlan(s.planId);
    const entry = monthMap.get(month) || { count: 0, total: 0 };
    entry.count++;
    entry.total += plan?.price || 0;
    monthMap.set(month, entry);
  });
  const monthlyIncome = Array.from(monthMap.entries()).map(([month, data]) => ({ month, ...data }));

  return (
    <div>
      <div className="flex items-center justify-between mb-8">
        <h1 className="text-2xl font-bold text-gray-900">Accounts</h1>
      </div>

      {loading ? (
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-8 w-8 border-4 border-primary-200 border-t-primary-600" />
        </div>
      ) : (
        <>
          {/* Summary Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-5 mb-8">
            <div className="card">
              <div className="flex items-center gap-3 mb-3">
                <div className="w-10 h-10 bg-emerald-500/10 rounded-xl flex items-center justify-center">
                  <svg className="w-5 h-5 text-emerald-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
                <h3 className="text-sm font-medium text-gray-500">Total Income</h3>
              </div>
              <p className="text-3xl font-extrabold text-gray-900">GH₵{totalIncome.toLocaleString()}</p>
              <p className="text-xs text-gray-400 mt-1">{subs.length} confirmed transactions</p>
            </div>

            <div className="card">
              <div className="flex items-center gap-3 mb-3">
                <div className="w-10 h-10 bg-blue-500/10 rounded-xl flex items-center justify-center">
                  <svg className="w-5 h-5 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
                  </svg>
                </div>
                <h3 className="text-sm font-medium text-gray-500">This Month</h3>
              </div>
              <p className="text-3xl font-extrabold text-gray-900">
                GH₵{monthlyIncome.find(m => m.month === new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'short' }))?.total.toLocaleString() || '0'}
              </p>
              <p className="text-xs text-gray-400 mt-1">
                {monthlyIncome.find(m => m.month === new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'short' }))?.count || 0} transactions
              </p>
            </div>

            <div className="card">
              <div className="flex items-center gap-3 mb-3">
                <div className="w-10 h-10 bg-purple-500/10 rounded-xl flex items-center justify-center">
                  <svg className="w-5 h-5 text-purple-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                  </svg>
                </div>
                <h3 className="text-sm font-medium text-gray-500">Top Plan</h3>
              </div>
              <p className="text-2xl font-extrabold text-gray-900">
                {incomeByPlan[0]?.name || '—'}
              </p>
              <p className="text-xs text-gray-400 mt-1">
                GH₵{incomeByPlan[0]?.total.toLocaleString() || '0'} from {incomeByPlan[0]?.count || 0} sales
              </p>
            </div>
          </div>

          {/* Income by Plan */}
          <div className="card mb-6">
            <h2 className="text-lg font-bold text-gray-900 mb-4">Income by Plan</h2>
            <div className="space-y-3">
              {incomeByPlan.map((plan) => (
                <div key={plan.planId} className="flex items-center justify-between py-2 border-b border-white/40 last:border-0">
                  <div>
                    <p className="font-medium text-gray-900">{plan.name}</p>
                    <p className="text-xs text-gray-400">{plan.count} sold · GH₵{plan.price} each</p>
                  </div>
                  <p className="text-lg font-bold text-primary-600">GH₵{plan.total.toLocaleString()}</p>
                </div>
              ))}
              {incomeByPlan.length === 0 && (
                <p className="text-sm text-gray-400 py-4 text-center">No confirmed subscriptions yet</p>
              )}
            </div>
          </div>

          {/* Monthly Breakdown */}
          <div className="card mb-6">
            <h2 className="text-lg font-bold text-gray-900 mb-4">Monthly Breakdown</h2>
            <div className="space-y-3">
              {monthlyIncome.map((m) => (
                <div key={m.month} className="flex items-center justify-between py-2 border-b border-white/40 last:border-0">
                  <p className="font-medium text-gray-900">{m.month}</p>
                  <div className="flex items-center gap-4">
                    <span className="text-sm text-gray-500">{m.count} transactions</span>
                    <p className="text-lg font-bold text-primary-600">GH₵{m.total.toLocaleString()}</p>
                  </div>
                </div>
              ))}
              {monthlyIncome.length === 0 && (
                <p className="text-sm text-gray-400 py-4 text-center">No data yet</p>
              )}
            </div>
          </div>

          {/* Transaction Ledger */}
          <div className="card">
            <h2 className="text-lg font-bold text-gray-900 mb-4">Transaction Ledger</h2>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="text-left text-sm text-gray-500 border-b">
                    <th className="pb-3 pr-4">Date</th>
                    <th className="pb-3 pr-4">User</th>
                    <th className="pb-3 pr-4">Plan</th>
                    <th className="pb-3 text-right">Amount</th>
                  </tr>
                </thead>
                <tbody>
                  {subs.map((s) => (
                    <tr key={s._id} className="border-b border-white/40 last:border-0">
                      <td className="py-3 pr-4 text-sm">
                        {new Date(s.confirmedAt || s.createdAt).toLocaleDateString()}
                      </td>
                      <td className="py-3 pr-4">
                        <p className="font-medium text-sm text-gray-900">{s.userId?.name || 'Unknown'}</p>
                        <p className="text-xs text-gray-400">{s.userId?.phone}</p>
                      </td>
                      <td className="py-3 pr-4 text-sm">{getPlan(s.planId)?.name || s.planId}</td>
                      <td className="py-3 text-right font-bold text-primary-600">
                        GH₵{(getPlan(s.planId)?.price || 0).toLocaleString()}
                      </td>
                    </tr>
                  ))}
                  {subs.length === 0 && (
                    <tr>
                      <td colSpan={4} className="py-12 text-center text-gray-400">No transactions yet</td>
                    </tr>
                  )}
                </tbody>
                {subs.length > 0 && (
                  <tfoot>
                    <tr className="border-t-2 border-gray-200">
                      <td colSpan={3} className="py-3 font-bold text-gray-900">Total</td>
                      <td className="py-3 text-right font-extrabold text-primary-600 text-lg">
                        GH₵{totalIncome.toLocaleString()}
                      </td>
                    </tr>
                  </tfoot>
                )}
              </table>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
