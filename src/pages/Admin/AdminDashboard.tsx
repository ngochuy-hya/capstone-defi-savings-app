import React, { useEffect, useState } from 'react';
import { useWallet } from '../../context/WalletContext';
import { useAdmin } from '../../hooks/useAdmin';
import { usePlans } from '../../hooks/usePlans';
import { useDeposit } from '../../hooks/useDeposit';
import { formatUSDC } from '../../utils/formatters';
import type { Plan, Deposit } from '../../types';
import { Button } from '../../components/common/Button/Button';
import { useContracts } from '../../context/ContractContext';
import { DepositStatus } from '../../utils/constants';
import {
  Shield,
  TrendingUp,
  Users,
  DollarSign,
  Settings,
  CheckCircle,
  Clock,
  Plus,
  Edit,
  Power,
  BarChart3,
  Wallet,
  Copy,
  Check,
  AlertTriangle,
  History
} from 'lucide-react';
import styles from './AdminDashboard.module.scss';

// Extended type for deposits with owner
type DepositWithOwner = Deposit & { owner: string };

export const Admin: React.FC = () => {
  const { address, isAdmin } = useWallet();
  const { createPlan, updatePlan, togglePlan, fundInterestVault, withdrawInterestVault, getVaultStats, emergencyPause, unpause, loading, error } = useAdmin();
  const { plans, fetchPlans } = usePlans();
  const { fetchAllDeposits } = useDeposit();
  const { depositNFTContract, savingsBankContract } = useContracts();

  const [deposits, setDeposits] = useState<DepositWithOwner[]>([]);
  const [vaultStats, setVaultStats] = useState<{
    totalPrincipal: string;
    totalInterest: string;
    availableInterest: string;
    reservedInterest: string;
  } | null>(null);
  const [activeTab, setActiveTab] = useState<'overview' | 'plans' | 'users' | 'withdrawals' | 'settings'>('overview');
  const [showCreatePlanModal, setShowCreatePlanModal] = useState(false);
  const [editingPlan, setEditingPlan] = useState<Plan | null>(null);
  const [fundAmount, setFundAmount] = useState('');
  const [withdrawAmount, setWithdrawAmount] = useState('');
  const [copiedAddress, setCopiedAddress] = useState<string | null>(null);
  const [isPaused, setIsPaused] = useState<boolean | null>(null);

  // Form state for plan creation/editing
  const [planFormData, setPlanFormData] = useState({
    name: 'Standard Plan',
    durationDays: '30',
    aprBps: '600',
    minDeposit: '100',
    maxDeposit: '1000000',
    penaltyBps: '300',
  });

  const loadVaultStats = async () => {
    const stats = await getVaultStats();
    if (stats) setVaultStats(stats);
  };

  useEffect(() => {
    if (isAdmin) {
      fetchPlans();
      loadDeposits();
      loadVaultStats();
    }
  }, [isAdmin]);

  // Refetch deposits when admin opens Withdrawals tab so rút sớm / closed deposits always show
  useEffect(() => {
    if (isAdmin && activeTab === 'withdrawals') {
      loadDeposits();
    }
  }, [isAdmin, activeTab]);

  // Load pause status when admin opens Settings tab
  const loadPausedStatus = async () => {
    if (!savingsBankContract) return;
    try {
      const paused = await savingsBankContract.paused();
      setIsPaused(paused);
    } catch {
      setIsPaused(null);
    }
  };
  useEffect(() => {
    if (isAdmin && activeTab === 'settings' && savingsBankContract) {
      loadPausedStatus();
    }
  }, [isAdmin, activeTab, savingsBankContract]);

  const loadDeposits = async () => {
    const allDeposits = await fetchAllDeposits();

    // Fetch owner: NFT.ownerOf for active, SavingsBank.depositOwner for closed (NFT burned)
    if (!depositNFTContract || !savingsBankContract) {
      setDeposits([]);
      return;
    }

    const ZERO = '0x0000000000000000000000000000000000000000';
    const depositsWithOwners: DepositWithOwner[] = await Promise.all(
      allDeposits.map(async (deposit) => {
        try {
          const owner = await depositNFTContract.ownerOf(deposit.tokenId);
          return { ...deposit, owner };
        } catch {
          // NFT burned (rút sớm / đáo hạn / gia hạn) — lấy owner từ contract nếu có lưu
          try {
            const storedOwner = await savingsBankContract.depositOwner(deposit.tokenId);
            const addr = typeof storedOwner === 'string' ? storedOwner : (storedOwner as string);
            return { ...deposit, owner: addr && addr !== ZERO ? addr : ZERO };
          } catch {
            return { ...deposit, owner: ZERO };
          }
        }
      })
    );

    setDeposits(depositsWithOwners);
  };

  const ZERO_ADDRESS = '0x0000000000000000000000000000000000000000';
  const isBurnedNFT = (owner: string) => owner === ZERO_ADDRESS;

  const copyToClipboard = (address: string) => {
    navigator.clipboard.writeText(address).then(() => {
      setCopiedAddress(address);
      setTimeout(() => setCopiedAddress(null), 2000);
    });
  };

  const renderOwnerCell = (owner: string) => {
    if (isBurnedNFT(owner)) {
      return <span className={styles.burnedOwner}>— (NFT đã burn)</span>;
    }
    return (
      <div className={styles.addressWithCopy}>
        <code>{owner.slice(0, 10)}…{owner.slice(-8)}</code>
        <button
          type="button"
          className={styles.copyButton}
          onClick={() => copyToClipboard(owner)}
          title="Copy"
        >
          {copiedAddress === owner ? <Check size={12} /> : <Copy size={12} />}
        </button>
      </div>
    );
  };

  if (!isAdmin) {
    return (
      <div className={styles.container}>
        <div className={styles.accessDenied}>
          <Shield size={64} className={styles.deniedIcon} />
          <h2>Access Denied</h2>
          <p>You must be an administrator to access this dashboard.</p>
          <div className={styles.addressBox}>
            <span>Your Address:</span>
            <code>{address}</code>
          </div>
        </div>
      </div>
    );
  }

  const handleCreatePlan = async (e: React.FormEvent) => {
    e.preventDefault();
    const success = await createPlan(
      planFormData.name,
      Number(planFormData.durationDays),
      Number(planFormData.aprBps),
      planFormData.minDeposit,
      planFormData.maxDeposit,
      Number(planFormData.penaltyBps)
    );

    if (success) {
      setShowCreatePlanModal(false);
      resetPlanForm();
      fetchPlans();
    }
  };

  const handleUpdatePlan = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingPlan) return;

    const success = await updatePlan(
      Number(editingPlan.planId),
      Number(planFormData.aprBps),
      planFormData.minDeposit,
      planFormData.maxDeposit,
      Number(planFormData.penaltyBps),
      editingPlan.enabled
    );

    if (success) {
      setEditingPlan(null);
      resetPlanForm();
      fetchPlans();
    }
  };

  const handleTogglePlan = async (planId: bigint, currentStatus: boolean) => {
    const success = await togglePlan(Number(planId), !currentStatus);
    if (success) {
      fetchPlans();
    }
  };

  const handleFundInterestVault = async (e: React.FormEvent) => {
    e.preventDefault();
    const success = await fundInterestVault(fundAmount);
    if (success) {
      setFundAmount('');
      await loadVaultStats();
      alert('Interest vault funded successfully!');
    }
  };

  const handleWithdrawInterestVault = async (e: React.FormEvent) => {
    e.preventDefault();
    const available = vaultStats ? BigInt(vaultStats.availableInterest) : 0n;
    const amountWei = BigInt(Math.floor(parseFloat(withdrawAmount) * 1000000));
    if (amountWei > available) {
      alert(`Chỉ có thể rút tối đa ${formatUSDC(available)} USDC (available). Reserved không được rút.`);
      return;
    }
    const success = await withdrawInterestVault(withdrawAmount);
    if (success) {
      setWithdrawAmount('');
      await loadVaultStats();
      alert('Đã rút từ Interest Vault thành công!');
    }
  };

  const handleUnpause = async () => {
    const success = await unpause();
    if (success) {
      await loadPausedStatus();
      alert('Contract đã bật lại. User có thể deposit.');
    }
  };

  const handlePause = async () => {
    const ok = window.confirm('Tạm dừng contract sẽ chặn mọi deposit/withdraw. Chỉ admin mới unpause được. Tiếp tục?');
    if (!ok) return;
    const success = await emergencyPause();
    if (success) {
      await loadPausedStatus();
      alert('Contract đã tạm dừng.');
    }
  };

  const resetPlanForm = () => {
    setPlanFormData({
      name: 'Standard Plan',
      durationDays: '30',
      aprBps: '600',
      minDeposit: '100',
      maxDeposit: '1000000',
      penaltyBps: '300',
    });
  };

  const startEditPlan = (plan: Plan) => {
    setEditingPlan(plan);
    setPlanFormData({
      name: plan.name,
      durationDays: plan.durationDays.toString(),
      aprBps: plan.aprBps.toString(),
      minDeposit: plan.minDeposit.toString(),
      maxDeposit: plan.maxDeposit.toString(),
      penaltyBps: plan.earlyWithdrawPenaltyBps.toString(),
    });
    setShowCreatePlanModal(true);
  };

  // Calculate statistics
  const totalDeposits = deposits.length;
  const activeDeposits = deposits.filter((d: DepositWithOwner) => d.status === 0).length;
  const totalValueLocked = deposits.reduce((sum: number, d: DepositWithOwner) => sum + Number(d.principal), 0);
  const uniqueUsers = new Set(deposits.map((d: DepositWithOwner) => d.owner.toLowerCase())).size;

  // Get user list with deposit counts
  const userStats = deposits.reduce((acc: Record<string, any>, deposit: DepositWithOwner) => {
    const userAddr = deposit.owner.toLowerCase();
    if (!acc[userAddr]) {
      acc[userAddr] = {
        address: deposit.owner,
        depositCount: 0,
        totalDeposited: BigInt(0),
        activeDeposits: 0,
      };
    }
    acc[userAddr].depositCount++;
    acc[userAddr].totalDeposited += deposit.principal;
    if (deposit.status === 0) acc[userAddr].activeDeposits++;
    return acc;
  }, {} as Record<string, any>);

  const userList = Object.values(userStats);

  return (
    <div className={styles.container}>
      {/* Header */}
      <div className={styles.header}>
        <div className={styles.headerContent}>
          <div className={styles.headerTop}>
            <div className={styles.titleSection}>
              <Shield size={40} />
              <div>
                <h1>Admin Dashboard</h1>
                <p>Manage your savings platform</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Stats Overview */}
      <div className={styles.statsGrid}>
        <div className={styles.statCard}>
          <div className={styles.statIcon}>
            <Users size={24} />
          </div>
          <div className={styles.statContent}>
            <span className={styles.statLabel}>Total Users</span>
            <span className={styles.statValue}>{uniqueUsers}</span>
          </div>
        </div>

        <div className={styles.statCard}>
          <div className={styles.statIcon}>
            <DollarSign size={24} />
          </div>
          <div className={styles.statContent}>
            <span className={styles.statLabel}>Total Value Locked</span>
            <span className={styles.statValue}>{formatUSDC(BigInt(totalValueLocked))}</span>
          </div>
        </div>

        <div className={styles.statCard}>
          <div className={styles.statIcon}>
            <BarChart3 size={24} />
          </div>
          <div className={styles.statContent}>
            <span className={styles.statLabel}>Total Deposits</span>
            <span className={styles.statValue}>{totalDeposits}</span>
          </div>
        </div>

        <div className={styles.statCard}>
          <div className={styles.statIcon}>
            <TrendingUp size={24} />
          </div>
          <div className={styles.statContent}>
            <span className={styles.statLabel}>Active Deposits</span>
            <span className={styles.statValue}>{activeDeposits}</span>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className={styles.tabs}>
        <button
          className={`${styles.tab} ${activeTab === 'overview' ? styles.active : ''}`}
          onClick={() => setActiveTab('overview')}
        >
          <BarChart3 size={18} />
          Overview
        </button>
        <button
          className={`${styles.tab} ${activeTab === 'plans' ? styles.active : ''}`}
          onClick={() => setActiveTab('plans')}
        >
          <Clock size={18} />
          Plans Management
        </button>
        <button
          className={`${styles.tab} ${activeTab === 'users' ? styles.active : ''}`}
          onClick={() => setActiveTab('users')}
        >
          <Users size={18} />
          User List
        </button>
        <button
          className={`${styles.tab} ${activeTab === 'withdrawals' ? styles.active : ''}`}
          onClick={() => setActiveTab('withdrawals')}
        >
          <History size={18} />
          Withdrawals
        </button>
        <button
          className={`${styles.tab} ${activeTab === 'settings' ? styles.active : ''}`}
          onClick={() => setActiveTab('settings')}
        >
          <Settings size={18} />
          Settings
        </button>
      </div>

      {/* Content Area */}
      <div className={styles.content}>
        {/* Overview Tab */}
        {activeTab === 'overview' && (
          <div className={styles.overviewTab}>
            <div className={styles.sectionTitle}>
              <BarChart3 size={24} />
              <h2>Platform Overview</h2>
            </div>

            <div className={styles.overviewGrid}>
              <div className={styles.overviewCard}>
                <h3>Active Plans</h3>
                <div className={styles.overviewValue}>{plans.filter(p => p.enabled).length}</div>
                <p className={styles.overviewLabel}>Enabled plans</p>
              </div>

              <div className={styles.overviewCard}>
                <h3>Total Plans</h3>
                <div className={styles.overviewValue}>{plans.length}</div>
                <p className={styles.overviewLabel}>All plans created</p>
              </div>

              <div className={styles.overviewCard}>
                <h3>Avg Deposit Size</h3>
                <div className={styles.overviewValue}>
                  {totalDeposits > 0 ? formatUSDC(BigInt(Math.floor(totalValueLocked / totalDeposits))) : '0'}
                </div>
                <p className={styles.overviewLabel}>USDC per deposit</p>
              </div>

              <div className={styles.overviewCard}>
                <h3>Platform Status</h3>
                <div className={styles.overviewValue}>
                  <CheckCircle size={32} className={styles.statusIcon} />
                </div>
                <p className={styles.overviewLabel}>Operational</p>
              </div>
            </div>

            {/* Vault Statistics */}
            {vaultStats && (
              <div className={styles.vaultStatsSection}>
                <h3 className={styles.vaultStatsTitle}>
                  <Wallet size={20} />
                  Vault Balances (on-chain)
                </h3>
                <div className={styles.vaultStatsGrid}>
                  <div className={styles.vaultStatCard}>
                    <h4>TokenVault (Principal)</h4>
                    <p className={styles.vaultStatDesc}>User principal only — admin cannot withdraw</p>
                    <div className={styles.vaultStatValue}>
                      {formatUSDC(BigInt(vaultStats.totalPrincipal))} <span>USDC</span>
                    </div>
                  </div>
                  <div className={styles.vaultStatCard}>
                    <h4>InterestVault (Interest pool)</h4>
                    <p className={styles.vaultStatDesc}>Total balance in interest vault</p>
                    <div className={styles.vaultStatValue}>
                      {formatUSDC(BigInt(vaultStats.totalInterest))} <span>USDC</span>
                    </div>
                    <div className={styles.vaultStatBreakdown}>
                      <div className={styles.vaultStatRow}>
                        <span>Available (admin can withdraw)</span>
                        <strong>{formatUSDC(BigInt(vaultStats.availableInterest))} USDC</strong>
                      </div>
                      <div className={styles.vaultStatRow}>
                        <span>Reserved (for active deposits)</span>
                        <strong>{formatUSDC(BigInt(vaultStats.reservedInterest))} USDC</strong>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Recent Deposits */}
            <div className={styles.recentSection}>
              <h3>Recent Deposits</h3>
              <div className={styles.depositsList}>
                {deposits.slice(0, 5).map((deposit: DepositWithOwner) => (
                  <div key={deposit.tokenId.toString()} className={styles.depositItem}>
                    <div className={styles.depositInfo}>
                      <span className={styles.depositId}>NFT #{deposit.tokenId.toString()}</span>
                      <div className={styles.addressWithCopy}>
                        <code className={styles.depositUser}>{deposit.owner}</code>
                        <button
                          className={styles.copyButton}
                          onClick={() => copyToClipboard(deposit.owner)}
                          title="Copy address"
                        >
                          {copiedAddress === deposit.owner ? <Check size={14} /> : <Copy size={14} />}
                        </button>
                      </div>
                    </div>
                    <div className={styles.depositAmount}>{formatUSDC(deposit.principal)} USDC</div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Plans Management Tab */}
        {activeTab === 'plans' && (
          <div className={styles.plansTab}>
            <div className={styles.sectionHeader}>
              <div className={styles.sectionTitle}>
                <Clock size={24} />
                <h2>Savings Plans</h2>
              </div>
              <Button onClick={() => {
                setEditingPlan(null);
                resetPlanForm();
                setShowCreatePlanModal(true);
              }}>
                <Plus size={18} />
                Create New Plan
              </Button>
            </div>

            <div className={styles.plansGrid}>
              {plans.map(plan => (
                <div key={plan.planId.toString()} className={`${styles.planCard} ${!plan.enabled ? styles.disabled : ''}`}>
                  <div className={styles.planHeader}>
                    <div className={styles.planId}>Plan #{plan.planId.toString()}</div>
                    <div className={`${styles.planStatus} ${plan.enabled ? styles.enabled : styles.disabled}`}>
                      {plan.enabled ? 'Active' : 'Disabled'}
                    </div>
                  </div>

                  <div className={styles.planApr}>
                    {(plan.aprBps / 100).toFixed(2)}%
                    <span>APR</span>
                  </div>

                  <div className={styles.planDetails}>
                    <div className={styles.planDetailRow}>
                      <span>Name:</span>
                      <span>{plan.name}</span>
                    </div>
                    <div className={styles.planDetailRow}>
                      <span>Duration:</span>
                      <span>{plan.durationDays} days</span>
                    </div>
                    <div className={styles.planDetailRow}>
                      <span>Min Deposit:</span>
                      <span>{formatUSDC(plan.minDeposit)} USDC</span>
                    </div>
                    <div className={styles.planDetailRow}>
                      <span>Max Deposit:</span>
                      <span>{formatUSDC(plan.maxDeposit)} USDC</span>
                    </div>
                    <div className={styles.planDetailRow}>
                      <span>Penalty:</span>
                      <span>{(plan.earlyWithdrawPenaltyBps / 100).toFixed(2)}%</span>
                    </div>
                  </div>

                  <div className={styles.planActions}>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => startEditPlan(plan)}
                    >
                      <Edit size={16} />
                      Edit
                    </Button>
                    <Button
                      variant={plan.enabled ? 'danger' : 'primary'}
                      size="sm"
                      onClick={() => handleTogglePlan(plan.planId, plan.enabled)}
                      loading={loading}
                    >
                      <Power size={16} />
                      {plan.enabled ? 'Disable' : 'Enable'}
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Withdrawals Tab (closed deposits: early withdrawn, withdrawn at maturity, renewed) */}
        {activeTab === 'withdrawals' && (
          <div className={styles.withdrawalsTab}>
            <div className={styles.withdrawalsHeader}>
              <div className={styles.sectionTitle}>
                <History size={24} />
                <h2>Withdrawal History</h2>
              </div>
              <Button variant="secondary" size="sm" onClick={() => loadDeposits()} title="Làm mới danh sách">
                Làm mới
              </Button>
            </div>
            <p className={styles.withdrawalsIntro}>
              Deposits that have been closed (early withdrawn, withdrawn at maturity, or renewed). Early-withdraw penalty flows into InterestVault.
            </p>

            {(() => {
              const earlyWithdrawn = deposits.filter((d: DepositWithOwner) => d.status === DepositStatus.EarlyWithdrawn);
              const withdrawn = deposits.filter((d: DepositWithOwner) => d.status === DepositStatus.Withdrawn);
              const renewed = deposits.filter((d: DepositWithOwner) => d.status === DepositStatus.Renewed);

              const findPlan = (planId: bigint): Plan | undefined => plans.find((p) => p.planId === planId);
              const penaltyAmount = (principal: bigint, penaltyBps: number) =>
                (principal * BigInt(penaltyBps)) / 10000n;

              return (
                <>
                  <div className={styles.withdrawalsSection}>
                    <h3 className={styles.withdrawalsSectionTitle}>
                      <AlertTriangle size={20} />
                      Rút sớm (Early Withdrawn) — {earlyWithdrawn.length}
                    </h3>
                    <p className={styles.withdrawalsSectionDesc}>
                      Tiền phạt chảy vào InterestVault. Admin có thể đối chiếu với số dư InterestVault.
                    </p>
                    {earlyWithdrawn.length === 0 ? (
                      <p className={styles.emptyList}>Chưa có giao dịch rút sớm.</p>
                    ) : (
                      <div className={styles.withdrawalsTableWrap}>
                        <table className={styles.withdrawalsTable}>
                          <thead>
                            <tr>
                              <th>NFT #</th>
                              <th>Owner</th>
                              <th>Plan</th>
                              <th>Principal</th>
                              <th>Penalty %</th>
                              <th>Penalty (USDC)</th>
                            </tr>
                          </thead>
                          <tbody>
                            {earlyWithdrawn.map((d: DepositWithOwner) => {
                              const plan = findPlan(d.planId);
                              const penaltyBps = plan?.earlyWithdrawPenaltyBps ?? 0;
                              const penalty = penaltyAmount(d.principal, penaltyBps);
                              return (
                                <tr key={d.tokenId.toString()}>
                                  <td className={styles.mono}>#{d.tokenId.toString()}</td>
                                  <td>{renderOwnerCell(d.owner)}</td>
                                  <td>{plan?.name ?? `#${d.planId}`}</td>
                                  <td className={styles.mono}>{formatUSDC(d.principal)} USDC</td>
                                  <td className={styles.mono}>{(penaltyBps / 100).toFixed(2)}%</td>
                                  <td className={styles.mono}>{formatUSDC(penalty)} USDC</td>
                                </tr>
                              );
                            })}
                          </tbody>
                        </table>
                      </div>
                    )}
                  </div>

                  <div className={styles.withdrawalsSection}>
                    <h3 className={styles.withdrawalsSectionTitle}>
                      <CheckCircle size={20} />
                      Rút đúng hạn (Withdrawn at Maturity) — {withdrawn.length}
                    </h3>
                    {withdrawn.length === 0 ? (
                      <p className={styles.emptyList}>Chưa có giao dịch rút đúng hạn.</p>
                    ) : (
                      <div className={styles.withdrawalsTableWrap}>
                        <table className={styles.withdrawalsTable}>
                          <thead>
                            <tr>
                              <th>NFT #</th>
                              <th>Owner</th>
                              <th>Plan</th>
                              <th>Principal</th>
                            </tr>
                          </thead>
                          <tbody>
                            {withdrawn.map((d: DepositWithOwner) => {
                              const plan = findPlan(d.planId);
                              return (
                                <tr key={d.tokenId.toString()}>
                                  <td className={styles.mono}>#{d.tokenId.toString()}</td>
                                  <td>{renderOwnerCell(d.owner)}</td>
                                  <td>{plan?.name ?? `#${d.planId}`}</td>
                                  <td className={styles.mono}>{formatUSDC(d.principal)} USDC</td>
                                </tr>
                              );
                            })}
                          </tbody>
                        </table>
                      </div>
                    )}
                  </div>

                  <div className={styles.withdrawalsSection}>
                    <h3 className={styles.withdrawalsSectionTitle}>
                      <Clock size={20} />
                      Đã gia hạn (Renewed) — {renewed.length}
                    </h3>
                    {renewed.length === 0 ? (
                      <p className={styles.emptyList}>Chưa có giao dịch gia hạn.</p>
                    ) : (
                      <div className={styles.withdrawalsTableWrap}>
                        <table className={styles.withdrawalsTable}>
                          <thead>
                            <tr>
                              <th>NFT #</th>
                              <th>Owner</th>
                              <th>Plan</th>
                              <th>Principal</th>
                            </tr>
                          </thead>
                          <tbody>
                            {renewed.map((d: DepositWithOwner) => {
                              const plan = findPlan(d.planId);
                              return (
                                <tr key={d.tokenId.toString()}>
                                  <td className={styles.mono}>#{d.tokenId.toString()}</td>
                                  <td>{renderOwnerCell(d.owner)}</td>
                                  <td>{plan?.name ?? `#${d.planId}`}</td>
                                  <td className={styles.mono}>{formatUSDC(d.principal)} USDC</td>
                                </tr>
                              );
                            })}
                          </tbody>
                        </table>
                      </div>
                    )}
                  </div>
                </>
              );
            })()}
          </div>
        )}

        {/* Users Tab */}
        {activeTab === 'users' && (
          <div className={styles.usersTab}>
            <div className={styles.sectionTitle}>
              <Users size={24} />
              <h2>Registered Users ({uniqueUsers})</h2>
            </div>

            <div className={styles.usersTable}>
              <div className={styles.tableHeader}>
                <div className={styles.tableCol}>User Address</div>
                <div className={styles.tableCol}>Total Deposits</div>
                <div className={styles.tableCol}>Active</div>
                <div className={styles.tableCol}>Total Amount</div>
              </div>

              {userList.map((user: any) => (
                <div key={user.address} className={styles.tableRow}>
                  <div className={styles.tableCol}>
                    <Wallet size={16} />
                    <div className={styles.addressWithCopy}>
                      <code className={styles.userAddress}>{user.address}</code>
                      <button
                        className={styles.copyButton}
                        onClick={() => copyToClipboard(user.address)}
                        title="Copy address"
                      >
                        {copiedAddress === user.address ? <Check size={14} /> : <Copy size={14} />}
                      </button>
                    </div>
                  </div>
                  <div className={styles.tableCol}>
                    <span className={styles.badge}>{user.depositCount}</span>
                  </div>
                  <div className={styles.tableCol}>
                    <span className={styles.badge}>{user.activeDeposits}</span>
                  </div>
                  <div className={styles.tableCol}>
                    <span className={styles.amount}>{formatUSDC(user.totalDeposited)} USDC</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Settings Tab */}
        {activeTab === 'settings' && (
          <div className={styles.settingsTab}>
            <div className={styles.sectionTitle}>
              <Settings size={24} />
              <h2>Platform Settings</h2>
            </div>

            <div className={styles.settingsCard}>
              <h3>
                <DollarSign size={20} />
                Fund Interest Vault
              </h3>
              <p>Deposit USDC into the Interest Vault to cover interest payments</p>

              {vaultStats && (
                <div className={styles.vaultCurrentStats}>
                  <div className={styles.vaultCurrentRow}>
                    <span>InterestVault total balance:</span>
                    <strong>{formatUSDC(BigInt(vaultStats.totalInterest))} USDC</strong>
                  </div>
                  <div className={styles.vaultCurrentRow}>
                    <span>Available (withdrawable by admin):</span>
                    <strong>{formatUSDC(BigInt(vaultStats.availableInterest))} USDC</strong>
                  </div>
                  <div className={styles.vaultCurrentRow}>
                    <span>Reserved (for active deposits):</span>
                    <strong>{formatUSDC(BigInt(vaultStats.reservedInterest))} USDC</strong>
                  </div>
                </div>
              )}

              <form onSubmit={handleFundInterestVault} className={styles.settingsForm}>
                <div className={styles.inputGroup}>
                  <label>Amount (USDC)</label>
                  <input
                    type="number"
                    placeholder="1000"
                    value={fundAmount}
                    onChange={(e) => setFundAmount(e.target.value)}
                    className={styles.addressInput}
                    required
                    min="0"
                    step="0.01"
                  />
                </div>
                <Button type="submit" loading={loading}>
                  Fund Interest Vault
                </Button>
              </form>
            </div>

            <div className={styles.settingsCard}>
              <h3>
                <DollarSign size={20} />
                Rút từ Interest Vault
              </h3>
              <p>Rút USDC từ Interest Vault về ví admin. Chỉ rút được phần Available (không rút được Reserved).</p>

              {vaultStats && (
                <div className={styles.vaultCurrentStats}>
                  <div className={styles.vaultCurrentRow}>
                    <span>Available (có thể rút):</span>
                    <strong>{formatUSDC(BigInt(vaultStats.availableInterest))} USDC</strong>
                  </div>
                  <div className={styles.vaultCurrentRow}>
                    <span>Reserved (cho deposit đang mở):</span>
                    <strong>{formatUSDC(BigInt(vaultStats.reservedInterest))} USDC</strong>
                  </div>
                </div>
              )}

              <form onSubmit={handleWithdrawInterestVault} className={styles.settingsForm}>
                <div className={styles.inputGroup}>
                  <label>Số tiền rút (USDC)</label>
                  <input
                    type="number"
                    placeholder="0"
                    value={withdrawAmount}
                    onChange={(e) => setWithdrawAmount(e.target.value)}
                    className={styles.addressInput}
                    required
                    min="0"
                    step="0.01"
                  />
                </div>
                <Button type="submit" loading={loading} variant="secondary">
                  Rút về ví
                </Button>
              </form>
            </div>

            <div className={styles.settingsCard}>
              <h3>
                <Power size={20} />
                Pause / Unpause Contract
              </h3>
              <p>Khi contract bị pause, user không thể deposit hoặc withdraw. Chỉ admin có thể bật lại.</p>
              {isPaused !== null && (
                <div className={styles.vaultCurrentStats}>
                  <div className={styles.vaultCurrentRow}>
                    <span>Trạng thái:</span>
                    <strong className={isPaused ? styles.statusPaused : styles.statusActive}>
                      {isPaused ? 'Đang tạm dừng' : 'Đang hoạt động'}
                    </strong>
                  </div>
                </div>
              )}
              <div className={styles.settingsForm} style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
                {isPaused === true && (
                  <Button type="button" onClick={handleUnpause} loading={loading}>
                    Bật lại (Unpause)
                  </Button>
                )}
                {isPaused === false && (
                  <Button type="button" onClick={handlePause} loading={loading} variant="secondary">
                    Tạm dừng (Pause)
                  </Button>
                )}
              </div>
            </div>

            <div className={styles.settingsCard}>
              <h3>
                <Shield size={20} />
                Admin Information
              </h3>
              <div className={styles.adminInfo}>
                <div className={styles.infoRow}>
                  <span>Your Address:</span>
                  <code>{address}</code>
                </div>
                <div className={styles.infoRow}>
                  <span>Role:</span>
                  <span className={styles.roleAdmin}>Administrator</span>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Create/Edit Plan Modal */}
      {showCreatePlanModal && (
        <>
          <div className={styles.modalBackdrop} onClick={() => setShowCreatePlanModal(false)} />
          <div className={styles.modal}>
            <div className={styles.modalHeader}>
              <h2>{editingPlan ? 'Edit Plan' : 'Create New Plan'}</h2>
              <button className={styles.closeBtn} onClick={() => setShowCreatePlanModal(false)}>×</button>
            </div>

            <form onSubmit={editingPlan ? handleUpdatePlan : handleCreatePlan} className={styles.modalForm}>
              <div className={styles.formGroup}>
                <label>Plan Name</label>
                <input
                  type="text"
                  value={planFormData.name}
                  onChange={(e) => setPlanFormData({ ...planFormData, name: e.target.value })}
                  required
                  disabled={!!editingPlan}
                  placeholder="Standard Plan"
                />
              </div>

              <div className={styles.formGroup}>
                <label>Duration (Days)</label>
                <input
                  type="number"
                  value={planFormData.durationDays}
                  onChange={(e) => setPlanFormData({ ...planFormData, durationDays: e.target.value })}
                  required
                  disabled={!!editingPlan}
                />
              </div>

              <div className={styles.formGroup}>
                <label>APR (Basis Points)</label>
                <input
                  type="number"
                  value={planFormData.aprBps}
                  onChange={(e) => setPlanFormData({ ...planFormData, aprBps: e.target.value })}
                  placeholder="600 = 6%"
                  required
                />
                <span className={styles.hint}>{(Number(planFormData.aprBps) / 100).toFixed(2)}%</span>
              </div>

              <div className={styles.formGroup}>
                <label>Minimum Deposit (USDC)</label>
                <input
                  type="text"
                  value={planFormData.minDeposit}
                  onChange={(e) => setPlanFormData({ ...planFormData, minDeposit: e.target.value })}
                  required
                />
              </div>

              <div className={styles.formGroup}>
                <label>Maximum Deposit (USDC)</label>
                <input
                  type="text"
                  value={planFormData.maxDeposit}
                  onChange={(e) => setPlanFormData({ ...planFormData, maxDeposit: e.target.value })}
                  required
                />
              </div>

              <div className={styles.formGroup}>
                <label>Early Withdrawal Penalty (Basis Points)</label>
                <input
                  type="number"
                  value={planFormData.penaltyBps}
                  onChange={(e) => setPlanFormData({ ...planFormData, penaltyBps: e.target.value })}
                  placeholder="300 = 3%"
                  required
                />
                <span className={styles.hint}>{(Number(planFormData.penaltyBps) / 100).toFixed(2)}%</span>
              </div>

              {error && <div className={styles.error}>{error}</div>}

              <div className={styles.modalActions}>
                <Button type="button" variant="outline" onClick={() => setShowCreatePlanModal(false)}>
                  Cancel
                </Button>
                <Button type="submit" loading={loading}>
                  {editingPlan ? 'Update Plan' : 'Create Plan'}
                </Button>
              </div>
            </form>
          </div>
        </>
      )}
    </div>
  );
};
