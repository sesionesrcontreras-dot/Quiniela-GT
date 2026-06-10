/**
 * ════════════════════════════════════════════════════════════════════
 *  LIBRO CONTABLE DE PARTIDA DOBLE (double-entry ledger)
 * ════════════════════════════════════════════════════════════════════
 *
 *  Este es el modulo mas importante para el control financiero.
 *
 *  Principio: cada transaccion son >= 2 asientos (entries) cuyo
 *  (suma de debe) == (suma de haber). Si no cuadra, se RECHAZA.
 *  Asi es matematicamente imposible "perder" o "inventar" dinero.
 *
 *  El saldo de una cuenta NUNCA se guarda como un campo editable.
 *  Se CALCULA: saldo = SUM(debe) - SUM(haber). Nadie puede tocarlo a mano.
 *
 *  Convencion contable usada (cuentas de tipo "activo" y "gasto" suben con
 *  el DEBE; "pasivo" e "ingreso" suben con el HABER):
 *    - Activo  (CASH_BANK, BANK_ACCOUNT, PAGGO_GATEWAY): saldo normal = debe
 *    - Pasivo  (USER_WALLET, POOL_ESCROW):               saldo normal = haber
 *    - Ingreso (PLATFORM_REVENUE):                       saldo normal = haber
 *    - Gasto   (PAYMENT_FEES, PROMO_BONUS):              saldo normal = debe
 */

import { Prisma, PrismaClient } from "@prisma/client";
import { AccountType, TxType } from "./enums";
import { prisma } from "./prisma";
import { applyRake } from "./money";

type Tx = Prisma.TransactionClient | PrismaClient;

export interface PostingLine {
  accountId: string;
  debitCents?: number;
  creditCents?: number;
}

/**
 * Registra una transaccion contable de forma atomica y validada.
 * Lanza error (y revierte todo) si los asientos no suman cero.
 */
export async function postTransaction(
  db: Tx,
  params: {
    type: TxType;
    description: string;
    reference?: string;
    createdById?: string;
    lines: PostingLine[];
  }
) {
  const { lines } = params;
  if (lines.length < 2) throw new Error("Una transaccion necesita >= 2 asientos");

  let totalDebit = 0;
  let totalCredit = 0;
  for (const l of lines) {
    const d = l.debitCents ?? 0;
    const c = l.creditCents ?? 0;
    if (d < 0 || c < 0) throw new Error("Montos negativos no permitidos");
    if (d > 0 && c > 0) throw new Error("Un asiento no puede tener debe y haber");
    totalDebit += d;
    totalCredit += c;
  }

  // INVARIANTE CENTRAL: debe == haber
  if (totalDebit !== totalCredit) {
    throw new Error(
      `Transaccion descuadrada: debe=${totalDebit} haber=${totalCredit}`
    );
  }
  if (totalDebit === 0) throw new Error("Transaccion en cero no permitida");

  return db.ledgerTransaction.create({
    data: {
      type: params.type,
      description: params.description,
      reference: params.reference,
      createdById: params.createdById,
      entries: {
        create: lines.map((l) => ({
          accountId: l.accountId,
          debitCents: l.debitCents ?? 0,
          creditCents: l.creditCents ?? 0,
        })),
      },
    },
    include: { entries: true },
  });
}

/**
 * Pozos de VARIAS quinielas en 2 consultas (en vez de 2 por quiniela).
 * Devuelve Map poolId -> centavos disponibles en su escrow.
 */
export async function getPoolPots(db: Tx, poolIds: string[]): Promise<Map<string, number>> {
  const pots = new Map<string, number>();
  if (poolIds.length === 0) return pots;

  const accounts = await db.ledgerAccount.findMany({
    where: { poolId: { in: poolIds } },
    select: { id: true, poolId: true },
  });
  if (accounts.length === 0) return pots;

  const sums = await db.ledgerEntry.groupBy({
    by: ["accountId"],
    where: { accountId: { in: accounts.map((a) => a.id) } },
    _sum: { debitCents: true, creditCents: true },
  });
  const byAccount = new Map(sums.map((s) => [s.accountId, s]));

  for (const a of accounts) {
    const s = byAccount.get(a.id);
    // escrow es pasivo: disponible = haber - debe
    const pot = s ? (s._sum.creditCents ?? 0) - (s._sum.debitCents ?? 0) : 0;
    pots.set(a.poolId!, pot);
  }
  return pots;
}

