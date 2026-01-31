import React, { useEffect, useState } from 'react';
import { useDeposit } from '../../../hooks/useDeposit';
import { usePlans } from '../../../hooks/usePlans';
import type { Deposit, Plan } from '../../../types';
import { formatUSDC, formatDate, getDaysRemaining, isMatured } from '../../../utils/formatters';
import { calculateMaturityAmount } from '../../../utils/calculator';
import { Button } from '../../common/Button/Button';
import { DepositStatus } from '../../../utils/constants';
import { useWallet } from '../../../context/WalletContext';
import { TrendingUp, Clock, CheckCircle, DollarSign, AlertCircle, RotateCcw, RefreshCw, History } from 'lucide-react';
import styles from './MyDeposits.module.scss';

const CLOSED_DEPOSITS_KEY = (addr: string) => `closed_deposits_${addr?.toLowerCase() ?? ''}`;
const MAX_CLOSED_IDS = 50;

function getClosedDepositIds(address: string | undefined): number[] {
  if (!address) return [];
  try {
    const raw = localStorage.getItem(CLOSED_DEPOSITS_KEY(address));
    if (!raw) return [];
    const arr = JSON.parse(raw) as number[];
    return Array.isArray(arr) ? arr : [];
  } catch {
    return [];
  }
}

function addClosedDepositId(address: string | undefined, depositId: number): void {
  if (!address) return;
  const key = CLOSED_DEPOSITS_KEY(address);
  const current = getClosedDepositIds(address);
  const next = [depositId, ...current.filter(id => id !== depositId)].slice(0, MAX_CLOSED_IDS);
  try {
    localStorage.setItem(key, JSON.stringify(next));
  } catch {
    // ignore
  }
}

