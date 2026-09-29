import { Paperclip, Send, X } from "lucide-react-native";
import { useState } from "react";
import { TextInput, View } from "react-native";
import { AppText, FileSourceSheet, IconButton } from "@/components";
import { useUpload } from "@/hooks/useUpload";
import { useTheme } from "@/theme";
import type { UploadedDocument } from "@/types/domain";
import { supportCapabilities, uploadSupportAttachment } from "../hooks/useSupport";

const MAX_LENGTH = 2000;

export interface MessageComposerProps {
  sending: boolean;
  /** Resolves true when the message was accepted (composer then clears). */
  onSend: (body: string, attachments: readonly UploadedDocument[]) => Promise<boolean>;
}

/** Reply box with a single optional attachment (uploaded before sending). */
export function MessageComposer({ sending, onSend }: MessageComposerProps) {
  const theme = useTheme();
  const [body, setBody] = useState("");
  const [sheetOpen, setSheetOpen] = useState(false);
  const [pickError, setPickError] = useState<string | null>(null);
  const attachment = useUpload(uploadSupportAttachment);
  const canSend = body.trim().length > 0 && !sending && !attachment.isUploading;

  const send = async () => {
    if (!canSend) return;
    const accepted = await onSend(body.trim(), attachment.result ? [attachment.result] : []);
    if (accepted) {
      setBody("");
      attachment.remove();
    }
  };

  const statusText =
    attachment.status.kind === "uploading"
      ? `Enviando anexo… ${Math.round(attachment.status.progress * 100)}%`
      : attachment.status.kind === "error"
        ? attachment.status.message
        : (pickError ?? null);

  return (
    <View style={{ gap: theme.spacing.xs }}>
      {attachment.file ? (
        <View style={{ flexDirection: "row", alignItems: "center", gap: theme.spacing.xs, backgroundColor: theme.colors.surfaceMuted, borderRadius: theme.radius.md, paddingLeft: theme.spacing.sm }}>
          <Paperclip size={theme.sizing.iconSm} color={theme.colors.textSecondary} />
          <AppText variant="footnote" numberOfLines={1} style={{ flex: 1 }}>
            {attachment.file.name}
          </AppText>
          <IconButton icon={X} accessibilityLabel="Remover anexo" onPress={attachment.remove} />
        </View>
      ) : null}
      {statusText ? (
        <AppText variant="footnote" tone={attachment.status.kind === "error" || pickError ? "danger" : "secondary"} accessibilityLiveRegion="polite">
          {statusText}
        </AppText>
      ) : null}
      <View style={{ flexDirection: "row", alignItems: "flex-end", gap: theme.spacing.xs }}>
        {supportCapabilities.attachments ? <IconButton icon={Paperclip} accessibilityLabel="Anexar arquivo" onPress={() => setSheetOpen(true)} disabled={attachment.isUploading} /> : null}
        <TextInput
          value={body}
          onChangeText={setBody}
          placeholder="Escreva sua mensagem"
          placeholderTextColor={theme.colors.textTertiary}
          multiline
          maxLength={MAX_LENGTH}
          accessibilityLabel="Mensagem"
          maxFontSizeMultiplier={theme.sizing.maxFontScale}
          style={{
            flex: 1,
            minHeight: theme.sizing.touchTarget,
            maxHeight: 140,
            borderWidth: 1,
            borderColor: theme.colors.border,
            borderRadius: theme.radius.lg,
            paddingHorizontal: theme.spacing.md,
            paddingTop: theme.spacing.sm,
            paddingBottom: theme.spacing.sm,
            color: theme.colors.textPrimary,
            backgroundColor: theme.colors.surface,
            fontFamily: theme.typography.body.fontFamily,
            fontSize: theme.typography.body.fontSize
          }}
        />
        <IconButton icon={Send} accessibilityLabel="Enviar mensagem" onPress={() => void send()} disabled={!canSend} />
      </View>
      <FileSourceSheet
        visible={sheetOpen}
        title="Anexar arquivo"
        onClose={() => setSheetOpen(false)}
        onPicked={(file) => {
          setPickError(null);
          void attachment.start(file);
        }}
        onError={setPickError}
      />
    </View>
  );
}
