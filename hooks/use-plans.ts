'use client';

import { useState, useEffect } from 'react';

export interface Plan {
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
  bytesLimit?: number;
}

/**
 * Hook to fetch active plans from the API.
 * Falls back to an empty array if the API is unreachable.
 */
export function usePlans() {
  const [plans, setPlans] = useState<Plan[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const controller = new AbortController();

    fetch('/api/plans', { signal: controller.signal })
      .then((res) => res.json())
      .then((data) => {
        if (data.success) {
          // Sort: popular first, then by price
          const sorted = data.data.sort((a: Plan, b: Plan) => {
            if (a.popular !== b.popular) return a.popular ? -1 : 1;
            return a.price - b.price;
          });
          setPlans(sorted);
        }
      })
      .catch((err) => {
        if (err.name !== 'AbortError') {
          // API unreachable — plans will be empty
        }
      })
      .finally(() => setLoading(false));

    return () => controller.abort();
  }, []);

  return { plans, loading };
}

/**
 * Look up a plan by its profile ID (e.g. "1-day", "7-day", etc.).
 */
export function usePlanById(profileId: string | undefined) {
  const { plans, loading } = usePlans();
  const plan = profileId ? plans.find((p) => p.planId === profileId) : null;
  return { plan, loading };
}
