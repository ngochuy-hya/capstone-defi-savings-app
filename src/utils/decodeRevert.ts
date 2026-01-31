import { Interface, formatUnits } from 'ethers';

const USDC_DECIMALS = 6;

/**
 * Common contract errors that can occur when opening a deposit.
 * Only the error signatures we need to decode (selector + args).
 */
const ERROR_ABI = [
  'error ERC20InsufficientBalance(address sender, uint256 balance, uint256 needed)',
  'error ERC20InsufficientAllowance(address spender, uint256 allowance, uint256 needed)',
  'error EnforcedPause()',
  'error ExpectedPause()',
  'error OwnableUnauthorizedAccount(address account)',
  'error SafeERC20FailedOperation(address token)',
  'error Error(string message)', // require("...") revert
];

const iface = new Interface(ERROR_ABI);

/**
 * Decode revert data from a failed transaction and return a user-friendly Vietnamese message.
 * Returns null if the error cannot be decoded.
 */
export function decodeOpenDepositRevert(data: string | undefined): string | null {
  if (!data || typeof data !== 'string' || data.length < 10) return null;
  const hex = data.startsWith('0x') ? data : '0x' + data;
  if (hex.length < 10) return null; // selector is 4 bytes = 10 chars
  try {
    const parsed = iface.parseError(hex);
    if (!parsed) return null;
    switch (parsed.name) {
      case 'ERC20InsufficientBalance': {
        const [, balance, needed] = parsed.args;
        return `Ví không đủ USDC. Cần ${formatUnits(needed, USDC_DECIMALS)} USDC, ví chỉ có ${formatUnits(balance, USDC_DECIMALS)} USDC.`;
      }
      case 'ERC20InsufficientAllowance': {
        const [, , needed] = parsed.args;
        return `Chưa approve đủ USDC cho vault (cần ${formatUnits(needed, USDC_DECIMALS)} USDC). Vui lòng bấm "Confirm Deposit" lại một lần nữa để approve rồi gửi.`;
      }
      case 'EnforcedPause':
        return 'Contract đang tạm dừng. Admin cần bật lại (unpause) trước khi gửi tiền.';
      case 'OwnableUnauthorizedAccount':
        return 'Quyền truy cập bị từ chối trên contract.';
      case 'SafeERC20FailedOperation':
        return 'Chuyển USDC thất bại. Kiểm tra: ví đủ USDC và đã approve cho TokenVault (thử bấm Confirm lại).';
      case 'Error': {
        const [message] = parsed.args;
        const msg = String(message ?? '').trim();
        if (msg.includes('Insufficient available balance') || msg.includes('InterestVault'))
          return 'InterestVault tạm thời không đủ liquidity để reserve lãi. Admin cần fund thêm vault hoặc thử lại sau.';
        if (msg.includes('Below minDeposit') || msg.includes('Above maxDeposit'))
          return `Số tiền không nằm trong giới hạn plan: ${msg}`;
        if (msg.includes('Plan not active') || msg.includes('not active'))
          return 'Plan này đang tắt. Vui lòng chọn plan khác.';
        if (msg.length > 0) return msg;
        return null;
      }
      default:
        return null;
    }
  } catch {
    return null;
  }
}
