'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { usePlans, type Plan } from '@/hooks/use-plans';
import { formatBytes, authFetch, logout } from '@/lib/client-utils';

interface UserData {
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

interface HotspotStatus {
  uptime?: string;
  bytesIn?: number;
  bytesOut?: number;
  isActive?: boolean;
  remainingTime?: string;
}

interface PendingRequest {
  _id: string;
  planId: string;
  status: string;
  createdAt: string;
}

export default function DashboardPage() {
  const router = useRouter();
  const { plans } = usePlans();
  const [user, setUser] = useState<UserData | null>(null);
  const [hotspotStatus, setHotspotStatus] = useState<HotspotStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [pendingRequest, setPendingRequest] = useState<PendingRequest | null>(null);
  const [requesting, setRequesting] = useState<string | null>(null);
  const [showConfirm, setShowConfirm] = useState<string | null>(null);
  const [bundlesOpen, setBundlesOpen] = useState(false);

  const fetchUser = useCallback(async () => {
    try {
      const res = await authFetch('/api/auth/me');
      const data = await res.json();

      if (!data.success) {
        router.push('/login');
        return;
      }

      setUser(data.data);

      // Fetch pending request
      const subRes = await authFetch('/api/subscriptions');
      const subData = await subRes.json();
      if (subData.success) {
        const pending = subData.data.find((s: PendingRequest) => s.status === 'pending');
        setPendingRequest(pending || null);
      }

      if (data.data.hotspotUsername) {
        const statusRes = await authFetch('/api/hotspot/usage');
        const statusData = await statusRes.json();
        if (statusData.success) {
          setHotspotStatus({
            isActive: statusData.data.usage?.currentlyActive,
            bytesIn: statusData.data.usage?.bytesIn,
            bytesOut: statusData.data.usage?.bytesOut,
            uptime: statusData.data.usage?.uptime,
            remainingTime: statusData.data.account?.remainingTime,
          });
        }
      }
    } catch (error) {
      console.error('Error fetching user:', error);
    } finally {
      setLoading(false);
    }
  }, [router]);

  useEffect(() => {
    fetchUser();
  }, [fetchUser]);

  const handleRequestPlan = async (planId: string) => {
    setRequesting(planId);
    try {
      const res = await authFetch('/api/subscriptions', {
        method: 'POST',
        body: JSON.stringify({ planId }),
      });
      const data = await res.json();
      if (data.success) {
        fetchUser();
      } else {
        alert(data.error || 'Failed to request plan');
      }
    } catch {
      alert('Network error');
    } finally {
      setRequesting(null);
      setShowConfirm(null);
    }
  };

  const getDaysRemaining = () => {
    if (!user?.expiresAt) return null;
    const diff = new Date(user.expiresAt).getTime() - Date.now();
    const days = Math.ceil(diff / (1000 * 60 * 60 * 24));
    return days > 0 ? days : 0;
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active': return 'badge-success';
      case 'expired': return 'badge-danger';
      case 'suspended': return 'badge-warning';
      default: return 'badge-info';
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="animate-spin rounded-full h-12 w-12 border-4 border-primary-200 border-t-primary-600" />
      </div>
    );
  }

  if (!user) return null;

