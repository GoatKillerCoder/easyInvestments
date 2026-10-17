import {
  authenticateAdminServerFn,
  authenticateManualAccountServerFn,
  changeManualAccountPasswordServerFn,
  deactivateManualAccountServerFn,
  deleteAdminManualAccountServerFn,
  getManualAccountServerFn,
  getManualAccountsServerFn,
  registerAdminManualAccountServerFn,
  registerManualAccountServerFn,
  updateAdminManualAccountStatusServerFn,
  updateAdminManualAccountServerFn,
} from "@/lib/manual-account-server";
import { createYocoDepositServerFn } from "@/lib/yoco-server";
import {
  createWithdrawalRequestServerFn,
  listWithdrawalRequestsAdminServerFn,
  updateWithdrawalRequestAdminServerFn,
} from "@/lib/withdrawal-server";

const ACTIVE_ACCOUNT_STORAGE_KEY = "easyEquitiesActiveAccountId";

export type PortfolioHolding = {
  fundName: string;
  ticker: string;
  marketValue: number;
  changePct: string;
};

export type AccountTransaction = {
  date: string;
  type: "Deposit" | "Withdrawal";
  method: string;
  status: "Pending" | "Processing" | "Completed" | "Rejected" | "Failed";
  amount: number;
};

export type ManualAccount = {
  id: string;
  fullName: string;
  email: string;
  phone: string;
  country: string;
  address: string;
  registeredDate: string;
  accountType: string;
  company: string;
  status: string;
  accountPlatform: string;
  accountNumber: string;
  balance: number;
  portfolioValue: number;
  totalInvested: number;
  holdings: PortfolioHolding[];
  transactions: AccountTransaction[];
};

export type ManualAccountRegistration = {
  account: ManualAccount;
  password: string;
};

export function calculatePortfolioValue(balance?: number | null, totalInvested?: number | null) {
  const safeBalance = typeof balance === "number" && Number.isFinite(balance) ? balance : 0;
  const safeTotalInvested =
    typeof totalInvested === "number" && Number.isFinite(totalInvested) ? totalInvested : 0;
  return (Math.round(safeBalance * 100) + Math.round(safeTotalInvested * 100)) / 100;
}

export function formatRand(value?: number | null) {
  const safeValue = typeof value === "number" && Number.isFinite(value) ? value : 0;
  const [whole, fraction] = Math.abs(safeValue).toFixed(2).split(".");
  const groupedWhole = whole.replace(/\B(?=(\d{3})+(?!\d))/g, " ");
  return `${safeValue < 0 ? "-" : ""}R ${groupedWhole},${fraction}`;
}

export function authenticateAdmin(pin: string): Promise<string> {
  return authenticateAdminServerFn({ data: { pin } });
}

export function getManualAccounts(adminToken: string): Promise<ManualAccount[]> {
  return getManualAccountsServerFn({ data: { adminToken } });
}

export function saveManualAccount(registration: ManualAccountRegistration): Promise<ManualAccount> {
  return registerManualAccountServerFn({ data: registration });
}

export function saveAdminManualAccount(
  registration: ManualAccountRegistration,
  adminToken: string,
): Promise<ManualAccount> {
  return registerAdminManualAccountServerFn({ data: { registration, adminToken } });
}

export function updateAdminManualAccount(
  account: ManualAccount,
  adminToken: string,
  password?: string,
): Promise<ManualAccount> {
  return updateAdminManualAccountServerFn({ data: { account, adminToken, password } });
}

export function updateAdminManualAccountStatus(
  id: string,
  status: string,
  adminToken: string,
): Promise<{ id: string; status: string }> {
  return updateAdminManualAccountStatusServerFn({ data: { id, status, adminToken } });
}

export function deleteAdminManualAccount(id: string, adminToken: string): Promise<{ id: string }> {
  return deleteAdminManualAccountServerFn({ data: { id, adminToken } });
}

export function getActiveManualAccount(): Promise<ManualAccount | undefined> {
  const activeAccountId = localStorage.getItem(ACTIVE_ACCOUNT_STORAGE_KEY);
  const sessionToken = getUserSessionToken();
  if (!activeAccountId || !sessionToken) return Promise.resolve(undefined);

  return getManualAccountServerFn({ data: { id: activeAccountId, sessionToken } });
}

const SESSION_TOKEN_STORAGE_KEY = "easyEquitiesSessionToken";

export function getUserSessionToken(): string | undefined {
  return localStorage.getItem(SESSION_TOKEN_STORAGE_KEY) ?? undefined;
}

export function createYocoDeposit(amount: string, sessionToken: string) {
  return createYocoDepositServerFn({ data: { amount, sessionToken } });
}

export type WithdrawalRequestInput =
  | {
      amount: string;
      idempotencyKey: string;
      sessionToken: string;
      method: "Bank account";
      accountHolderName: string;
      bankName: string;
      accountNumber: string;
      accountType: "Cheque" | "Savings" | "Transmission";
      branchCode: string;
    }
  | {
      amount: string;
      idempotencyKey: string;
      sessionToken: string;
      method: "PayPal";
      paypalEmail: string;
    };

export function createWithdrawalRequest(data: WithdrawalRequestInput) {
  return createWithdrawalRequestServerFn({ data });
}

export type AdminWithdrawalRequest = {
  reference: string;
  userId: string;
  fullName: string;
  createdAt: string;
  amount: string;
  fee: string;
  method: "Bank account" | "PayPal";
  destinationSummary: string;
  destination:
    | {
        accountHolderName: string;
        bankName: string;
        accountNumber: string;
        accountType: "Cheque" | "Savings" | "Transmission";
        branchCode: string;
      }
    | { paypalEmail: string };
  status: "Pending" | "Processing";
};

export function getAdminWithdrawalRequests(adminToken: string) {
  return listWithdrawalRequestsAdminServerFn({ data: { adminToken } });
}

export function updateAdminWithdrawalRequest(
  adminToken: string,
  reference: string,
  status: "Processing" | "Rejected",
) {
  return updateWithdrawalRequestAdminServerFn({ data: { adminToken, reference, status } });
}

export function setActiveManualAccount(account: ManualAccount, sessionToken?: string): void {
  localStorage.setItem(ACTIVE_ACCOUNT_STORAGE_KEY, account.id);
  if (sessionToken) localStorage.setItem(SESSION_TOKEN_STORAGE_KEY, sessionToken);
  else localStorage.removeItem(SESSION_TOKEN_STORAGE_KEY);
}

export function clearActiveManualAccount(): void {
  localStorage.removeItem(ACTIVE_ACCOUNT_STORAGE_KEY);
  localStorage.removeItem(SESSION_TOKEN_STORAGE_KEY);
  localStorage.removeItem("easyEquitiesUser");
}

export function authenticateManualAccount(email: string, password: string, company: string) {
  return authenticateManualAccountServerFn({ data: { email, password, company } });
}

export function deactivateManualAccount(id: string, password: string) {
  return deactivateManualAccountServerFn({ data: { id, password } });
}

export function changeManualAccountPassword(
  id: string,
  currentPassword: string,
  newPassword: string,
) {
  return changeManualAccountPasswordServerFn({
    data: { id, currentPassword, newPassword },
  });
}
