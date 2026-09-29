import { z } from "zod";
import type { TicketCategory } from "@/types/domain";
import { requiredText } from "@/utils/validation";

export const TICKET_CATEGORIES = ["FATURA", "PAGAMENTO", "ECONOMIA", "CADASTRO", "BENEFICIOS", "OUTROS"] as const satisfies readonly TicketCategory[];

export const newTicketSchema = z.object({
  category: z.enum(TICKET_CATEGORIES, { message: "Selecione o assunto." }),
  subject: requiredText("Resuma o problema em poucas palavras.", 80).refine((v) => v.length >= 5, "Use pelo menos 5 caracteres."),
  message: requiredText("Descreva o que aconteceu.", 2000).refine((v) => v.length >= 20, "Conte um pouco mais (mínimo de 20 caracteres).")
});

export type NewTicketForm = z.input<typeof newTicketSchema>;
