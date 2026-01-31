import React, { useState, useEffect } from 'react';
import { TrendingUp, Clock, Percent, DollarSign, CheckCircle2, ArrowRight, Pause } from 'lucide-react';
import { usePlans } from '../../hooks/usePlans';
import { useDeposit } from '../../hooks/useDeposit';
import { useWallet } from '../../context/WalletContext';
import { parseUSDC } from '../../utils/formatters';
import { Button } from '../../components/common/Button/Button';
import { formatUSDC } from '../../utils/formatters';
import type { Plan } from '../../types';
import styles from './Plans.module.scss';

export const Plans: React.FC = () => {
  const { plans, loading: plansLoading, fetchPlans } = usePlans();
  const { openDeposit, loading: depositLoading, error: depositError, clearError } = useDeposit();
  const { isConnected } = useWallet();
  const [selectedPlan, setSelectedPlan] = useState<Plan | null>(null);
  const [amount, setAmount] = useState('');

  useEffect(() => {
    fetchPlans();
  }, [fetchPlans]);

  // Clear deposit error when user changes amount or plan so they see fresh validation
  useEffect(() => {
    if (selectedPlan || amount) clearError();
  }, [selectedPlan, amount, clearError]);

  const handleDeposit = async () => {
    if (!selectedPlan || !amount) return;
    const amountNum = Number(amount);
    if (isNaN(amountNum) || amountNum <= 0) return;
    const amountWei = parseUSDC(amount);
    if (amountWei < selectedPlan.minDeposit) {
      alert(`Số tiền tối thiểu là ${formatUSDC(selectedPlan.minDeposit)} USDC.`);
      return;
    }
    if (selectedPlan.maxDeposit !== 0n && amountWei > selectedPlan.maxDeposit) {
      alert(`Số tiền vượt quá giới hạn plan. Tối đa ${formatUSDC(selectedPlan.maxDeposit)} USDC.`);
      return;
    }
    const success = await openDeposit(Number(selectedPlan.planId), amount);
    if (success) {
      setAmount('');
      setSelectedPlan(null);
    }
  };

  const calculateInterest = (principal: string, aprBps: number, days: number) => {
    if (!principal || isNaN(Number(principal))) return '0';
    const p = Number(principal);
    const rate = aprBps / 10000;
    const interest = (p * rate * days) / 365;
    return interest.toFixed(2);
  };

  return (
    <div className={styles.plans}>
      {/* Header */}
      <div className={styles.header}>
        <div className={styles.headerContent}>
          <h1 className={styles.title}>
            <TrendingUp size={40} />
            <span>Savings Plans</span>
          </h1>
          <p className={styles.subtitle}>
            Choose from flexible term deposits with competitive APR rates
          </p>
        </div>
      </div>

      {/* Plans Grid */}
      <div className={styles.container}>
        {plansLoading ? (
          <div className={styles.loading}>
            <div className={styles.spinner}></div>
            <p>Loading plans...</p>
          </div>
        ) : plans.length === 0 ? (
          <div className={styles.empty}>
            <TrendingUp size={64} />
            <h3>No Plans Available</h3>
            <p>Check back later for savings opportunities</p>
          </div>
        ) : (
          <div className={styles.grid}>
            {plans.map((plan, index) => (
              <div
                key={Number(plan.planId)}
                className={`${styles.card} ${selectedPlan?.planId === plan.planId ? styles.selected : ''} ${!plan.enabled ? styles.cardPaused : ''}`}
                style={{ animationDelay: `${index * 0.1}s` }}
              >
                {/* Paused / Tạm dừng Badge */}
                {!plan.enabled && (
                  <div className={styles.badgePaused}>
                    <Pause size={14} />
                    <span>Tạm dừng</span>
                  </div>
                )}
                {/* Popular Badge (only when active) */}
                {plan.enabled && plan.durationDays === 90 && (
                  <div className={styles.badge}>
                    <CheckCircle2 size={14} />
                    <span>Popular</span>
                  </div>
                )}

                {/* Plan Header */}
                <div className={styles.cardHeader}>
                  <div className={styles.iconWrapper}>
                    <Clock size={32} />
                  </div>
                  <div>
                    <h3 className={styles.cardTitle}>{plan.name}</h3>
                    <p className={styles.cardSubtitle}>{plan.durationDays} Days Term</p>
                  </div>
                </div>

                {/* Offchain Image (optional) */}
                {plan.metadata?.display.image?.src && (
                  <div className={styles.planImageWrap}>
                    <img
                      className={styles.planImage}
                      src={plan.metadata.display.image.src}
                      alt={plan.metadata.display.image.alt ?? `${plan.name} plan image`}
                      loading="lazy"
                    />
                  </div>
                )}

                {/* APR Display */}
                <div className={styles.apr}>
                  <span className={styles.aprValue}>{(plan.aprBps / 100).toFixed(2)}%</span>
                  <span className={styles.aprLabel}>APR</span>
                </div>

                {/* Plan Details */}
                <div className={styles.details}>
                  <div className={styles.detailRow}>
                    <div className={styles.detailLabel}>
                      <DollarSign size={16} />
                      <span>Min Deposit</span>
                    </div>
                    <div className={styles.detailValue}>
                      {formatUSDC(plan.minDeposit)} USDC
                    </div>
                  </div>

                  <div className={styles.detailRow}>
                    <div className={styles.detailLabel}>
                      <DollarSign size={16} />
                      <span>Max Deposit</span>
                    </div>
                    <div className={styles.detailValue}>
                      {plan.maxDeposit === 0n ? 'Unlimited' : `${formatUSDC(plan.maxDeposit)} USDC`}
                    </div>
                  </div>

                  <div className={styles.detailRow}>
                    <div className={styles.detailLabel}>
                      <Percent size={16} />
                      <span>Early Penalty</span>
                    </div>
                    <div className={styles.detailValue}>
                      {(plan.earlyWithdrawPenaltyBps / 100).toFixed(1)}%
                    </div>
                  </div>
                </div>

                {/* Estimated Returns */}
                {selectedPlan?.planId === plan.planId && amount && (
                  <div className={styles.estimate}>
                    <div className={styles.estimateRow}>
                      <span>Principal</span>
                      <strong>{amount} USDC</strong>
                    </div>
                    <div className={styles.estimateRow}>
                      <span>Interest</span>
                      <strong className={styles.success}>
                        +{calculateInterest(amount, plan.aprBps, plan.durationDays)} USDC
                      </strong>
                    </div>
                    <div className={`${styles.estimateRow} ${styles.total}`}>
                      <span>Total at Maturity</span>
                      <strong>
                        {(Number(amount) + Number(calculateInterest(amount, plan.aprBps, plan.durationDays))).toFixed(2)} USDC
                      </strong>
                    </div>
                  </div>
                )}

                {/* Action Button */}
                <Button
                  fullWidth
                  variant={selectedPlan?.planId === plan.planId ? 'primary' : 'outline'}
                  onClick={() => plan.enabled && setSelectedPlan(plan)}
                  disabled={!plan.enabled}
                  icon={!plan.enabled ? <Pause size={18} /> : selectedPlan?.planId === plan.planId ? <CheckCircle2 size={18} /> : <ArrowRight size={18} />}
                  iconPosition="right"
                >
                  {!plan.enabled ? 'Tạm dừng' : selectedPlan?.planId === plan.planId ? 'Selected' : 'Select Plan'}
                </Button>
              </div>
            ))}
          </div>
        )}

        {/* Deposit Form Modal */}
        {selectedPlan && (
          <>
            <div
              className={styles.modalBackdrop}
              onClick={() => {
                setSelectedPlan(null);
                setAmount('');
              }}
            />
            <div className={styles.depositForm}>
              <h3 className={styles.formTitle}>
                <DollarSign size={24} />
                <span>Deposit Amount</span>
              </h3>
              <p className={styles.formSubtitle}>
                Enter amount between {formatUSDC(selectedPlan.minDeposit)} and {selectedPlan.maxDeposit === 0n ? 'unlimited' : formatUSDC(selectedPlan.maxDeposit)} USDC
              </p>

              <div className={styles.inputWrapper}>
                <input
                  type="number"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  placeholder="0.00"
                  className={styles.input}
                  min={formatUSDC(selectedPlan.minDeposit)}
                  max={selectedPlan.maxDeposit !== 0n ? formatUSDC(selectedPlan.maxDeposit) : undefined}
                  step="0.01"
                />
                <span className={styles.inputSuffix}>USDC</span>
              </div>
              {depositError && (
                <p className={styles.formError} role="alert">
                  {depositError}
                </p>
              )}
              <div className={styles.formActions}>
                <Button
                  variant="ghost"
                  onClick={() => {
                    setSelectedPlan(null);
                    setAmount('');
                  }}
                >
                  Cancel
                </Button>
                <Button
                  variant="primary"
                  onClick={handleDeposit}
                  loading={depositLoading}
                  disabled={!isConnected || !amount || Number(amount) <= 0}
                  icon={<CheckCircle2 size={18} />}
                >
                  {!isConnected ? 'Connect Wallet First' : 'Confirm Deposit'}
                </Button>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
};
