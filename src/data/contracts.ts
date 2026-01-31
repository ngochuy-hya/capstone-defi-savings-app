// Contract addresses on Sepolia testnet
// Updated: January 29, 2026 - New NFT-based architecture
import MockUSDCJson from './abi/MockUSDC.json';
import SavingsBankJson from './abi/SavingsBank.json';
import TokenVaultJson from './abi/TokenVault.json';
import InterestVaultJson from './abi/InterestVault.json';
import DepositNFTJson from './abi/DepositNFT.json';

const env = import.meta.env as unknown as Record<string, string | undefined>;
const withFallback = (key: string, fallback: string) => env[key] ?? fallback;

// Sepolia addresses (deployments/sepolia) — January 2026
const DEFAULT_ADDRESSES = {
  MockUSDC: '0xF38A9Ed7840aB6eef41DF9d88b19fFf7443AA656',
  TokenVault: '0x3F371D9b7AF25DF7fcE3DEE044a11825ACDeFD64',
  InterestVault: '0x5a17868C3d6E1d3f19Ea56c483eA10aE5050051F',
  MockDepositNFT: '0x5f7Ac1Dc1180D652aa06B3eA7017B9E76bc46765',
  SavingsBank: '0x3B6e54bb5B36a89838435EC504cE78B3B7Fd29DC',
};

export const CONTRACTS = {
  MockUSDC: {
    address: withFallback('VITE_MOCK_USDC_ADDRESS', DEFAULT_ADDRESSES.MockUSDC),
    abi: MockUSDCJson,
  },
  SavingsBank: {
    address: withFallback('VITE_SAVINGS_BANK_ADDRESS', DEFAULT_ADDRESSES.SavingsBank),
    abi: SavingsBankJson,
  },
  TokenVault: {
    address: withFallback('VITE_TOKEN_VAULT_ADDRESS', DEFAULT_ADDRESSES.TokenVault),
    abi: TokenVaultJson,
  },
  InterestVault: {
    address: withFallback('VITE_INTEREST_VAULT_ADDRESS', DEFAULT_ADDRESSES.InterestVault),
    abi: InterestVaultJson,
  },
  DepositNFT: {
    address: withFallback('VITE_DEPOSIT_NFT_ADDRESS', DEFAULT_ADDRESSES.MockDepositNFT),
    abi: DepositNFTJson,
  },
};

export const SUPPORTED_CHAINS = {
  SEPOLIA: {
    chainId: 11155111,
    name: 'Sepolia',
    rpcUrl: 'https://ethereum-sepolia-rpc.publicnode.com',
    blockExplorer: 'https://sepolia.etherscan.io',
  },
};
