import { Camera, FolderOpen, ImagePlus, type LucideIcon } from "lucide-react-native";
import { useMemo } from "react";
import { DEFAULT_DOCUMENT_TYPES, DEFAULT_MAX_UPLOAD_BYTES, useFilePicker, type FileSource } from "@/hooks/useFilePicker";
import type { LocalFile } from "@/types/domain";
import { errorMessage } from "@/utils/app-error";
import { BottomSheet } from "../common/BottomSheet";
import { ListItem } from "../lists/ListItem";

const SOURCE_META: Record<FileSource, { label: string; description: string; icon: LucideIcon }> = {
  camera: { label: "Tirar foto", description: "Use a câmera em um local iluminado", icon: Camera },
  gallery: { label: "Escolher da galeria", description: "Use uma foto já salva", icon: ImagePlus },
  files: { label: "Escolher arquivo", description: "PDF, JPG ou PNG", icon: FolderOpen }
};

export interface FileSourceSheetProps {
  visible: boolean;
  onClose: () => void;
  title?: string;
  onPicked: (file: LocalFile) => void;
  onError: (message: string) => void;
  sources?: readonly FileSource[];
  acceptedMimeTypes?: readonly string[];
  maxSizeBytes?: number;
}

/** Camera / gallery / files chooser shared by uploaders and the chat composer. */
export function FileSourceSheet({
  visible,
  onClose,
  title = "Enviar documento",
  onPicked,
  onError,
  sources = ["camera", "gallery", "files"],
  acceptedMimeTypes = DEFAULT_DOCUMENT_TYPES,
  maxSizeBytes = DEFAULT_MAX_UPLOAD_BYTES
}: FileSourceSheetProps) {
  const pickerOptions = useMemo(() => ({ acceptedMimeTypes, maxSizeBytes }), [acceptedMimeTypes, maxSizeBytes]);
  const { pick } = useFilePicker(pickerOptions);

  const choose = async (source: FileSource) => {
    onClose();
    try {
      const picked = await pick(source);
      if (picked) onPicked(picked);
    } catch (caught) {
      onError(errorMessage(caught));
    }
  };

  return (
    <BottomSheet visible={visible} onClose={onClose} title={title} scrollable={false}>
      {sources.map((source, index) => {
        const meta = SOURCE_META[source];
        return (
          <ListItem key={source} title={meta.label} subtitle={meta.description} icon={meta.icon} onPress={() => void choose(source)} showChevron divider={index < sources.length - 1} />
        );
      })}
    </BottomSheet>
  );
}
