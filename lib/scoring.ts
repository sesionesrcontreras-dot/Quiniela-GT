/**
 * Motor de puntaje. Reglas configurables por quiniela (JSON en Pool.scoringRules).
 *
 *  exact   = puntos por acertar el marcador EXACTO (ej 2-1 = 2-1)
 *  outcome = puntos por acertar solo el resultado (gana local/empate/gana visita)
 *  goalDiff(opcional) = puntos extra por acertar la diferencia de goles
 */

export interface ScoringRules {
  exact: number;
  outcome: number;
  goalDiff?: number;
  /** bono por acertar el CAMPEON del torneo (prediccion general) */
  champion?: number;
}

export const DEFAULT_RULES: ScoringRules = { exact: 3, outcome: 1, champion: 10 };

export function parseRules(json: string): ScoringRules {
  try {
    const r = JSON.parse(json);
    return {
      exact: Number(r.exact ?? DEFAULT_RULES.exact),
      outcome: Number(r.outcome ?? DEFAULT_RULES.outcome),
      goalDiff: r.goalDiff != null ? Number(r.goalDiff) : undefined,
      champion: r.champion != null ? Number(r.champion) : undefined,
    };
  } catch {
    return DEFAULT_RULES;
  }
}

function outcome(home: number, away: number): "H" | "D" | "A" {
  if (home > away) return "H";
  if (home < away) return "A";
  return "D";
}

/**
 * Calcula los puntos de UNA prediccion contra el resultado real.
 * Si los puntos son acumulativos, "exact" ya implica acertar el "outcome",
 * por eso devolvemos el MAXIMO aplicable, no la suma (salvo goalDiff que suma).
 */
export function scorePrediction(
  rules: ScoringRules,
  pred: { home: number; away: number },
  result: { home: number; away: number }
): number {
  const exactHit = pred.home === result.home && pred.away === result.away;
  if (exactHit) return rules.exact;

  let pts = 0;
  if (outcome(pred.home, pred.away) === outcome(result.home, result.away)) {
    pts += rules.outcome;
    if (rules.goalDiff && pred.home - pred.away === result.home - result.away) {
      pts += rules.goalDiff;
    }
  }
  return pts;
}
