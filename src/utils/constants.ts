// Constants for the application
export const CHAIN_ID = 11155111; // Sepolia
export const USDC_DECIMALS = 6;
export const BASIS_POINTS = 10000;
export const SECONDS_PER_DAY = 86400;
export const SECONDS_PER_YEAR = 31536000;

// Contract addresses on Sepolia (Updated: January 29, 2026)
export const SAVINGS_BANK_ADDRESS = '0xB95742736EDeE68c9cb3F9a44D3F04D96F40d7d4';
export const VAULT_MANAGER_ADDRESS = '0x870d756E4Ec6745C24CE3DAD776cC53ddB51ae62';
export const USDC_ADDRESS = '0xC62464eaD63c27aE68B296522837e923f856fe05';

// Admin address (will be fetched from contract owner())

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

// Grace period (3 days)
export const GRACE_PERIOD = 3 * SECONDS_PER_DAY;

// Default plans (Deployed on Sepolia)
export const DEFAULT_PLANS = [
  { name: '7-Day Express', durationDays: 7, aprBps: 500, penalty: 200 },
  { name: '30-Day Standard', durationDays: 30, aprBps: 800, penalty: 300 },
  { name: '90-Day Growth', durationDays: 90, aprBps: 1200, penalty: 500 },
  { name: '180-Day Premium', durationDays: 180, aprBps: 1500, penalty: 800 },
];
