import { Check, ChevronDown, Search } from "lucide-react-native";
import { useMemo, useState } from "react";
import { Pressable, View } from "react-native";
import { useTheme } from "@/theme";
import { ACVELInput } from "./ACVELInput";
import { AppText } from "./AppText";
import { BottomSheet } from "./BottomSheet";

export interface SelectOption<T extends string> {
  value: T;
  label: string;
  description?: string;
}

export interface ACVELSelectProps<T extends string> {
  label: string;
  value: T | null;
  options: readonly SelectOption<T>[];
  onChange: (value: T) => void;
  placeholder?: string;
  error?: string | undefined;
  helper?: string | undefined;
  /** Search is shown automatically for long lists (e.g. concessionárias, UF). */
  searchable?: boolean;
  disabled?: boolean;
}

/**
 * Field that opens a bottom-sheet picker (replaces web native <select> and the
 * copy-pasted BankSelect/ConcessionariaSelect dropdowns with 32px rows).
 */
export function ACVELSelect<T extends string>({
  label,
  value,
  options,
  onChange,
  placeholder = "Selecione",
  error,
  helper,
  searchable,
  disabled = false
}: ACVELSelectProps<T>) {
  const theme = useTheme();
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const selected = options.find((option) => option.value === value) ?? null;
  const showSearch = searchable ?? options.length > 8;

  const filtered = useMemo(() => {
    const term = query.trim().toLowerCase();
    if (!term) return options;
    return options.filter((option) => `${option.label} ${option.description ?? ""}`.toLowerCase().includes(term));
  }, [options, query]);

  return (
    <View style={{ gap: theme.spacing.xxs }}>
      <AppText variant="subheadStrong">{label}</AppText>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={`${label}: ${selected?.label ?? placeholder}`}
        accessibilityHint="Abre a lista de opções"
        accessibilityState={{ disabled }}
        disabled={disabled}
        onPress={() => setOpen(true)}
        style={({ pressed }) => ({
          minHeight: theme.sizing.input,
          flexDirection: "row",
          alignItems: "center",
          paddingHorizontal: theme.spacing.md,
          borderRadius: theme.radius.md,
          borderWidth: error ? 2 : 1,
          borderColor: error ? theme.colors.danger.fg : theme.colors.border,
          backgroundColor: disabled ? theme.colors.surfaceMuted : pressed ? theme.colors.surfaceMuted : theme.colors.surface
        })}
      >
        <AppText variant="body" tone={selected ? "primary" : "tertiary"} style={{ flex: 1 }} numberOfLines={1}>
          {selected?.label ?? placeholder}
        </AppText>
        <ChevronDown size={theme.sizing.iconMd} color={theme.colors.textSecondary} />
      </Pressable>
      {error ? (
        <AppText variant="footnote" tone="danger" accessibilityLiveRegion="polite">
          {error}
        </AppText>
      ) : helper ? (
        <AppText variant="footnote" tone="secondary">
          {helper}
        </AppText>
      ) : null}

      <BottomSheet
        visible={open}
        title={label}
        onClose={() => {
          setOpen(false);
          setQuery("");
        }}
      >
        {showSearch ? (
          <ACVELInput
            label="Buscar"
            icon={Search}
            value={query}
            onChangeText={setQuery}
            placeholder="Digite para filtrar"
            autoCorrect={false}
            returnKeyType="search"
          />
        ) : null}
        {filtered.length === 0 ? (
          <AppText variant="subhead" tone="secondary" style={{ paddingVertical: theme.spacing.md }}>
            Nenhuma opção encontrada.
          </AppText>
        ) : (
          filtered.map((option) => {
            const isSelected = option.value === value;
            return (
              <Pressable
                key={option.value}
                accessibilityRole="radio"
                accessibilityState={{ selected: isSelected }}
                onPress={() => {
                  onChange(option.value);
                  setOpen(false);
                  setQuery("");
                }}
                style={({ pressed }) => ({
                  minHeight: theme.sizing.listRow,
                  flexDirection: "row",
                  alignItems: "center",
                  gap: theme.spacing.sm,
                  paddingHorizontal: theme.spacing.sm,
                  borderRadius: theme.radius.md,
                  backgroundColor: isSelected ? theme.colors.primarySoft : pressed ? theme.colors.surfaceMuted : "transparent"
                })}
              >
                <View style={{ flex: 1 }}>
                  <AppText variant={isSelected ? "bodyStrong" : "body"}>{option.label}</AppText>
                  {option.description ? (
                    <AppText variant="footnote" tone="secondary">
                      {option.description}
                    </AppText>
                  ) : null}
                </View>
                {isSelected ? <Check size={theme.sizing.iconMd} color={theme.colors.primary} /> : null}
              </Pressable>
            );
          })
        )}
      </BottomSheet>
    </View>
  );
}
