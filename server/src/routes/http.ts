import type { Context } from "hono";
import type { ContentfulStatusCode } from "hono/utils/http-status";
import { DomainError } from "../services/errors";

export function handleError(c: Context, error: unknown) {
  if (error instanceof DomainError) {
    return c.json({ error: error.message }, error.status as ContentfulStatusCode);
  }
  throw error;
}
