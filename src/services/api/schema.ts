import { z } from "zod";

/**
 * Zod building blocks for backend payloads. The legacy business/rateio APIs
 * serialise decimals as strings and are inconsistent about null vs. missing,
 * so responses are normalised here once instead of in every mapper.
 */

/** Number or numeric string (Prisma Decimal) → number. */
export const zNumber = z.union([z.number(), z.string().trim().regex(/^-?\d+(\.\d+)?$/)]).transform(Number);

/** Optional numeric → number | null. */
export const zNumberOrNull = zNumber.nullish().transform((value) => value ?? null);

/** Optional string → string | null (empty string kept). */
export const zStringOrNull = z.string().nullish().transform((value) => value ?? null);

/** Optional string → string ("" when missing). */
export const zStringOrEmpty = z.string().nullish().transform((value) => value ?? "");

/** Identifier that may arrive as number or string. */
export const zId = z.union([z.string().min(1), z.number()]).transform(String);

/** Accepts `[...]` or `{ data: [...] }` (paginated) and returns the array. */
export function zList<T extends z.ZodType>(item: T) {
  return z.union([z.array(item), z.object({ data: z.array(item) })]).transform((value) => (Array.isArray(value) ? value : value.data));
}

/** For endpoints whose success body is irrelevant (204 or ignored JSON). */
export const zIgnoredBody = z.unknown().transform((): void => undefined);

export type JsonPrimitive = string | number | boolean | null;
export type JsonValue = JsonPrimitive | JsonValue[] | { [key: string]: JsonValue | undefined };
