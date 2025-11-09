import React from 'react';
import { Tabs } from 'expo-router';
import { Ionicons } from '@expo/vector-icons'; // ¡Un paquete de íconos popular!

// Si no tienes @expo/vector-icons instalado, ejecútalo:
// npx expo install @expo/vector-icons

export default function TabLayout() {
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: '#007AFF', // Un color activo (iOS blue)
        tabBarInactiveTintColor: 'gray',
        tabBarStyle: {
          backgroundColor: '#FFFFFF',
        },
      }}
    >
      <Tabs.Screen
        name="beneficiary" // 1. Nombre del archivo: beneficiary.tsx
        options={{
          title: 'Recibir', // Título de la pestaña
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="arrow-down-circle" size={size} color={color} />
          ),
          headerTitle: 'Recibir Dinero', // Título en la barra superior
        }}
      />
      <Tabs.Screen
        name="payer" // 2. Nombre del archivo: payer.tsx
        options={{
          title: 'Enviar', // Título de la pestaña
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="arrow-up-circle" size={size} color={color} />
          ),
          headerTitle: 'Enviar Dinero', // Título en la barra superior
        }}
      />
    </Tabs>
  );
}
