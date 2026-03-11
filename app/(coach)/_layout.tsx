import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Tabs, router } from 'expo-router';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';
import { IconButton } from 'react-native-paper';
import { COLORS } from '@/constants/theme';
import { useAuthStore } from '@/lib/stores/authStore';

export default function CoachLayout() {
  const viewMode = useAuthStore((s) => s.viewMode);
  const userProfile = useAuthStore((s) => s.userProfile);
  const setViewMode = useAuthStore((s) => s.setViewMode);

  const isAdminCoachMode =
    viewMode === 'coach' &&
    (userProfile?.role === 'admin' || userProfile?.role === 'owner');

  return (
    <View style={{ flex: 1 }}>
      {isAdminCoachMode && (
        <View style={styles.banner}>
          <View style={styles.bannerContent}>
            <MaterialCommunityIcons name="information" size={18} color="#FFFFFF" />
            <Text style={styles.bannerText}>Coach Mode</Text>
          </View>
          <TouchableOpacity
            style={styles.exitButton}
            onPress={() => {
              setViewMode(null);
              router.replace('/(admin)/dashboard');
            }}
          >
            <Text style={styles.exitButtonText}>Exit</Text>
          </TouchableOpacity>
        </View>
      )}
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: COLORS.primary,
        tabBarInactiveTintColor: COLORS.textSecondary,
        headerStyle: { backgroundColor: COLORS.primary },
        headerTintColor: '#FFFFFF',
      }}
    >
      <Tabs.Screen
        name="schedule"
        options={{
          title: 'Schedule',
          tabBarIcon: ({ color, size }) => (
            <MaterialCommunityIcons name="calendar" size={size} color={color} />
          ),
          headerRight: () => (
            <IconButton
              icon="bell"
              size={22}
              iconColor="#FFFFFF"
              onPress={() => router.push('/(coach)/notifications')}
            />
          ),
        }}
      />
      <Tabs.Screen
        name="availability"
        options={{
          title: 'My Lessons',
          tabBarIcon: ({ color, size }) => (
            <MaterialCommunityIcons name="book-edit-outline" size={size} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="students"
        options={{
          title: 'Students',
          tabBarIcon: ({ color, size }) => (
            <MaterialCommunityIcons name="account-group" size={size} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="notifications"
        options={{
          href: null,
        }}
      />
      <Tabs.Screen
        name="settings"
        options={{
          title: 'Settings',
          tabBarIcon: ({ color, size }) => (
            <MaterialCommunityIcons name="cog" size={size} color={color} />
          ),
        }}
      />
    </Tabs>
    </View>
  );
}

const styles = StyleSheet.create({
  banner: {
    backgroundColor: COLORS.info,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  bannerContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  bannerText: {
    color: '#FFFFFF',
    fontWeight: '600',
    fontSize: 14,
  },
  exitButton: {
    backgroundColor: 'rgba(255,255,255,0.25)',
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 16,
  },
  exitButtonText: {
    color: '#FFFFFF',
    fontWeight: '600',
    fontSize: 13,
  },
});
