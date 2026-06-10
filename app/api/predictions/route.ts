import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/auth";
import { parse, predictionSchema } from "@/lib/validation";
import { ok, fail, handleError } from "@/lib/security";

// POST /api/predictions  -> guardar/actualizar predicciones de un boleto
export async function POST(req: Request) {
  try {
    const session = await requireUser();
    const data = parse(predictionSchema, await req.json());

    const entry = await prisma.entry.findUnique({
      where: { id: data.entryId },
      include: { pool: true },
    });
    if (!entry) return fail("Boleto no encontrado", 404);
    if (entry.userId !== session.uid) return fail("Este boleto no es tuyo", 403);
    if (entry.status !== "ACTIVE") return fail("El boleto no esta activo", 409);

    // En un reto de un solo partido, solo se acepta prediccion de ESE match.
    if (entry.pool.matchId) {
      const extra = data.predictions.find((p) => p.matchId !== entry.pool.matchId);
      if (extra) return fail("Este reto solo admite prediccion del partido del reto", 400);
    }

    // Solo se aceptan predicciones de partidos que aun NO han iniciado.
    const matchIds = data.predictions.map((p) => p.matchId);
    const matches = await prisma.match.findMany({
      where: { id: { in: matchIds } },
    });
    const matchById = new Map(matches.map((m) => [m.id, m]));

    const now = new Date();
    const valid = data.predictions.filter((p) => {
      const m = matchById.get(p.matchId);
      if (!m) return false;
      const lock = m.lockedAt ?? m.kickoff;
      return m.status === "SCHEDULED" && lock > now;
    });

    if (valid.length === 0)
      return fail("Los partidos seleccionados ya estan cerrados", 409);

    // upsert atomico de cada prediccion (una por partido por boleto)
    await prisma.$transaction(
      valid.map((p) =>
        prisma.prediction.upsert({
          where: { entryId_matchId: { entryId: entry.id, matchId: p.matchId } },
          create: {
            entryId: entry.id,
            matchId: p.matchId,
            predHome: p.predHome,
            predAway: p.predAway,
          },
          update: { predHome: p.predHome, predAway: p.predAway },
        })
      )
    );

    return ok({ saved: valid.length, ignored: data.predictions.length - valid.length });
  } catch (e) {
    return handleError(e);
  }
}
