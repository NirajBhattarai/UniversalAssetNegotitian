# Plan C: Hybrid Escrow with Smart Settlement Implementation Plan

## Overview
User connects wallet and approves transaction, funds held in escrow smart contract, released when carbon credits verified, with fallback to database tracking.

## Architecture Components

### 1. Wallet Connection for User Authentication
- User connects Hedera wallet (HashPack/Blade)
- System verifies user has sufficient USDC/USDT/HBAR balance
- User maintains custody until explicit approval

### 2. Two-Phase Commit Protocol
- **Phase 1**: Lock funds (user approval)
- **Phase 2**: Verify credits → Transfer

### 3. Hedera Consensus Service (HCS)
- Immutable transaction logs
- Audit trail for all carbon credit purchases
- Public verifiability

### 4. Database as Source of Truth
- PostgreSQL tracks all state
- Blockchain provides verification layer
- Fast queries with on-chain audit capability

---

## Implementation Roadmap

### Phase 1: Database Schema Updates

#### New Tables to Create

**1. `user_carbon_credits` Table**
```sql
CREATE TABLE user_carbon_credits (
  purchase_id SERIAL PRIMARY KEY,
  user_id VARCHAR(255) NOT NULL,
  user_wallet_address VARCHAR(255) NOT NULL,
  company_id INTEGER NOT NULL REFERENCES company(company_id),
  credit_amount DECIMAL(15, 2) NOT NULL,
  payment_amount DECIMAL(15, 2) NOT NULL,
  currency VARCHAR(10) NOT NULL, -- 'USDC', 'USDT', 'HBAR'
  transaction_hash VARCHAR(255),
  hcs_topic_id VARCHAR(255),
  hcs_sequence_number BIGINT,
  status VARCHAR(50) NOT NULL, -- 'pending', 'completed', 'failed', 'refunded'
  created_at TIMESTAMP DEFAULT NOW(),
  completed_at TIMESTAMP,
  metadata JSONB
);

CREATE INDEX idx_user_carbon_credits_wallet ON user_carbon_credits(user_wallet_address);
CREATE INDEX idx_user_carbon_credits_user ON user_carbon_credits(user_id);
CREATE INDEX idx_user_carbon_credits_status ON user_carbon_credits(status);
```

**2. `escrow_transactions` Table**
```sql
CREATE TABLE escrow_transactions (
  escrow_id VARCHAR(255) PRIMARY KEY,
  user_wallet_address VARCHAR(255) NOT NULL,
  amount DECIMAL(15, 2) NOT NULL,
  currency VARCHAR(10) NOT NULL,
  status VARCHAR(50) NOT NULL, -- 'locked', 'completed', 'refunded', 'failed'
  locked_at TIMESTAMP DEFAULT NOW(),
  settled_at TIMESTAMP,
  timeout_at TIMESTAMP,
  metadata JSONB
);

CREATE INDEX idx_escrow_status ON escrow_transactions(status);
CREATE INDEX idx_escrow_wallet ON escrow_transactions(user_wallet_address);
```

---

### Phase 2: Backend Services

#### File: `src/services/EscrowService.ts` (NEW)

**Purpose**: Manage escrow lifecycle for carbon credit purchases

**Methods**:
```typescript
class EscrowService {
  // Lock funds in escrow (user approves allowance)
  async lockFunds(params: {
    userWalletAddress: string;
    amount: number;
    currency: 'USDC' | 'USDT' | 'HBAR';
    timeoutMinutes?: number;
  }): Promise<{ escrowId: string; status: string }>;

  // Verify company has sufficient carbon credits
  async verifyCarbonCredits(params: {
    companyId: number;
    creditAmount: number;
  }): Promise<{ available: boolean; currentCredit: number }>;

  // Execute the swap (payment + credit transfer)
  async executeSwap(params: {
    escrowId: string;
    userId: string;
    companyId: number;
    creditAmount: number;
    recipientWalletAddress: string;
  }): Promise<{
    success: boolean;
    transactionHash: string;
    hcsTopicId: string;
    hcsSequenceNumber: number;
  }>;

  // Release or refund transaction
  async releaseOrRefund(params: {
    escrowId: string;
    action: 'release' | 'refund';
    reason?: string;
  }): Promise<{ success: boolean }>;

  // Check escrow status
  async getEscrowStatus(escrowId: string): Promise<EscrowTransaction>;

  // Cleanup expired escrows (background job)
  async cleanupExpiredEscrows(): Promise<number>;
}
```

