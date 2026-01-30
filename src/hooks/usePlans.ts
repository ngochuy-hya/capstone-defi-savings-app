import { useState, useCallback } from 'react';
import { useContracts } from '../context/ContractContext';
import type { Plan } from '../types';
import { loadPlanMetadata, pickPlanMetadata } from '../data/planMetadata';

const MAX_UINT256 = (1n << 256n) - 1n;

export const usePlans = () => {
  const { savingsBankContract } = useContracts();
  const [plans, setPlans] = useState<Plan[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchPlans = useCallback(async () => {
    if (!savingsBankContract) return;

    try {
      setLoading(true);
      setError(null);

      const allPlans: Plan[] = [];

      const metaFile = await loadPlanMetadata();

      const nextPlanId: bigint = await savingsBankContract.nextPlanId();
      const totalPlans = Number(nextPlanId) - 1;
      if (totalPlans <= 0) {
        setPlans([]);
        return;
      }

      for (let i = 1; i <= totalPlans; i++) {
        const plan = await savingsBankContract.savingPlans(i);
        const maxDeposit = (plan.maxDeposit as bigint) === MAX_UINT256 ? 0n : (plan.maxDeposit as bigint);
        const name: string = plan.name;
        const durationDays = Number(plan.durationDays);

        allPlans.push({
          planId: BigInt(i),
          name,
          durationDays,
          aprBps: Number(plan.aprBps),
          minDeposit: plan.minDeposit,
          maxDeposit,
          earlyWithdrawPenaltyBps: Number(plan.earlyWithdrawPenaltyBps),
          enabled: plan.isActive,
          metadata: pickPlanMetadata(metaFile, { planId: i, name, durationDays }),
        });
      }

      setPlans(allPlans);
    } catch (err: any) {
      setError(err.message || 'Failed to fetch plans');
      console.error('Error fetching plans:', err);
    } finally {
      setLoading(false);
    }
  }, [savingsBankContract]);

  const getPlan = useCallback(async (planId: number): Promise<Plan | null> => {
    if (!savingsBankContract) return null;

    try {
      const nextPlanId: bigint = await savingsBankContract.nextPlanId();
      if (planId <= 0 || BigInt(planId) >= nextPlanId) return null;

      const plan = await savingsBankContract.savingPlans(planId);
      const maxDeposit = (plan.maxDeposit as bigint) === MAX_UINT256 ? 0n : (plan.maxDeposit as bigint);
      const metaFile = await loadPlanMetadata();
      const name: string = plan.name;
      const durationDays = Number(plan.durationDays);
      return {
        planId: BigInt(planId),
        name,
        durationDays,
        aprBps: Number(plan.aprBps),
        minDeposit: plan.minDeposit,
        maxDeposit,
        earlyWithdrawPenaltyBps: Number(plan.earlyWithdrawPenaltyBps),
        enabled: plan.isActive,
        metadata: pickPlanMetadata(metaFile, { planId, name, durationDays }),
      };
    } catch (err: any) {
      console.error('Error fetching plan:', err);
      return null;
    }
  }, [savingsBankContract]);

  return {
    plans,
    loading,
    error,
    fetchPlans,
    getPlan,
  };
};
