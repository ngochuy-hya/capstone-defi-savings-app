import React, { createContext, useContext, useMemo } from 'react';
import type { ReactNode } from 'react';
import { Contract } from 'ethers';
import { useWallet } from './WalletContext';
import { CONTRACTS } from '../data/contracts';
import type { ContractContextType } from '../types';

const ContractContext = createContext<ContractContextType | undefined>(undefined);

export const ContractProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const { provider, isConnected } = useWallet();

  const contracts = useMemo(() => {
    if (!provider || !isConnected) {
      return {
        provider: null,
        savingsBankContract: null,
        tokenVaultContract: null,
        interestVaultContract: null,
        depositNFTContract: null,
        usdcContract: null,
      };
    }

    // Create contract instances (read-only for now, will use signer for transactions)
    const savingsBankContract = new Contract(
      CONTRACTS.SavingsBank.address,
      CONTRACTS.SavingsBank.abi.abi as any,
      provider
    );

    const tokenVaultContract = new Contract(
      CONTRACTS.TokenVault.address,
      CONTRACTS.TokenVault.abi.abi as any,
      provider
    );

    const interestVaultContract = new Contract(
      CONTRACTS.InterestVault.address,
      CONTRACTS.InterestVault.abi.abi as any,
      provider
    );

    const depositNFTContract = new Contract(
      CONTRACTS.DepositNFT.address,
      CONTRACTS.DepositNFT.abi.abi as any,
      provider
    );

    const usdcContract = new Contract(
      CONTRACTS.MockUSDC.address,
      CONTRACTS.MockUSDC.abi.abi as any,
      provider
    );

    return {
      provider,
      savingsBankContract,
      tokenVaultContract,
      interestVaultContract,
      depositNFTContract,
      usdcContract,
    };
  }, [provider, isConnected]);

  return (
    <ContractContext.Provider value={contracts}>
      {children}
    </ContractContext.Provider>
  );
};

export const useContracts = () => {
  const context = useContext(ContractContext);
  if (!context) {
    throw new Error('useContracts must be used within ContractProvider');
  }
  return context;
};
