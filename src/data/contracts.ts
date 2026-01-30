// Contract addresses on Sepolia testnet
// Updated: January 29, 2026 - New NFT-based architecture
import MockUSDCJson from './abi/MockUSDC.json';
import SavingsBankJson from './abi/SavingsBank.json';
import TokenVaultJson from './abi/TokenVault.json';
import InterestVaultJson from './abi/InterestVault.json';
import DepositNFTJson from './abi/DepositNFT.json';

const env = import.meta.env as unknown as Record<string, string | undefined>;
const withFallback = (key: string, fallback: string) => env[key] ?? fallback;

export const CONTRACTS = {
  MockUSDC: {
    address: withFallback('VITE_MOCK_USDC_ADDRESS', '0x5f89720026332AC218F3f832dE3b7488222aDE9C'),
    abi: MockUSDCJson,
  },
  SavingsBank: {
    address: withFallback('VITE_SAVINGS_BANK_ADDRESS', '0xbf18558adf6BA008eA2c6924D50e980C998313f0'),
    abi: SavingsBankJson,
  },
  TokenVault: {
    address: withFallback('VITE_TOKEN_VAULT_ADDRESS', '0xEF08c572e314e0BAbf781C82B5775EAD68c789d4'),
    abi: TokenVaultJson,
  },
  InterestVault: {
    address: withFallback('VITE_INTEREST_VAULT_ADDRESS', '0xAaa46e0dE3CA6031dDD391da653FCedF5cb32a84'),
    abi: InterestVaultJson,
  },
  DepositNFT: {
    address: withFallback('VITE_DEPOSIT_NFT_ADDRESS', '0xdD4572634915c7aa789CCD03af9d6dB0Fd61E690'),
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
