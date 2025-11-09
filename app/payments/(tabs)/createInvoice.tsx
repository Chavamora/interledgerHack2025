import React, { useState } from 'react';
import { View, Alert, ScrollView, ActivityIndicator } from 'react-native';
import { Stack } from 'expo-router';
import { Button } from '@/components/ui/button';
import { Icon } from '@/components/ui/icon';
import { Text } from '@/components/ui/text';
import { Input } from '@/components/ui/input'; // optional, if available in your setup
import { useColorScheme } from 'nativewind';
import { CreditCardIcon, CheckCircle2Icon, CreditCard } from 'lucide-react-native';
import * as Clipboard from 'expo-clipboard';
import {CurrencyDropdown} from '@/components/CurrencyDropdown'
const API_BASE_URL = 'https://unspiteful-roosevelt-unhated.ngrok-free.dev';

export default function BeneficiaryScreen() {
  const { colorScheme } = useColorScheme();

  // Hidden credentials — never shown in UI
  const sellerCredentials = {
    keyId: '3f6ec6c7-9c1a-4a9c-959e-d153aa9b9f49',
    privateKeyBase64: 'MC4CAQAwBQYDK2VwBCIEIFvmF1Cpz7jLuQ97FGiGyG/yLW3Z/iNfmvwqpjmcwsex',
    walletAddressUrl: 'https://ilp.interledger-test.dev/ahoa8921',
  };

  const [amountValue, setAmountValue] = useState('1000');
  const [assetCode, setAssetCode] = useState('CAD');
  const [assetScale, setAssetScale] = useState('2');
  const [newInvoiceId, setNewInvoiceId] = useState('');
  const [invoiceToCheck, setInvoiceToCheck] = useState('');
  const [paymentStatus, setPaymentStatus] = useState('');
  const [loading, setLoading] = useState(false);
  const handleCreateInvoice = async () => {
    setLoading(true);
    setNewInvoiceId('');
    setPaymentStatus('');

    try {
      const response = await fetch(`${API_BASE_URL}/api/create-incoming-payment`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'ngrok-skip-browser-warning': 'true',
        },
        body: JSON.stringify({
          sellerCredentials,
          paymentDetails: {
            amountValue,
            assetCode,
            assetScale: parseInt(assetScale, 10),
          },
        }),
      });

      if (!response.ok) throw new Error(await response.text());
      const data = await response.json();

      setNewInvoiceId(data.id);
      Alert.alert('Factura creada', 'La factura se ha generado correctamente.');
    } catch (error: any) {
      console.error(error);
      Alert.alert('Error', error.message || 'No se pudo crear la factura.');
    } finally {
      setLoading(false);
    }
  };

  const handleCheckStatus = async () => {
    if (!invoiceToCheck) {
      Alert.alert('Error', 'Introduce la URL de la factura a verificar.');
      return;
    }

    setLoading(true);
    setPaymentStatus('');

    try {
      const response = await fetch(`${API_BASE_URL}/api/check-payment-status`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sellerCredentials,
          paymentUrl: invoiceToCheck,
        }),
      });

      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Error al verificar el estado');

      setPaymentStatus(data.paymentStatus.state);
      Alert.alert('Estado del Pago', `El estado es: ${data.paymentStatus.state}`);
    } catch (error: any) {
      console.error(error);
      Alert.alert('Error', error.message);
    } finally {
      setLoading(false);
    }
  };

  const copyToClipboard = async (text: string) => {
    await Clipboard.setStringAsync(text);
    Alert.alert('Copiado', 'URL de la factura copiada al portapapeles.');
  };

  return (
    <>
      <Stack.Screen options={{ title: 'Payments', headerTransparent: true }} />

      <ScrollView
        className="flex-1 bg-background p-6"
        contentContainerStyle={{ paddingBottom: 40 }}
      >
        <View className="items-center mb-8">
          <Icon as={CreditCardIcon} className="size-10 text-foreground" />
          <Text className="text-2xl font-bold text-foreground">Receive Payment</Text>
          <Text className="text-muted-foreground text-center mt-1">
            Create or check payment invoices securely.
          </Text>
        </View>

        {/* Create Invoice Section */}
        <View className="bg-card rounded-2xl p-5 mb-6 shadow-md">
          <Text className="text-lg font-semibold text-foreground mb-4">Create Invoice</Text>

          <Text className="text-sm text-muted-foreground mb-1">Amount (e.g. 1000 = $10.00)</Text>
          <Input
            value={amountValue}
            onChangeText={setAmountValue}
            keyboardType="numeric"
            className="mb-3"
          />

          <Text className="text-sm text-muted-foreground mb-1">Currency Code</Text>

  <CurrencyDropdown value={assetCode} onChange={setAssetCode} />
          <Text className="text-sm text-muted-foreground mb-1">Scale</Text>
          <Input
            value={assetScale}
            onChangeText={setAssetScale}
            keyboardType="numeric"
            className="mb-5"
          />

          <Button onPress={handleCreateInvoice} disabled={loading}>
            <Text>Create Invoice</Text>
          </Button>

          {newInvoiceId ? (
            <View className="mt-5 rounded-xl bg-accent/10 p-4">
              <Text className="text-sm font-medium text-foreground mb-2">
                Invoice Created
              </Text>
              <View className="flex-row items-center justify-between">
                <Text
                  numberOfLines={1}
                  ellipsizeMode="middle"
                  selectable
                  className="text-xs text-muted-foreground flex-1 mr-3"
                >
                  {newInvoiceId}
                </Text>
                <Button
                  variant="secondary"
                  size="sm"
                  onPress={() => copyToClipboard(newInvoiceId)}
                >
                  <Text>Copy</Text>
                </Button>
              </View>
            </View>
          ) : null}
        </View>

        {/* Check Invoice Section */}
        <View className="bg-card rounded-2xl p-5 shadow-md">
          <Text className="text-lg font-semibold text-foreground mb-4">Check Status</Text>

          <Text className="text-sm text-muted-foreground mb-1">Invoice URL</Text>
          <Input
            value={invoiceToCheck}
            onChangeText={setInvoiceToCheck}
            placeholder="Paste invoice URL here..."
            className="mb-5"
          />

          <Button onPress={handleCheckStatus} disabled={loading}>
            <Text>Check Status</Text>
          </Button>

          {paymentStatus ? (
            <View className="mt-5 rounded-xl bg-accent/10 p-4">
              <View className="flex-row items-center gap-2 mb-2">
                <Icon as={CheckCircle2Icon} className="size-5 text-foreground" />
                <Text className="font-medium text-foreground">Current Status</Text>
              </View>
              <Text className="text-muted-foreground">{paymentStatus}</Text>
            </View>
          ) : null}
        </View>

        {loading && (
          <ActivityIndicator size="large" className="mt-8 text-primary" />
        )}
      </ScrollView>
    </>
  );
}

