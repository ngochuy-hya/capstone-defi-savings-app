import { useState, useCallback } from 'react';
import { Contract } from 'ethers';
import { useContracts } from '../context/ContractContext';
import { useWallet } from '../context/WalletContext';
import type { Deposit } from '../types';
import { parseUSDC, formatUSDC } from '../utils/formatters';
import { calculateInterest } from '../utils/calculator';
import { decodeOpenDepositRevert } from '../utils/decodeRevert';

export const useDeposit = () => {
  const { savingsBankContract, tokenVaultContract, interestVaultContract, usdcContract, provider } = useContracts();
  const { address } = useWallet();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [txHash, setTxHash] = useState<string | null>(null);

  const openDeposit = useCallback(async (
    planId: number,
    amount: string,
    enableAutoRenew: boolean = false
  ): Promise<boolean> => {
    if (!savingsBankContract || !tokenVaultContract || !interestVaultContract || !usdcContract || !provider || !address) {
      setError('Wallet not connected');
      return false;
    }

    try {
      setLoading(true);
      setError(null);
      setTxHash(null);

      const amountWei = parseUSDC(amount);

      // Pre-check: plan exists and is active
      const plan = await savingsBankContract.savingPlans(planId);
      const planActive = plan?.isActive ?? false;
      if (!planActive) {
        setError('Plan không khả dụng hoặc đã bị tắt. Vui lòng chọn plan khác.');
        return false;
      }

      const durationDays = Number(plan.durationDays ?? 0);
      const aprBps = Number(plan.aprBps ?? 0);
      if (durationDays <= 0) {
        setError('Plan không hợp lệ (duration).');
        return false;
      }

      // Pre-check: estimated interest must be covered by InterestVault
      const estimatedInterest = calculateInterest(amountWei, aprBps, durationDays);
      const availableBalance = await interestVaultContract.availableBalance();
      if (availableBalance < estimatedInterest) {
        setError(
          `InterestVault không đủ liquidity để trả lãi (cần ~${formatUSDC(estimatedInterest)} USDC, có ${formatUSDC(availableBalance)} USDC). Admin cần nạp thêm USDC vào vault.`
        );
        return false;
      }

      // Pre-check: user balance
      const userBalance = await usdcContract.balanceOf(address);
      if (userBalance < amountWei) {
        setError(`Ví không đủ USDC. Cần ${amount} USDC, có ${formatUSDC(userBalance)} USDC.`);
        return false;
      }

      const signer = await provider.getSigner();

      // Step 1: Approve USDC
      console.log('Approving USDC...');
      const usdcWithSigner = usdcContract.connect(signer) as Contract;
      const approveTx = await usdcWithSigner.approve(
        tokenVaultContract.target,
        amountWei
      );
      await approveTx.wait();
      console.log('USDC approved:', approveTx.hash);

      // Step 2: Open deposit
      console.log('Opening deposit...');
      const savingsBankWithSigner = savingsBankContract.connect(signer) as Contract;
      const depositTx = await savingsBankWithSigner.openDeposit(planId, amountWei, enableAutoRenew);
      setTxHash(depositTx.hash);

      await depositTx.wait();
      console.log('Deposit opened:', depositTx.hash);

      return true;
    } catch (err: any) {
      const revertData = err?.data ?? err?.error?.data ?? err?.info?.data;
      const decoded = revertData ? decodeOpenDepositRevert(revertData) : null;
      const msg = String(err?.reason ?? err?.message ?? '');
      const isRevert = msg.includes('revert') || err?.code === 'CALL_EXCEPTION';
      const friendly = decoded
        ? decoded
        : isRevert
          ? 'Giao dịch bị từ chối trên chain. Kiểm tra: số tiền (min/max), plan đang bật, InterestVault đủ liquidity, ví đủ USDC.'
          : msg || 'Failed to open deposit';
      setError(friendly);
      console.error('Error opening deposit:', err);
      return false;
    } finally {
      setLoading(false);
    }
  }, [savingsBankContract, tokenVaultContract, interestVaultContract, usdcContract, provider, address]);

  const fetchUserDeposits = useCallback(async (): Promise<Deposit[]> => {
    if (!savingsBankContract || !address) return [];

    try {
      const depositIds: bigint[] = await savingsBankContract.getUserDeposits(address);
      const deposits: Deposit[] = [];

      for (const depositId of depositIds) {
        try {
          const [
            planId,
            principal,
            startTime,
            maturityTime,
            lockedAprBps,
            isAutoRenewEnabled,
            status,
          ] = await savingsBankContract.getDepositDetails(depositId);

          deposits.push({
            tokenId: depositId,
            planId,
            principal,
            startTime,
            maturityTime,
            lockedAprBps: Number(lockedAprBps),
            isAutoRenewEnabled,
            status: Number(status),
          });
        } catch (err) {
          console.error(`Error fetching deposit details for ${depositId.toString()}:`, err);
        }
      }

      return deposits.sort((a, b) => Number(b.tokenId - a.tokenId));
    } catch (err: any) {
      console.error('Error fetching deposits:', err);
      return [];
    }
  }, [savingsBankContract, address]);

  /** Fetch deposit details by IDs (for closed/history — NFT already burned but record exists on chain). */
  const fetchDepositDetailsByIds = useCallback(async (ids: bigint[]): Promise<Deposit[]> => {
    if (!savingsBankContract || ids.length === 0) return [];

    const results: Deposit[] = [];
    for (const depositId of ids) {
      try {
        const [
          planId,
          principal,
          startTime,
          maturityTime,
          lockedAprBps,
          isAutoRenewEnabled,
          status,
        ] = await savingsBankContract.getDepositDetails(depositId);

        results.push({
          tokenId: depositId,
          planId,
          principal,
          startTime,
          maturityTime,
          lockedAprBps: Number(lockedAprBps),
          isAutoRenewEnabled,
          status: Number(status),
        });
      } catch {
        // Deposit may not exist (e.g. invalid id); skip
      }
    }
    return results.sort((a, b) => Number(b.tokenId - a.tokenId));
  }, [savingsBankContract]);

  // Fetch ALL deposits (for admin) — including closed (withdrawn / early withdrawn / renewed).
  // Uses nextDepositId so we get every deposit ever created; NFT enumeration would miss burned tokens.
  const fetchAllDeposits = useCallback(async (): Promise<Deposit[]> => {
    if (!savingsBankContract) return [];

    try {
      const nextId: bigint = await savingsBankContract.nextDepositId();
      const deposits: Deposit[] = [];

      for (let id = 1; id < Number(nextId); id++) {
        try {
          const [
            planId,
            principal,
            startTime,
            maturityTime,
            lockedAprBps,
            isAutoRenewEnabled,
            status,
          ] = await savingsBankContract.getDepositDetails(BigInt(id));

          deposits.push({
            tokenId: BigInt(id),
            planId,
            principal,
            startTime,
            maturityTime,
            lockedAprBps: Number(lockedAprBps),
            isAutoRenewEnabled,
            status: Number(status),
          });
        } catch (err) {
          console.error(`Error fetching deposit details for id ${id}:`, err);
        }
      }

      return deposits.sort((a, b) => Number(b.tokenId - a.tokenId));
    } catch (err: any) {
      console.error('Error fetching all deposits:', err);
      return [];
    }
  }, [savingsBankContract]);

  const withdrawAtMaturity = useCallback(async (
    tokenId: number
  ): Promise<boolean> => {
    if (!savingsBankContract || !provider) {
      setError('Wallet not connected');
      return false;
    }

    try {
      setLoading(true);
      setError(null);
      setTxHash(null);

      const signer = await provider.getSigner();
      const savingsBankWithSigner = savingsBankContract.connect(signer) as Contract;

      const tx = await savingsBankWithSigner.withdraw(tokenId);
      setTxHash(tx.hash);

      await tx.wait();
      console.log('Withdrawn at maturity:', tx.hash);

      return true;
    } catch (err: any) {
      setError(err.message || 'Failed to withdraw');
      console.error('Error withdrawing:', err);
      return false;
    } finally {
      setLoading(false);
    }
  }, [savingsBankContract, provider]);

  const earlyWithdraw = useCallback(async (
    tokenId: number
  ): Promise<boolean> => {
    if (!savingsBankContract || !provider) {
      setError('Wallet not connected');
      return false;
    }

    try {
      setLoading(true);
      setError(null);
      setTxHash(null);

      const signer = await provider.getSigner();
      const savingsBankWithSigner = savingsBankContract.connect(signer) as Contract;

      const tx = await savingsBankWithSigner.earlyWithdraw(tokenId);
      setTxHash(tx.hash);

      await tx.wait();
      console.log('Early withdraw:', tx.hash);

      return true;
    } catch (err: any) {
      setError(err.message || 'Failed to early withdraw');
      console.error('Error early withdrawing:', err);
      return false;
    } finally {
      setLoading(false);
    }
  }, [savingsBankContract, provider]);

  // Auto-renew: compounds interest with LOCKED APR, within 2 days after maturity
  const renewDeposit = useCallback(async (tokenId: number): Promise<boolean> => {
    if (!savingsBankContract || !provider) {
      setError('Wallet not connected');
      return false;
    }

    try {
      setLoading(true);
      setError(null);
      setTxHash(null);

      const signer = await provider.getSigner();
      const savingsBankWithSigner = savingsBankContract.connect(signer) as Contract;

      const tx = await savingsBankWithSigner.autoRenew(tokenId);
      setTxHash(tx.hash);

      await tx.wait();
      console.log('Deposit auto-renewed:', tx.hash);

      return true;
    } catch (err: any) {
      setError(err.message || 'Failed to auto-renew deposit');
      console.error('Error auto-renewing deposit:', err);
      return false;
    } finally {
      setLoading(false);
    }
  }, [savingsBankContract, provider]);

  const clearError = useCallback(() => {
    setError(null);
  }, []);

  return {
    openDeposit,
    fetchUserDeposits,
    fetchDepositDetailsByIds,
    fetchAllDeposits,
    withdrawAtMaturity,
    earlyWithdraw,
    renewDeposit,
    clearError,
    loading,
    error,
    txHash,
  };
};
