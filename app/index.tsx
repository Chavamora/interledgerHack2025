import { Button } from '@/components/ui/button';
import { Icon } from '@/components/ui/icon';
import { Text } from '@/components/ui/text';
import { Link, Stack } from 'expo-router';
import { MoonStarIcon, SunIcon, UserIcon, CreditCardIcon, ClockIcon } from 'lucide-react-native';
import { useColorScheme } from 'nativewind';
import * as React from 'react';
import { View } from 'react-native';
import { THEME } from '@/lib/theme';

const palette = THEME.light;

const SCREEN_OPTIONS = {
  title: 'Home',
  headerTransparent: true,
  headerRight: () => <ThemeToggle />,
};

function hexToRgba(hex: string, alpha = 1) {
  try {
    const clean = hex.replace('#', '');
    const full =
      clean.length === 3
        ? clean
            .split('')
            .map((c) => c + c)
            .join('')
        : clean;
    const int = parseInt(full, 16);
    const r = (int >> 16) & 255;
    const g = (int >> 8) & 255;
    const b = int & 255;
    return `rgba(${r}, ${g}, ${b}, ${alpha})`;
  } catch (e) {
    return hex;
  }
}

export default function Screen() {
  const { colorScheme } = useColorScheme();

  return (
    <div
      style={{
        backgroundColor: palette.background,
        backgroundImage: palette.backgroundImage,
        backgroundSize: 'cover',
        backgroundPosition: 'center',
        backgroundRepeat: 'no-repeat',
      }}
      className="min-h-screen">
      <div
        className="relative m-4 mx-auto my-6 flex w-full min-w-0 max-w-3xl flex-col items-center gap-4 rounded-lg border p-6 px-4 font-sans md:max-w-4xl md:flex-col"
        style={{ backgroundColor: hexToRgba(palette.card, 0.64) }}>
        <Stack.Screen options={SCREEN_OPTIONS} />
        <View className="flex-1 items-center justify-center gap-10 p-6">
          <View className="w-full max-w-sm items-center gap-6">
            <Text className="text-2xl font-bold text-foreground">Welcome</Text>
            <Text className="text-center text-muted-foreground">
              Choose an option to get started
            </Text>
          </View>

          <View className="w-full max-w-sm flex-row flex-wrap justify-center gap-6">
            <Link href="/profile/profile" asChild>
              <Button variant="outline" size="lg">
                <Icon as={UserIcon} size={18} className="text-secondary-foreground" />
                <Text className="text-lg font-semibold">Profile</Text>
              </Button>
            </Link>

            <Link href="/payments" asChild>
              <Button variant="outline" size="lg">
                <Icon as={CreditCardIcon} size={18} className="text-secondary-foreground" />
                <Text className="text-lg font-semibold">Payments</Text>
              </Button>
            </Link>

            <Link href="/history" asChild>
              <Button variant="outline" size="lg">
                <Icon as={ClockIcon} size={18} className="text-secondary-foreground" />
                <Text className="text-lg font-semibold">History</Text>
              </Button>
            </Link>
          </View>
        </View>
      </div>
    </div>
  );
}

const THEME_ICONS = {
  light: SunIcon,
  dark: MoonStarIcon,
};

function ThemeToggle() {
  const { colorScheme, toggleColorScheme } = useColorScheme();

  return (
    <Button
      onPressIn={toggleColorScheme}
      size="icon"
      variant="ghost"
      className="ios:size-9 rounded-full web:mx-4">
      <Icon as={THEME_ICONS[colorScheme ?? 'light']} className="size-5" />
    </Button>
  );
}
