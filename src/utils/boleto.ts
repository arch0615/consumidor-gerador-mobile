import { onlyDigits } from "./format";

/**
 * Converts a bank boleto "linha digitável" (47 digits) into its 44-digit
 * barcode (FEBRABAN layout):
 *   line  = AAABC.CCCCX DDDDD.DDDDDY EEEEE.EEEEEZ K UUUUVVVVVVVVVV
 *   code  = AAAB K UUUUVVVVVVVVVV CCCCC DDDDDDDDDD EEEEEEEEEE
 * Returns null for anything that is not a 47-digit bank line.
 */
export function barcodeFromDigitableLine(line: string): string | null {
  const digits = onlyDigits(line);
  if (digits.length !== 47) return null;
  return digits.slice(0, 4) + digits.slice(32, 33) + digits.slice(33, 47) + digits.slice(4, 9) + digits.slice(10, 20) + digits.slice(21, 31);
}
