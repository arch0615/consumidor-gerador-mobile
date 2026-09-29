import { useRef, useState } from "react";
import { FlatList, useWindowDimensions, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { ACVELButton, AppText, BrandLogo } from "@/components";
import { INTRO_SLIDES, type IntroSlide } from "@/features/onboarding/intro-slides";
import { usePreferencesStore } from "@/stores/preferences.store";
import { useTheme } from "@/theme";

/** Welcome carousel; finishing (or skipping) marks the intro as seen and the guard moves to Login. */
export default function OnboardingScreen() {
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  const markIntroSeen = usePreferencesStore((state) => state.markIntroSeen);
  const listRef = useRef<FlatList<IntroSlide>>(null);
  const [index, setIndex] = useState(0);
  const isLast = index === INTRO_SLIDES.length - 1;

  const next = () => {
    if (isLast) markIntroSeen();
    else {
      listRef.current?.scrollToIndex({ index: index + 1, animated: true });
      setIndex(index + 1);
    }
  };

  return (
    <View style={{ flex: 1, backgroundColor: theme.colors.heroBackground, paddingTop: insets.top, paddingBottom: insets.bottom + theme.spacing.md }}>
      <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: theme.spacing.md, minHeight: theme.sizing.touchTarget }}>
        <BrandLogo width={112} on="dark" />
        {!isLast ? <ACVELButton label="Pular" variant="inverse" size="sm" fullWidth={false} onPress={markIntroSeen} /> : null}
      </View>

      <FlatList
        ref={listRef}
        data={INTRO_SLIDES}
        keyExtractor={(slide) => slide.id}
        horizontal
        pagingEnabled
        bounces={false}
        showsHorizontalScrollIndicator={false}
        getItemLayout={(_, itemIndex) => ({ length: width, offset: width * itemIndex, index: itemIndex })}
        onMomentumScrollEnd={(event) => setIndex(Math.round(event.nativeEvent.contentOffset.x / width))}
        renderItem={({ item }) => (
          <View style={{ width, flex: 1, justifyContent: "center", paddingHorizontal: theme.spacing.lg, gap: theme.spacing.lg }}>
            <View style={{ width: 96, height: 96, borderRadius: theme.radius.xl, backgroundColor: theme.colors.heroPressed, alignItems: "center", justifyContent: "center" }}>
              <item.icon size={48} color={theme.colors.accent} />
            </View>
            <AppText variant="display" tone="hero" accessibilityRole="header">
              {item.title}
            </AppText>
            <AppText variant="body" tone="heroMuted">
              {item.message}
            </AppText>
          </View>
        )}
      />

      <View style={{ paddingHorizontal: theme.spacing.md, gap: theme.spacing.lg }}>
        <View
          style={{ flexDirection: "row", justifyContent: "center", gap: theme.spacing.xs }}
          accessible
          accessibilityLabel={`Página ${index + 1} de ${INTRO_SLIDES.length}`}
        >
          {INTRO_SLIDES.map((slide, dotIndex) => (
            <View
              key={slide.id}
              style={{
                width: dotIndex === index ? 24 : 8,
                height: 8,
                borderRadius: theme.radius.full,
                backgroundColor: dotIndex === index ? theme.colors.accent : theme.colors.heroTextMuted
              }}
            />
          ))}
        </View>
        <ACVELButton label={isLast ? "Começar" : "Próximo"} variant="inverse" onPress={next} />
      </View>
    </View>
  );
}