/** Saldo de una cuenta = SUM(debe) - SUM(haber), en centavos. */
export async function getBalance(db: Tx, accountId: string): Promise<number> {
  const agg = await db.ledgerEntry.aggregate({
    where: { accountId },
    _sum: { debitCents: true, creditCents: true },
  });
  return (agg._sum.debitCents ?? 0) - (agg._sum.creditCents ?? 0);
}

/** Busca (o crea) la cuenta de sistema de un tipo dado. */
export async function getSystemAccount(db: Tx, type: AccountType) {
  const existing = await db.ledgerAccount.findFirst({
    where: { type, userId: null, poolId: null },
  });
  if (existing) return existing;
  return db.ledgerAccount.create({
    data: { type, name: type },
  });
}

/** Cuenta billetera de un usuario (la crea si no existe). */
export async function getUserWallet(db: Tx, userId: string) {
  const existing = await db.ledgerAccount.findUnique({ where: { userId } });
  if (existing) return existing;
  return db.ledgerAccount.create({
    data: { type: AccountType.USER_WALLET, name: `Wallet ${userId}`, userId },
  });
}

/** Cuenta escrow (pozo) de una quiniela (la crea si no existe). */
export async function getPoolEscrow(db: Tx, poolId: string) {
  const existing = await db.ledgerAccount.findUnique({ where: { poolId } });
  if (existing) return existing;
  return db.ledgerAccount.create({
    data: { type: AccountType.POOL_ESCROW, name: `Escrow ${poolId}`, poolId },
  });
}

/** Mapea metodo de pago -> cuenta de activo donde entra el dinero real. */
function methodToAssetType(method: string): AccountType {
  switch (method) {
    case "CARD_PAGGO":
      return AccountType.PAGGO_GATEWAY;
    case "BANK_TRANSFER":
      return AccountType.BANK_ACCOUNT;
    case "CASH_AGENCY":
      return AccountType.CASH_BANK;
    default:
      return AccountType.BANK_ACCOUNT;
  }
}

/**
 * Operacion de alto nivel: un jugador DEPOSITA dinero (pago confirmado).
 * Asiento: DEBE activo (entra dinero real) / HABER billetera del usuario
 * (le debemos ese saldo). Opcionalmente descuenta comision del procesador.
 */
export async function recordDeposit(
  db: Tx,
  params: {
    userId: string;
    method: string;
    amountCents: number;
    feeCents?: number; // comision del procesador (ej Paggo)
    reference?: string;
    createdById?: string;
  }
) {
  const asset = await getSystemAccount(db, methodToAssetType(params.method));
  const wallet = await getUserWallet(db, params.userId);
  const lines: PostingLine[] = [
    { accountId: asset.id, debitCents: params.amountCents },
    { accountId: wallet.id, creditCents: params.amountCents },
  ];

  await postTransaction(db, {
    type: TxType.DEPOSIT,
    description: `Deposito ${params.method}`,
    reference: params.reference,
    createdById: params.createdById,
    lines,
  });

  // Si hay comision del procesador, se registra como gasto:
  // DEBE gasto comisiones / HABER activo (el procesador se queda esa parte)
  if (params.feeCents && params.feeCents > 0) {
    const fees = await getSystemAccount(db, AccountType.PAYMENT_FEES);
    await postTransaction(db, {
      type: TxType.FEE,
      description: `Comision procesador ${params.method}`,
      reference: params.reference,
      createdById: params.createdById,
      lines: [
        { accountId: fees.id, debitCents: params.feeCents },
        { accountId: asset.id, creditCents: params.feeCents },
      ],
    });
  }
}

