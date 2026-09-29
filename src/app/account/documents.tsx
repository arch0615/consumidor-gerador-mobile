import { FileText, Upload } from "lucide-react-native";
import { useState } from "react";
import { View } from "react-native";
import { ACVELButton, ACVELCard, InfoCard, ListItem, QueryView, Screen, StatusChip } from "@/components";
import { UploadDocumentSheet } from "@/features/profile/components/UploadDocumentSheet";
import { useDocuments, useOpenDocument } from "@/features/profile/hooks/useAccount";
import { useRefreshControl } from "@/hooks/useRefreshControl";
import { useTheme } from "@/theme";
import type { DocumentKind } from "@/types/domain";
import { errorMessage } from "@/utils/app-error";
import { formatDate } from "@/utils/format";
import { DOCUMENT_KIND_LABEL, DOCUMENT_STATUS } from "@/utils/status-labels";

export default function DocumentsScreen() {
  const theme = useTheme();
  const documents = useDocuments();
  const openDocument = useOpenDocument();
  const refresh = useRefreshControl(documents);
  const [sheet, setSheet] = useState<{ open: boolean; kind: DocumentKind }>({ open: false, kind: "RG" });
  const openSheet = (kind: DocumentKind = "RG") => setSheet({ open: true, kind });

  return (
    <Screen {...refresh} footer={<ACVELButton label="Enviar documento" icon={Upload} onPress={() => openSheet()} />}>
      <QueryView
        query={documents}
        loadingRows={4}
        isEmpty={(list) => list.length === 0}
        empty={{ icon: FileText, title: "Nenhum documento enviado", message: "Envie um documento com foto (RG ou CNH) para agilizar a análise do seu cadastro." }}
      >
        {(list) => (
          <View style={{ gap: theme.spacing.md }}>
            {openDocument.isError ? <InfoCard tone="danger" title="Não foi possível abrir o documento" message={errorMessage(openDocument.error)} /> : null}
            {list
              .filter((doc) => doc.status === "REPROVADO")
              .map((doc) => (
                <InfoCard
                  key={`rejected-${doc.id}`}
                  tone="danger"
                  title={`${DOCUMENT_KIND_LABEL[doc.kind]} reprovado`}
                  message={doc.rejectionReason ?? "Envie o documento novamente."}
                  actionLabel="Enviar novamente"
                  onAction={() => openSheet(doc.kind)}
                />
              ))}
            <ACVELCard padding="xs">
              {list.map((doc, index) => (
                <ListItem
                  key={doc.id}
                  icon={FileText}
                  title={DOCUMENT_KIND_LABEL[doc.kind]}
                  subtitle={doc.name}
                  caption={`Enviado em ${formatDate(doc.uploadedAt.slice(0, 10))}`}
                  accessibilityLabel={`${DOCUMENT_KIND_LABEL[doc.kind]}, ${DOCUMENT_STATUS[doc.status].label}, enviado em ${formatDate(doc.uploadedAt.slice(0, 10))}`}
                  trailing={<StatusChip status={DOCUMENT_STATUS[doc.status]} size="sm" />}
                  accessibilityHint="Abre o documento"
                  onPress={() => openDocument.mutate(doc.id)}
                  divider={index < list.length - 1}
                />
              ))}
            </ACVELCard>
          </View>
        )}
      </QueryView>
      <UploadDocumentSheet key={sheet.kind} visible={sheet.open} initialKind={sheet.kind} onClose={() => setSheet((current) => ({ ...current, open: false }))} />
    </Screen>
  );
}
