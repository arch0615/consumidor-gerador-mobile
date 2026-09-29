/**
 * Validation rules shared by all forms. CPF/CNPJ/e-mail logic is ported from
 * the web (`src/lib/validation/*`) and the backend (`shared/validation/*`) so
 * web, mobile and API reject exactly the same inputs.
 */
import { z } from "zod";
import { onlyDigits } from "./format";

export function isValidCpf(value: string): boolean {
  const cpf = onlyDigits(value);
  if (cpf.length !== 11 || /^(\d)\1+$/.test(cpf)) return false;
  let sum = 0;
  for (let i = 0; i < 9; i += 1) sum += Number(cpf.charAt(i)) * (10 - i);
  let check = (sum * 10) % 11;
  if (check === 10) check = 0;
  if (check !== Number(cpf.charAt(9))) return false;
  sum = 0;
  for (let i = 0; i < 10; i += 1) sum += Number(cpf.charAt(i)) * (11 - i);
  check = (sum * 10) % 11;
  if (check === 10) check = 0;
  return check === Number(cpf.charAt(10));
}

const CNPJ_W1 = [5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2] as const;
const CNPJ_W2 = [6, 5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2] as const;

export function isValidCnpj(value: string): boolean {
  const cnpj = onlyDigits(value);
  if (cnpj.length !== 14 || /^(\d)\1+$/.test(cnpj)) return false;
  let sum = 0;
  for (let i = 0; i < 12; i += 1) sum += Number(cnpj.charAt(i)) * (CNPJ_W1[i] ?? 0);
  const first = sum % 11 < 2 ? 0 : 11 - (sum % 11);
  if (first !== Number(cnpj.charAt(12))) return false;
  sum = 0;
  for (let i = 0; i < 13; i += 1) sum += Number(cnpj.charAt(i)) * (CNPJ_W2[i] ?? 0);
  const second = sum % 11 < 2 ? 0 : 11 - (sum % 11);
  return second === Number(cnpj.charAt(13));
}

export const BRAZIL_UFS = [
  "AC", "AL", "AP", "AM", "BA", "CE", "DF", "ES", "GO", "MA", "MT", "MS", "MG", "PA",
  "PB", "PR", "PE", "PI", "RJ", "RN", "RS", "RO", "RR", "SC", "SP", "SE", "TO"
] as const;

/** Password policy (same as sign-up on web and the API): ≥8, lower, upper, digit, special. */
export const PASSWORD_RULES = [
  { id: "length", label: "Mínimo de 8 caracteres", test: (v: string) => v.length >= 8 },
  { id: "lower", label: "Uma letra minúscula", test: (v: string) => /[a-z]/.test(v) },
  { id: "upper", label: "Uma letra maiúscula", test: (v: string) => /[A-Z]/.test(v) },
  { id: "digit", label: "Um número", test: (v: string) => /\d/.test(v) },
  { id: "special", label: "Um caractere especial (@$!%*?&)", test: (v: string) => /[@$!%*?&]/.test(v) }
] as const;

export const emailField = z
  .string()
  .trim()
  .toLowerCase()
  .min(1, "Informe seu e-mail.")
  .max(254, "E-mail muito longo.")
  .pipe(z.email({ message: "Confira o e-mail — exemplo: nome@empresa.com.br" }));

export const passwordField = z
  .string()
  .min(1, "Informe sua senha.")
  .refine((v) => PASSWORD_RULES.every((rule) => rule.test(v)), "A senha não atende a todos os requisitos.");

export const cpfField = z
  .string()
  .transform(onlyDigits)
  .refine((v) => v.length === 11, "O CPF deve ter 11 dígitos.")
  .refine(isValidCpf, "CPF inválido — confira os números.");

export const cpfOrCnpjField = z
  .string()
  .transform(onlyDigits)
  .refine((v) => v.length === 11 || v.length === 14, "Informe um CPF (11 dígitos) ou CNPJ (14 dígitos).")
  .refine((v) => (v.length === 11 ? isValidCpf(v) : isValidCnpj(v)), "CPF/CNPJ inválido — confira os números.");

export const cepField = z
  .string()
  .transform(onlyDigits)
  .refine((v) => v.length === 8, "O CEP deve ter 8 dígitos.");

export const phoneField = z
  .string()
  .transform(onlyDigits)
  .refine((v) => v.length === 10 || v.length === 11, "Informe DDD + número.");

export const requiredText = (message: string, max = 120) => z.string().trim().min(1, message).max(max, "Texto muito longo.");
