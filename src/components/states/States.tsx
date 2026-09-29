import { CircleAlert, Inbox, RefreshCw, WifiOff, type LucideIcon } from "lucide-react-native";
import { View } from "react-native";
import { useTheme } from "@/theme";
import { ACVELCard } from "../common/ACVELCard";
import { Skeleton, SkeletonGroup } from "../common/Skeleton";
import { StateView, type StateAction } from "./StateView";

export interface EmptyStateProps {
  title: string;
  message: string;
  icon?: LucideIcon;
  action?: StateAction;
  secondaryAction?: StateAction;
}

export function EmptyState({ title, message, icon = Inbox, action, secondaryAction }: EmptyStateProps) {
  return <StateView icon={icon} title={title} message={message} tone="brand" primaryAction={action} secondaryAction={secondaryAction} />;
}

export interface ErrorStateProps {
  title?: string;
  message: string;
  onRetry: () => void;
}

export function ErrorState({ title = "Não foi possível carregar", message, onRetry }: ErrorStateProps) {
  return (
    <StateView
      icon={CircleAlert}
      tone="danger"
      title={title}
      message={message}
      primaryAction={{ label: "Tentar novamente", icon: RefreshCw, onPress: onRetry }}
    />
  );
}

export function OfflineState({ onRetry }: { onRetry: () => void }) {
  return (
    <StateView
      icon={WifiOff}
      tone="warning"
      title="Você está sem conexão"
      message="Conecte-se à internet para carregar estas informações."
      primaryAction={{ label: "Tentar novamente", icon: RefreshCw, onPress: onRetry }}
    />
  );
}

export type LoadingLayout = "list" | "cards" | "detail" | "dashboard";

/** Skeleton shaped like the final layout (first load only). */
export function LoadingState({ layout = "list", rows = 4 }: { layout?: LoadingLayout; rows?: number }) {
  const theme = useTheme();
  if (layout === "dashboard") {
    return (
      <SkeletonGroup>
        <Skeleton height={180} radius="lg" />
        <View style={{ flexDirection: "row", gap: theme.spacing.sm }}>
          <View style={{ flex: 1 }}>
            <Skeleton height={96} radius="lg" />
          </View>
          <View style={{ flex: 1 }}>
            <Skeleton height={96} radius="lg" />
          </View>
        </View>
        <Skeleton height={160} radius="lg" />
        <Skeleton height={72} radius="lg" />
      </SkeletonGroup>
    );
  }
  if (layout === "detail") {
    return (
      <SkeletonGroup>
        <Skeleton height={140} radius="lg" />
        <Skeleton width="60%" height={20} />
        {Array.from({ length: rows }, (_, index) => (
          <Skeleton key={index} height={48} radius="md" />
        ))}
      </SkeletonGroup>
    );
  }
  if (layout === "cards") {
    return (
      <SkeletonGroup>
        {Array.from({ length: rows }, (_, index) => (
          <ACVELCard key={index}>
            <View style={{ gap: theme.spacing.sm }}>
              <Skeleton width="40%" height={14} />
              <Skeleton width="70%" height={22} />
              <Skeleton width="55%" height={14} />
            </View>
          </ACVELCard>
        ))}
      </SkeletonGroup>
    );
  }
  return (
    <SkeletonGroup>
      {Array.from({ length: rows }, (_, index) => (
        <View key={index} style={{ flexDirection: "row", gap: theme.spacing.sm, alignItems: "center" }}>
          <Skeleton width={40} height={40} radius="md" />
          <View style={{ flex: 1, gap: theme.spacing.xs }}>
            <Skeleton width="70%" height={16} />
            <Skeleton width="45%" height={12} />
          </View>
        </View>
      ))}
    </SkeletonGroup>
  );
}
