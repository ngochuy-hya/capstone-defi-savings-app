# 🏦 SaveVault - DeFi Savings Protocol Frontend

> **Capstone Project - Blockchain Development Internship**  
> **Author:** Nguyễn Ngọc Huy - AppsCyclone  
> **Timeline:** January 2026

Giao diện React cho **DeFi Savings Protocol**: kết nối ví, xem plan, mở deposit (NFT), theo dõi sổ tiết kiệm, rút đúng hạn / rút sớm / gia hạn. Admin: quản lý plan, fund/rút Interest Vault, pause/unpause.

**Smart contracts:** [capstone-defi-savings-protocol](../capstone-defi-savings-protocol/) (Hardhat, Solidity).

---

## 📋 Overview

**SaveVault Frontend** kết nối với protocol trên Sepolia:

- 💳 **Connect Wallet** — MetaMask, network Sepolia
- 📋 **Plans** — Xem plan (APR, kỳ hạn, min/max), plan tắt hiển thị mờ
- 💰 **Deposit** — Chọn plan, nhập số tiền, approve USDC → mở deposit, nhận NFT
- 📊 **My Deposits** — Active / Matured / Đã đóng (lịch sử rút sớm, đáo hạn, gia hạn)
- 💸 **Withdraw** — Rút đúng hạn (gốc + lãi) hoặc rút sớm (gốc − phạt)
- ♻️ **Renew** — Gia hạn trong 2 ngày sau đáo hạn (APR locked)
- 🧮 **Calculator** — Ước tính lãi theo plan
- 👑 **Admin** — Tạo/sửa/bật tắt plan, Fund / Rút Interest Vault, Pause / Unpause contract

### Tech Stack

- **Framework:** React 19 + TypeScript
- **Build:** Vite 7
- **Blockchain:** ethers.js v6
- **Styling:** SCSS Modules
- **Icons:** Lucide React
- **Routing:** React Router DOM v7

---

## 🚀 Quick Start

### Prerequisites

- Node.js 16+
- npm hoặc yarn
- MetaMask (hoặc ví tương thích)
- Sepolia testnet ETH (gas) + test USDC

### Install & Run

```bash
cd capstone-defi-savings-app
npm install
cp .env.example .env
# Sửa .env nếu dùng contract khác (mặc định Sepolia)
npm run dev
```

Mở `http://localhost:5173`

---

## 📦 Deployed Contracts (Sepolia)

Cấu hình mặc định trong `.env.example`:

| Contract     | Address (Sepolia) |
|-------------|-------------------|
| MockUSDC    | `0xF38A9Ed7840aB6eef41DF9d88b19fFf7443AA656` |
| SavingsBank | `0x3B6e54bb5B36a89838435EC504cE78B3B7Fd29DC` |
| TokenVault  | `0x3F371D9b7AF25DF7fcE3DEE044a11825ACDeFD64` |
| InterestVault | `0x5a17868C3d6E1d3f19Ea56c483eA10aE5050051F` |
| DepositNFT  | `0x5f7Ac1Dc1180D652aa06B3eA7017B9E76bc46765` |

- **Chain ID:** 11155111 (Sepolia)  
- **Explorer:** https://sepolia.etherscan.io

---

## 🌐 Environment Variables

Xem `.env.example`. Các biến dùng trong build (prefix `VITE_`):

```env
# Contract Addresses (Sepolia)
VITE_MOCK_USDC_ADDRESS=0x...
VITE_SAVINGS_BANK_ADDRESS=0x...
VITE_TOKEN_VAULT_ADDRESS=0x...
VITE_INTEREST_VAULT_ADDRESS=0x...
VITE_DEPOSIT_NFT_ADDRESS=0x...

# Network
VITE_CHAIN_ID=11155111
VITE_CHAIN_NAME=Sepolia
VITE_RPC_URL=https://ethereum-sepolia-rpc.publicnode.com
VITE_BLOCK_EXPLORER=https://sepolia.etherscan.io

# App (optional)
VITE_APP_NAME=SaveVault
VITE_APP_DESCRIPTION=Smart Savings Protocol on Ethereum
```

