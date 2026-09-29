import { z } from "zod";
import type { ResidenceType } from "@/types/domain";
import { onlyDigits } from "@/utils/format";
import { BRAZIL_UFS, cepField, cpfOrCnpjField, requiredText } from "@/utils/validation";

export const RESIDENCE_TYPES = ["CASA", "APARTAMENTO", "EMPRESA", "COMERCIAL", "INDUSTRIA", "RURAL", "OUTRO"] as const satisfies readonly ResidenceType[];
export const HOLDER_OPTIONS = ["SELF", "OTHER"] as const;

export const newResidenceSchema = z.object({
  // Step 1 — basic info
  type: z.enum(RESIDENCE_TYPES, { message: "Selecione o tipo de imóvel." }),
  holder: z.enum(HOLDER_OPTIONS),
  // Step 2 — bill upload (required when creating; optional when correcting a registration)
  billDocumentId: z.string(),
  // Step 3 — review
  holderName: requiredText("Informe o nome do titular da conta."),
  holderDocument: cpfOrCnpjField,
  ucNumber: z
    .string()
    .transform(onlyDigits)
    .refine((v) => v.length >= 6 && v.length <= 15, "Informe o número da instalação (UC) como aparece na conta."),
  utilityCode: z.string().min(1, "Selecione a distribuidora."),
  cep: cepField,
  street: requiredText("Informe a rua."),
  number: requiredText("Informe o número.", 10),
  complement: z.string().trim().max(60, "Complemento muito longo."),
  district: requiredText("Informe o bairro."),
  city: requiredText("Informe a cidade."),
  uf: z.enum(BRAZIL_UFS, { message: "Selecione o estado." }),
  averageConsumptionKwh: z
    .string()
    .transform((v) => (onlyDigits(v) === "" ? null : Number(onlyDigits(v))))
    .refine((v) => v === null || (v > 0 && v < 100_000), "Consumo médio inválido.")
});

export type NewResidenceFormInput = z.input<typeof newResidenceSchema>;
export type NewResidenceFormOutput = z.output<typeof newResidenceSchema>;
export type NewResidenceField = keyof NewResidenceFormInput;

export const BILL_REQUIRED_MESSAGE = "Envie a conta de luz para continuar.";

/** Fields validated before leaving each wizard step (the bill is checked by the wizard). */
export const STEP_FIELDS: readonly (readonly NewResidenceField[])[] = [
  ["type", "holder"],
  [],
  ["holderName", "holderDocument", "ucNumber", "utilityCode", "cep", "street", "number", "complement", "district", "city", "uf", "averageConsumptionKwh"],
  []
];

export const NEW_RESIDENCE_DEFAULTS: NewResidenceFormInput = {
  type: "CASA",
  holder: "SELF",
  billDocumentId: "",
  holderName: "",
  holderDocument: "",
  ucNumber: "",
  utilityCode: "",
  cep: "",
  street: "",
  number: "",
  complement: "",
  district: "",
  city: "",
  uf: "SP",
  averageConsumptionKwh: ""
};
