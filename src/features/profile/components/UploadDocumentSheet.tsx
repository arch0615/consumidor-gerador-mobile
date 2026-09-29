import { useQueryClient } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { View } from "react-native";
import { ACVELButton, ACVELSelect, BottomSheet, DocumentUploader } from "@/components";
import { useUpload } from "@/hooks/useUpload";
import { queryKeys } from "@/services/query-keys";
import { useTheme } from "@/theme";
import type { DocumentKind } from "@/types/domain";
import { DOCUMENT_KIND_LABEL } from "@/utils/status-labels";
import { uploadAccountDocument } from "../hooks/useAccount";

const UPLOADABLE_KINDS: readonly DocumentKind[] = ["RG", "CNH", "CNPJ", "CONTA_DE_LUZ", "OUTRO"];

export interface UploadDocumentSheetProps {
  visible: boolean;
  initialKind?: DocumentKind;
  onClose: () => void;
}

/** Choose a document type, pick/photograph it and upload with progress. */
export function UploadDocumentSheet({ visible, initialKind = "RG", onClose }: UploadDocumentSheetProps) {
  const theme = useTheme();
  const queryClient = useQueryClient();
  const [kind, setKind] = useState<DocumentKind>(initialKind);
  const uploadFn = useMemo(() => uploadAccountDocument(kind), [kind]);
  const upload = useUpload(uploadFn);

  const close = () => {
    upload.remove();
    onClose();
  };

  const finish = () => {
    void queryClient.invalidateQueries({ queryKey: queryKeys.documents });
    close();
  };

  return (
    <BottomSheet
      visible={visible}
      onClose={close}
      title="Enviar documento"
      description="Envie uma foto nítida ou PDF. Analisamos em até 2 dias úteis."
      footer={<ACVELButton label="Concluir" disabled={upload.status.kind !== "uploaded"} onPress={finish} />}
    >
      <View style={{ gap: theme.spacing.md }}>
        <ACVELSelect
          label="Tipo de documento"
          value={kind}
          options={UPLOADABLE_KINDS.map((value) => ({ value, label: DOCUMENT_KIND_LABEL[value] }))}
          onChange={(next) => {
            upload.remove();
            setKind(next);
          }}
          disabled={upload.isUploading}
        />
        <DocumentUploader label="Arquivo" file={upload.file} status={upload.status} onFileSelected={(file) => void upload.start(file)} onRemove={upload.remove} onRetry={upload.retry} />
      </View>
    </BottomSheet>
  );
}
