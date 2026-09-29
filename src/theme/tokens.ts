/**
 * ACVEL design tokens (docs/mobile-design-system.md in the web repo).
 * Components must consume tokens through `useTheme()` — never raw values.
 */

export const palette = {
  acvelBlue: "#094496",
  acvelBluePressed: "#073778",
  acvelNavy: "#183760",
  acvelCyan: "#43D5F6",
  acvelCyanPressed: "#2FC3E6",
  neutral900: "#1E1E1E",
  white: "#FFFFFF",
  solarAmber: "#F59E0B",
  solarAmberDark: "#FBBF24",
  whatsapp: "#25D366"
} as const;

export interface StatusColors {
  bg: string;
  fg: string;
  border: string;
}

export interface ThemeColors {
  canvas: string;
  surface: string;
  surfaceMuted: string;
  surfaceRaised: string;
  border: string;
  borderStrong: string;
  textPrimary: string;
  textSecondary: string;
  textTertiary: string;
  textOnPrimary: string;
  textInverse: string;
  primary: string;
  primaryPressed: string;
  primarySoft: string;
  secondary: string;
  accent: string;
  heroBackground: string;
  heroText: string;
  heroTextMuted: string;
  heroPressed: string;
  success: StatusColors;
  warning: StatusColors;
  danger: StatusColors;
  info: StatusColors;
  neutral: StatusColors;
  generator: string;
  chart: readonly [string, string, string, string];
  chartGrid: string;
  scrim: string;
  skeleton: string;
  skeletonHighlight: string;
  focusRing: string;
  whatsapp: string;
  tabBar: string;
}

export const lightColors: ThemeColors = {
  canvas: "#F8FAFC",
  surface: "#FFFFFF",
  surfaceMuted: "#EEF2F7",
  surfaceRaised: "#FFFFFF",
  border: "#DCE6F3",
  borderStrong: "#B8C7DB",
  textPrimary: "#1E1E1E",
  textSecondary: "#475569",
  textTertiary: "#64748B",
  textOnPrimary: "#FFFFFF",
  textInverse: "#FFFFFF",
  primary: palette.acvelBlue,
  primaryPressed: palette.acvelBluePressed,
  primarySoft: "#E6EEF9",
  secondary: palette.acvelNavy,
  accent: palette.acvelCyan,
  heroBackground: palette.acvelBlue,
  heroText: "#FFFFFF",
  heroTextMuted: "#C9DAF3",
  heroPressed: "rgba(255,255,255,0.16)",
  success: { bg: "#D1FAE5", fg: "#065F46", border: "#6EE7B7" },
  warning: { bg: "#FEF3C7", fg: "#92400E", border: "#FCD34D" },
  danger: { bg: "#FFE4E6", fg: "#9F1239", border: "#FDA4AF" },
  info: { bg: "#E0F2FE", fg: "#075985", border: "#7DD3FC" },
  neutral: { bg: "#E2E8F0", fg: "#475569", border: "#CBD5E1" },
  generator: palette.solarAmber,
  chart: [palette.acvelBlue, "#10B981", palette.solarAmber, palette.acvelCyan],
  chartGrid: "#E2E8F0",
  scrim: "rgba(0,0,0,0.5)",
  skeleton: "#E2E8F0",
  skeletonHighlight: "#F1F5F9",
  focusRing: palette.acvelBlue,
  whatsapp: palette.whatsapp,
  tabBar: "#FFFFFF"
};

export const darkColors: ThemeColors = {
  canvas: "#101828",
  surface: "#1E293B",
  surfaceMuted: "#273449",
  surfaceRaised: "#243247",
  border: "#334155",
  borderStrong: "#475569",
  textPrimary: "#F8FAFC",
  textSecondary: "#CBD5E1",
  textTertiary: "#94A3B8",
  textOnPrimary: "#0F172A",
  textInverse: "#0F172A",
  primary: palette.acvelCyan,
  primaryPressed: palette.acvelCyanPressed,
  primarySoft: "#123049",
  secondary: palette.acvelNavy,
  accent: palette.acvelCyan,
  heroBackground: palette.acvelNavy,
  heroText: "#FFFFFF",
  heroTextMuted: "#A9BFDF",
  heroPressed: "rgba(255,255,255,0.12)",
  success: { bg: "#022C22", fg: "#A7F3D0", border: "#047857" },
  warning: { bg: "#451A03", fg: "#FDE68A", border: "#B45309" },
  danger: { bg: "#4C0519", fg: "#FECDD3", border: "#BE123C" },
  info: { bg: "#082F49", fg: "#BAE6FD", border: "#0369A1" },
  neutral: { bg: "#334155", fg: "#CBD5E1", border: "#475569" },
  generator: palette.solarAmberDark,
  chart: [palette.acvelCyan, "#34D399", palette.solarAmberDark, "#93C5FD"],
  chartGrid: "#334155",
  scrim: "rgba(0,0,0,0.6)",
  skeleton: "#273449",
  skeletonHighlight: "#334155",
  focusRing: palette.acvelCyan,
  whatsapp: palette.whatsapp,
  tabBar: "#1E293B"
};