  const daysRemaining = getDaysRemaining();
  const currentPlan = user.hotspotProfile ? plans.find(p => p.planId === user.hotspotProfile) : null;
  const pendingPlan = pendingRequest ? plans.find(p => p.planId === pendingRequest.planId) : null;

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-100 via-blue-50 to-indigo-100">
      {/* Header */}
      <header className="bg-white/60 backdrop-blur-xl border-b border-white/40 sticky top-0 z-40">
        <div className="max-w-6xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 bg-primary-600 rounded-xl flex items-center justify-center shadow-lg shadow-primary-500/30">
              <span className="text-white font-bold">W</span>
            </div>
            <span className="font-bold text-lg text-gray-900">Westerville Connect</span>
          </div>
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-3">
              <div className="text-right hidden sm:block">
                <p className="text-sm font-semibold text-gray-900">{user.name}</p>
                <p className="text-xs text-gray-500">{user.phone}</p>
              </div>
              <div className="w-9 h-9 bg-primary-100/80 backdrop-blur-sm text-primary-700 rounded-full flex items-center justify-center font-bold text-sm border border-primary-200/50">
                {user.name.charAt(0).toUpperCase()}
              </div>
            </div>
            <button onClick={() => logout(router)} className="flex items-center gap-1 text-sm text-gray-400 hover:text-gray-600 transition-colors">
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
              </svg>
              <span className="hidden sm:inline">Logout</span>
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-6 py-8">
        {/* Status Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-5 mb-8">
          <div className="card">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 bg-indigo-500/10 rounded-xl flex items-center justify-center">
                <svg className="w-5 h-5 text-indigo-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                </svg>
              </div>
              <h3 className="text-sm font-medium text-gray-500">Account</h3>
            </div>
            <p className="text-xl font-bold text-gray-900">
              {user.hotspotUsername || 'No account yet'}
            </p>
            <div className="mt-2 flex items-center gap-2">
              <span className={getStatusColor(user.status)}>
                {user.status.charAt(0).toUpperCase() + user.status.slice(1)}
              </span>
              {currentPlan && (
                <span className="text-xs text-gray-400">{currentPlan.name}</span>
              )}
            </div>
          </div>

          <div className="card">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 bg-emerald-500/10 rounded-xl flex items-center justify-center">
                <svg className="w-5 h-5 text-emerald-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <h3 className="text-sm font-medium text-gray-500">Time Left</h3>
            </div>
            <p className="text-xl font-bold text-gray-900">
              {user.status === 'active'
                ? (user.hotspotProfile?.startsWith('data-')
                    ? 'Never expires'
                    : (hotspotStatus?.remainingTime || (daysRemaining !== null ? `${daysRemaining} days` : '—')))
                : '—'}
            </p>
            {user.expiresAt && (
              <p className="text-xs text-gray-400 mt-2">
                Expires {new Date(user.expiresAt).toLocaleDateString()}
              </p>
            )}
          </div>

          <div className="card">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 bg-blue-500/10 rounded-xl flex items-center justify-center">
                <svg className="w-5 h-5 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M13 10V3L4 14h7v7l9-11h-7z" />
                </svg>
              </div>
              <div className="flex-1">
                <h3 className="text-sm font-medium text-gray-500">Data</h3>
              </div>
              <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${hotspotStatus?.isActive ? 'bg-emerald-100/80 text-emerald-700' : 'bg-gray-100/80 text-gray-500'}`}>
                {hotspotStatus?.isActive ? 'Online' : 'Offline'}
              </span>
            </div>
            <p className="text-xl font-bold text-gray-900">
              {formatBytes(hotspotStatus?.bytesIn)}
            </p>
            <p className="text-xs text-gray-400 mt-2">
              {formatBytes(hotspotStatus?.bytesOut)} downloaded
            </p>
          </div>
        </div>

        {/* Pending Request Banner */}
        {pendingRequest && pendingPlan && (
          <div className="card mb-8 border-l-4 border-yellow-400 bg-yellow-50">
            <div className="flex items-center justify-between">
              <div>
                <p className="font-bold text-gray-900">⏳ Request Pending</p>
                <p className="text-sm text-gray-600 mt-1">
                  Your request for <strong>{pendingPlan.name}</strong> (GH₵{pendingPlan.price}) is being reviewed by admin.
                </p>
              </div>
              <span className="badge bg-yellow-100 text-yellow-800">Waiting</span>
            </div>
          </div>
        )}

        {/* Payment Info */}
        <div className="card bg-blue-50 border border-blue-200 mb-8">
          <div className="flex items-start gap-4">
            <div className="w-10 h-10 bg-blue-600 rounded-lg flex items-center justify-center flex-shrink-0 mt-0.5">
              <svg className="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z" />
              </svg>
            </div>
            <div>
              <h3 className="font-bold text-blue-900">Payment Details</h3>
              <p className="text-sm text-blue-700 mt-1">
                Send payment to <strong className="text-base">0543100626</strong> — Tuah Acheampong
              </p>
              <p className="text-xs text-blue-500 mt-1">After sending, request a plan below. Admin will verify your payment.</p>
            </div>
          </div>
        </div>

