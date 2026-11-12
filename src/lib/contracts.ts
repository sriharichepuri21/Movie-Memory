export const FACT_CACHE_SECONDS = 60;

export type FactResult = {
  fact: { id: string; movie: string; text: string; generatedAt: string };
  source: "generated" | "cache" | "stale";
  warning?: string;
};

export type ApiErrorBody = { error: { code: string; message: string } };