**Implementation Details**:
- Use database transactions for atomicity
- Set 30-minute timeout on escrows (configurable)
- Automatic refund for expired escrows
- Emit events for monitoring

---

#### File: `src/services/HederaService.ts` (ENHANCEMENTS)

**New Methods to Add**:

```typescript
// Check if user has sufficient balance
async checkUserBalance(params: {
  accountId: string;
  requiredAmount: number;
  currency: 'HBAR' | 'USDC' | 'USDT';
}): Promise<{ sufficient: boolean; currentBalance: number }>;

// Process payment with HCS logging
async processPaymentWithVerification(params: {
  senderAccountId: string;
  recipientAccountId: string;
  amount: number;
  currency: 'HBAR' | 'USDC' | 'USDT';
  memo: string;
  hcsTopicId: string;
}): Promise<{
  transactionHash: string;
  hcsSequenceNumber: number;
  gasUsed: number;
}>;

// Create HCS record (immutable log)
async createHCSRecord(params: {
  topicId: string;
  message: {
    type: 'CARBON_CREDIT_PURCHASE';
    userId: string;
    companyId: number;
    creditAmount: number;
    paymentAmount: number;
    currency: string;
    timestamp: string;
  };
}): Promise<{ sequenceNumber: number; consensusTimestamp: string }>;

// Create HCS topic for carbon credit transactions (one-time setup)
async createCarbonCreditTopic(): Promise<{ topicId: string }>;
```

---

#### File: `src/services/CarbonCreditTokenService.ts` (NEW - Optional for Future)

**Purpose**: Manage carbon credit tokenization (Phase 3 enhancement)

```typescript
class CarbonCreditTokenService {
  // Mint carbon credit tokens for a company
  async mintCarbonCreditTokens(params: {
    companyId: number;
    amount: number;
  }): Promise<{ tokenId: string }>;

  // Transfer carbon credits to user
  async transferCarbonCredits(params: {
    tokenId: string;
    recipientAccountId: string;
    amount: number;
  }): Promise<{ transactionHash: string }>;
}
```

---

### Phase 3: Payment Agent Updates

#### File: `agents/payment-agent/src/index.ts`

**Current Flow**: Mock blockchain transactions → **New Flow**: Real escrow + blockchain

**Changes to `PaymentAgentExecutor.execute()`**:

1. **Parse user request** to extract:
   - User wallet address
   - Payment method (USDC/USDT/HBAR)
   - Credit amount
   - Company ID

2. **Step 1: Check User Balance**
```typescript
const balanceCheck = await hederaService.checkUserBalance({
  accountId: userWalletAddress,
  requiredAmount: totalCost,
  currency: paymentMethod
});

if (!balanceCheck.sufficient) {
  throw new Error(`Insufficient balance. Required: ${totalCost}, Available: ${balanceCheck.currentBalance}`);
}
```

3. **Step 2: Lock Funds in Escrow**
```typescript
const escrowResult = await escrowService.lockFunds({
  userWalletAddress,
  amount: totalCost,
  currency: paymentMethod,
  timeoutMinutes: 30
});
```

4. **Step 3: Verify Company Has Credits**
```typescript
const creditVerification = await escrowService.verifyCarbonCredits({
  companyId,
  creditAmount
});

if (!creditVerification.available) {
  await escrowService.releaseOrRefund({
    escrowId: escrowResult.escrowId,
    action: 'refund',
    reason: 'Insufficient company credits'
  });
  throw new Error('Company does not have sufficient credits');
}
```

