import { useEffect, useRef } from "react";
import { ScrollView, View } from "react-native";
import { ACVELCard, AppText, InfoCard, QueryView, Screen, StatusChip } from "@/components";
import { MessageBubble } from "@/features/support/components/MessageBubble";
import { MessageComposer } from "@/features/support/components/MessageComposer";
import { useSendTicketMessage, useTicket } from "@/features/support/hooks/useSupport";
import { useRefreshControl } from "@/hooks/useRefreshControl";
import { useRouteId } from "@/hooks/useRouteId";
import { useTheme } from "@/theme";
import { errorMessage } from "@/utils/app-error";
import { formatDateTime } from "@/utils/format";
import { TICKET_CATEGORY_LABEL, TICKET_STATUS } from "@/utils/status-labels";

export default function TicketDetailScreen() {
  const theme = useTheme();
  const ticketId = useRouteId();
  const ticket = useTicket(ticketId);
  const sendMessage = useSendTicketMessage(ticketId);
  const refresh = useRefreshControl(ticket);
  const scrollRef = useRef<ScrollView>(null);
  const messageCount = ticket.data?.messages.length ?? 0;
  const closed = ticket.data?.status === "FECHADO";

  // Keep the newest message in view when the thread grows.
  useEffect(() => {
    if (messageCount === 0) return undefined;
    const timer = setTimeout(() => scrollRef.current?.scrollToEnd({ animated: true }), 100);
    return () => clearTimeout(timer);
  }, [messageCount]);

  const footer =
    ticket.data && !closed ? (
      <MessageComposer
        sending={sendMessage.isPending}
        onSend={async (body, attachments) => {
          try {
            await sendMessage.mutateAsync({ body, attachments });
            return true;
          } catch {
            return false;
          }
        }}
      />
    ) : undefined;

  return (
    <Screen {...refresh} keyboardAware scrollRef={scrollRef} footer={footer}>
      <QueryView query={ticket} loading="detail" errorTitle="Não foi possível carregar o chamado">
        {(detail) => (
          <View style={{ gap: theme.spacing.lg }}>
            <ACVELCard>
              <View style={{ gap: theme.spacing.xs }}>
                <AppText variant="title3">{detail.subject}</AppText>
                <AppText variant="footnote" tone="secondary">
                  {detail.protocol ? `Protocolo ${detail.protocol} · ` : ""}
                  {TICKET_CATEGORY_LABEL[detail.category]}
                </AppText>
                <AppText variant="footnote" tone="secondary">
                  Aberto em {formatDateTime(detail.createdAt)}
                </AppText>
                <StatusChip status={TICKET_STATUS[detail.status]} />
              </View>
            </ACVELCard>

            {detail.status === "AGUARDANDO_CLIENTE" ? (
              <InfoCard tone="warning" title="Aguardando sua resposta" message="Responda abaixo para darmos continuidade ao atendimento." />
            ) : null}
            {closed ? <InfoCard tone="neutral" title="Chamado encerrado" message="Se precisar de mais ajuda, abra um novo chamado." /> : null}

            <View style={{ gap: theme.spacing.md }}>
              {detail.messages.map((message) => (
                <MessageBubble key={message.id} message={message} />
              ))}
            </View>

            {sendMessage.isError ? <InfoCard tone="danger" title="Mensagem não enviada" message={errorMessage(sendMessage.error)} /> : null}
          </View>
        )}
      </QueryView>
    </Screen>
  );
}
