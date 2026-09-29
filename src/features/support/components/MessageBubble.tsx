import { Paperclip } from "lucide-react-native";
import { View } from "react-native";
import { AppText } from "@/components";
import { useTheme } from "@/theme";
import type { TicketMessage } from "@/types/domain";
import { formatDateTime } from "@/utils/format";

/** Chat bubble: customer on the right (brand), support on the left (surface). */
export function MessageBubble({ message }: { message: TicketMessage }) {
  const theme = useTheme();
  const mine = message.sender === "CLIENTE";
  const tone = mine ? "onPrimary" : "primary";
  return (
    <View
      style={{ alignItems: mine ? "flex-end" : "flex-start" }}
      accessible
      accessibilityLabel={`${mine ? "Você" : "Suporte ACVEL"}, ${formatDateTime(message.createdAt)}: ${message.body}${message.attachments.length > 0 ? `. ${message.attachments.length} anexo(s)` : ""}`}
    >
      <View
        style={{
          maxWidth: "85%",
          gap: theme.spacing.xxs,
          padding: theme.spacing.sm,
          borderRadius: theme.radius.lg,
          borderBottomRightRadius: mine ? theme.radius.sm : theme.radius.lg,
          borderBottomLeftRadius: mine ? theme.radius.lg : theme.radius.sm,
          backgroundColor: mine ? theme.colors.primary : theme.colors.surface,
          borderWidth: mine ? 0 : 1,
          borderColor: theme.colors.border
        }}
      >
        {!mine ? (
          <AppText variant="caption" tone="brand">
            Suporte ACVEL
          </AppText>
        ) : null}
        <AppText variant="body" tone={tone}>
          {message.body}
        </AppText>
        {message.attachments.map((attachment) => (
          <View key={attachment.documentId} style={{ flexDirection: "row", alignItems: "center", gap: theme.spacing.xxs }}>
            <Paperclip size={theme.sizing.iconSm} color={mine ? theme.colors.textOnPrimary : theme.colors.textSecondary} />
            <AppText variant="footnote" tone={mine ? "onPrimary" : "secondary"} numberOfLines={1}>
              {attachment.name}
            </AppText>
          </View>
        ))}
      </View>
      <AppText variant="caption" tone="tertiary" style={{ marginTop: theme.spacing.xxs }}>
        {formatDateTime(message.createdAt)}
      </AppText>
    </View>
  );
}
