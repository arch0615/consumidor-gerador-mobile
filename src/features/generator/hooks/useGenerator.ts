import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { generatorService } from "@/services/generator.service";
import { queryKeys } from "@/services/query-keys";

export function useGeneratorAccess() {
  return useQuery({ queryKey: queryKeys.generator, queryFn: () => generatorService.getAccess() });
}

/** "Quero ser gerador": opens a request for the ACVEL team (granting access happens in the ADM module). */
export function useRequestGeneratorAccess() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (message?: string) => generatorService.requestAccess(message),
    onSuccess: (access) => queryClient.setQueryData(queryKeys.generator, access)
  });
}