export const MyDeposits: React.FC = () => {
  const { fetchUserDeposits, fetchDepositDetailsByIds, withdrawAtMaturity, earlyWithdraw, renewDeposit, loading } = useDeposit();
  const { getPlan } = usePlans();
  const { address, isConnected } = useWallet();
  const [deposits, setDeposits] = useState<Deposit[]>([]);
  const [closedDeposits, setClosedDeposits] = useState<Deposit[]>([]);
  const [plans, setPlans] = useState<Map<string, Plan>>(new Map());
  const [loadingDeposits, setLoadingDeposits] = useState(true);

  const nowSec = () => BigInt(Math.floor(Date.now() / 1000));

  const clamp = (n: bigint, min: bigint, max: bigint) => (n < min ? min : n > max ? max : n);

  const formatRemaining = (maturityTime: bigint) => {
    const now = nowSec();
    if (now >= maturityTime) return 'Matured';
    const diff = maturityTime - now;
    const days = diff / 86400n;
    const hours = (diff % 86400n) / 3600n;
    const mins = (diff % 3600n) / 60n;
    if (days > 0n) return `${days.toString()}d ${hours.toString()}h left`;
    if (hours > 0n) return `${hours.toString()}h ${mins.toString()}m left`;
    return `${mins.toString()}m left`;
  };

  const progressPercent = (start: bigint, maturity: bigint) => {
    if (maturity <= start) return 0;
    const dur = maturity - start;
    const elapsed = clamp(nowSec() - start, 0n, dur);
    return Number((elapsed * 100n) / dur);
  };

  // Refetch when wallet connects or address changes (fix: reload page showed no deposits until refetch)
  useEffect(() => {
    if (address && isConnected) {
      loadDeposits();
    } else {
      setDeposits([]);
      setClosedDeposits([]);
      setPlans(new Map());
      setLoadingDeposits(false);
    }
  }, [address, isConnected]);

  const loadClosedDeposits = async () => {
    if (!address) return;
    const ids = getClosedDepositIds(address);
    if (ids.length === 0) {
      setClosedDeposits([]);
      return;
    }
    const closed = await fetchDepositDetailsByIds(ids.map(BigInt));
    setClosedDeposits(closed);
    // Merge plan cache for closed deposits
    const closedPlanMap = new Map<string, Plan>();
    for (const d of closed) {
      const plan = await getPlan(Number(d.planId));
      if (plan) closedPlanMap.set(d.planId.toString(), plan);
    }
    if (closedPlanMap.size > 0) {
      setPlans(prev => {
        const next = new Map(prev);
        closedPlanMap.forEach((v, k) => next.set(k, v));
        return next;
      });
    }
  };

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
    await loadClosedDeposits();
    setLoadingDeposits(false);
  };

  const handleWithdraw = async (depositId: bigint) => {
    const success = await withdrawAtMaturity(Number(depositId));
    if (success) {
      addClosedDepositId(address ?? undefined, Number(depositId));
      alert('Withdrawn successfully!');
      loadDeposits();
    }
  };

  const handleEarlyWithdraw = async (depositId: bigint) => {
    if (!confirm('Are you sure? You will be charged a penalty fee.')) return;

    const success = await earlyWithdraw(Number(depositId));
    if (success) {
      addClosedDepositId(address ?? undefined, Number(depositId));
      alert('Early withdraw successful!');
      loadDeposits();
    }
  };

  const handleRenew = async (depositId: bigint) => {
    // autoRenew(tokenId) — locks APR, compounds interest, within 2 days after maturity
    const success = await renewDeposit(Number(depositId));
    if (success) {
      addClosedDepositId(address ?? undefined, Number(depositId));
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

  const hasAnyDeposits = deposits.length > 0 || closedDeposits.length > 0;

  if (!hasAnyDeposits && !loadingDeposits) {
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
          {!isConnected ? (
            <>
              <h2>Connect your wallet</h2>
              <p>Connect your wallet to see your deposits.</p>
            </>
          ) : (
            <>
              <h2>No Deposits Yet</h2>
              <p>Start saving by choosing a plan and making your first deposit!</p>
            </>
          )}
        </div>
      </div>
    );
  }

  const renderDepositCard = (deposit: Deposit, status: string) => {
    const plan = plans.get(deposit.planId.toString());
    const daysLeft = getDaysRemaining(deposit.maturityTime);
    const remainingLabel = formatRemaining(deposit.maturityTime);
    const progress = progressPercent(deposit.startTime, deposit.maturityTime);
    const maturityAmount = calculateMaturityAmount(
      deposit.principal,
      deposit.lockedAprBps,
      plan?.durationDays || 0
    );
    const totalInterestAtMaturity = maturityAmount > deposit.principal ? maturityAmount - deposit.principal : 0n;
    const durationSeconds = deposit.maturityTime > deposit.startTime ? deposit.maturityTime - deposit.startTime : 0n;
    const elapsedSeconds = durationSeconds === 0n ? 0n : clamp(nowSec() - deposit.startTime, 0n, durationSeconds);
    const accruedInterestEst =
      durationSeconds === 0n ? 0n : (totalInterestAtMaturity * elapsedSeconds) / durationSeconds;

    const penaltyBps = BigInt(plan?.earlyWithdrawPenaltyBps ?? 0);
    const penaltyAmount = (deposit.principal * penaltyBps) / 10000n;
    const earlyPayout = deposit.principal > penaltyAmount ? deposit.principal - penaltyAmount : 0n;

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
            {deposit.isAutoRenewEnabled && (
              <span className={`${styles.chip} ${styles.chipAutoRenew}`}>Auto-renew</span>
            )}
          </div>
          {status === 'active' && <span className={styles.daysLeft}>{daysLeft} days left</span>}
        </div>

        <div className={styles.heroRow}>
          <div className={styles.planInfo}>
            {plan?.metadata?.display.image?.src && (
              <div className={styles.planImageWrap}>
                <img
                  className={styles.planImage}
                  src={plan.metadata.display.image.src}
                  alt={plan.metadata.display.image.alt ?? `${plan.name} plan image`}
                  loading="lazy"
                />
              </div>
            )}
            <div className={styles.planText}>
              <div className={styles.planTitle}>
                {plan?.metadata?.display.title ?? plan?.name ?? `Plan #${deposit.planId.toString()}`}
              </div>
              <div className={styles.planSubtitle}>
                {plan?.durationDays ? `${plan.durationDays} days term` : 'Term deposit'}
              </div>
              {plan?.metadata?.display.description && (
                <div className={styles.planDescription}>{plan.metadata.display.description}</div>
              )}
              {plan?.metadata?.display.highlights?.length ? (
                <div className={styles.planHighlights}>
                  {plan.metadata.display.highlights.slice(0, 3).map((h) => (
                    <span key={h} className={styles.chip}>
                      {h}
                    </span>
                  ))}
                </div>
              ) : null}
            </div>
          </div>

          <div className={styles.progressWrap}>
            <div
              className={styles.progressRing}
              style={{ ['--p' as unknown as keyof React.CSSProperties]: progress } as React.CSSProperties}
              aria-label={`Progress ${progress}%`}
            >
              <div className={styles.progressInner}>
                <div className={styles.progressValue}>{progress}%</div>
                <div className={styles.progressLabel}>{remainingLabel}</div>
              </div>
            </div>
          </div>
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
              Interest (est.)
            </span>
            <span className={styles.resultValue}>
              +{formatUSDC(accruedInterestEst)} USDC
            </span>
          </div>
          <div className={styles.resultItem}>
            <span className={styles.resultLabel}>Projected at Maturity</span>
            <span className={styles.resultValue}>+{formatUSDC(totalInterestAtMaturity)} USDC</span>
          </div>
          <div className={styles.divider}></div>
          <div className={styles.resultItem}>
            <span className={styles.resultLabel}>Total at Maturity</span>
            <span className={styles.totalValue}>{formatUSDC(maturityAmount)} USDC</span>
          </div>
        </div>

        {status === 'active' && penaltyBps > 0n && (
          <div className={styles.penaltyBox}>
            <div className={styles.penaltyRow}>
              <span className={styles.resultLabel}>Early withdraw penalty</span>
              <span className={styles.detailValue}>{Number(penaltyBps) / 100}%</span>
            </div>
            <div className={styles.penaltyRow}>
              <span className={styles.resultLabel}>Penalty amount (est.)</span>
              <span className={styles.resultValue}>-{formatUSDC(penaltyAmount)} USDC</span>
            </div>
            <div className={styles.penaltyRow}>
              <span className={styles.resultLabel}>You receive (est.)</span>
              <span className={styles.totalValue}>{formatUSDC(earlyPayout)} USDC</span>
            </div>
          </div>
        )}

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

  const closedStatusLabel = (status: number) => {
    if (status === DepositStatus.EarlyWithdrawn) return 'Đã rút sớm';
    if (status === DepositStatus.Withdrawn) return 'Đã đáo hạn';
    if (status === DepositStatus.Renewed) return 'Đã gia hạn';
    return 'Đã đóng';
  };

  const renderClosedCard = (deposit: Deposit) => {
    const plan = plans.get(deposit.planId.toString());
    const label = closedStatusLabel(deposit.status);
    return (
      <div key={deposit.tokenId.toString()} className={`${styles.card} ${styles.cardClosed}`}>
        <div className={styles.cardTop}>
          <div className={styles.badgeContainer}>
            <span className={`${styles.badge} ${styles.badgeClosed}`}>
              <History size={14} />
              {label}
            </span>
            <span className={styles.depositId}>NFT #{deposit.tokenId.toString()}</span>
          </div>
        </div>
        <div className={styles.heroRow}>
          <div className={styles.planInfo}>
            {plan?.metadata?.display.image?.src && (
              <div className={styles.planImageWrap}>
                <img
                  className={styles.planImage}
                  src={plan.metadata.display.image.src}
                  alt={plan.metadata.display.image.alt ?? `${plan?.name} plan image`}
                  loading="lazy"
                />
              </div>
            )}
            <div className={styles.planText}>
              <div className={styles.planTitle}>
                {plan?.metadata?.display.title ?? plan?.name ?? `Plan #${deposit.planId.toString()}`}
              </div>
              <div className={styles.planSubtitle}>
                {plan?.durationDays ? `${plan.durationDays} days term` : 'Term deposit'}
              </div>
            </div>
          </div>
          <div className={styles.principalAmount}>{formatUSDC(deposit.principal)} USDC</div>
        </div>
        <div className={styles.detailGrid}>
          <div className={styles.detailRow}>
            <span className={styles.detailLabel}>Bắt đầu</span>
            <span className={styles.detailValue}>{formatDate(deposit.startTime)}</span>
          </div>
          <div className={styles.detailRow}>
            <span className={styles.detailLabel}>Đáo hạn</span>
            <span className={styles.detailValue}>{formatDate(deposit.maturityTime)}</span>
          </div>
        </div>
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
        {isConnected && (
          <Button
            variant="outline"
            size="sm"
            onClick={() => loadDeposits()}
            disabled={loadingDeposits}
            icon={<RefreshCw size={16} />}
          >
            {loadingDeposits ? 'Loading...' : 'Làm mới'}
          </Button>
        )}
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

      {closedDeposits.length > 0 && (
        <section className={styles.section}>
          <h2 className={styles.sectionTitleClosed}>
            <History size={24} />
            Đã đóng (Lịch sử)
          </h2>
          <p className={styles.sectionDescClosed}>
            Các deposit đã rút sớm, rút đúng hạn hoặc gia hạn — chỉ để xem lại, không thể thao tác.
          </p>
          <div className={styles.grid}>
            {closedDeposits.map(deposit => renderClosedCard(deposit))}
          </div>
        </section>
      )}
    </div>
  );
};