5. **Step 4: Execute Atomic Swap**
```typescript
const swapResult = await escrowService.executeSwap({
  escrowId: escrowResult.escrowId,
  userId: userWalletAddress, // or user ID from auth
  companyId,
  creditAmount,
  recipientWalletAddress: companyWalletAddress
});
```

6. **Step 5: Log to HCS**
```typescript
// This happens inside executeSwap, but conceptually:
await hederaService.createHCSRecord({
  topicId: process.env.CARBON_CREDIT_HCS_TOPIC_ID,
  message: {
    type: 'CARBON_CREDIT_PURCHASE',
    userId: userWalletAddress,
    companyId,
    creditAmount,
    paymentAmount: totalCost,
    currency: paymentMethod,
    timestamp: new Date().toISOString()
  }
});
```

7. **Step 6: Update Database**
```typescript
// Insert into user_carbon_credits
await db.insert(userCarbonCredits).values({
  userId: userWalletAddress,
  userWalletAddress,
  companyId,
  creditAmount,
  paymentAmount: totalCost,
  currency: paymentMethod,
  transactionHash: swapResult.transactionHash,
  hcsTopicId: swapResult.hcsTopicId,
  hcsSequenceNumber: swapResult.hcsSequenceNumber,
  status: 'completed',
  completedAt: new Date()
});

// Decrease company credits
await db.update(companyCredit)
  .set({
    currentCredit: sql`${companyCredit.currentCredit} - ${creditAmount}`,
    soldCredit: sql`${companyCredit.soldCredit} + ${creditAmount}`,
    updatedAt: new Date()
  })
  .where(eq(companyCredit.companyId, companyId));
```

**Error Handling & Rollback**:
```typescript
try {
  // Execute swap
} catch (error) {
  // Refund escrow
  await escrowService.releaseOrRefund({
    escrowId,
    action: 'refund',
    reason: error.message
  });
  
  // Update escrow status to failed
  await db.update(escrowTransactions)
    .set({ status: 'failed', settledAt: new Date() })
    .where(eq(escrowTransactions.escrowId, escrowId));
    
  throw error;
}
```

---

### Phase 4: Negotiation Agent Integration

#### File: `agents/carbon-credit-negotiation-agent/src/index.ts`

**Enhancement**: Return company wallet addresses in negotiation results

**Change in `calculateNegotiationResult()`**:

```typescript
const bestOffers: CreditOffer[] = offers.map(offer => ({
  ...offer,
  walletAddress: offer.walletAddress // Already fetched from DB
}));
```

**Change in `formatNegotiationResponse()`**:
```typescript
result.bestOffers.forEach((offer, index) => {
  response += `${index + 1}. **${offer.companyName}**\n`;
  response += `   - Credits: ${offer.currentCredit}\n`;
  response += `   - Price: $${offer.offerPrice?.toFixed(2)} per credit\n`;
  response += `   - Total: $${((offer.currentCredit || 0) * (offer.offerPrice || 0)).toFixed(2)}\n`;
  response += `   - Wallet: ${offer.walletAddress || 'Not configured'}\n\n`; // NEW
});
```

---

### Phase 5: Frontend Integration

#### File: `web-ui/src/components/MultiAgentChat.tsx`

**New Features to Add**:

1. **Wallet Connection Button**
```typescript
const [connectedWallet, setConnectedWallet] = useState<string | null>(null);
const [walletProvider, setWalletProvider] = useState<'hashpack' | 'blade' | null>(null);

const connectWallet = async (provider: 'hashpack' | 'blade') => {
  // Integration with HashPack or Blade wallet
  const wallet = await provider === 'hashpack' 
    ? connectHashPack() 
    : connectBlade();
  
  setConnectedWallet(wallet.accountId);
  setWalletProvider(provider);
};
```

