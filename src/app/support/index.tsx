import { useRouter } from "expo-router";
import { Mail, MessageCircle, MessagesSquare, Phone, Plus } from "lucide-react-native";
import { Linking, View } from "react-native";
import { ACVELButton, ACVELCard, AppText, ListItem, QueryView, Screen, SectionHeader, StatusChip } from "@/components";
import { FaqItem } from "@/features/support/components/FaqItem";
import { useHelpCenter, useTickets } from "@/features/support/hooks/useSupport";
import { useRefreshControl } from "@/hooks/useRefreshControl";
import { routes } from "@/navigation/routes";
import { useTheme } from "@/theme";
import { formatPhone, formatRelativeTime } from "@/utils/format";
import { TICKET_CATEGORY_LABEL, TICKET_STATUS } from "@/utils/status-labels";

export default function SupportScreen() {
  const theme = useTheme();
  const router = useRouter();
  const tickets = useTickets();
  const helpCenter = useHelpCenter();
  const refresh = useRefreshControl(tickets, helpCenter);

  return (
    <Screen {...refresh} footer={<ACVELButton label="Abrir chamado" icon={Plus} onPress={() => router.push(routes.newTicket)} />}>
      <View style={{ gap: theme.spacing.sm }}>
        <SectionHeader title="Meus chamados" />
        <QueryView
          query={tickets}
          loadingRows={3}
          isEmpty={(list) => list.length === 0}
          empty={{ icon: MessagesSquare, title: "Nenhum chamado aberto", message: "Se precisar de ajuda com faturas, economia ou cadastro, abra um chamado." }}
        >
          {(list) => (
            <ACVELCard padding="xs">
              {list.map((ticket, index) => (
                <ListItem
                  key={ticket.id}
                  title={ticket.subject}
                  subtitle={ticket.lastMessagePreview ?? undefined}
                  caption={[ticket.protocol, TICKET_CATEGORY_LABEL[ticket.category], formatRelativeTime(ticket.updatedAt)].filter(Boolean).join(" · ")}
                  accessibilityLabel={`${ticket.subject}, ${TICKET_STATUS[ticket.status].label}${ticket.protocol ? `, protocolo ${ticket.protocol}` : ""}`}
                  trailing={<StatusChip status={TICKET_STATUS[ticket.status]} size="sm" />}
                  onPress={() => router.push(routes.ticket(ticket.id))}
                  divider={index < list.length - 1}
                />
              ))}
            </ACVELCard>
          )}
        </QueryView>
      </View>

      <QueryView query={helpCenter} loadingRows={3}>
        {({ contact, faq }) => (
          <View style={{ gap: theme.spacing.lg }}>
            <View style={{ gap: theme.spacing.sm }}>
              <SectionHeader title="Fale com a gente" subtitle={contact.hours ?? undefined} />
              <ACVELCard padding="xs">
                {contact.whatsapp ? (
                  <ListItem icon={MessageCircle} iconTone="success" title="WhatsApp" subtitle="Resposta mais rápida" onPress={() => void Linking.openURL(`https://wa.me/${contact.whatsapp}`)} divider={Boolean(contact.phone ?? contact.email)} />
                ) : null}
                {contact.phone ? <ListItem icon={Phone} title="Telefone" subtitle={formatPhone(contact.phone)} onPress={() => void Linking.openURL(`tel:${contact.phone}`)} divider={Boolean(contact.email)} /> : null}
                {contact.email ? <ListItem icon={Mail} title="E-mail" subtitle={contact.email} onPress={() => void Linking.openURL(`mailto:${contact.email}`)} /> : null}
                {!contact.whatsapp && !contact.phone && !contact.email ? <ListItem icon={MessagesSquare} title="Abra um chamado" subtitle="Nossa equipe responde por aqui mesmo" onPress={() => router.push(routes.newTicket)} /> : null}
              </ACVELCard>
            </View>
            <View style={{ gap: theme.spacing.sm }}>
              <SectionHeader title="Perguntas frequentes" />
              <ACVELCard padding="sm">
                {faq.length > 0 ? (
                  faq.map((item, index) => <FaqItem key={item.question} question={item.question} answer={item.answer} divider={index < faq.length - 1} />)
                ) : (
                  <AppText variant="subhead" tone="secondary">
                    Nenhuma pergunta cadastrada.
                  </AppText>
                )}
              </ACVELCard>
            </View>
          </View>
        )}
      </QueryView>
    </Screen>
  );
}
