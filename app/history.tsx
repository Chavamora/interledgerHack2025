import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Alert,
  FlatList,
  ActivityIndicator,
  RefreshControl,
} from 'react-native';
import { Stack } from 'expo-router';
import { Icon } from '@/components/ui/icon';
import { Text } from '@/components/ui/text';
import { useColorScheme } from 'nativewind';
import {
  List,
  ArrowUp,
  ArrowDown,
  CheckCircle2Icon,
  XCircleIcon,
  ClockIcon,
  BadgeCentIcon, // Icono para 'No transacciones'
} from 'lucide-react-native';

const API_BASE_URL = 'https://unspiteful-roosevelt-unhated.ngrok-free.dev';

// Definimos un tipo para nuestras transacciones
interface Transaction {
  id: string;
  type: 'sent' | 'received';
  amount: {
    value: string;
    assetCode: string;
    assetScale: number;
  };
  state: string; // e.g., 'COMPLETED', 'PENDING'
  createdAt: string;
}

// --- Componente de Fila de Transacción ---
const TransactionItem = ({ item }: { item: Transaction }) => {
  const isSent = item.type === 'sent';
  const icon = isSent ? ArrowUp : ArrowDown;
  const iconColorClass = isSent ? 'text-red-500' : 'text-green-500';
  const amountPrefix = isSent ? '-' : '+';

  // Formatear el monto (ej. 1000 con escala 2 -> 10.00)
  const formattedAmount = (
    parseInt(item.amount.value, 10) /
    Math.pow(10, item.amount.assetScale)
  ).toFixed(item.amount.assetScale);

  // Formatear la fecha
  const formattedDate = new Date(item.createdAt).toLocaleDateString('en-US', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });

  // Icono y color de estado
  let StatusIcon = ClockIcon;
  let statusColor = 'text-yellow-500'; // PENDING

  if (item.state === 'COMPLETED') {
    StatusIcon = CheckCircle2Icon;
    statusColor = 'text-green-500';
  } else if (item.state === 'FAILED' || item.state === 'EXPIRED') {
    StatusIcon = XCircleIcon;
    statusColor = 'text-red-500';
  }

  return (
    <View className="flex-row items-center p-4 bg-card border-b border-border">
      {/* Icono de Tipo (Enviado/Recibido) */}
      <View
        className={`w-10 h-10 items-center justify-center rounded-full ${
          isSent ? 'bg-red-500/10' : 'bg-green-500/10'
        }`}
      >
        <Icon as={icon} className={`size-5 ${iconColorClass}`} />
      </View>

      {/* Detalles (Tipo y Fecha) */}
      <View className="flex-1 mx-4">
        <Text className="text-base font-medium text-foreground">
          {isSent ? 'Sent' : 'Received'}
        </Text>
        <Text className="text-sm text-muted-foreground">{formattedDate}</Text>
      </View>

      {/* Monto y Estado */}
      <View className="items-end">
        <Text className={`text-base font-bold ${iconColorClass}`}>
          {amountPrefix} ${formattedAmount}
        </Text>
        <View className="flex-row items-center gap-1 mt-1">
          <Icon as={StatusIcon} className={`size-3 ${statusColor}`} />
          <Text className={`text-xs font-medium ${statusColor}`}>
            {item.state}
          </Text>
        </View>
      </View>
    </View>
  );
};

// --- Pantalla Principal de Historial ---
export default function HistoryScreen() {
  const { colorScheme } = useColorScheme();
  const [history, setHistory] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // --- Credenciales del usuario de la app ---
  // (Usando el estilo de tu PayerScreen.tsx)
  const [keyId, setKeyId] = useState('3f6ec6c7-9c1a-4a9c-959e-d153aa9b9f49');
  const [privateKeyBase64, setPrivateKeyBase64] = useState(
    'MC4CAQAwBQYDK2VwBCIEIFvmF1Cpz7jLuQ97FGiGyG/yLW3Z/iNfmvwqpjmcwsex'
  );
  const [walletAddressUrl, setWalletAddressUrl] = useState(
    'https://ilp.interledger-test.dev/ahoa8921'
  );

  // Helper para obtener credenciales
  const getUserCredentials = () => ({
    keyId,
    privateKeyBase64,
    walletAddressUrl,
  });

  const fetchHistory = async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/api/get-history`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json',

        'ngrok-skip-browser-warning': 'true'
        },
        body: JSON.stringify({ userCredentials: getUserCredentials() }),
      });

      if (!response.ok) {
        const err = await response.json();
        throw new Error(err.error || 'Failed to fetch history');
      }

      const data = await response.json();
      setHistory(data);
    } catch (error: any) {
      console.error(error);
      Alert.alert('Error', error.message);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  // Cargar al montar
  useEffect(() => {
    fetchHistory();
  }, []);

  // "Jalar para recargar"
  const onRefresh = useCallback(() => {
    setRefreshing(true);
    fetchHistory();
  }, []);

  return (
    <>
      <Stack.Screen
        options={{ title: 'Transaction History', headerTransparent: true }}
      />
      <View className="flex-1 bg-background">
        {/* Encabezado Personalizado */}
        <View className="items-center mb-4 pt-24 px-6">
          <Icon as={List} className="size-10 mb-3 text-foreground" />
          <Text className="text-2xl font-bold text-foreground">
            Transaction History
          </Text>
          <Text className="text-muted-foreground text-center mt-1">
            Your recent incoming and outgoing payments.
          </Text>
        </View>

        {/* Lista de Transacciones */}
        {loading ? (
          <ActivityIndicator size="large" className="mt-8 text-primary" />
        ) : (
          <FlatList
            data={history}
            renderItem={({ item }) => <TransactionItem item={item} />}
            keyExtractor={(item) => item.id}
            ListEmptyComponent={
              <View className="items-center justify-center p-10 opacity-50">
                <Icon as={BadgeCentIcon} className="size-16 text-muted-foreground mb-4" />
                <Text className="text-muted-foreground text-lg">
                  No transactions yet
                </Text>
                <Text className="text-muted-foreground text-center">
                  Pull down to refresh.
                </Text>
              </View>
            }
            refreshControl={
              <RefreshControl
                refreshing={refreshing}
                onRefresh={onRefresh}
                tintColor={colorScheme === 'dark' ? '#FFFFFF' : '#000000'}
              />
            }
          />
        )}
      </View>
    </>
  );
}
