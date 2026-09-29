import { createContext, useCallback, useContext, useEffect, useMemo, useRef, type PropsWithChildren } from "react";
import { ScrollView, View } from "react-native";
import type { FieldErrors, FieldValues } from "react-hook-form";
import { spacing } from "@/theme";

type AnchorRegistry = Map<string, View>;

const FormScrollContext = createContext<AnchorRegistry | null>(null);

/** Flattens nested RHF errors into dotted field paths ("address.cep"). */
function errorPaths(errors: FieldErrors, prefix = ""): string[] {
  return Object.entries(errors).flatMap(([key, value]) => {
    const path = prefix ? `${prefix}.${key}` : key;
    if (!value || typeof value !== "object") return [];
    if ("message" in value || "type" in value) return [path];
    return errorPaths(value as FieldErrors, path);
  });
}

/**
 * Scroll-to-first-invalid-field support. Usage:
 *   const formScroll = useFormScroll();
 *   <Screen scrollRef={formScroll.scrollRef}>
 *     <FormScrollProvider registry={formScroll.registry}>…fields…</FormScrollProvider>
 *   handleSubmit(onValid, formScroll.onInvalid)
 */
export function useFormScroll<T extends FieldValues>() {
  const scrollRef = useRef<ScrollView>(null);
  const registry = useMemo<AnchorRegistry>(() => new Map(), []);

  const onInvalid = useCallback(
    (errors: FieldErrors<T>) => {
      const scroll = scrollRef.current;
      // The inner content view is the coordinate space for scrollTo offsets.
      const content: Parameters<View["measureLayout"]>[0] | undefined = scroll?.getInnerViewNode();
      if (!scroll || !content) return;
      const anchors = errorPaths(errors)
        .map((path) => registry.get(path))
        .filter((anchor): anchor is View => anchor !== undefined);
      let topmost = Number.POSITIVE_INFINITY;
      let pending = anchors.length;
      const finish = () => {
        pending -= 1;
        if (pending === 0 && Number.isFinite(topmost)) {
          scroll.scrollTo({ y: Math.max(0, topmost - spacing.lg), animated: true });
        }
      };
      anchors.forEach((anchor) =>
        anchor.measureLayout(
          content,
          (_x, y) => {
            topmost = Math.min(topmost, y);
            finish();
          },
          finish
        )
      );
    },
    [registry]
  );

  return { scrollRef, registry, onInvalid };
}

export function FormScrollProvider({ registry, children }: PropsWithChildren<{ registry: AnchorRegistry }>) {
  return <FormScrollContext.Provider value={registry}>{children}</FormScrollContext.Provider>;
}

/** Wraps a field so the form can scroll to it when it is invalid. */
export function FormFieldAnchor({ name, children }: PropsWithChildren<{ name: string }>) {
  const registry = useContext(FormScrollContext);
  const ref = useRef<View>(null);
  useEffect(() => {
    const node = ref.current;
    if (!registry || !node) return undefined;
    registry.set(name, node);
    return () => {
      if (registry.get(name) === node) registry.delete(name);
    };
  }, [registry, name]);
  return (
    <View ref={ref} collapsable={false}>
      {children}
    </View>
  );
}
