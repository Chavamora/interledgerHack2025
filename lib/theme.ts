import { DarkTheme, DefaultTheme, type Theme } from '@react-navigation/native';
 
export const THEME = {
  light: {
  // New palette (user provided): swapped background/card per request
  // background: #CBF3BB
  // card/highlight: #ECF4E8
  // titles/accents: #ABE7B2
  // foreground/text: #93BFC7
  backgroundImage: `url("https://static.vecteezy.com/system/resources/previews/021/053/429/non_2x/green-gradient-abstract-background-texture-free-vector.jpg")`,
  background: '#CBF3BB',
  foreground: '#93BFC7',
  card: '#ECF4E8',
  cardForeground: '#93BFC7',
  popover: '#ECF4E8',
  popoverForeground: '#93BFC7',
  primary: '#ECF4E8',
  primaryForeground: '#93BFC7',
  // darken secondary for better contrast
  secondary: '#6FB379',
  secondaryForeground: '#93BFC7',
  muted: '#6FB379',
  mutedForeground: '#93BFC7',
    accent: '#CBF3BB',
    accentForeground: '#93BFC7',
    destructive: 'hsl(0 84.2% 60.2%)',
  border: '#ECF4E8',
  input: '#CBF3BB',
  ring: '#ABE7B2',
    radius: '0.625rem',
  chart1: '#ECF4E8',
  chart2: '#CBF3BB',
  chart3: '#ABE7B2',
  chart4: '#93BFC7',
  chart5: '#ECF4E8',
    // Additional semantic tokens
    success: '#9FE2B7',
    successForeground: '#0B4F2A',
    info: '#93C7D1',
    infoForeground: '#083744',
    warning: '#FFD580',
    warningForeground: '#7A4900',
    surface: '#F7FFF7',
    surfaceForeground: '#073022',
    neutral: '#8FA7A2',
    neutralForeground: '#08302D',
  },
  dark: {
    // Dark variants derived from the same hue family but increased contrast
    background: '#06281A', // deep green-teal for dark background
    foreground: '#ECF4E8', // light text
    card: '#0F3B2A',
    cardForeground: '#ECF4E8',
    popover: '#0F3B2A',
    popoverForeground: '#ECF4E8',
    primary: '#0F3B2A',
    primaryForeground: '#ECF4E8',
    secondary: '#5B8F72',
    secondaryForeground: '#ECF4E8',
    muted: '#5B8F72',
    mutedForeground: '#ECF4E8',
    accent: '#0F3B2A',
    accentForeground: '#ECF4E8',
    destructive: 'hsl(0 70.9% 59.4%)',
    border: '#0F3B2A',
    input: '#06281A',
    ring: '#5B8F72',
    radius: '0.625rem',
    chart1: '#0F3B2A',
    chart2: '#06281A',
    chart3: '#5B8F72',
    chart4: '#ECF4E8',
    chart5: '#0F3B2A',
      // Dark semantic tokens (higher contrast)
      success: '#1E7A3A',
      successForeground: '#ECF4E8',
      info: '#2A6B78',
      infoForeground: '#ECF4E8',
      warning: '#B27A00',
      warningForeground: '#ECF4E8',
      surface: '#0B2A20',
      surfaceForeground: '#ECF4E8',
      neutral: '#4C6A66',
      neutralForeground: '#ECF4E8',
  },
};
 
export const NAV_THEME: Record<'light' | 'dark', Theme> = {
  light: {
    ...DefaultTheme,
    colors: {
      background: THEME.light.background,
      border: THEME.light.border,
      card: THEME.light.card,
      notification: THEME.light.destructive,
      primary: THEME.light.primary,
      text: THEME.light.foreground,
    },
  },
  dark: {
    ...DarkTheme,
    colors: {
      background: THEME.dark.background,
      border: THEME.dark.border,
      card: THEME.dark.card,
      notification: THEME.dark.destructive,
      primary: THEME.dark.primary,
      text: THEME.dark.foreground,
    },
  },
};