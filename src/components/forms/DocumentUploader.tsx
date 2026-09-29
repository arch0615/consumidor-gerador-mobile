import { FileText, RefreshCw, Trash, Upload } from "lucide-react-native";
import { useState } from "react";
import { Pressable, View } from "react-native";
import { DEFAULT_DOCUMENT_TYPES, DEFAULT_MAX_UPLOAD_BYTES, type FileSource } from "@/hooks/useFilePicker";
import { useTheme } from "@/theme";
import type { LocalFile } from "@/types/domain";
import { formatFileSize } from "@/utils/format";
import { AppText } from "../common/AppText";
import { IconButton } from "../common/IconButton";
import { FileSourceSheet } from "./FileSourceSheet";

export type UploadStatus =
  | { kind: "idle" }
  | { kind: "uploading"; progress: number }
  | { kind: "uploaded" }
  | { kind: "error"; message: string };

export interface DocumentUploaderProps {
  label: string;
  helper?: string;
  file: LocalFile | null;
  onFileSelected: (file: LocalFile) => void;
  onRemove: () => void;
  status?: UploadStatus;
  onRetry?: () => void;
  /** Validation error from the form (e.g. "Envie a conta de energia"). */
  error?: string | undefined;
  sources?: readonly FileSource[];
  acceptedMimeTypes?: readonly string[];
  maxSizeBytes?: number;
}

/**
 * Document picker + upload status card. The caller owns the upload (via a
 * service mutation) and reports progress through `status`.
 */
export function DocumentUploader({
  label,
  helper,
  file,
  onFileSelected,
  onRemove,
  status = { kind: "idle" },
  onRetry,
  error,
  sources = ["camera", "gallery", "files"],
  acceptedMimeTypes = DEFAULT_DOCUMENT_TYPES,
  maxSizeBytes = DEFAULT_MAX_UPLOAD_BYTES
}: DocumentUploaderProps) {
  const theme = useTheme();
  const [sheetOpen, setSheetOpen] = useState(false);
  const [pickError, setPickError] = useState<string | null>(null);
  const visibleError = pickError ?? (status.kind === "error" ? status.message : error);
  const borderColor = visibleError ? theme.colors.danger.fg : theme.colors.borderStrong;

  return (
    <View style={{ gap: theme.spacing.xs }}>
      <AppText variant="subheadStrong">{label}</AppText>
      {file ? (
        <View
          style={{
            borderWidth: 1,
            borderColor: visibleError ? theme.colors.danger.fg : theme.colors.border,
            borderRadius: theme.radius.md,
            backgroundColor: theme.colors.surface,
            padding: theme.spacing.sm,
            gap: theme.spacing.xs
          }}
        >
          <View style={{ flexDirection: "row", alignItems: "center", gap: theme.spacing.sm }}>
            <FileText size={theme.sizing.iconLg} color={theme.colors.primary} />
            <View style={{ flex: 1 }}>
              <AppText variant="subheadStrong" numberOfLines={1}>
                {file.name}
              </AppText>
              <AppText variant="footnote" tone="secondary">
                {status.kind === "uploading"
                  ? `Enviando… ${Math.round(status.progress * 100)}%`
                  : status.kind === "uploaded"
                    ? `Enviado · ${formatFileSize(file.sizeBytes)}`
                    : formatFileSize(file.sizeBytes)}
              </AppText>
            </View>
            {status.kind === "error" && onRetry ? <IconButton icon={RefreshCw} accessibilityLabel="Tentar enviar novamente" onPress={onRetry} /> : null}
            {status.kind !== "uploading" ? <IconButton icon={Trash} accessibilityLabel={`Remover ${file.name}`} onPress={onRemove} /> : null}
          </View>
          {status.kind === "uploading" ? (
            <View
              accessibilityRole="progressbar"
              accessibilityValue={{ min: 0, max: 100, now: Math.round(status.progress * 100) }}
              style={{ height: 6, borderRadius: theme.radius.full, backgroundColor: theme.colors.surfaceMuted, overflow: "hidden" }}
            >
              <View style={{ width: `${Math.round(status.progress * 100)}%`, height: "100%", backgroundColor: theme.colors.primary }} />
            </View>
          ) : null}
        </View>
      ) : (
        <Pressable
          onPress={() => setSheetOpen(true)}
          accessibilityRole="button"
          accessibilityLabel={`${label}. Toque para enviar`}
          accessibilityHint={helper}
          style={({ pressed }) => ({
            minHeight: 120,
            borderWidth: 1.5,
            borderStyle: "dashed",
            borderColor,
            borderRadius: theme.radius.md,
            backgroundColor: pressed ? theme.colors.surfaceMuted : theme.colors.surface,
            alignItems: "center",
            justifyContent: "center",
            gap: theme.spacing.xs,
            padding: theme.spacing.md
          })}
        >
          <Upload size={theme.sizing.iconXl} color={theme.colors.primary} />
          <AppText variant="bodyStrong" tone="brand">
            Enviar documento
          </AppText>
          <AppText variant="footnote" tone="secondary" align="center">
            {helper ?? `PDF, JPG ou PNG até ${formatFileSize(maxSizeBytes)}`}
          </AppText>
        </Pressable>
      )}
      {visibleError ? (
        <AppText variant="footnote" tone="danger" accessibilityLiveRegion="polite">
          {visibleError}
        </AppText>
      ) : null}
      <FileSourceSheet
        visible={sheetOpen}
        onClose={() => setSheetOpen(false)}
        sources={sources}
        acceptedMimeTypes={acceptedMimeTypes}
        maxSizeBytes={maxSizeBytes}
        onPicked={(picked) => {
          setPickError(null);
          onFileSelected(picked);
        }}
        onError={setPickError}
      />
    </View>
  );
}
