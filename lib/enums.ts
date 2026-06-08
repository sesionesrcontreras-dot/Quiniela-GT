/**
 * "Enums" como objetos constantes tipados.
 *
 * SQLite (Prisma) no soporta enums nativos, asi que en la DB se guardan como
 * String. Aqui centralizamos los valores validos para tener autocompletado y
 * evitar errores de tipeo. En PostgreSQL podrias migrar a enums reales.
 */

export const Role = {
  PLAYER: "PLAYER",
  ADMIN: "ADMIN",
  FINANCE: "FINANCE",
} as const;
export type Role = (typeof Role)[keyof typeof Role];

export const KycStatus = {
  NONE: "NONE",
  PENDING: "PENDING",
  VERIFIED: "VERIFIED",
  REJECTED: "REJECTED",
} as const;
export type KycStatus = (typeof KycStatus)[keyof typeof KycStatus];

export const MatchStatus = {
  SCHEDULED: "SCHEDULED",
  LOCKED: "LOCKED",
  FINISHED: "FINISHED",
  CANCELLED: "CANCELLED",
} as const;
export type MatchStatus = (typeof MatchStatus)[keyof typeof MatchStatus];

export const PoolType = {
  PUBLIC: "PUBLIC",
  PRIVATE: "PRIVATE",
} as const;
export type PoolType = (typeof PoolType)[keyof typeof PoolType];

export const PoolStatus = {
  DRAFT: "DRAFT",
  OPEN: "OPEN",
  CLOSED: "CLOSED",
  SETTLED: "SETTLED",
  CANCELLED: "CANCELLED",
} as const;
export type PoolStatus = (typeof PoolStatus)[keyof typeof PoolStatus];

export const EntryStatus = {
  PENDING_PAYMENT: "PENDING_PAYMENT",
  ACTIVE: "ACTIVE",
  REFUNDED: "REFUNDED",
  DISQUALIFIED: "DISQUALIFIED",
} as const;
export type EntryStatus = (typeof EntryStatus)[keyof typeof EntryStatus];

export const PaymentMethod = {
  BANK_TRANSFER: "BANK_TRANSFER",
  CARD_PAGGO: "CARD_PAGGO",
  CASH_AGENCY: "CASH_AGENCY",
  WALLET: "WALLET",
} as const;
export type PaymentMethod = (typeof PaymentMethod)[keyof typeof PaymentMethod];

export const PaymentStatus = {
  PENDING: "PENDING",
  CONFIRMED: "CONFIRMED",
  REJECTED: "REJECTED",
  REFUNDED: "REFUNDED",
} as const;
export type PaymentStatus = (typeof PaymentStatus)[keyof typeof PaymentStatus];

export const PayoutStatus = {
  PENDING: "PENDING",
  PAID: "PAID",
  CANCELLED: "CANCELLED",
} as const;
export type PayoutStatus = (typeof PayoutStatus)[keyof typeof PayoutStatus];

export const AccountType = {
  USER_WALLET: "USER_WALLET", // pasivo: dinero que le debemos al jugador
  POOL_ESCROW: "POOL_ESCROW", // pasivo: pozo de una quiniela
  PLATFORM_REVENUE: "PLATFORM_REVENUE", // ingreso: la comision (rake)
  PAYMENT_FEES: "PAYMENT_FEES", // gasto: comisiones de procesador
  CASH_BANK: "CASH_BANK", // activo: efectivo recibido en agencias
  BANK_ACCOUNT: "BANK_ACCOUNT", // activo: transferencias recibidas
  PAGGO_GATEWAY: "PAGGO_GATEWAY", // activo: fondos en el procesador
  PROMO_BONUS: "PROMO_BONUS", // gasto: creditos promocionales
} as const;
export type AccountType = (typeof AccountType)[keyof typeof AccountType];

export const TxType = {
  DEPOSIT: "DEPOSIT",
  ENTRY_FEE: "ENTRY_FEE",
  RAKE: "RAKE",
  PAYOUT: "PAYOUT",
  REFUND: "REFUND",
  WITHDRAWAL: "WITHDRAWAL",
  FEE: "FEE",
  ADJUSTMENT: "ADJUSTMENT",
} as const;
export type TxType = (typeof TxType)[keyof typeof TxType];
