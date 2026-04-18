/**
 * SprintAppNavigator — wires the 6 screens shipped in the 2026-04-17/18
 * sprint into a role-aware navigation tree.
 *
 * Separate from the existing MainNavigator so it can be dropped into an
 * app shell without disturbing the legacy licenses/payments navigator.
 *
 * Structure:
 *   Root (native-stack)
 *     • NafathLogin           — shown when not authed
 *     • ParentTabs            — parent/guardian role
 *         - MyChildren
 *         - Telehealth
 *         - Chat → ChatThread
 *     • TherapistTabs         — therapist/specialist role
 *         - Workbench
 *         - Telehealth
 *         - Chat → ChatThread
 *
 * Host app can embed this as a sub-navigator, or use it as the root.
 */

import React, { useCallback, useEffect, useState } from 'react';
import { View, Text, ActivityIndicator, StyleSheet } from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import * as SecureStore from 'expo-secure-store';

import MyChildrenScreen from '../screens/parent/MyChildrenScreen';
import TherapistWorkbenchScreen from '../screens/therapist/TherapistWorkbenchScreen';
import TelehealthScreen from '../screens/telehealth/TelehealthScreen';
import ChatListScreen from '../screens/chat/ChatListScreen';
import ChatThreadScreen from '../screens/chat/ChatThreadScreen';
import NafathLoginScreen from '../screens/auth/NafathLoginScreen';

type ParentTabsParamList = {
  MyChildren: undefined;
  Telehealth: undefined;
  ChatList: undefined;
};

type TherapistTabsParamList = {
  Workbench: undefined;
  Telehealth: undefined;
  ChatList: undefined;
};

type RootParamList = {
  NafathLogin: undefined;
  ParentTabs: undefined;
  TherapistTabs: undefined;
  ChatThread: { conversationId: string; otherName?: string };
};

type SessionUser = { id: string; email: string; role: string; name?: string };

const RootStack = createNativeStackNavigator<RootParamList>();
const ParentTab = createBottomTabNavigator<ParentTabsParamList>();
const TherapistTab = createBottomTabNavigator<TherapistTabsParamList>();

function isParent(role: string) {
  return ['parent', 'guardian'].includes((role || '').toLowerCase());
}
function isTherapist(role: string) {
  return ['therapist', 'specialist', 'clinical_supervisor'].includes((role || '').toLowerCase());
}

// ── Tab navigators ───────────────────────────────────────────────────────
function ParentTabs({ navigation }: any) {
  return (
    <ParentTab.Navigator
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: '#1976d2',
        tabBarLabelStyle: { fontSize: 11, fontWeight: '600' },
      }}
    >
      <ParentTab.Screen
        name="MyChildren"
        component={MyChildrenScreen as any}
        options={{ tabBarLabel: 'أطفالي' }}
      />
      <ParentTab.Screen
        name="Telehealth"
        component={TelehealthScreen as any}
        options={{ tabBarLabel: 'جلسات الفيديو' }}
      />
      <ParentTab.Screen
        name="ChatList"
        options={{ tabBarLabel: 'الرسائل' }}
      >
        {() => (
          <ChatListScreen
            onOpenConversation={id =>
              navigation.navigate('ChatThread', { conversationId: id })
            }
          />
        )}
      </ParentTab.Screen>
    </ParentTab.Navigator>
  );
}

function TherapistTabs({ navigation }: any) {
  return (
    <TherapistTab.Navigator
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: '#7c3aed',
        tabBarLabelStyle: { fontSize: 11, fontWeight: '600' },
      }}
    >
      <TherapistTab.Screen
        name="Workbench"
        component={TherapistWorkbenchScreen as any}
        options={{ tabBarLabel: 'منصّتي' }}
      />
      <TherapistTab.Screen
        name="Telehealth"
        component={TelehealthScreen as any}
        options={{ tabBarLabel: 'جلسات الفيديو' }}
      />
      <TherapistTab.Screen
        name="ChatList"
        options={{ tabBarLabel: 'الرسائل' }}
      >
        {() => (
          <ChatListScreen
            onOpenConversation={id =>
              navigation.navigate('ChatThread', { conversationId: id })
            }
          />
        )}
      </TherapistTab.Screen>
    </TherapistTab.Navigator>
  );
}

// ── Root navigator ───────────────────────────────────────────────────────
export default function SprintAppNavigator({
  embedded = false,
}: {
  /** Set true when rendering inside an existing NavigationContainer */
  embedded?: boolean;
}) {
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState<SessionUser | null>(null);

  const loadSession = useCallback(async () => {
    try {
      const token = await SecureStore.getItemAsync('authToken');
      const raw = await SecureStore.getItemAsync('currentUser');
      if (token && raw) {
        setUser(JSON.parse(raw));
      } else {
        setUser(null);
      }
    } catch {
      setUser(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadSession();
  }, [loadSession]);

  const initialRoute: keyof RootParamList = !user
    ? 'NafathLogin'
    : isParent(user.role)
      ? 'ParentTabs'
      : isTherapist(user.role)
        ? 'TherapistTabs'
        : 'ParentTabs'; // admin/default falls back to parent view

  const tree = (
    <RootStack.Navigator
      key={initialRoute /* force re-render on login */}
      initialRouteName={initialRoute}
      screenOptions={{ headerShown: false }}
    >
      <RootStack.Screen name="NafathLogin">
        {() => (
          <NafathLoginScreen
            onSuccess={u => {
              setUser(u);
            }}
          />
        )}
      </RootStack.Screen>
      <RootStack.Screen name="ParentTabs" component={ParentTabs} />
      <RootStack.Screen name="TherapistTabs" component={TherapistTabs} />
      <RootStack.Screen
        name="ChatThread"
        options={{
          presentation: 'card',
          animation: 'slide_from_left', // RTL
        }}
      >
        {({ route, navigation }: any) => (
          <ChatThreadScreen
            conversationId={route.params?.conversationId}
            otherName={route.params?.otherName}
            onBack={() => navigation.goBack()}
          />
        )}
      </RootStack.Screen>
    </RootStack.Navigator>
  );

  if (loading) {
    return (
      <View style={styles.splash}>
        <ActivityIndicator size="large" color="#1976d2" />
        <Text style={styles.splashText}>جاري التحميل…</Text>
      </View>
    );
  }

  return embedded ? tree : <NavigationContainer>{tree}</NavigationContainer>;
}

export { ParentTabs, TherapistTabs, isParent, isTherapist };

const styles = StyleSheet.create({
  splash: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#f0fdf4',
  },
  splashText: { marginTop: 12, color: '#6b7280' },
});
