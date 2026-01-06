// ============================================================
// ClimaTrak Mobile - Tabs Layout
// ============================================================

import { Tabs } from 'expo-router';
import { View, Text, StyleSheet } from 'react-native';
import { 
  Home, 
  ClipboardList, 
  Box, 
  AlertTriangle, 
  Settings 
} from 'lucide-react-native';
import { useSyncStore } from '@/store';
import { theme } from '@/theme';

interface TabIconProps {
  icon: React.ReactNode;
  focused: boolean;
  label: string;
  badge?: number;
}

function TabIcon({ icon, focused, label, badge }: TabIconProps) {
  return (
    <View style={styles.tabIconContainer}>
      <View style={styles.iconWrapper}>
        {icon}
        {badge !== undefined && badge > 0 && (
          <View style={styles.badge}>
            <Text style={styles.badgeText}>
              {badge > 99 ? '99+' : badge}
            </Text>
          </View>
        )}
      </View>
      <Text
        style={[
          styles.tabLabel,
          focused && styles.tabLabelFocused,
        ]}
      >
        {label}
      </Text>
    </View>
  );
}

export default function TabsLayout() {
  const pendingCount = useSyncStore((state) => state.pendingCount);
  
  return (
    <Tabs
      screenOptions={{
        headerShown: true,
        headerStyle: {
          backgroundColor: theme.colors.white,
          elevation: 0,
          shadowOpacity: 0,
          borderBottomWidth: 1,
          borderBottomColor: theme.colors.neutral[200],
        },
        headerTitleStyle: {
          fontSize: theme.typography.fontSize.lg,
          fontWeight: '600',
          color: theme.colors.neutral[900],
        },
        tabBarStyle: {
          backgroundColor: theme.colors.white,
          borderTopWidth: 1,
          borderTopColor: theme.colors.neutral[200],
          height: 70,
          paddingBottom: 10,
          paddingTop: 8,
        },
        tabBarShowLabel: false,
        tabBarActiveTintColor: theme.colors.primary[600],
        tabBarInactiveTintColor: theme.colors.neutral[400],
      }}
    >
      <Tabs.Screen
        name="home"
        options={{
          headerTitle: 'ClimaTrak',
          tabBarIcon: ({ focused, color }) => (
            <TabIcon
              icon={<Home size={24} color={color} />}
              focused={focused}
              label="Início"
            />
          ),
        }}
      />
      
      <Tabs.Screen
        name="work-orders"
        options={{
          headerTitle: 'Ordens de Serviço',
          tabBarIcon: ({ focused, color }) => (
            <TabIcon
              icon={<ClipboardList size={24} color={color} />}
              focused={focused}
              label="OS"
              badge={pendingCount}
            />
          ),
        }}
      />
      
      <Tabs.Screen
        name="assets"
        options={{
          headerTitle: 'Ativos',
          tabBarIcon: ({ focused, color }) => (
            <TabIcon
              icon={<Box size={24} color={color} />}
              focused={focused}
              label="Ativos"
            />
          ),
        }}
      />
      
      <Tabs.Screen
        name="alerts"
        options={{
          headerTitle: 'Alertas',
          tabBarIcon: ({ focused, color }) => (
            <TabIcon
              icon={<AlertTriangle size={24} color={color} />}
              focused={focused}
              label="Alertas"
            />
          ),
        }}
      />
      
      <Tabs.Screen
        name="settings"
        options={{
          headerTitle: 'Configurações',
          tabBarIcon: ({ focused, color }) => (
            <TabIcon
              icon={<Settings size={24} color={color} />}
              focused={focused}
              label="Config"
            />
          ),
        }}
      />
    </Tabs>
  );
}

const styles = StyleSheet.create({
  tabIconContainer: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconWrapper: {
    position: 'relative',
  },
  tabLabel: {
    fontSize: 10,
    marginTop: 4,
    color: theme.colors.neutral[400],
  },
  tabLabelFocused: {
    color: theme.colors.primary[600],
    fontWeight: '500',
  },
  badge: {
    position: 'absolute',
    top: -4,
    right: -8,
    minWidth: 16,
    height: 16,
    borderRadius: 8,
    backgroundColor: theme.colors.semantic.error,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 4,
  },
  badgeText: {
    fontSize: 10,
    fontWeight: '600',
    color: theme.colors.white,
  },
});
