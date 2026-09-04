/**
 * Turns a caught value into a readable string.
 *
 * A `catch` block in TypeScript receives `unknown`, not `Error` — the thrown
 * value could be anything. This is the one place that decides how to read it,
 * so every other file just calls `errorMessage(error)`.
 */
export function errorMessage(error: unknown): string {
  if (error instanceof Error) {
    return error.message;
  }
  return String(error);
}