/** Montserrat family names as registered by @expo-google-fonts/montserrat. */
export const fontFamily = {
  regular: "Montserrat_400Regular",
  medium: "Montserrat_500Medium",
  semibold: "Montserrat_600SemiBold",
  bold: "Montserrat_700Bold"
} as const;

export type FontWeightName = keyof typeof fontFamily;

export interface TextStyleToken {
  fontSize: number;
  lineHeight: number;
  fontFamily: string;
  letterSpacing?: number;
  textTransform?: "uppercase";
}

export const typography = {
  display: { fontSize: 32, lineHeight: 40, fontFamily: fontFamily.bold },
  title1: { fontSize: 24, lineHeight: 32, fontFamily: fontFamily.bold },
  title2: { fontSize: 20, lineHeight: 28, fontFamily: fontFamily.bold },
  title3: { fontSize: 17, lineHeight: 24, fontFamily: fontFamily.semibold },
  body: { fontSize: 16, lineHeight: 24, fontFamily: fontFamily.regular },
  bodyStrong: { fontSize: 16, lineHeight: 24, fontFamily: fontFamily.semibold },
  callout: { fontSize: 15, lineHeight: 20, fontFamily: fontFamily.semibold },
  subhead: { fontSize: 14, lineHeight: 20, fontFamily: fontFamily.regular },
  subheadStrong: { fontSize: 14, lineHeight: 20, fontFamily: fontFamily.semibold },
  footnote: { fontSize: 13, lineHeight: 18, fontFamily: fontFamily.regular },
  caption: { fontSize: 12, lineHeight: 16, fontFamily: fontFamily.medium },
  overline: { fontSize: 12, lineHeight: 16, fontFamily: fontFamily.semibold, letterSpacing: 0.8, textTransform: "uppercase" }
} as const satisfies Record<string, TextStyleToken>;

export type TypographyVariant = keyof typeof typography;

/** 4-pt spacing scale. `md` (16) is the screen gutter and card padding. */
export const spacing = {
  none: 0,
  xxs: 4,
  xs: 8,
  sm: 12,
  md: 16,
  lg: 24,
  xl: 32,
  xxl: 48
} as const;

export type SpacingToken = keyof typeof spacing;

export const radius = {
  sm: 8,
  md: 12,
  lg: 16,
  xl: 24,
  full: 999
} as const;

/** Minimum sizes (iOS 44pt / Android 48dp). */
export const sizing = {
  touchTarget: 48,
  buttonLg: 52,
  buttonMd: 44,
  buttonSm: 36,
  input: 52,
  listRow: 56,
  listRowTwoLine: 72,
  chip: 32,
  iconSm: 16,
  iconMd: 20,
  iconLg: 24,
  iconXl: 32,
  avatarSm: 32,
  avatarLg: 64,
  fab: 56,
  maxFontScale: 1.3
} as const;

export interface ShadowToken {
  shadowColor: string;
  shadowOffset: { width: number; height: number };
  shadowOpacity: number;
  shadowRadius: number;
  elevation: number;
}

export const shadows = {
  none: { shadowColor: "#000", shadowOffset: { width: 0, height: 0 }, shadowOpacity: 0, shadowRadius: 0, elevation: 0 },
  /** Sticky bars, tab bar */
  level1: { shadowColor: "#0B1B33", shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.08, shadowRadius: 8, elevation: 3 },
  /** Sheets, dialogs, FAB */
  level2: { shadowColor: "#0B1B33", shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.16, shadowRadius: 24, elevation: 10 }
} as const satisfies Record<string, ShadowToken>;

export const motion = {
  fast: 150,
  base: 250,
  slow: 400
} as const;

export interface Theme {
  mode: "light" | "dark";
  colors: ThemeColors;
  typography: typeof typography;
  spacing: typeof spacing;
  radius: typeof radius;
  sizing: typeof sizing;
  shadows: typeof shadows;
  motion: typeof motion;
}

export function buildTheme(mode: "light" | "dark"): Theme {
  return {
    mode,
    colors: mode === "dark" ? darkColors : lightColors,
    typography,
    spacing,
    radius,
    sizing,
    shadows,
    motion
  };
}
