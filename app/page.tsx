'use client';

import Link from 'next/link';
import { usePlans } from '@/hooks/use-plans';

export default function HomePage() {
  const { plans } = usePlans();
  return (
    <div className="glass-bg">
      {/* Nav */}
      <nav className="flex items-center justify-between px-6 py-4 lg:px-12">
        <div className="flex items-center gap-2">
          <div className="w-9 h-9 bg-primary-600 rounded-xl flex items-center justify-center shadow-lg shadow-primary-500/30">
            <span className="text-white font-bold text-lg">W</span>
          </div>
          <span className="text-gray-900 font-bold text-xl">Westerville Connect</span>
        </div>
        <div className="flex items-center gap-4">
          <Link
            href="/login"
            className="text-gray-600 hover:text-gray-900 font-medium transition-colors"
          >
            Login
          </Link>
          <Link
            href="/register"
            className="btn-primary text-sm px-5 py-2.5"
          >
            Get Started
          </Link>
        </div>
      </nav>

      {/* Hero */}
      <div className="flex flex-col items-center justify-center text-center px-6 py-20 lg:py-32">
        <div className="inline-flex items-center bg-emerald-500/10 backdrop-blur-sm rounded-full px-4 py-1.5 mb-8 border border-emerald-200/50">
          <span className="w-2 h-2 bg-emerald-500 rounded-full mr-2 animate-pulse" />
          <span className="text-emerald-700 text-sm font-medium">Now available — Fast & Secure WiFi</span>
        </div>

        <h1 className="text-4xl md:text-6xl lg:text-7xl font-extrabold text-gray-900 leading-tight max-w-4xl">
          Internet Access,{' '}
          <span className="bg-gradient-to-r from-primary-600 to-indigo-600 bg-clip-text text-transparent">
            Simplified
          </span>
        </h1>

        <p className="mt-6 text-lg md:text-xl text-gray-500 max-w-2xl">
          Get online in seconds. Choose a plan, pay with mobile money, and start browsing.
          No queues, no paperwork.
        </p>

        <div className="mt-10 flex flex-col sm:flex-row gap-4">
          <Link
            href="/register"
            className="btn-primary text-lg px-8 py-4"
          >
            Register & Connect
          </Link>
          <Link
            href="/login"
            className="btn-secondary text-lg px-8 py-4"
          >
            I have an account
          </Link>
        </div>
      </div>

      {/* Plans */}
      <div className="px-6 lg:px-12 pb-20">
        <h2 className="text-2xl md:text-3xl font-bold text-gray-900 text-center mb-12">
          Choose Your Plan
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-5xl mx-auto">
          {plans.filter(p => !p.planId.startsWith('data-')).map((plan) => (
            <div
              key={plan.planId}
              className={`rounded-2xl p-8 transition-all duration-300 ${
                plan.popular
                  ? 'card ring-2 ring-primary-400 shadow-xl shadow-primary-500/10 scale-105'
                  : 'card hover:shadow-xl hover:shadow-black/5'
              }`}
            >
              {plan.popular && (
                <span className="inline-block bg-primary-100 text-primary-700 text-xs font-bold px-3 py-1 rounded-full mb-4">
                  MOST POPULAR
                </span>
              )}
              <h3 className="text-xl font-bold text-gray-900">{plan.name}</h3>
              <div className="mt-4 mb-6">
                <span className="text-4xl font-extrabold text-gray-900">
                  GH₵{plan.price.toLocaleString()}
                </span>
                <span className="text-sm text-gray-400 ml-2">
                  / {plan.duration}
                </span>
              </div>
              <ul className="space-y-3 mb-8">
                {plan.features.map((f, i) => (
                  <li key={i} className="flex items-center gap-2 text-sm text-gray-600">
                    <svg className="w-5 h-5 text-emerald-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                    {f}
                  </li>
                ))}
              </ul>
              <Link
                href="/register"
                className={`block text-center py-3 rounded-xl font-semibold transition-all ${
                  plan.popular
                    ? 'btn-primary'
                    : 'btn-secondary'
                }`}
              >
                Get Started
              </Link>
            </div>
          ))}
        </div>
      </div>

      {/* Footer */}
      <footer className="text-center text-gray-400 text-sm py-8 border-t border-white/30 backdrop-blur-sm">
        © {new Date().getFullYear()} Westerville Connect. Powered by MikroTik.
      </footer>
    </div>
  );
}
