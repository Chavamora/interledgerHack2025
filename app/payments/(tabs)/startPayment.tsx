import React, { useState, useEffect } from 'react';
import { View, Alert, ScrollView, ActivityIndicator, Linking } from 'react-native';
import { Stack } from 'expo-router';
import { Button } from '@/components/ui/button';
import { Icon } from '@/components/ui/icon';
import { Text } from '@/components/ui/text';
import { Input } from '@/components/ui/input';
import { useColorScheme } from 'nativewind';
import { SendIcon, CheckCircle2Icon } from 'lucide-react-native';

const API_BASE_URL = 'https://unspiteful-roosevelt-unhated.ngrok-free.dev';

interface PendingPayment {
  continueToken: string;
  continueUri: string;
  quoteId: string;
}

export default function PayerScreen() {
  const { colorScheme } = useColorScheme();

  // Credentials
  const [keyId, setKeyId] = useState('9ef9a49d-4ef0-4baf-b938-285d41d596e7');
  const [privateKeyBase64, setPrivateKeyBase64] = useState(
    'MC4CAQAwBQYDK2VwBCIEIGzcyxiaY+PJ0qOgAfjQX/q22vdX5TI+MY0wPAJ1xUgz'
  );
  const [walletAddressUrl, setWalletAddressUrl] = useState(
    'https://ilp.interledger-test.dev/usd123123'
  );

  // Payment
  const [invoiceToPayUrl, setInvoiceToPayUrl] = useState('');
  const [statusMessage, setStatusMessage] = useState('');
  const [loading, setLoading] = useState(false);
  const [pendingPayment, setPendingPayment] = useState<PendingPayment | null>(null);

  // Deep link listener
  useEffect(() => {
    const handleDeepLink = (event: { url: string }) => {
      console.log('Deep link recibido:', event.url);
      if (event.url.startsWith('my-app://payment/callback')) {
        const url = new URL(event.url);
        const interact_ref = url.searchParams.get('interact_ref');

        if (!interact_ref) {
          Alert.alert('Error', 'Deep link inválido (faltó interact_ref)');
          setLoading(false);
          return;
        }

        if (pendingPayment) {
          finalizePayment(interact_ref, pendingPayment);
        } else {
          Alert.alert('Error', 'Callback recibido sin pago pendiente.');
          setLoading(false);
        }
      }
    };

    const subscription = Linking.addEventListener('url', handleDeepLink);
    return () => subscription.remove();
  }, [pendingPayment]);

  // Helpers
  const getPayerCredentials = () => ({
    keyId,
    privateKeyBase64,
    walletAddressUrl,
  });

  const finalizePayment = async (interact_ref: string, paymentDetails: PendingPayment) => {
    setLoading(true);
    setStatusMessage('3/3: Finalizando pago...');

    try {
      const response = await fetch(`${API_BASE_URL}/api/finalize-payment`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' ,
'ngrok-skip-browser-warning': 'true' 
        },
        body: JSON.stringify({
          payerCredentials: getPayerCredentials(),
          quoteId: paymentDetails.quoteId,
          continueToken: paymentDetails.continueToken,
          continueUri: paymentDetails.continueUri,
          interact_ref,
        }),
      });

      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Error al finalizar el pago');

      Alert.alert('¡Pago Exitoso!', `El pago se completó. ID: ${data.payment.id}`);
      setStatusMessage(`Pago exitoso: ${data.payment.id}`);
    } catch (error: any) {
      console.error(error);
      Alert.alert('Error', error.message);
      setStatusMessage(`Error: ${error.message}`);
    } finally {
      setLoading(false);
      setPendingPayment(null);
      setInvoiceToPayUrl('');
    }
  };

  const handlePay = async () => {
    if (!invoiceToPayUrl) {
      Alert.alert('Error', 'Por favor, pega la URL de la factura.');
      return;
    }

    setLoading(true);
    setStatusMessage('1/3: Obteniendo cotización...');
    setPendingPayment(null);

    try {
      const quoteRes = await fetch(`${API_BASE_URL}/api/quotes`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json',
'ngrok-skip-browser-warning': 'true'
        },
        body: JSON.stringify({
          payerCredentials: getPayerCredentials(),
          recipientUrl: invoiceToPayUrl,
        }),
      });

      const quoteData = await quoteRes.json();
      if (!quoteRes.ok) throw new Error(quoteData.error || 'Error al obtener cotización');

      setStatusMessage('2/3: Iniciando pago interactivo...');
      const payRes = await fetch(`${API_BASE_URL}/api/start-payment`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json',
        'ngrok-skip-browser-warning': 'true'
        },
        body: JSON.stringify({
          payerCredentials: getPayerCredentials(),
          quoteId: quoteData.id,
        }),
      });

      const payData = await payRes.json();
      if (!payRes.ok) throw new Error(payData.error || 'Error al iniciar el pago');

      setPendingPayment({
        continueToken: payData.continueToken,
        continueUri: payData.continueUri,
        quoteId: payData.quoteId,
      });

      setStatusMessage('2/3: Esperando aprobación del usuario...');
      await Linking.openURL(payData.redirectTo);
    } catch (error: any) {
      console.error(error);
      Alert.alert('Error', error.message);
      setStatusMessage(`Error: ${error.message}`);
      setLoading(false);
    }
  };

  return (
    <>
      <Stack.Screen options={{ title: 'Send Payment', headerTransparent: true }} />
      <ScrollView
        className="flex-1 bg-background p-6"
        contentContainerStyle={{ paddingBottom: 40 }}
      >
        {/* Header */}
        <View className="items-center mb-8">
          <Icon as={SendIcon} className="size-10 mb-3 text-foreground" />
          <Text className="text-2xl font-bold text-foreground">Send Payment</Text>
          <Text className="text-muted-foreground text-center mt-1">
            Enter an invoice URL and confirm to send funds.
          </Text>
        </View>

        {/* Payment Section */}
        <View className="bg-card rounded-2xl p-5 shadow-md">
          <Text className="text-lg font-semibold text-foreground mb-4">Make a Payment</Text>

          <Text className="text-sm text-muted-foreground mb-1">
            Invoice URL (from the Beneficiary)
          </Text>
          <Input
            value={invoiceToPayUrl}
            onChangeText={setInvoiceToPayUrl}
            placeholder="Paste invoice URL here..."
            className="mb-5"
          />

          <Button onPress={handlePay} disabled={loading}>
            <Text>Pay Invoice</Text>
          </Button>

          {statusMessage ? (
            <View className="mt-5 rounded-xl bg-accent/10 p-4">
              <View className="flex-row items-center gap-2 mb-2">
                <Icon as={CheckCircle2Icon} className="size-5 text-foreground" />
                <Text className="font-medium text-foreground">Status</Text>
              </View>
              <Text className="text-muted-foreground">{statusMessage}</Text>
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

