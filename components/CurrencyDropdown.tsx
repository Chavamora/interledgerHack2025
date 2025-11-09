import * as React from 'react';
import {
  View,
  ScrollView,
  Modal,
  Pressable,
} from 'react-native';
import { Text } from '@/components/ui/text';
import { Button } from '@/components/ui/button';
import { Icon } from '@/components/ui/icon';
import { Card } from '@/components/ui/card';
import { ChevronDown, Check } from 'lucide-react-native';
import { useColorScheme } from 'nativewind';

const CURRENCIES = [
  'USD', 'EUR', 'MXN', 'JPY', 'GBP', 'CAD', 'AUD', 'BRL', 'CNY', 'INR',
  'CHF', 'KRW', 'SEK', 'NOK', 'ZAR', 'SGD', 'HKD', 'RUB', 'TRY', 'PLN',
];

export function CurrencyDropdown({
  value,
  onChange,
}: {
  value: string;
  onChange: (v: string) => void;
}) {
  const [visible, setVisible] = React.useState(false);
  const { colorScheme } = useColorScheme();

  return (
    <View className="w-full items-start ">
      {/* Main button */}
      <Button
        onPress={() => setVisible(true)}
        variant="outline"
        className="w-48 flex-row justify-between items-center rounded-xl"
      >
        <Text className="text-base font-medium">{value}</Text>
        <Icon as={ChevronDown} className="size-4 opacity-60" />
      </Button>

      {/* Modal dropdown */}
      <Modal
        visible={visible}
        animationType="slide"
        transparent
        onRequestClose={() => setVisible(false)}
      >
        <View className="flex-1 justify-end bg-black/40">
          <Card
            className={`rounded-t-3xl p-4 ${
              colorScheme === 'dark' ? 'bg-background' : 'bg-white'
            }`}
          >
            <Text className="text-lg font-semibold mb-3 text-center">
              Select Currency
            </Text>
            <ScrollView className="max-h-[60vh]">
              {CURRENCIES.map((code) => {
                const selected = code === value;
                return (
                  <Pressable
                    key={code}
                    onPress={() => {
                      onChange(code);
                      setVisible(false);
                    }}
                    className={`flex-row justify-between items-center px-4 py-3 rounded-xl ${
                      selected
                        ? 'bg-primary/10'
                        : 'bg-transparent'
                    }`}
                  >
                    <Text
                      className={`text-base ${
                        selected ? 'text-primary font-semibold' : ''
                      }`}
                    >
                      {code}
                    </Text>
                    {selected && (
                      <Icon as={Check} className="size-4 text-primary" />
                    )}
                  </Pressable>
                );
              })}
            </ScrollView>

            <Button
              className="mt-4 rounded-xl"
              variant="secondary"
              onPress={() => setVisible(false)}
            >
              <Text>Close</Text>
            </Button>
          </Card>
        </View>
      </Modal>
    </View>
  );
}

