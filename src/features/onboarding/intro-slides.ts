import { ChartColumn, Leaf, PiggyBank, type LucideIcon } from "lucide-react-native";

export interface IntroSlide {
  id: string;
  icon: LucideIcon;
  title: string;
  message: string;
}

/** First-launch introduction (shown once per device). */
export const INTRO_SLIDES: readonly IntroSlide[] = [
  {
    id: "clean-energy",
    icon: Leaf,
    title: "Energia limpa por assinatura",
    message: "Receba créditos de energia solar direto na sua conta de luz. Sem obras, sem instalação e sem investimento."
  },
  {
    id: "savings",
    icon: PiggyBank,
    title: "Economia todo mês",
    message: "Pague menos pela mesma energia. O desconto aparece na sua fatura ACVEL, mês a mês."
  },
  {
    id: "control",
    icon: ChartColumn,
    title: "Tudo na palma da mão",
    message: "Acompanhe consumo, economia, faturas e pagamentos com Pix ou boleto pelo app."
  }
];
