import { Tabs } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { MicIcon, MoonIcon, SlidersIcon } from '@/components/icons';
import { colors, fontFamily, MIN_TAP, space } from '@/theme';

export default function TabsLayout() {
  const insets = useSafeAreaInsets();
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: colors.moon,
        tabBarInactiveTintColor: colors.textMuted,
        tabBarStyle: {
          backgroundColor: colors.skyDeep,
          borderTopColor: colors.border,
          height: MIN_TAP + space.md + insets.bottom,
          paddingTop: space.sm,
          paddingBottom: insets.bottom + space.sm,
        },
        tabBarItemStyle: { minHeight: MIN_TAP },
        tabBarLabelStyle: { fontFamily: fontFamily.semibold, fontSize: 13 },
      }}>
      <Tabs.Screen
        name="index"
        options={{
          title: 'Sounds',
          tabBarAccessibilityLabel: 'Sounds library',
          tabBarIcon: ({ color }) => <MoonIcon color={color} />,
        }}
      />
      <Tabs.Screen
        name="my-sounds"
        options={{
          title: 'My Sounds',
          tabBarAccessibilityLabel: 'My Sounds, your recordings',
          tabBarIcon: ({ color }) => <MicIcon color={color} />,
        }}
      />
      <Tabs.Screen
        name="settings"
        options={{
          title: 'Settings',
          tabBarAccessibilityLabel: 'Settings',
          tabBarIcon: ({ color }) => <SlidersIcon color={color} />,
        }}
      />
    </Tabs>
  );
}
