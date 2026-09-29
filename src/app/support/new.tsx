import { zodResolver } from "@hookform/resolvers/zod";
import { useRouter } from "expo-router";
import { Send } from "lucide-react-native";
import { useForm, useWatch } from "react-hook-form";
import { View } from "react-native";
import { ACVELButton, DocumentUploader, FormInput, FormScrollProvider, FormSelect, InfoCard, Screen, useFormScroll } from "@/components";
import { supportCapabilities, uploadSupportAttachment, useCreateTicket } from "@/features/support/hooks/useSupport";
import { newTicketSchema, TICKET_CATEGORIES, type NewTicketForm } from "@/features/support/schemas";
import { useUpload } from "@/hooks/useUpload";
import { routes } from "@/navigation/routes";
import { useTheme } from "@/theme";
import { errorMessage } from "@/utils/app-error";
import { TICKET_CATEGORY_LABEL } from "@/utils/status-labels";

const CATEGORY_OPTIONS = TICKET_CATEGORIES.map((category) => ({ value: category, label: TICKET_CATEGORY_LABEL[category] }));
const MESSAGE_MAX = 2000;

export default function NewTicketScreen() {
  const theme = useTheme();
  const router = useRouter();
  const createTicket = useCreateTicket();
  const attachment = useUpload(uploadSupportAttachment);
  const formScroll = useFormScroll<NewTicketForm>();
  const form = useForm<NewTicketForm>({ resolver: zodResolver(newTicketSchema), defaultValues: { category: "FATURA", subject: "", message: "" }, mode: "onTouched" });
  const message = useWatch({ control: form.control, name: "message" });

  const submit = form.handleSubmit(
    (values) =>
      createTicket.mutate(
        { ...values, attachmentIds: attachment.result ? [attachment.result.documentId] : [] },
        { onSuccess: (ticket) => router.replace(routes.ticket(ticket.id)) }
      ),
    formScroll.onInvalid
  );

  return (
    <Screen
      keyboardAware
      scrollRef={formScroll.scrollRef}
      footer={<ACVELButton label="Enviar chamado" icon={Send} loading={createTicket.isPending} loadingLabel="Enviando…" disabled={attachment.isUploading} onPress={() => void submit()} />}
    >
      {createTicket.isError ? <InfoCard tone="danger" title="Não foi possível abrir o chamado" message={errorMessage(createTicket.error)} /> : null}
      <FormScrollProvider registry={formScroll.registry}>
        <View style={{ gap: theme.spacing.md }}>
          <FormSelect control={form.control} name="category" label="Assunto" options={CATEGORY_OPTIONS} />
          <FormInput control={form.control} name="subject" label="Título" placeholder="Ex.: Valor da fatura diferente" maxLength={80} returnKeyType="next" submitBehavior="submit" onSubmitEditing={() => form.setFocus("message")} />
          <FormInput
            control={form.control}
            name="message"
            label="Descreva o problema"
            placeholder="Conte o que aconteceu, com datas e valores se possível."
            multiline
            numberOfLines={6}
            maxLength={MESSAGE_MAX}
            helper={`${message.length}/${MESSAGE_MAX}`}
          />
          {supportCapabilities.attachments ? (
            <DocumentUploader
              label="Anexo (opcional)"
              helper="Foto da conta, comprovante ou print da tela"
              file={attachment.file}
              status={attachment.status}
              onFileSelected={(file) => void attachment.start(file)}
              onRemove={attachment.remove}
              onRetry={attachment.retry}
            />
          ) : null}
        </View>
      </FormScrollProvider>
    </Screen>
  );
}
