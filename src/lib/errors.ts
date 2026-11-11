export class AppError extends Error {
  constructor(
    public readonly code: string,
    message: string,
    public readonly status: number,
  ) { super(message); }
}

export function unauthorized(): never {
  throw new AppError("UNAUTHENTICATED", "Please sign in to continue.", 401);
}
