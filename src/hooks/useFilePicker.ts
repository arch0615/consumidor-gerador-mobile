import * as DocumentPicker from "expo-document-picker";
import * as ImagePicker from "expo-image-picker";
import { useCallback } from "react";
import type { LocalFile } from "@/types/domain";
import { AppError } from "@/utils/app-error";
import { formatFileSize } from "@/utils/format";

export type FileSource = "camera" | "gallery" | "files";

export interface FilePickerOptions {
  maxSizeBytes: number;
  /** MIME types accepted from the file browser (camera/gallery always give images). */
  acceptedMimeTypes: readonly string[];
}

export const DEFAULT_DOCUMENT_TYPES = ["application/pdf", "image/jpeg", "image/png"] as const;
export const DEFAULT_MAX_UPLOAD_BYTES = 10 * 1024 * 1024;

function extensionFor(mimeType: string): string {
  if (mimeType === "application/pdf") return "pdf";
  if (mimeType === "image/png") return "png";
  return "jpg";
}

function validate(file: LocalFile, options: FilePickerOptions): LocalFile {
  const accepted = options.acceptedMimeTypes.some((type) => (type.endsWith("/*") ? file.mimeType.startsWith(type.slice(0, -1)) : type === file.mimeType));
  if (!accepted) throw new AppError("UNSUPPORTED_FILE");
  if (file.sizeBytes > options.maxSizeBytes) {
    throw new AppError("FILE_TOO_LARGE", `O arquivo excede o limite de ${formatFileSize(options.maxSizeBytes)}.`);
  }
  return file;
}

function fromImageAsset(asset: ImagePicker.ImagePickerAsset): LocalFile {
  const mimeType = asset.mimeType ?? "image/jpeg";
  return {
    uri: asset.uri,
    name: asset.fileName ?? `foto-${Date.now()}.${extensionFor(mimeType)}`,
    mimeType,
    sizeBytes: asset.fileSize ?? 0
  };
}

/**
 * Camera / gallery / file-browser picking with permission handling and
 * client-side type and size checks. Returns null when the user cancels.
 */
export function useFilePicker(options: FilePickerOptions) {
  const pick = useCallback(
    async (source: FileSource): Promise<LocalFile | null> => {
      if (source === "camera") {
        const permission = await ImagePicker.requestCameraPermissionsAsync();
        if (!permission.granted) {
          throw new AppError("FORBIDDEN", "Permita o acesso à câmera nas configurações do aparelho para fotografar a conta.");
        }
        const result = await ImagePicker.launchCameraAsync({ mediaTypes: ["images"], quality: 0.8 });
        const asset = result.canceled ? undefined : result.assets[0];
        return asset ? validate(fromImageAsset(asset), options) : null;
      }
      if (source === "gallery") {
        const result = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ["images"], quality: 0.8 });
        const asset = result.canceled ? undefined : result.assets[0];
        return asset ? validate(fromImageAsset(asset), options) : null;
      }
      const result = await DocumentPicker.getDocumentAsync({ type: [...options.acceptedMimeTypes], copyToCacheDirectory: true });
      const asset = result.canceled ? undefined : result.assets[0];
      if (!asset) return null;
      return validate(
        { uri: asset.uri, name: asset.name, mimeType: asset.mimeType ?? "application/octet-stream", sizeBytes: asset.size ?? 0 },
        options
      );
    },
    [options]
  );
  return { pick };
}
