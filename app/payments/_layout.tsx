// app/payments/_layout.tsx

import { Stack } from 'expo-router';

export default function PaymentsLayout() {
  // Este layout simplemente renderiza a sus hijos (tus pestañas)
  // Puedes usarlo para poner un título común a todas las pantallas de pago,
  // o simplemente dejar que las pestañas manejen los títulos.
  return (
    <Stack>
      <Stack.Screen
        name="(tabs)" 
        options={{
          headerShown: false, 
        }}
      />
    </Stack>
  );
}
