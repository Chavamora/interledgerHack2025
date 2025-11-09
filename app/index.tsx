import { Button } from '@/components/ui/button';
import { Icon } from '@/components/ui/icon';
import { Text } from '@/components/ui/text';
import { Link, Stack } from 'expo-router';
import { MoonStarIcon, SunIcon, UserIcon, CreditCardIcon, ClockIcon } from 'lucide-react-native';
import { useColorScheme } from 'nativewind';
import * as React from 'react';
import { View } from 'react-native';

const SCREEN_OPTIONS = {
  title: 'Home',
  headerTransparent: true,
  headerRight: () => <ThemeToggle />,
};

export default function Screen() {
  const { colorScheme } = useColorScheme();

  return (
    <>
      <Stack.Screen options={SCREEN_OPTIONS} />
      <View className="flex-1 items-center justify-center gap-10 bg-background p-6">
        <View className="w-full max-w-sm items-center gap-6">
          <Text className="text-2xl font-bold text-foreground">Welcome</Text>
          <Text className="text-muted-foreground text-center">
            Choose an option to get started
          </Text>
        </View>

        <View className="w-full max-w-sm flex-row flex-wrap justify-center gap-6">
          <Link href="/profile" asChild>
            <Button className="h-32 w-32 flex-col justify-center rounded-2xl shadow-md">
              <Icon as={UserIcon} className="size-10 mb-2 text-background" />
              <Text className="text-lg font-semibold">Profile</Text>
            </Button>
          </Link>

          <Link href="/payments" asChild>
            <Button className="h-32 w-32 flex-col justify-center rounded-2xl shadow-md">
              <Icon as={CreditCardIcon} className="text-background size-10 mb-2" />
              <Text className="text-lg font-semibold">Payments</Text>
            </Button>
          </Link>

          <Link href="/history" asChild>
            <Button className="h-32 w-32 flex-col justify-center rounded-2xl shadow-md">
              <Icon as={ClockIcon} className="text-background size-10 mb-2" />
              <Text className="text-lg font-semibold">History</Text>
            </Button>
          </Link>
        </View>
      </View>
    </>
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
      className="ios:size-9 rounded-full web:mx-4"
    >
      <Icon as={THEME_ICONS[colorScheme ?? 'light']} className="size-5" />
    </Button>
  );
}