2. **Display User Balance**
```typescript
const [userBalance, setUserBalance] = useState<{
  hbar: number;
  usdc: number;
  usdt: number;
} | null>(null);

useEffect(() => {
  if (connectedWallet) {
    fetchUserBalance(connectedWallet);
  }
}, [connectedWallet]);
```

3. **Transaction Approval Modal**
```typescript
interface TransactionApprovalModalProps {
  open: boolean;
  transaction: {
    creditAmount: number;
    totalCost: number;
    currency: 'USDC' | 'USDT' | 'HBAR';
    companyName: string;
  };
  onApprove: () => void;
  onReject: () => void;
}

const TransactionApprovalModal = ({ ... }) => {
  return (
    <Modal>
      <h3>Approve Carbon Credit Purchase</h3>
      <p>Credits: {transaction.creditAmount}</p>
      <p>Cost: {transaction.totalCost} {transaction.currency}</p>
      <p>Seller: {transaction.companyName}</p>
      <Button onClick={onApprove}>Approve & Pay</Button>
      <Button onClick={onReject}>Cancel</Button>
    </Modal>
  );
};
```

4. **Enhanced Negotiation Flow**
```typescript
const simulateNegotiationWithPayment = async (userRequest: string) => {
  // Step 1: Check wallet connection
  if (!connectedWallet) {
    addNegotiationStep('System', '⚠️ Please connect your wallet first', 'status');
    return;
  }

  // Step 2: Get negotiation results
  const negotiationResponse = await a2aAgentService.sendMessageToAgent(
    userRequest, 
    'carbon-credit-negotiation'
  );

  // Step 3: Show approval modal
  setShowApprovalModal(true);
  
  // Step 4: On approval, call payment agent with wallet address
  const paymentRequest = `${userRequest} from wallet ${connectedWallet}`;
  const paymentResponse = await a2aAgentService.sendMessageToAgent(
    paymentRequest,
    'carbon-credit-payment'
  );
};
```

5. **Transaction Status Updates**
```typescript
// Real-time updates during payment processing
const [paymentStatus, setPaymentStatus] = useState<
  'idle' | 'checking_balance' | 'locking_funds' | 'verifying_credits' | 
  'executing_swap' | 'logging_hcs' | 'completed' | 'failed'
>('idle');

// Display progress indicator
const getStatusMessage = (status: typeof paymentStatus) => {
  switch (status) {
    case 'checking_balance': return '💰 Checking your balance...';
    case 'locking_funds': return '🔒 Locking funds in escrow...';
    case 'verifying_credits': return '✅ Verifying carbon credits...';
    case 'executing_swap': return '⚡ Executing payment transaction...';
    case 'logging_hcs': return '📝 Recording on Hedera Consensus Service...';
    case 'completed': return '🎉 Purchase completed!';
    case 'failed': return '❌ Transaction failed';
    default: return '';
  }
};
```

---

#### New File: `web-ui/src/services/WalletService.ts` (NEW)

**Purpose**: Wallet connection abstraction

```typescript
export class WalletService {
  // Connect HashPack wallet
  async connectHashPack(): Promise<{
    accountId: string;
    publicKey: string;
  }>;

  // Connect Blade wallet
  async connectBlade(): Promise<{
    accountId: string;
    publicKey: string;
  }>;

  // Disconnect wallet
  async disconnect(): Promise<void>;

  // Get account balance
  async getBalance(accountId: string): Promise<{
    hbar: number;
    usdc: number;
    usdt: number;
  }>;

  // Sign transaction (for escrow approval)
  async signTransaction(transaction: any): Promise<string>;
}
```

---

### Phase 6: API Routes

#### File: `web-ui/src/app/api/user/balance/route.ts` (NEW)

```typescript
import { NextRequest, NextResponse } from 'next/server';
import { hederaService } from '@/services/HederaClient';

export async function GET(request: NextRequest) {
  const accountId = request.nextUrl.searchParams.get('accountId');
  
  if (!accountId) {
    return NextResponse.json({ error: 'Account ID required' }, { status: 400 });
  }

  try {
    const balance = await hederaService.getAccountBalance(accountId);
    return NextResponse.json(balance);
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
```

