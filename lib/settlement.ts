/**
 * Liquidacion de quinielas: recalcular puntajes y repartir el pozo.
 * Usa el ledger para mover el dinero de forma auditable.
 */

import { prisma } from "./prisma";
import { parseRules, scorePrediction } from "./scoring";
import { splitByPercent } from "./money";
import { distributePrizes, getPoolEscrow, getBalance } from "./ledger";
import { Prisma } from "@prisma/client";

/**
 * Recalcula los puntos de cada prediccion y el total por boleto (Entry)
 * para una quiniela. Solo cuenta partidos FINISHED.
 */
export async function recalcPoolPoints(poolId: string) {
  const pool = await prisma.pool.findUniqueOrThrow({ where: { id: poolId } });
  const rules = parseRules(pool.scoringRules);

  const entries = await prisma.entry.findMany({
    where: { poolId, status: "ACTIVE" },
    include: { predictions: { include: { match: true } } },
  });

  for (const entry of entries) {
    let total = 0;
    for (const pred of entry.predictions) {
      if (
        pred.match.status === "FINISHED" &&
        pred.match.homeScore != null &&
        pred.match.awayScore != null
      ) {
        const pts = scorePrediction(
          rules,
          { home: pred.predHome, away: pred.predAway },
          { home: pred.match.homeScore, away: pred.match.awayScore }
        );
        if (pts !== pred.pointsAwarded) {
          await prisma.prediction.update({
            where: { id: pred.id },
            data: { pointsAwarded: pts },
          });
        }
        total += pts;
      }
    }
    if (total !== entry.points) {
      await prisma.entry.update({ where: { id: entry.id }, data: { points: total } });
    }
  }
}

/** Calcula el ranking (boletos ordenados por puntos desc). */
export async function getStandings(poolId: string) {
  return prisma.entry.findMany({
    where: { poolId, status: "ACTIVE" },
    orderBy: [{ points: "desc" }, { createdAt: "asc" }], // desempate: quien entro antes
    include: { user: { select: { id: true, name: true } } },
  });
}

/**
 * Liquida una quiniela: reparte el pozo (escrow) entre los ganadores segun
 * prizeSplit. Maneja empates dividiendo en partes iguales el premio combinado
 * de las posiciones empatadas. Idempotente: si ya esta SETTLED, no hace nada.
 */
export async function settlePool(poolId: string, adminId?: string) {
  await recalcPoolPoints(poolId);

  return prisma.$transaction(async (tx) => {
    const pool = await tx.pool.findUniqueOrThrow({ where: { id: poolId } });
    if (pool.status === "SETTLED") return { alreadySettled: true };

    const escrow = await getPoolEscrow(tx, poolId);
    const potCents = -(await getBalance(tx, escrow.id)); // pasivo => saldo disponible
    if (potCents <= 0) {
      await tx.pool.update({ where: { id: poolId }, data: { status: "SETTLED" } });
      return { potCents: 0, payouts: [] };
    }

    const prizeSplit = JSON.parse(pool.prizeSplit) as number[];
    const prizeByPosition = splitByPercent(potCents, prizeSplit);

    const standings = await tx.entry.findMany({
      where: { poolId, status: "ACTIVE" },
      orderBy: [{ points: "desc" }, { createdAt: "asc" }],
    });

    // Agrupar por puntaje para repartir empates equitativamente.
    const winnersMap = new Map<string, number>(); // userId -> centavos
    let pos = 0;
    let i = 0;
    while (i < standings.length && pos < prizeByPosition.length) {
      // grupo de empatados con el mismo puntaje
      const group: typeof standings = [standings[i]];
      let j = i + 1;
      while (j < standings.length && standings[j].points === standings[i].points) {
        group.push(standings[j]);
        j++;
      }
      // suma de premios de las posiciones que cubre este grupo
      let combined = 0;
      for (let k = 0; k < group.length && pos + k < prizeByPosition.length; k++) {
        combined += prizeByPosition[pos + k];
      }
      const each = Math.floor(combined / group.length);
      let remainder = combined - each * group.length;
      for (const g of group) {
        let amt = each;
        if (remainder > 0) {
          amt += 1;
          remainder--;
        }
        if (amt > 0) winnersMap.set(g.userId, (winnersMap.get(g.userId) ?? 0) + amt);
      }
      pos += group.length;
      i = j;
    }

    const winners = [...winnersMap.entries()].map(([userId, amountCents]) => ({
      userId,
      amountCents,
    }));

    // Ajuste final por si quedaron centavos sin asignar (sin ganadores suficientes)
    const assigned = winners.reduce((a, w) => a + w.amountCents, 0);
    if (assigned !== potCents && winners.length > 0) {
      winners[0].amountCents += potCents - assigned;
    }

    if (winners.length > 0) {
      await distributePrizes(tx, { poolId, winners, createdById: adminId });

      // Registrar Payout por ganador (para gestion de pagos)
      let position = 1;
      for (const w of winners) {
        await tx.payout.create({
          data: {
            poolId,
            userId: w.userId,
            amountCents: w.amountCents,
            position: position++,
            status: "PENDING",
          },
        });
      }
    }

    await tx.pool.update({ where: { id: poolId }, data: { status: "SETTLED" } });
    return { potCents, payouts: winners };
  });
}
