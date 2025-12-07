/**
 * IDRX Service Types
 */

// ==================== Common Types ====================

export type IDRXWebhookType = 'MINT' | 'REDEEM';

export type MintPaymentStatus = 'PENDING' | 'PAID' | 'EXPIRED' | 'FAILED';
export type MintStatus = 'PENDING' | 'PROCESSING' | 'MINTED' | 'FAILED';
export type BurnStatus = 'PENDING' | 'SUCCESS' | 'FAILED';
export type ReportStatus = 'NONE' | 'REPORTED' | 'RESOLVED';

// ==================== API Response Types ====================

export interface IDRXApiKey {
  apiKey: string;
  apiSecret?: string;
}

export interface IDRXMember {
  id: number;
  email: string;
  fullname: string;
  createdAt: string;
  updatedAt?: string;
  ApiKeys?: IDRXApiKey[];
}

export interface IDRXResponse<T> {
  statusCode: number;
  message: string;
  data: T;
}

// ==================== Transaction History ====================

export interface TransactionHistory {
  id: number;
  merchantCode: string;
  amount: string;
  merchantOrderId: string;
  productDetail: string;
  additionalParam: string;
  resultCode: string;
  signature: string;
  paymentCode: string;
  merchantUserId: number;
  reference: string | null;
  spUserHash: string | null;
  settlementDate: string;
  publisherOrderId: string;
  sourceAccount: string | null;
  deleted: boolean;
  createdAt: string;
  updatedAt: string;
}

// ==================== Mint Request Types ====================

export interface MintRequestTransactionFee {
  id: number;
  name: string;
  amount: string;
  mintRequestId?: number;
  deleted: boolean;
}

export interface USDTRequest {
  id: number;
  mintRequestId: number;
  merchantOrderId: string;
  destinationWalletAddress: string;
  chainId: number;
  amountIdrx: number;
  usdtRequested: string;
  amountUsdt: string;
  swapTxHash: string;
  txHash: string;
  status: 'PENDING' | 'SUCCESS' | 'FAILED';
  deleted: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface IDRXMintWebhookPayload {
  id: number;
  paymentAmount: number;
  merchantOrderId: string;
  productDetails: string;
  toBeMinted: string;
  destinationWalletAddress: string;
  chainId: number;
  merchantUserInfo: number;
  customerVaName: string;
  email: string;
  virtualAccountNo: string | null;
  vaPaymentRequestId: string | null;
  minted: boolean;
  paymentStatus: MintPaymentStatus;
  userMintStatus: MintStatus;
  adminMintStatus: MintStatus;
  deleted: boolean;
  createdAt: string;
  updatedAt: string;
  expiryTimestamp: string;
  isApproved: boolean;
  reference: string;
  txHash: string;
  qredoTxId: string | null;
  signedTx: string | null;
  reportStatus: ReportStatus;
  requestType: 'idrx' | 'usdt' | 'usdc' | 'usdt0' | null;
  processByUserId: number;
  usdtRequest: USDTRequest | null;
  TransactionHistory: TransactionHistory;
  MintRequestTransactionFees: MintRequestTransactionFee[];
}

// ==================== Redeem Request Types ====================

export interface RedeemRequestTransactionFee {
  id: number;
  name: string;
  amount: string;
  redeemRequestId: number;
  deleted: boolean;
}

export interface DepositRedeemRequest {
  id: number;
  chainId: number;
  userId: number;
  address: string;
  toAddress: string;
  transferTxHash: string;
  tokenFrom: string;
  amountFrom: string;
  tokenTo: string;
  amountTo: string;
  swapTxHash: string;
  burnTxHash: string;
  status: 'PENDING' | 'SUCCESS' | 'FAILED';
  createdAt: string;
  updatedAt: string;
  deleted: boolean;
}

export interface IDRXRedeemWebhookPayload {
  id: number;
  chainId: number;
  userId: number;
  requester: string;
  txHash: string;
  fromAddress: string;
  amount: string;
  bankName: string;
  bankCode: string;
  bankAccountNumber: string;
  bankAccountName: string;
  bankAccountNumberHash: string | null;
  custRefNumber: string;
  disburseId: number;
  burnStatus: BurnStatus;
  createdAt: string;
  updatedAt: string;
  deleted: boolean;
  reportStatus: ReportStatus;
  notes: string | null;
  RedeemRequestTransactionFees: RedeemRequestTransactionFee[];
  depositRedeemRequest?: DepositRedeemRequest;
}

// ==================== Webhook Handler Types ====================

export type IDRXWebhookPayload = IDRXMintWebhookPayload | IDRXRedeemWebhookPayload;

export interface WebhookHandlerResult {
  success: boolean;
  message: string;
  data?: {
    transactionId?: string;
    type?: IDRXWebhookType;
    status?: string;
  };
}

export interface WebhookValidationResult {
  isValid: boolean;
  type: IDRXWebhookType | null;
  errors: string[];
}

// ==================== Sync Types ====================

export interface SyncResult {
  success: boolean;
  totalFetched: number;
  newMembers: number;
  updatedMembers: number;
  skippedMembers: number;
  errors: Array<{ memberId: number; error: string }>;
  duration: number;
}

export interface SyncOptions {
  dryRun?: boolean;
  batchSize?: number;
  skipEncryption?: boolean;
}