#### File: `web-ui/src/app/api/user/carbon-credits/route.ts` (NEW)

```typescript
export async function GET(request: NextRequest) {
  const walletAddress = request.nextUrl.searchParams.get('walletAddress');
  
  // Query user_carbon_credits table
  const purchases = await db
    .select()
    .from(userCarbonCredits)
    .where(eq(userCarbonCredits.userWalletAddress, walletAddress))
    .orderBy(desc(userCarbonCredits.createdAt));

  return NextResponse.json(purchases);
}
```

---

## Transaction Flow Diagram

```
┌─────────────┐
│    User     │
└──────┬──────┘
       │ 1. Connect Wallet
       ▼
┌─────────────────────┐
│  Frontend (Next.js) │
└──────┬──────────────┘
       │ 2. Request: "Buy 10,000 carbon credits with USDC"
       ▼
┌──────────────────────────┐
│ Negotiation Agent (A2A)  │
│ - Queries company_credit │
│ - Finds best offers      │
│ - Returns wallet address │
└──────┬───────────────────┘
       │ 3. Best Offer + Company Wallet
       ▼
┌─────────────────────┐
│  Frontend           │
│  Shows Approval UI  │
└──────┬──────────────┘
       │ 4. User Approves
       ▼
┌──────────────────────────┐
│  Payment Agent (A2A)     │
└──────┬───────────────────┘
       │ 5. Check Balance
       ▼
┌──────────────────────────┐
│  HederaService           │
│  checkUserBalance()      │
└──────┬───────────────────┘
       │ 6. Balance OK
       ▼
┌──────────────────────────┐
│  EscrowService           │
│  lockFunds()             │
└──────┬───────────────────┘
       │ 7. Funds Locked
       ▼
┌──────────────────────────┐
│  EscrowService           │
│  verifyCarbonCredits()   │
└──────┬───────────────────┘
       │ 8. Credits Available
       ▼
┌──────────────────────────┐
│  EscrowService           │
│  executeSwap()           │
└──────┬───────────────────┘
       │ 9a. Transfer USDC (Hedera)
       ├──────────────────────────────┐
       │ 9b. Update DB (PostgreSQL)   │
       │     - company_credit         │
       │     - user_carbon_credits    │
       ├──────────────────────────────┤
       │ 9c. Log to HCS (Hedera)      │
       └──────────────────────────────┘
       │ 10. Return Receipt
       ▼
┌─────────────────────┐
│  Frontend           │
│  Show Success ✅    │
└─────────────────────┘
```

---

## Environment Variables

Add to `.env` file:

```bash
# Hedera Configuration
HEDERA_ACCOUNT_ID=0.0.123456
HEDERA_PRIVATE_KEY=302e...
HEDERA_NETWORK=testnet

# Token IDs
HEDERA_USDC_TOKEN_ID=0.0.456789
HEDERA_USDT_TOKEN_ID=0.0.456790

# HCS Topic for Carbon Credits
CARBON_CREDIT_HCS_TOPIC_ID=0.0.789012

# Database
CARBON_MARKETPLACE_DATABASE_URL=postgresql://...

# Escrow Configuration
ESCROW_TIMEOUT_MINUTES=30
ESCROW_CLEANUP_INTERVAL_MINUTES=10
```

---

## Testing Strategy

### Unit Tests
1. **EscrowService Tests**
   - Lock funds successfully
   - Handle insufficient balance
   - Execute swap atomically
   - Refund expired escrows

2. **HederaService Tests**
   - Check balance correctly
   - Process payment with HCS logging
   - Handle transaction failures

### Integration Tests
1. **End-to-End Flow**
   - User connects wallet
   - Negotiates carbon credits
   - Approves payment
   - Receives credits
   - Verify on-chain + DB consistency

2. **Rollback Scenarios**
   - Company runs out of credits mid-transaction
   - User cancels during escrow
   - Network timeout during payment

