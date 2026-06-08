import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/auth";
import { parse, createPoolSchema } from "@/lib/validation";
import { toCents } from "@/lib/money";
import { ok, handleError, audit, getIp } from "@/lib/security";
import { randomBytes } from "crypto";

// GET /api/pools  -> lista de quinielas publicas abiertas
export async function GET() {
  try {
    const pools = await prisma.pool.findMany({
      where: { type: "PUBLIC", status: { in: ["OPEN", "CLOSED"] } },
      orderBy: { createdAt: "desc" },
      include: { _count: { select: { entries: true } }, tournament: true },
    });
    return ok(pools);
  } catch (e) {
    return handleError(e);
  }
}

// POST /api/pools  -> crear quiniela
export async function POST(req: Request) {
  try {
    const session = await requireUser();
    const data = parse(createPoolSchema, await req.json());

    const inviteCode =
      data.type === "PUBLIC" ? null : randomBytes(4).toString("hex").toUpperCase();

    const pool = await prisma.pool.create({
      data: {
        name: data.name,
        ownerId: session.uid,
        tournamentId: data.tournamentId,
        type: data.type,
        entryFeeCents: toCents(data.entryFeeQuetzales),
        rakePercent: data.rakePercent,
        maxEntriesPerUser: data.maxEntriesPerUser,
        prizeSplit: JSON.stringify(data.prizeSplit),
        scoringRules: JSON.stringify(data.scoring),
        inviteCode,
      },
    });

    await audit({
      actorId: session.uid,
      action: "POOL_CREATE",
      entity: "Pool",
      entityId: pool.id,
      metadata: { type: pool.type, rake: pool.rakePercent },
      ip: getIp(req),
    });

    return ok(pool, 201);
  } catch (e) {
    return handleError(e);
  }
}
