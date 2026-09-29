import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import * as Sharing from "expo-sharing";
import { useEffect } from "react";
import { invoiceService } from "@/services/invoice.service";
import { queryKeys } from "@/services/query-keys";
import type { InvoiceFilters } from "@/types/domain";
import { AppError } from "@/utils/app-error";

const PIX_POLL_INTERVAL_MS = 4000;

export function useInvoices(filters: InvoiceFilters) {
  return useQuery({ queryKey: queryKeys.invoices.list(filters), queryFn: () => invoiceService.list(filters), placeholderData: (previous) => previous });
}

export function useInvoice(invoiceId: string) {
  return useQuery({ queryKey: queryKeys.invoices.detail(invoiceId), queryFn: () => invoiceService.get(invoiceId) });
}

export function usePayments() {
  return useQuery({ queryKey: queryKeys.invoices.payments, queryFn: () => invoiceService.listPayments() });
}

/**
 * Downloads the official PDF (authenticated) and hands it to the system
 * share sheet, from which the user opens it in a PDF viewer or saves it.
 */
export function useOpenInvoicePdf() {
  return useMutation({
    mutationFn: async (invoiceId: string) => {
      const uri = await invoiceService.downloadPdf(invoiceId);
      if (!(await Sharing.isAvailableAsync())) throw new AppError("NOT_SUPPORTED", "Não há aplicativo disponível para abrir PDFs neste aparelho.");
      await Sharing.shareAsync(uri, { mimeType: "application/pdf", UTI: "com.adobe.pdf", dialogTitle: "Fatura ACVEL" });
    }
  });
}

/** Reads the invoice's bank charge (Pix payload + expiry). */
export function usePixCharge(invoiceId: string) {
  return useQuery({ queryKey: queryKeys.invoices.pix(invoiceId), queryFn: () => invoiceService.getPixCharge(invoiceId), staleTime: Infinity, gcTime: 0 });
}

/**
 * Polls the Pix status while the screen is open and the charge is pending;
 * once confirmed, invoices and the dashboard are refreshed.
 */
export function usePixStatus(invoiceId: string, enabled: boolean) {
  const queryClient = useQueryClient();
  const query = useQuery({
    queryKey: [...queryKeys.invoices.pix(invoiceId), "status"],
    queryFn: () => invoiceService.getChargeStatus(invoiceId),
    enabled,
    refetchInterval: (current) => {
      const status = current.state.data;
      return status === undefined || status === "AGUARDANDO" || status === "PROCESSANDO" ? PIX_POLL_INTERVAL_MS : false;
    },
    refetchIntervalInBackground: false,
    gcTime: 0
  });
  const confirmed = query.data === "CONFIRMADO";
  useEffect(() => {
    if (!confirmed) return;
    void queryClient.invalidateQueries({ queryKey: queryKeys.invoices.all });
    void queryClient.invalidateQueries({ queryKey: queryKeys.dashboard });
  }, [confirmed, queryClient]);
  return query;
}

export function useBoleto(invoiceId: string) {
  return useQuery({ queryKey: queryKeys.invoices.boleto(invoiceId), queryFn: () => invoiceService.getBoleto(invoiceId) });
}
