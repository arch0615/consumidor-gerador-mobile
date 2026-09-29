import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { queryKeys } from "@/services/query-keys";
import { residenceService } from "@/services/residence.service";
import type { LocalFile, NewResidenceInput } from "@/types/domain";

export function useResidences() {
  return useQuery({ queryKey: queryKeys.residences.all, queryFn: () => residenceService.list() });
}

export function useResidence(residenceId: string, options: { enabled?: boolean } = {}) {
  return useQuery({ queryKey: queryKeys.residences.detail(residenceId), queryFn: () => residenceService.get(residenceId), enabled: options.enabled ?? true });
}

export function useUtilities() {
  return useQuery({ queryKey: queryKeys.residences.utilities, queryFn: () => residenceService.listUtilities(), staleTime: 24 * 60 * 60_000 });
}

/** Whether a new unit can be registered now (e.g. blocked while billing data is being linked). */
export function useCreationAvailability(enabled: boolean) {
  return useQuery({ queryKey: queryKeys.residences.availability, queryFn: () => residenceService.getCreationAvailability(), enabled });
}

export function useCepLookup() {
  return useMutation({ mutationFn: (cep: string) => residenceService.lookupCep(cep) });
}

export function useBillExtraction() {
  return useMutation({ mutationFn: (file: LocalFile) => residenceService.extractBill(file) });
}

export const uploadBill = residenceService.uploadBill;

function useInvalidateResidences() {
  const queryClient = useQueryClient();
  return () => {
    void queryClient.invalidateQueries({ queryKey: queryKeys.residences.all });
    void queryClient.invalidateQueries({ queryKey: queryKeys.dashboard });
    void queryClient.invalidateQueries({ queryKey: queryKeys.documents });
  };
}

export function useCreateResidence() {
  const invalidate = useInvalidateResidences();
  return useMutation({ mutationFn: (input: NewResidenceInput) => residenceService.create(input), onSuccess: invalidate });
}

export function useUpdateResidence() {
  const invalidate = useInvalidateResidences();
  return useMutation({
    mutationFn: ({ residenceId, input }: { residenceId: string; input: NewResidenceInput }) => residenceService.update(residenceId, input),
    onSuccess: invalidate
  });
}
