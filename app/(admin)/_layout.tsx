import { useEffect } from 'react';
import { View } from 'react-native';
import { Tabs, router } from 'expo-router';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';
import { IconButton } from 'react-native-paper';
import { COLORS } from '@/constants/theme';
import { useAuthStore } from '@/lib/stores/authStore';

export default function AdminLayout() {
  const setViewMode = useAuthStore((s) => s.setViewMode);

  useEffect(() => {
    setViewMode(null);
  }, []);
  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: COLORS.primary,
        tabBarInactiveTintColor: COLORS.textSecondary,
        headerStyle: { backgroundColor: COLORS.primary },
        headerTintColor: '#FFFFFF',
      }}
    >
      <Tabs.Screen
        name="dashboard"
        options={{
          title: 'Dashboard',
          tabBarIcon: ({ color, size }) => (
            <MaterialCommunityIcons name="view-dashboard" size={size} color={color} />
          ),
          headerRight: () => (
            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
              <IconButton
                icon="account-switch"
                size={22}
                iconColor="#FFFFFF"
                onPress={() => {
                  setViewMode('coach');
                  router.push('/(coach)/schedule');
                }}
              />
              <IconButton
                icon="bell"
                size={22}
                iconColor="#FFFFFF"
                onPress={() => router.push('/(admin)/notifications')}
              />
              <IconButton
                icon="cog"
                size={22}
                iconColor="#FFFFFF"
                onPress={() => router.push('/(admin)/settings')}
              />
            </View>
          ),
        }}
      />
      <Tabs.Screen
        name="lessons"
        options={{
          title: 'Lessons',
          headerShown: false,
          tabBarIcon: ({ color, size }) => (
            <MaterialCommunityIcons name="school" size={size} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="students"
        options={{
          title: 'Students',
          headerShown: false,
          tabBarIcon: ({ color, size }) => (
            <MaterialCommunityIcons name="account-group" size={size} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="coaches"
        options={{
          title: 'Coaches',
          headerShown: false,
          tabBarIcon: ({ color, size }) => (
            <MaterialCommunityIcons name="account-tie" size={size} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="courts"
        options={{
          href: null,
          headerShown: false,
        }}
      />
      <Tabs.Screen
        name="subscriptions"
        options={{
          href: null,
          headerShown: false,
        }}
      />
      <Tabs.Screen
        name="payroll"
        options={{
          href: null,
          headerShown: false,
        }}
      />
      <Tabs.Screen
        name="settings"
        options={{
          href: null,
          headerShown: false,
        }}
      />
      <Tabs.Screen
        name="notifications"
        options={{
          href: null,
        }}
      />
    </Tabs>
  );
}