        {/* Plans Section */}
        <div className="mb-8">
          <h2 className="text-xl font-bold text-gray-900 mb-4">
            {user.status === 'active' ? 'Upgrade or Change Plan' : 'Choose a Plan'}
          </h2>

          {/* Duration passes */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5 mb-6">
            {plans.filter(p => !p.planId.startsWith('data-')).map((plan) => {
              const isCurrentPlan = user.hotspotProfile === plan.planId;
              const hasPending = !!pendingRequest;

              return (
                <div
                  key={plan.planId}
                  className={`card relative flex flex-col transition-all duration-300 hover:shadow-xl hover:shadow-black/5 ${
                    plan.popular ? 'ring-2 ring-primary-400 shadow-lg shadow-primary-500/10' : ''
                  } ${isCurrentPlan ? 'opacity-60' : ''}`}
                >
                  {plan.popular && (
                    <span className="absolute -top-3 left-1/2 -translate-x-1/2 bg-primary-100 text-primary-700 text-xs font-bold px-3 py-1 rounded-full">
                      BEST VALUE
                    </span>
                  )}

                  {/* Header */}
                  <div className="text-center pb-4 border-b border-white/40">
                    <p className="text-xs text-gray-400 font-medium uppercase tracking-wider">Duration Pass</p>
                    <h3 className="text-lg font-bold text-gray-900 mt-1">{plan.name}</h3>
                    <div className="mt-3">
                      <span className="text-3xl font-extrabold text-primary-600">GH₵{plan.price}</span>
                      <p className="text-sm text-gray-400 mt-0.5">{plan.duration}</p>
                    </div>
                  </div>

                  {/* Features */}
                  <ul className="space-y-2 mt-4 mb-6 flex-1">
                    {plan.features.map((f, i) => (
                      <li key={i} className="flex items-center gap-2 text-sm text-gray-600">
                        <svg className="w-4 h-4 text-emerald-500 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                        </svg>
                        {f}
                      </li>
                    ))}
                  </ul>

                  {/* Action */}
                  {isCurrentPlan ? (
                    <button className="btn-secondary w-full mt-auto" disabled>Current Plan</button>
                  ) : hasPending ? (
                    <button className="btn-secondary w-full mt-auto" disabled>Pending</button>
                  ) : (
                    <button
                      onClick={() => setShowConfirm(plan.planId)}
                      className="btn-primary w-full mt-auto"
                    >
                      {user.status === 'active' ? 'Switch' : 'Get Started'}
                    </button>
                  )}
                </div>
              );
            })}
          </div>

          {/* Non-Expiry Bundles dropdown */}
          {plans.filter(p => p.bytesLimit && p.bytesLimit > 0 && p.bytesLimit <= 5 * 1024 * 1024 * 1024).length > 0 && (
            <div className="card">
              <button
                onClick={() => setBundlesOpen(!bundlesOpen)}
                className={`w-full flex items-center justify-between text-left rounded-xl p-4 -m-4 transition-colors ${bundlesOpen ? 'bg-primary-50/50' : 'hover:bg-white/50'}`}
              >
                <div className="flex items-center gap-4">
                  <div className="w-11 h-11 bg-primary-500/10 rounded-xl flex items-center justify-center">
                    <svg className="w-6 h-6 text-primary-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
                    </svg>
                  </div>
                  <div>
                    <h3 className="text-lg font-bold text-gray-900">Non-Expiry Bundles</h3>
                    <p className="text-sm text-gray-500">
                      {plans.filter(p => p.bytesLimit && p.bytesLimit > 0 && p.bytesLimit <= 5 * 1024 * 1024 * 1024).length} packages — data never expires
                    </p>
                  </div>
                </div>
                <div className={`w-10 h-10 rounded-full flex items-center justify-center transition-all ${bundlesOpen ? 'bg-primary-100 rotate-180' : 'bg-white/60'}`}>
                  <svg
                    className={`w-5 h-5 ${bundlesOpen ? 'text-primary-600' : 'text-gray-400'}`}
                    fill="none" viewBox="0 0 24 24" stroke="currentColor"
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                  </svg>
                </div>
              </button>

              {bundlesOpen && (
                <div className="mt-4 pt-4 border-t border-white/40 space-y-2">
                  {plans.filter(p => p.bytesLimit && p.bytesLimit > 0 && p.bytesLimit <= 5 * 1024 * 1024 * 1024).map((plan) => {
                    const isCurrentPlan = user.hotspotProfile === plan.planId;
                    const hasPending = !!pendingRequest;

                    return (
                      <div
                        key={plan.planId}
                        className={`border border-white/40 rounded-xl p-4 flex items-center justify-between bg-white/40 backdrop-blur-sm ${isCurrentPlan ? 'opacity-60' : 'hover:border-primary-300 hover:bg-primary-50/30 transition-colors'}`}
                      >
                        <div>
                          <p className="font-bold text-gray-900">{plan.dataLimit}</p>
                          <p className="text-sm text-emerald-600 font-medium">Never expires</p>
                        </div>
                        <div className="flex items-center gap-3">
                          <span className="text-lg font-extrabold text-primary-600">
                            GH₵{plan.price}
                          </span>
                          {isCurrentPlan ? (
                            <span className="text-xs bg-white/60 backdrop-blur-sm text-gray-600 px-3 py-1.5 rounded-lg border border-white/40">Current</span>
                          ) : hasPending ? (
                            <span className="text-xs bg-yellow-100/80 text-yellow-700 px-3 py-1.5 rounded-lg">Pending</span>
                          ) : (
                            <button
                              onClick={() => setShowConfirm(plan.planId)}
                              className="btn-primary text-sm px-4 py-1.5"
                            >
                              Buy
                            </button>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Hotspot Login Info */}
        {user.hotspotUsername && (
          <div className="card">
            <h3 className="text-lg font-bold text-gray-900 mb-4">Your Hotspot Credentials</h3>
            <p className="text-sm text-gray-500 mb-4">
              Use these to log in to the WiFi hotspot:
            </p>
            <div className="bg-gray-50 rounded-lg p-4 font-mono text-sm space-y-1">
              <p><strong>Username:</strong> {user.hotspotUsername}</p>
              <p><strong>Profile:</strong> {currentPlan?.name || user.hotspotProfile || 'None'}</p>
            </div>
          </div>
        )}
      </main>

      {/* Confirm Plan Selection Modal */}
      {showConfirm && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 px-4">
          <div className="card max-w-md w-full">
            <h3 className="text-xl font-bold text-gray-900 mb-2">Confirm Plan Selection</h3>
            {(() => {
              const plan = plans.find(p => p.planId === showConfirm);
              if (!plan) return null;
              return (
                <>
                  <p className="text-gray-600 mb-4">
                    You are requesting <strong>{plan.name}</strong> for <strong>GH₵{plan.price}</strong>.
                    Admin will verify your payment and activate your account.
                  </p>
                  <div className="bg-gray-50 rounded-lg p-3 mb-4">
                    <p className="text-sm font-medium">{plan.name}</p>
                    <p className="text-sm text-gray-500">{plan.dataLimit} · {plan.duration}</p>
                    <p className="text-lg font-bold text-primary-600 mt-1">GH₵{plan.price.toLocaleString()}</p>
                  </div>

                  <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
                    <p className="text-sm font-bold text-blue-900 mb-2">Pay to:</p>
                    <div className="space-y-1 text-sm text-blue-800">
                      <p className="font-bold text-base">0543100626</p>
                      <p>Tuah Acheampong</p>
                    </div>
                    <p className="text-xs text-blue-600 mt-3">Send GH₵{plan.price.toLocaleString()} and click Confirm below. Admin will verify and activate.</p>
                  </div>
                  <div className="flex gap-3">
                    <button onClick={() => setShowConfirm(null)} className="btn-secondary flex-1">Cancel</button>
                    <button
                      onClick={() => handleRequestPlan(showConfirm)}
                      disabled={!!requesting}
                      className="btn-primary flex-1"
                    >
                      {requesting ? 'Submitting...' : 'Confirm Request'}
                    </button>
                  </div>
                </>
              );
            })()}
          </div>
        </div>
      )}
    </div>
  );
}