/**
 * Cobro de cuota de quiniela. Mueve dinero de la billetera del jugador
 * hacia: (a) el pozo de la quiniela (neto) y (b) el ingreso de la
 * plataforma (rake). En un solo asiento balanceado.
 */
export async function chargeEntryFee(
  db: Tx,
  params: {
    userId: string;
    poolId: string;
    grossCents: number;
    rakePercent: number;
    reference?: string;
    createdById?: string;
  }
) {
  const wallet = await getUserWallet(db, params.userId);
  const escrow = await getPoolEscrow(db, params.poolId);
  const revenue = await getSystemAccount(db, AccountType.PLATFORM_REVENUE);

  const balance = await getBalance(db, wallet.id);
  // billetera es pasivo: saldo disponible = -saldoContable (haber neto)
  const available = -balance;
  if (available < params.grossCents) {
    throw new Error("Saldo insuficiente en la billetera");
  }

  const { rakeCents, netCents } = applyRake(params.grossCents, params.rakePercent);

  await postTransaction(db, {
    type: TxType.ENTRY_FEE,
    description: `Cuota quiniela (rake ${params.rakePercent}%)`,
    reference: params.reference ?? params.poolId,
    createdById: params.createdById,
    lines: [
      // baja el pasivo con el jugador (debe en su billetera)
      { accountId: wallet.id, debitCents: params.grossCents },
      // sube el pozo (haber)
      { accountId: escrow.id, creditCents: netCents },
      // sube el ingreso de la plataforma = TU GANANCIA (haber)
      { accountId: revenue.id, creditCents: rakeCents },
    ],
  });

  return { rakeCents, netCents };
}

/**
 * RETIRO: el jugador saca dinero de su billetera hacia su cuenta bancaria.
 * Asiento: DEBE billetera (baja el pasivo) / HABER banco (sale dinero real).
 * Valida saldo suficiente DENTRO de la transaccion.
 */
export async function recordWithdrawal(
  db: Tx,
  params: {
    userId: string;
    amountCents: number;
    reference?: string;
    createdById?: string;
  }
) {
  const wallet = await getUserWallet(db, params.userId);
  const available = -(await getBalance(db, wallet.id));
  if (available < params.amountCents) {
    throw new Error("Saldo insuficiente para el retiro");
  }
  const bank = await getSystemAccount(db, AccountType.BANK_ACCOUNT);

  await postTransaction(db, {
    type: TxType.WITHDRAWAL,
    description: "Retiro a cuenta bancaria",
    reference: params.reference,
    createdById: params.createdById,
    lines: [
      { accountId: wallet.id, debitCents: params.amountCents },
      { accountId: bank.id, creditCents: params.amountCents },
    ],
  });
}

/**
 * Reparte el pozo a los ganadores: mueve del escrow de la quiniela a las
 * billeteras de los ganadores. La suma de premios debe == saldo del pozo.
 */
export async function distributePrizes(
  db: Tx,
  params: {
    poolId: string;
    winners: { userId: string; amountCents: number }[];
    createdById?: string;
  }
) {
  const escrow = await getPoolEscrow(db, params.poolId);
  const escrowBalance = -(await getBalance(db, escrow.id)); // pasivo
  const totalPrizes = params.winners.reduce((a, w) => a + w.amountCents, 0);

  if (totalPrizes !== escrowBalance) {
    throw new Error(
      `Premios (${totalPrizes}) != pozo (${escrowBalance}). No se reparte.`
    );
  }

  const lines: PostingLine[] = [
    { accountId: escrow.id, debitCents: totalPrizes }, // vacia el pozo
  ];
  for (const w of params.winners) {
    const wallet = await getUserWallet(db, w.userId);
    lines.push({ accountId: wallet.id, creditCents: w.amountCents });
  }

  await postTransaction(db, {
    type: TxType.PAYOUT,
    description: `Reparto de premios quiniela`,
    reference: params.poolId,
    createdById: params.createdById,
    lines,
  });
}

/** Atajo para correr dentro de una transaccion de DB. */
export function withTx<T>(fn: (tx: Prisma.TransactionClient) => Promise<T>) {
  return prisma.$transaction(fn);
}
