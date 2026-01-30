# 🏦 SaveVault - DeFi Savings Protocol Frontend

> Modern React frontend for the DeFi Savings Protocol  
> Built with React 19, TypeScript, ethers.js v6, and Vite

---

## 🚀 Quick Start

### Prerequisites
- Node.js 16+ and npm/yarn
- MetaMask or compatible Web3 wallet
- Sepolia testnet ETH (for gas)

### Installation

```bash
# Install dependencies
npm install
# or
yarn install

# Copy environment variables
cp .env.example .env

# Start development server
npm run dev
# or
yarn dev
```

Visit `http://localhost:5173`

---

## 📋 Features

### User Features
- ✅ **Connect Wallet** - MetaMask integration
- ✅ **Browse Plans** - View all available saving plans
- ✅ **Open Deposits** - Create new savings with chosen plan
- ✅ **View Deposits** - Track all your active deposits
- ✅ **Withdraw** - At maturity or early (with penalty)
- ✅ **Renew Deposits** - Rollover to new term
- ✅ **Interest Calculator** - Estimate earnings

### Admin Features
- ✅ **Create Plans** - Add new saving plans
- ✅ **Update Plans** - Modify existing plans
- ✅ **Toggle Plans** - Enable/disable plans
- ✅ **Vault Management** - Monitor protocol health
- ✅ **Emergency Pause** - Contract safety controls

---

## 🏗️ Tech Stack

- **Framework:** React 19 with TypeScript
- **Build Tool:** Vite 7
- **Blockchain:** ethers.js v6
- **Styling:** SCSS Modules
- **Icons:** Lucide React
- **Routing:** React Router DOM v7

---

## 📦 Deployed Contracts

### Sepolia Testnet

```typescript
MockUSDC:      0xC62464eaD63c27aE68B296522837e923f856fe05
VaultManager:  0x870d756E4Ec6745C24CE3DAD776cC53ddB51ae62
SavingsBank:   0xB95742736EDeE68c9cb3F9a44D3F04D96F40d7d4
```

Network: Sepolia (Chain ID: 11155111)  
Explorer: https://sepolia.etherscan.io/

---

## 🎨 Design System

