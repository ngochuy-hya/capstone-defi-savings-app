import { BrowserProvider } from 'ethers';
import type { PlanOffchainMetadataEntry } from '../data/planMetadata';

// Wallet types
export interface WalletState {
  address: string | null;
  chainId: number | null;
  balance: string;
  isConnected: boolean;
  isConnecting: boolean;
  error: string | null;
}

// Plan type from contract (updated for new architecture)
export interface Plan {
  planId: bigint;
  name: string; // Added in new architecture
  durationDays: number; // Renamed from tenorDays
  aprBps: number;
  minDeposit: bigint;
  maxDeposit: bigint;
  earlyWithdrawPenaltyBps: number; // Now called earlyWithdrawPenaltyBps in contract
  enabled: boolean;
  /**
   * Optional off-chain metadata (loaded from `public/plan-metadata.json`).
   * This does NOT come from the contract; it's purely for UI/marketing content.
   */
  metadata?: PlanOffchainMetadataEntry;
}

// Deposit type from contract (NFT-based architecture)
// Note: depositId is now the NFT tokenId, owner is obtained via NFT.ownerOf(tokenId)
export interface Deposit {
  tokenId: bigint; // NFT token ID (replaces depositId)
  planId: bigint;
  principal: bigint;
  startTime: bigint; // Renamed from startAt
  maturityTime: bigint; // Renamed from maturityAt
  lockedAprBps: number;
  isAutoRenewEnabled: boolean;
  status: number; // 0=Active, 1=Withdrawn, 2=EarlyWithdrawn, 3=Renewed
}

// Transaction status
export interface TransactionState {
  hash: string | null;
  isLoading: boolean;
  isSuccess: boolean;
  isError: boolean;
  error: string | null;
}

// Ethereum window type
declare global {
  interface Window {
    ethereum?: {
      isMetaMask?: boolean;
      request: (args: { method: string; params?: any[] }) => Promise<any>;
      on: (event: string, callback: (...args: any[]) => void) => void;
      removeListener: (event: string, callback: (...args: any[]) => void) => void;
    };
  }
}

export interface ContractContextType {
  provider: BrowserProvider | null;
  savingsBankContract: any;
  tokenVaultContract: any; // Replaced VaultManager
  interestVaultContract: any; // New
  depositNFTContract: any; // New
  usdcContract: any;
}
