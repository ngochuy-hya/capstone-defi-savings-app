import { useState } from 'react';
import { useWallet } from '../context/WalletContext';
import { useContracts } from '../context/ContractContext';
import { CONTRACTS } from '../data/contracts';

export const useAdmin = () => {
  const { provider } = useWallet();
  const { savingsBankContract, tokenVaultContract, interestVaultContract, usdcContract } = useContracts();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [txHash, setTxHash] = useState<string | null>(null);

  // Create new saving plan
  const createPlan = async (
    name: string,
    durationDays: number,
    aprBps: number,
    minDeposit: string,
    maxDeposit: string,
    penaltyBps: number
  ) => {
    if (!provider || !savingsBankContract) {
      setError('Provider or contract not available');
      return false;
    }

    try {
      setLoading(true);
      setError(null);
      setTxHash(null);

      const signer = await provider.getSigner();
      const contract = savingsBankContract.connect(signer);

      const minDepositWei = BigInt(Math.floor(parseFloat(minDeposit) * 1000000));
      const maxDepositWei = BigInt(Math.floor(parseFloat(maxDeposit) * 1000000));

      // New signature: createPlan(name, durationDays, minDeposit, maxDeposit, aprBps, earlyWithdrawPenaltyBps)
      const tx = await contract.createPlan(
        name,
        durationDays,
        minDepositWei,
        maxDepositWei,
        aprBps,
        penaltyBps
      );

      setTxHash(tx.hash);
      await tx.wait();

      setLoading(false);
      return true;
    } catch (err: any) {
      console.error('Create plan error:', err);
      setError(err.message || 'Failed to create plan');
      setLoading(false);
      return false;
    }
  };

  // Update existing plan
  const updatePlan = async (
    planId: number,
    aprBps: number,
    minDeposit: string,
    maxDeposit: string,
    penaltyBps: number,
    enabled: boolean
  ) => {
    if (!provider || !savingsBankContract) {
      setError('Provider or contract not available');
      return false;
    }

    try {
      setLoading(true);
      setError(null);
      setTxHash(null);

      const signer = await provider.getSigner();
      const contract = savingsBankContract.connect(signer);

      // Current contract does not update these fields (kept for UI compatibility)
      void minDeposit;
      void maxDeposit;

      // SavingsBank.updatePlan signature: updatePlan(planId, aprBps, earlyWithdrawPenaltyBps)
      // Note: min/max deposits are not updatable in the current contract.
      const tx = await contract.updatePlan(planId, aprBps, penaltyBps);

      setTxHash(tx.hash);
      await tx.wait();

      // SavingsBank.enablePlan controls plan active status
      const enableTx = await contract.enablePlan(planId, enabled);
      setTxHash(enableTx.hash);
      await enableTx.wait();

      setLoading(false);
      return true;
    } catch (err: any) {
      console.error('Update plan error:', err);
      setError(err.message || 'Failed to update plan');
      setLoading(false);
      return false;
    }
  };

  // Toggle plan enabled status
  const togglePlan = async (planId: number, enabled: boolean) => {
    if (!provider || !savingsBankContract) {
      setError('Provider or contract not available');
      return false;
    }

    try {
      setLoading(true);
      setError(null);

      const signer = await provider.getSigner();
      const contract = savingsBankContract.connect(signer);

      const tx = await contract.enablePlan(planId, enabled);

      await tx.wait();
      setLoading(false);
      return true;
    } catch (err: any) {
      console.error('Toggle plan error:', err);
      setError(err.message || 'Failed to toggle plan');
      setLoading(false);
      return false;
    }
  };

  // Get vault statistics
  const getVaultStats = async () => {
    if (!tokenVaultContract || !interestVaultContract || !savingsBankContract) return null;

    try {
      // Query the new vault contracts
      let totalPrincipal = BigInt(0);
      let totalInterest = BigInt(0);
      let availableInterest = BigInt(0);

      try {
        // Get balance from TokenVault (holds principal)
        totalPrincipal = await tokenVaultContract.balance();
      } catch (e) {
        console.log('Error getting TokenVault balance:', e);
      }

      try {
        // Get balance and available balance from InterestVault
        totalInterest = await interestVaultContract.balance();
        availableInterest = await interestVaultContract.availableBalance();
      } catch (e) {
        console.log('Error getting InterestVault balance:', e);
      }

      return {
        totalPrincipal: totalPrincipal.toString(),
        totalInterest: totalInterest.toString(),
        availableInterest: availableInterest.toString(),
        reservedInterest: (totalInterest - availableInterest).toString(),
      };
    } catch (err) {
      console.error('Get vault stats  error:', err);
      return {
        totalPrincipal: '0',
        totalInterest: '0',
        availableInterest: '0',
        reservedInterest: '0',
      };
    }
  };

  // Emergency pause
  const emergencyPause = async () => {
    if (!provider || !savingsBankContract) {
      setError('Provider or contract not available');
      return false;
    }

    try {
      setLoading(true);
      setError(null);

      const signer = await provider.getSigner();
      const contract = savingsBankContract.connect(signer);

      const tx = await contract.pause();
      await tx.wait();

      setLoading(false);
      return true;
    } catch (err: any) {
      console.error('Emergency pause error:', err);
      setError(err.message || 'Failed to pause contract');
      setLoading(false);
      return false;
    }
  };

  // Unpause
  const unpause = async () => {
    if (!provider || !savingsBankContract) {
      setError('Provider or contract not available');
      return false;
    }

    try {
      setLoading(true);
      setError(null);

      const signer = await provider.getSigner();
      const contract = savingsBankContract.connect(signer);

      const tx = await contract.unpause();
      await tx.wait();

      setLoading(false);
      return true;
    } catch (err: any) {
      console.error('Unpause error:', err);
      setError(err.message || 'Failed to unpause contract');
      setLoading(false);
      return false;
    }
  };

  // Fund interest vault (admin function to add liquidity)
  // Flow: admin approves InterestVault to spend USDC, then calls SavingsBank.fundVault(amount).
  // SavingsBank (owner of InterestVault) calls InterestVault.deposit(admin, amount) to pull USDC.
  const fundInterestVault = async (amount: string) => {
    if (!provider || !savingsBankContract || !usdcContract) {
      setError('Provider or contracts not available');
      return false;
    }

    try {
      setLoading(true);
      setError(null);
      setTxHash(null);

      const signer = await provider.getSigner();
      const amountWei = BigInt(Math.floor(parseFloat(amount) * 1000000));
      const interestVaultAddress = CONTRACTS.InterestVault.address;

      // 1. Approve InterestVault to pull USDC from admin
      const usdcWithSigner = usdcContract.connect(signer);
      const approveTx = await usdcWithSigner.approve(interestVaultAddress, amountWei);
      await approveTx.wait();

      // 2. SavingsBank.fundVault(amount) → calls InterestVault.deposit(msg.sender, amount)
      const savingsBankWithSigner = savingsBankContract.connect(signer);
      const tx = await savingsBankWithSigner.fundVault(amountWei);
      setTxHash(tx.hash);
      await tx.wait();

      setLoading(false);
      return true;
    } catch (err: any) {
      console.error('Fund interest vault error:', err);
      setError(err.message || 'Failed to fund interest vault');
      setLoading(false);
      return false;
    }
  };

  // Withdraw from InterestVault (admin only — only available balance, not reserved)
  const withdrawInterestVault = async (amount: string) => {
    if (!provider || !savingsBankContract) {
      setError('Provider or contract not available');
      return false;
    }

    try {
      setLoading(true);
      setError(null);
      setTxHash(null);

      const amountWei = BigInt(Math.floor(parseFloat(amount) * 1000000));
      if (amountWei <= 0n) {
        setError('Amount must be greater than 0');
        setLoading(false);
        return false;
      }

      const savingsBankWithSigner = savingsBankContract.connect(await provider.getSigner());
      const tx = await savingsBankWithSigner.withdrawVault(amountWei);
      setTxHash(tx.hash);
      await tx.wait();

      setLoading(false);
      return true;
    } catch (err: any) {
      console.error('Withdraw interest vault error:', err);
      setError(err.message || 'Failed to withdraw from interest vault');
      setLoading(false);
      return false;
    }
  };

  return {
    createPlan,
    updatePlan,
    togglePlan,
    getVaultStats,
    emergencyPause,
    unpause,
    fundInterestVault,
    withdrawInterestVault,
    loading,
    error,
    txHash,
  };
};
