import { useState, useCallback } from 'react';
import { Contract } from 'ethers';
import { useContracts } from '../context/ContractContext';
import { useWallet } from '../context/WalletContext';
import type { Deposit } from '../types';
import { parseUSDC } from '../utils/formatters';

export const useDeposit = () => {
  const { savingsBankContract, depositNFTContract, tokenVaultContract, usdcContract, provider } = useContracts();
  const { address } = useWallet();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [txHash, setTxHash] = useState<string | null>(null);

  const openDeposit = useCallback(async (
    planId: number,
    amount: string,
    enableAutoRenew: boolean = false
  ): Promise<boolean> => {
    if (!savingsBankContract || !tokenVaultContract || !usdcContract || !provider || !address) {
      setError('Wallet not connected');
      return false;
    }

    try {
      setLoading(true);
      setError(null);
      setTxHash(null);

      const signer = await provider.getSigner();
      const amountWei = parseUSDC(amount);

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
      setError(err.message || 'Failed to open deposit');
      console.error('Error opening deposit:', err);
      return false;
    } finally {
      setLoading(false);
    }
  }, [savingsBankContract, tokenVaultContract, usdcContract, provider, address]);

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

  // Fetch ALL deposits (for admin)
  const fetchAllDeposits = useCallback(async (): Promise<Deposit[]> => {
    if (!savingsBankContract || !depositNFTContract) return [];

    try {
      const deposits: Deposit[] = [];

      // Get total supply of NFTs
      const totalSupply = await depositNFTContract.totalSupply();
      const totalNum = Number(totalSupply);

      // Fetch all deposits by token ID
      for (let i = 0; i < totalNum; i++) {
        try {
          // Get token ID by index
          const tokenId = await depositNFTContract.tokenByIndex(i);

          const [
            planId,
            principal,
            startTime,
            maturityTime,
            lockedAprBps,
            isAutoRenewEnabled,
            status,
          ] = await savingsBankContract.getDepositDetails(tokenId);

          deposits.push({
            tokenId,
            planId,
            principal,
            startTime,
            maturityTime,
            lockedAprBps: Number(lockedAprBps),
            isAutoRenewEnabled,
            status: Number(status),
          });
        } catch (err) {
          console.error(`Error fetching deposit at index ${i}:`, err);
        }
      }

      return deposits.sort((a, b) => Number(b.tokenId - a.tokenId));
    } catch (err: any) {
      console.error('Error fetching all deposits:', err);
      return [];
    }
  }, [savingsBankContract, depositNFTContract]);

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

  const renewDeposit = useCallback(async (
    tokenId: number,
    useCurrentRate: boolean = true,
    newPlanId?: number
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

      // New signature: renew(tokenId, useCurrentRate, newPlanId)
      const planId = newPlanId || 0; // 0 means use same plan
      const tx = await savingsBankWithSigner.renew(tokenId, useCurrentRate, planId);
      setTxHash(tx.hash);

      await tx.wait();
      console.log('Deposit renewed:', tx.hash);

      return true;
    } catch (err: any) {
      setError(err.message || 'Failed to renew deposit');
      console.error('Error renewing deposit:', err);
      return false;
    } finally {
      setLoading(false);
    }
  }, [savingsBankContract, provider]);

  return {
    openDeposit,
    fetchUserDeposits,
    fetchAllDeposits,
    withdrawAtMaturity,
    earlyWithdraw,
    renewDeposit,
    loading,
    error,
    txHash,
  };
};
