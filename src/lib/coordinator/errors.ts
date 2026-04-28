export class ConsoleApiError extends Error {
  readonly code: string;
  readonly status?: number;
  readonly details?: unknown;

  constructor(input: { code: string; message: string; status?: number; details?: unknown }) {
    super(input.message);
    this.name = "ConsoleApiError";
    this.code = input.code;
    this.status = input.status;
    this.details = input.details;
  }
}

export function errorMessage(error: unknown): string {
  if (error instanceof ConsoleApiError) return error.message;
  if (error instanceof Error) return error.message;
  return String(error ?? "Unknown error");
}

export function isNotFound(error: unknown): boolean {
  return error instanceof ConsoleApiError && (error.status === 404 || error.code === "NOT_FOUND");
}