### Manual Testing Checklist
- [ ] Connect HashPack wallet
- [ ] Connect Blade wallet
- [ ] Check balances (HBAR, USDC, USDT)
- [ ] Negotiate carbon credits
- [ ] Approve transaction
- [ ] Verify HCS record
- [ ] Check database updates
- [ ] View purchase history

---

## Deployment Steps

### 1. Database Migration
```bash
# Run migration to create new tables
npm run db:migrate
```

### 2. HCS Topic Setup
```bash
# One-time setup: create HCS topic
npm run setup:hcs-topic
```

### 3. Deploy Backend Services
```bash
# Start all agents
npm run agents:all
```

### 4. Deploy Frontend
```bash
# Build and start Next.js app
cd web-ui
npm run build
npm run start
```

---

## Security Considerations

1. **Private Key Management**
   - Never expose user private keys
   - Use wallet SDKs for transaction signing
   - Platform wallet stored in secure vault (AWS Secrets Manager, HashiCorp Vault)

2. **Transaction Validation**
   - Verify transaction signatures
   - Check sufficient balance before escrow
   - Implement rate limiting on API endpoints

3. **Database Security**
   - Use prepared statements (Drizzle ORM handles this)
   - Encrypt sensitive data at rest
   - Regular backups

4. **Audit Trail**
   - All transactions logged to HCS
   - Database maintains complete history
   - Monitor for suspicious activity

---

## Performance Optimizations

1. **Caching**
   - Cache company credit availability (5 min TTL)
   - Cache token prices (1 min TTL)
   - Cache user balances (30 sec TTL)

2. **Database Indexing**
   - Index on `user_wallet_address`
   - Index on `status` for escrow cleanup
   - Composite index on `(company_id, status)`

3. **Batch Operations**
   - Cleanup expired escrows every 10 minutes
   - Batch HCS submissions if needed

---

## Future Enhancements

### Phase 4: Carbon Credit NFTs
- Tokenize carbon credits as Hedera NFTs
- Transfer NFTs instead of database records
- Enable secondary market trading

### Phase 5: Advanced Features
- Recurring carbon credit purchases
- Fractional carbon credit ownership
- Carbon offset portfolio management
- Integration with IoT devices for real-time verification

---

## Success Metrics

- **Transaction Success Rate**: > 99%
- **Average Transaction Time**: < 10 seconds
- **Escrow Refund Rate**: < 1%
- **User Wallet Connection Rate**: > 80%
- **Database-Blockchain Consistency**: 100%

---

## Support & Documentation

- **HashPack Documentation**: https://docs.hashpack.app/
- **Blade Wallet Documentation**: https://docs.bladewallet.io/
- **Hedera SDK**: https://docs.hedera.com/
- **HCS Guide**: https://docs.hedera.com/guides/docs/sdks/consensus

---

## Implementation Timeline

| Phase | Duration | Status |
|-------|----------|--------|
| Phase 1: Database Schema | 1 day | ⏳ Pending |
| Phase 2: Backend Services | 3 days | ⏳ Pending |
| Phase 3: Payment Agent Updates | 2 days | ⏳ Pending |
| Phase 4: Negotiation Agent Updates | 1 day | ⏳ Pending |
| Phase 5: Frontend Integration | 3 days | ⏳ Pending |
| Phase 6: API Routes | 1 day | ⏳ Pending |
| Testing & QA | 2 days | ⏳ Pending |
| **Total** | **~2 weeks** | |

---

## Getting Started

To begin implementation, start with Phase 1 (Database Schema) and work sequentially through each phase. Each phase builds on the previous one, ensuring a solid foundation for the hybrid escrow system.

**Next Steps**:
1. Review and approve this plan
2. Set up development environment
3. Create database migrations
4. Implement EscrowService
5. Integrate with Payment Agent
6. Build frontend wallet connection
7. Test end-to-end flow

---

*Last Updated: October 19, 2025*
*Plan Version: 1.0*

