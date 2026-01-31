// Constants for the application
export const CHAIN_ID = 11155111; // Sepolia
export const USDC_DECIMALS = 6;
export const BASIS_POINTS = 10000;
export const SECONDS_PER_DAY = 86400;
export const SECONDS_PER_YEAR = 31536000;

// Contract addresses on Sepolia (matches deployments/sepolia — January 2026)
export const SAVINGS_BANK_ADDRESS = '0x3B6e54bb5B36a89838435EC504cE78B3B7Fd29DC';
export const USDC_ADDRESS = '0xF38A9Ed7840aB6eef41DF9d88b19fFf7443AA656';
export const TOKEN_VAULT_ADDRESS = '0x3F371D9b7AF25DF7fcE3DEE044a11825ACDeFD64';
export const INTEREST_VAULT_ADDRESS = '0x5a17868C3d6E1d3f19Ea56c483eA10aE5050051F';
export const DEPOSIT_NFT_ADDRESS = '0x5f7Ac1Dc1180D652aa06B3eA7017B9E76bc46765';

// Deposit Status
export const DepositStatus = {
  Active: 0,
  Withdrawn: 1,
  EarlyWithdrawn: 2,
  Renewed: 3,
} as const;

export type DepositStatusType = typeof DepositStatus[keyof typeof DepositStatus];

export const DEPOSIT_STATUS_LABELS = {
  [DepositStatus.Active]: 'Active',
  [DepositStatus.Withdrawn]: 'Withdrawn',
  [DepositStatus.EarlyWithdrawn]: 'Early Withdrawn',
  [DepositStatus.Renewed]: 'Renewed',
};

// Auto-renew grace period (2 days after maturity — matches contract)
export const GRACE_PERIOD = 2 * SECONDS_PER_DAY;

// Default plans (Deployed on Sepolia)
export const DEFAULT_PLANS = [
  { name: '7-Day Express', durationDays: 7, aprBps: 500, penalty: 200 },
  { name: '30-Day Standard', durationDays: 30, aprBps: 800, penalty: 300 },
  { name: '90-Day Growth', durationDays: 90, aprBps: 1200, penalty: 500 },
  { name: '180-Day Premium', durationDays: 180, aprBps: 1500, penalty: 800 },
];
