// Gestion centralisée des erreurs applicatives.
export type ErrorCode = "UNAUTHENTICATED" | "FORBIDDEN" | "NOT_FOUND" | "VALIDATION" | "CONFLICT" | "INTERNAL";

const MESSAGES: Record<ErrorCode, string> = {
  UNAUTHENTICATED: "Veuillez vous connecter.",
  FORBIDDEN: "Vous n'avez pas les droits nécessaires pour cette action.",
  NOT_FOUND: "Élément introuvable.",
  VALIDATION: "Certaines informations sont invalides.",
  CONFLICT: "Cette opération entre en conflit avec des données existantes.",
  INTERNAL: "Une erreur inattendue est survenue. Réessayez.",
};

export class AppError extends Error {
  constructor(public code: ErrorCode, message?: string, public details?: unknown) {
    super(message ?? MESSAGES[code]);
    this.name = "AppError";
  }
}

/** Traduit une erreur Postgres/PostgREST en AppError. */
export function fromDbError(err: { code?: string; message?: string } | null | undefined): AppError {
  if (!err) return new AppError("INTERNAL");
  switch (err.code) {
    case "42501": return new AppError("FORBIDDEN");
    case "23505": return new AppError("CONFLICT", "Cet élément existe déjà.");
    case "23514": return new AppError("CONFLICT", "Opération refusée : contrainte d'intégrité (ex. stock insuffisant).");
    case "23503": return new AppError("VALIDATION", "Référence invalide.");
    case "PGRST116": return new AppError("NOT_FOUND");
    default: return new AppError("INTERNAL", undefined, err.message);
  }
}

/** Message lisible côté interface, quel que soit le type d'erreur. */
export function userMessage(err: unknown): string {
  if (err instanceof AppError) return err.message;
  if (err instanceof Error && err.message) {
    const known = Object.values(MESSAGES).find((m) => err.message.includes(m));
    return known ?? err.message;
  }
  return MESSAGES.INTERNAL;
}