---

## 📁 Project Structure

```
src/
├── components/
│   ├── common/          # Button, Header, Footer, ThemeToggle, UserInfoWidget
│   ├── user/            # PlanList, MyDeposits
│   └── wallet/          # ConnectWallet, WalletInfo
├── context/
│   ├── WalletContext.tsx    # Wallet + admin check
│   ├── ContractContext.tsx  # Contract instances
│   └── ThemeContext.tsx     # Light/Dark
├── hooks/
│   ├── usePlans.ts      # Plans từ contract
│   ├── useDeposit.ts    # openDeposit, withdraw, earlyWithdraw, renew, fetchUserDeposits, fetchDepositDetailsByIds
│   ├── useBalance.ts    # USDC balance
│   └── useAdmin.ts      # createPlan, updatePlan, togglePlan, fundInterestVault, withdrawInterestVault, pause, unpause
├── pages/
│   ├── Home/
│   ├── Plans/           # Danh sách plan + modal deposit
│   ├── MyDeposits/      # Active / Matured / Đã đóng (lịch sử)
│   ├── Calculator/
│   └── Admin/           # AdminDashboard (plans, users, withdrawals, settings)
├── styles/              # variables, themes, global
├── types/               # Plan, Deposit, ...
├── utils/               # formatters, calculator, decodeRevert, constants
└── data/
    ├── abi/             # SavingsBank, TokenVault, InterestVault, DepositNFT, MockUSDC
    ├── contracts.ts     # Addresses + ABIs
    └── planMetadata.ts  # Offchain plan metadata
```

---

## 🔗 Contract Integration (tóm tắt)

- **Plans:** `savingsBankContract.savingPlans(planId)`, `nextPlanId`
- **User deposits:** `savingsBankContract.getUserDeposits(address)` → `getDepositDetails(depositId)`
- **Open deposit:** User approve TokenVault → `savingsBankContract.openDeposit(planId, amountWei, enableAutoRenew)`
- **Withdraw / Early / Renew:** `withdraw(tokenId)`, `earlyWithdraw(tokenId)`, `autoRenew(tokenId)`
- **Admin:** `fundVault(amount)`, `withdrawVault(amount)`, `pause()`, `unpause()`, `createPlan`, `updatePlan`, `enablePlan`

Chi tiết logic on-chain: [capstone-defi-savings-protocol/README.md](../capstone-defi-savings-protocol/README.md) và `docs/ARCHITECTURE.md`.

---

## 🧪 Testing (Sepolia)

1. Chuyển MetaMask sang **Sepolia**.
2. Lấy test USDC: dùng script trong protocol (ví dụ `mint_to_address.ts`) hoặc gọi `mint(yourAddress, amount)` trên MockUSDC (6 decimals: 1e6 = 1 USDC).
3. Trên app: Connect → Plans → Chọn plan → Deposit → My Deposits (xem, rút sớm / rút đúng hạn / gia hạn).

---

## 📝 Scripts

```bash
npm run dev      # Dev server (Vite)
npm run build    # Build production → dist/
npm run preview  # Preview build
npm run lint     # ESLint
```

---

## 🚀 Deploy lên Vercel

1. **Root Directory:** Nếu repo là cả workspace, trong Vercel chọn root = `capstone-defi-savings-app`.
2. **Environment Variables:** Thêm tất cả biến `VITE_*` (giống `.env.example`) trong Vercel project.
3. **Deploy:** Push code hoặc dùng Vercel CLI (`vercel`, `vercel --prod`).

Chi tiết từng bước: **[DEPLOY_VERCEL.md](./DEPLOY_VERCEL.md)**.

---

## 📄 License

Dự án capstone, mục đích học tập (Blockchain Development Internship).

---

## 🙏 Credits

**Author:** Nguyễn Ngọc Huy  
**Organization:** AppsCyclone - Blockchain Development Internship  
**Project:** DeFi Savings Protocol Capstone  
**Date:** January 2026

> **Status:** ✅ Production-ready (Sepolia)  
> **Contracts:** [capstone-defi-savings-protocol](../capstone-defi-savings-protocol/)