### Color Palette (Light Theme)
- **Primary:** Indigo (#6366f1) - Professional banking feel
- **Secondary:** Emerald (#10b981) - Growth & success
- **Accent:** Violet (#a855f7) - Premium touch
- **Background:** White to light gray gradient

### Key Design Principles
- ✨ Clean, modern, professional appearance
- 📱 Fully responsive (mobile-first)
- ♿ Accessible (WCAG 2.1 AA)
- 🎯 User-friendly interactions
- ⚡ Smooth animations and transitions

---

## 📁 Project Structure

```
src/
├── components/
│   ├── common/          # Reusable UI components
│   ├── user/            # User-specific features
│   └── wallet/          # Wallet connection
├── context/
│   ├── WalletContext.tsx    # Wallet state management
│   └── ContractContext.tsx  # Contract instances
├── hooks/
│   ├── usePlans.ts          # Fetch and manage plans
│   ├── useDeposit.ts        # Deposit operations
│   ├── useBalance.ts        # USDC balance
│   └── useAdmin.ts          # Admin functions
├── pages/
│   ├── Home/                # Landing page
│   ├── Plans/               # Browse plans
│   ├── MyDeposits/          # User deposits
│   ├── Calculator/          # Interest calculator
│   └── Admin/               # Admin dashboard
├── styles/
│   ├── variables.scss       # Design tokens
│   └── global.scss          # Global styles
├── types/                   # TypeScript types
├── utils/                   # Helper functions
└── data/
    ├── abi/                 # Contract ABIs
    └── contracts.ts         # Contract addresses
```

---

## 🔗 Contract Integration

### Reading Data

```typescript
// Get all plans
const plans = await savingsBankContract.getAllPlans();

// Get specific deposit
const deposit = await savingsBankContract.getDeposit(depositId);

// Calculate interest
const interest = await savingsBankContract.calculateInterest(depositId);
```

### Writing Data

```typescript
// Open deposit (requires approval first)
await usdcContract.approve(savingsBankAddress, amount);
await savingsBankContract.openDeposit(planId, amount, enableAutoRenew);

// Withdraw at maturity
await savingsBankContract.withdraw(depositId);

// Early withdraw (with penalty)
await savingsBankContract.earlyWithdraw(depositId);

// Renew deposit
await savingsBankContract.renew(depositId, useCurrentRate);
```

---

## 🧪 Testing

### Get Test USDC

1. Connect wallet to Sepolia testnet
2. Visit [MockUSDC on Etherscan](https://sepolia.etherscan.io/address/0xC62464eaD63c27aE68B296522837e923f856fe05#writeContract)
3. Call `mint(yourAddress, 10000000000)` to get 10,000 USDC

### Test Flow

1. Connect MetaMask to Sepolia
2. Get test USDC tokens
3. Browse available plans
4. Open a deposit
5. View your deposits
6. Wait for maturity or withdraw early

---

## 📝 Available Scripts

```bash
# Development
npm run dev          # Start dev server
npm run build        # Build for production
npm run preview      # Preview production build

# Code Quality
npm run lint         # Run ESLint
```

---

## 🌐 Environment Variables

See `.env.example` for all available variables:

```env
VITE_USDC_ADDRESS=0xC62464eaD63c27aE68B296522837e923f856fe05
VITE_VAULT_MANAGER_ADDRESS=0x870d756E4Ec6745C24CE3DAD776cC53ddB51ae62
VITE_SAVINGS_BANK_ADDRESS=0xB95742736EDeE68c9cb3F9a44D3F04D96F40d7d4
VITE_CHAIN_ID=11155111
```

---

## 🎯 Key Features Implemented

### Wallet Integration
- ✅ MetaMask connection
- ✅ Network detection and switching
- ✅ Account change handling
- ✅ Balance tracking

### Plan Management
- ✅ Fetch all plans from contract
- ✅ Display plan details (APR, tenor, limits)
- ✅ Filter enabled plans
- ✅ Interest estimation calculator

### Deposit Management
- ✅ Open new deposits
- ✅ View user deposits
- ✅ Withdraw at maturity
- ✅ Early withdrawal with penalty
- ✅ Deposit renewal

### Admin Panel
- ✅ Create new plans
- ✅ Update existing plans
- ✅ Toggle plan status
- ✅ View vault statistics
- ✅ Emergency pause

---

## 🎨 UI Components

### Common Components
- **Button** - Multiple variants and sizes
- **Header** - Sticky navigation with wallet connection
- **Footer** - Links and network information
- **UserInfoWidget** - Quick user stats

### Feature Components
- **PlanList** - Display all saving plans
- **MyDeposits** - User's deposit portfolio
- **ConnectWallet** - Wallet connection flow
- **WalletInfo** - Connected wallet details

---

## 📱 Responsive Design

- ✅ Mobile-first approach
- ✅ Breakpoints: 480px, 640px, 768px, 1024px, 1280px
- ✅ Touch-friendly interactions
- ✅ Optimized for all screen sizes

---

## 🔐 Security Considerations

- ✅ Client-side validation
- ✅ Safe transaction handling
- ✅ Error boundary implementation
- ✅ Secure wallet connection
- ⚠️ Always verify transaction details before signing

---

## 🚀 Deployment

### Build for Production

```bash
npm run build
```

Output in `dist/` directory.

### Deploy Options
- Vercel
- Netlify
- GitHub Pages
- IPFS / Fleek
- Any static hosting

---

## 👨‍💻 Development

### Adding New Features

1. Create component in appropriate folder
2. Add types in `src/types/`
3. Create custom hook if needed
4. Update routing in `App.tsx`
5. Add styles in SCSS module

### Code Style
- TypeScript strict mode
- ESLint configuration
- SCSS modules for styling
- Functional components with hooks

---

## 📄 License

This project is for educational purposes as part of a blockchain development internship capstone project.

---

## 🙏 Credits

**Author:** Nguyễn Ngọc Huy  
**Organization:** AppsCyclone - Blockchain Development Internship  
**Project:** DeFi Savings Protocol Capstone  
**Date:** January 2025

---

> **Status:** ✅ Complete and Ready for Production  
> **Network:** Sepolia Testnet  
> **Smart Contracts:** Verified on Etherscan
