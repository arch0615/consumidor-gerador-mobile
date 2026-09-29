import { useCallback, useRef, useState } from "react";
import type { UploadStatus } from "@/components/forms/DocumentUploader";
import type { LocalFile } from "@/types/domain";
import { errorMessage } from "@/utils/app-error";

type UploadFn<T> = (file: LocalFile, onProgress: (progress: number) => void) => Promise<T>;

/**
 * Drives a DocumentUploader: selected file, progress, result and retry.
 * Late results from a replaced/removed file are ignored.
 */
export function useUpload<T>(uploadFn: UploadFn<T>) {
  const [file, setFile] = useState<LocalFile | null>(null);
  const [status, setStatus] = useState<UploadStatus>({ kind: "idle" });
  const [result, setResult] = useState<T | null>(null);
  const attempt = useRef(0);

  const start = useCallback(
    async (next: LocalFile): Promise<T | null> => {
      attempt.current += 1;
      const current = attempt.current;
      setFile(next);
      setResult(null);
      setStatus({ kind: "uploading", progress: 0 });
      try {
        const uploaded = await uploadFn(next, (progress) => {
          if (attempt.current === current) setStatus({ kind: "uploading", progress });
        });
        if (attempt.current !== current) return null;
        setResult(uploaded);
        setStatus({ kind: "uploaded" });
        return uploaded;
      } catch (error) {
        if (attempt.current === current) setStatus({ kind: "error", message: errorMessage(error) });
        return null;
      }
    },
    [uploadFn]
  );

  const retry = useCallback(() => {
    if (file) void start(file);
  }, [file, start]);

  const remove = useCallback(() => {
    attempt.current += 1;
    setFile(null);
    setResult(null);
    setStatus({ kind: "idle" });
  }, []);

  return { file, status, result, start, retry, remove, isUploading: status.kind === "uploading" };
}
