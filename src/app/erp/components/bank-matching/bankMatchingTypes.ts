export interface BankTransaction {
  id: number;
  entityType?: "CORP" | "INDIVIDUAL";
  bankName: string;
  accountNo: string;
  accountHolder?: string;
  accountProduct?: string;
  transDate: string;
  transTime: string;
  transType: "DEPOSIT" | "WITHDRAWAL" | "OPEN";
  amount: number;
  withdrawalAmount: number;
  depositAmount: number;
  balanceAfter: number;
  senderReceiver: string;
  counterpartyAccount: string | null;
  counterpartyBank: string | null;
  memo: string | null;
  txChannel: string | null;
  checkAmount: number;
  cmsCode: string | null;
  counterpartyHolder: string | null;
  isMatched: boolean;
  matchedType: string | null;
  matchedId: string | null;
  matchedAt: string | null;
}

export interface BankMatchingTabProps {
  currentUser: any;
  selectedEntity?: "ALL" | "CORP" | "INDIVIDUAL";
}

export interface AccountStatusItem {
  accountNo: string;
  entityType: string;
  bankName: string;
  label?: string;
  latestTransDate: string | null;
  latestTransTime: string | null;
  latestTransDatetime: string | null;
  latestBalance: number;
  totalCount: number;
  lastUploadedAt: string | null;
}

export interface BankSummary {
  totalCount: number;
  depositCount: number;
  withdrawalCount: number;
  totalDeposit: number;
  totalWithdrawal: number;
  matchedDeposit: number;
  unmatchedDeposit: number;
  latestBalance: number;
  latestTxDatetime: string | null;
}

export interface NewTransactionState {
  entityType: "CORP" | "INDIVIDUAL";
  bankName: string;
  accountNo: string;
  transDate: string;
  transTime: string;
  transType: "DEPOSIT" | "WITHDRAWAL";
  amount: string;
  balanceAfter: string;
  senderReceiver: string;
  counterpartyBank: string;
  counterpartyAccount: string;
  counterpartyHolder: string;
  txChannel: string;
  memo: string;
}

export interface UploadResultState {
  totalParsed: number;
  insertedCount: number;
  duplicateCount: number;
  meta?: any;
}
