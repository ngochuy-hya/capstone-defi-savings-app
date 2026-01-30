import React, { useEffect, useState } from 'react';
import { useDeposit } from '../../../hooks/useDeposit';
import { usePlans } from '../../../hooks/usePlans';
import type { Deposit, Plan } from '../../../types';
import { formatUSDC, formatDate, getDaysRemaining, isMatured } from '../../../utils/formatters';
import { calculateMaturityAmount } from '../../../utils/calculator';
import { Button } from '../../common/Button/Button';
import { DepositStatus } from '../../../utils/constants';
import { TrendingUp, Clock, CheckCircle, DollarSign, AlertCircle, RotateCcw } from 'lucide-react';
import styles from './MyDeposits.module.scss';

export const MyDeposits: React.FC = () => {
  const { fetchUserDeposits, withdrawAtMaturity, earlyWithdraw, renewDeposit, loading } = useDeposit();
  const { getPlan } = usePlans();
  const [deposits, setDeposits] = useState<Deposit[]>([]);
  const [plans, setPlans] = useState<Map<string, Plan>>(new Map());
  const [loadingDeposits, setLoadingDeposits] = useState(true);

  useEffect(() => {
    loadDeposits();
  }, []);

  const loadDeposits = async () => {
    setLoadingDeposits(true);
    const userDeposits = await fetchUserDeposits();
    setDeposits(userDeposits);

    // Fetch plan details for each deposit
    const planMap = new Map<string, Plan>();
    for (const deposit of userDeposits) {
      const plan = await getPlan(Number(deposit.planId));
      if (plan) {
        planMap.set(deposit.planId.toString(), plan);
      }
    }
    setPlans(planMap);
    setLoadingDeposits(false);
  };

  const handleWithdraw = async (depositId: bigint) => {
    const success = await withdrawAtMaturity(Number(depositId));
    if (success) {
      alert('Withdrawn successfully!');
      loadDeposits();
    }
  };

  const handleEarlyWithdraw = async (depositId: bigint) => {
    if (!confirm('Are you sure? You will be charged a penalty fee.')) return;

    const success = await earlyWithdraw(Number(depositId));
    if (success) {
      alert('Early withdraw successful!');
      loadDeposits();
    }
  };

  const handleRenew = async (depositId: bigint) => {
    // renewDeposit(tokenId, useCurrentRate, newPlanId)
    // newPlanId = 0 means use the same plan
    const success = await renewDeposit(Number(depositId), true, 0);
    if (success) {
      alert('Deposit renewed successfully!');
      loadDeposits();
    }
  };

  if (loadingDeposits) {
    return (
      <div className={styles.container}>
        <div className={styles.header}>
          <div className={styles.headerContent}>
            <h1 className={styles.title}>
              <DollarSign size={40} />
              My Deposits
            </h1>
            <p className={styles.subtitle}>Track and manage all your savings deposits</p>
          </div>
        </div>
        <div className={styles.loadingContainer}>
          <div className={styles.spinner}></div>
          <p>Loading your deposits...</p>
        </div>
      </div>
    );
  }

  // Categorize deposits by status
  const groupedDeposits = {
    active: deposits.filter(d => d.status === DepositStatus.Active && !isMatured(d.maturityTime)),
    matured: deposits.filter(d => isMatured(d.maturityTime) && d.status === DepositStatus.Active),
    withdrawn: deposits.filter(d => d.status === DepositStatus.Withdrawn || d.status === DepositStatus.EarlyWithdrawn),
    renewed: deposits.filter(d => d.status === DepositStatus.Renewed),
  };

  const hasAnyDeposits = deposits.length > 0;

  if (!hasAnyDeposits) {
    return (
      <div className={styles.container}>
        <div className={styles.header}>
          <div className={styles.headerContent}>
            <h1 className={styles.title}>
              <DollarSign size={40} />
              My Deposits
            </h1>
            <p className={styles.subtitle}>Track and manage all your savings deposits</p>
          </div>
        </div>
        <div className={styles.emptyState}>
          <div className={styles.emptyIcon}>
            <DollarSign size={64} />
          </div>
          <h2>No Deposits Yet</h2>
          <p>Start saving by choosing a plan and making your first deposit!</p>
        </div>
      </div>
    );
  }

  const renderDepositCard = (deposit: Deposit, status: string) => {
    const plan = plans.get(deposit.planId.toString());
    const daysLeft = getDaysRemaining(deposit.maturityTime);
    const maturityAmount = calculateMaturityAmount(
      deposit.principal,
      deposit.lockedAprBps,
      plan?.durationDays || 0
    );

    return (
      <div key={deposit.tokenId.toString()} className={`${styles.card} ${styles[status]}`}>
        <div className={styles.cardTop}>
          <div className={styles.badgeContainer}>
            <span className={`${styles.badge} ${styles[`badge_${status}`]}`}>
              {status === 'active' && <Clock size={14} />}
              {status === 'matured' && <AlertCircle size={14} />}
              {status === 'withdrawn' && <CheckCircle size={14} />}
              {status === 'renewed' && <RotateCcw size={14} />}
              {status === 'active' && 'Active'}
              {status === 'matured' && 'Matured'}
              {status === 'withdrawn' && 'Withdrawn'}
              {status === 'renewed' && 'Renewed'}
            </span>
            <span className={styles.depositId}>NFT #{deposit.tokenId.toString()}</span>
          </div>
          {status === 'active' && <span className={styles.daysLeft}>{daysLeft} days left</span>}
        </div>

        <div className={styles.mainAmount}>
          <span className={styles.amountLabel}>Principal</span>
          <span className={styles.amount}>{formatUSDC(deposit.principal)}</span>
          <span className={styles.currency}>USDC</span>
        </div>

        <div className={styles.detailsGrid}>
          <div className={styles.detailRow}>
            <span className={styles.detailLabel}>APR</span>
            <span className={styles.detailValue}>{deposit.lockedAprBps / 100}%</span>
          </div>
          <div className={styles.detailRow}>
            <span className={styles.detailLabel}>Duration</span>
            <span className={styles.detailValue}>{plan?.durationDays} days</span>
          </div>
          <div className={styles.detailRow}>
            <span className={styles.detailLabel}>Start</span>
            <span className={styles.detailValue}>{formatDate(deposit.startTime)}</span>
          </div>
          <div className={styles.detailRow}>
            <span className={styles.detailLabel}>Maturity</span>
            <span className={styles.detailValue}>{formatDate(deposit.maturityTime)}</span>
          </div>
        </div>

        <div className={styles.resultBox}>
          <div className={styles.resultItem}>
            <span className={styles.resultLabel}>
              <TrendingUp size={16} />
              Interest Earned
            </span>
            <span className={styles.resultValue}>
              +{formatUSDC(maturityAmount - deposit.principal)} USDC
            </span>
          </div>
          <div className={styles.divider}></div>
          <div className={styles.resultItem}>
            <span className={styles.resultLabel}>Total at Maturity</span>
            <span className={styles.totalValue}>{formatUSDC(maturityAmount)} USDC</span>
          </div>
        </div>

        {(status === 'active' || status === 'matured') && (
          <div className={styles.actions}>
            {status === 'matured' ? (
              <>
                <Button
                  fullWidth
                  onClick={() => handleWithdraw(deposit.tokenId)}
                  loading={loading}
                >
                  Withdraw Funds
                </Button>
                <Button
                  fullWidth
                  variant="outline"
                  onClick={() => handleRenew(deposit.tokenId)}
                  loading={loading}
                >
                  Renew Deposit
                </Button>
              </>
            ) : (
              <Button
                fullWidth
                variant="danger"
                onClick={() => handleEarlyWithdraw(deposit.tokenId)}
                loading={loading}
              >
                Early Withdraw (Penalty: {plan?.earlyWithdrawPenaltyBps ? plan.earlyWithdrawPenaltyBps / 100 : 0}%)
              </Button>
            )}
          </div>
        )}
      </div>
    );
  };

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <div className={styles.headerContent}>
          <h1 className={styles.title}>
            <TrendingUp size={40} />
            My Deposits
          </h1>
          <p className={styles.subtitle}>Track and manage all your savings deposits</p>
        </div>
      </div>

      {groupedDeposits.active.length > 0 && (
        <section className={styles.section}>
          <h2 className={styles.sectionTitle}>
            <Clock size={24} />
            Active Deposits ({groupedDeposits.active.length})
          </h2>
          <div className={styles.grid}>
            {groupedDeposits.active.map(deposit => renderDepositCard(deposit, 'active'))}
          </div>
        </section>
      )}

      {groupedDeposits.matured.length > 0 && (
        <section className={styles.section}>
          <h2 className={styles.sectionTitle}>
            <AlertCircle size={24} />
            Matured - Action Required ({groupedDeposits.matured.length})
          </h2>
          <div className={styles.grid}>
            {groupedDeposits.matured.map(deposit => renderDepositCard(deposit, 'matured'))}
          </div>
        </section>
      )}

      {groupedDeposits.renewed.length > 0 && (
        <section className={styles.section}>
          <h2 className={styles.sectionTitle}>
            <RotateCcw size={24} />
            Renewed Deposits ({groupedDeposits.renewed.length})
          </h2>
          <div className={styles.grid}>
            {groupedDeposits.renewed.map(deposit => renderDepositCard(deposit, 'renewed'))}
          </div>
        </section>
      )}

      {groupedDeposits.withdrawn.length > 0 && (
        <section className={styles.section}>
          <h2 className={styles.sectionTitle}>
            <CheckCircle size={24} />
            Withdrawn Deposits ({groupedDeposits.withdrawn.length})
          </h2>
          <div className={styles.grid}>
            {groupedDeposits.withdrawn.map(deposit => renderDepositCard(deposit, 'withdrawn'))}
          </div>
        </section>
      )}
    </div>
  );
};
