import { ChevronDown } from "lucide-react-native";
import { useState } from "react";
import { Pressable, View } from "react-native";
import { AppText } from "@/components";
import { useTheme } from "@/theme";

/** Expandable question/answer row. */
export function FaqItem({ question, answer, divider }: { question: string; answer: string; divider: boolean }) {
  const theme = useTheme();
  const [open, setOpen] = useState(false);
  return (
    <View style={{ borderBottomWidth: divider ? 1 : 0, borderBottomColor: theme.colors.border }}>
      <Pressable
        onPress={() => setOpen((current) => !current)}
        accessibilityRole="button"
        accessibilityState={{ expanded: open }}
        style={{ minHeight: theme.sizing.listRow, flexDirection: "row", alignItems: "center", gap: theme.spacing.sm, paddingVertical: theme.spacing.sm }}
      >
        <AppText variant="bodyStrong" style={{ flex: 1 }}>
          {question}
        </AppText>
        <View style={{ transform: [{ rotate: open ? "180deg" : "0deg" }] }}>
          <ChevronDown size={theme.sizing.iconMd} color={theme.colors.textTertiary} />
        </View>
      </Pressable>
      {open ? (
        <AppText variant="subhead" tone="secondary" style={{ paddingBottom: theme.spacing.sm }}>
          {answer}
        </AppText>
      ) : null}
    </View>
  );
}
