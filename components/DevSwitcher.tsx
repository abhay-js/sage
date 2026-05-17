import { useState } from 'react';
import {
  View, Text, TouchableOpacity, Modal, ActivityIndicator, Alert,
} from 'react-native';
import { supabase } from '../lib/supabase';

const TEST_ACCOUNTS = [
  {
    label: 'Athlete 1',
    sub: 'Active member · runner',
    email: 'dev.user1@sage.test',
    password: 'devuser1sage',
    color: '#4ade80',
  },
  {
    label: 'Athlete 2',
    sub: 'Active member · cyclist',
    email: 'dev.user2@sage.test',
    password: 'devuser2sage',
    color: '#60a5fa',
  },
  {
    label: 'Athlete 3',
    sub: 'Active member · triathlete',
    email: 'dev.user3@sage.test',
    password: 'devuser3sage',
    color: '#f472b6',
  },
  {
    label: 'Admin',
    sub: 'Full dashboard access',
    email: 'dev.admin@sage.test',
    password: 'devadminsage',
    color: '#f59e0b',
  },
];

export function DevSwitcher() {
  // Only renders in development builds — zero cost in production
  if (!__DEV__) return null;

  const [visible, setVisible] = useState(false);
  const [switching, setSwitching] = useState<string | null>(null);

  async function switchTo(acc: typeof TEST_ACCOUNTS[0]) {
    setSwitching(acc.email);
    await supabase.auth.signOut();
    const { error } = await supabase.auth.signInWithPassword({
      email: acc.email,
      password: acc.password,
    });
    setSwitching(null);
    setVisible(false);
    if (error) {
      Alert.alert(
        'Account not found',
        `${error.message}\n\nRun the SQL in supabase/dev-users.sql to create test accounts.`,
      );
    }
  }

  return (
    <>
      {/* Floating pill — bottom-left, above tab bar */}
      <TouchableOpacity
        onPress={() => setVisible(true)}
        activeOpacity={0.8}
        style={{
          position: 'absolute',
          bottom: 100,
          left: 14,
          backgroundColor: '#7c3aed',
          borderRadius: 20,
          paddingHorizontal: 11,
          paddingVertical: 5,
          zIndex: 9999,
          shadowColor: '#7c3aed',
          shadowOpacity: 0.6,
          shadowRadius: 8,
          shadowOffset: { width: 0, height: 2 },
        }}
      >
        <Text style={{ color: '#fff', fontSize: 10, fontWeight: '900', letterSpacing: 1 }}>
          DEV
        </Text>
      </TouchableOpacity>

      {/* Bottom-sheet modal */}
      <Modal
        visible={visible}
        transparent
        animationType="slide"
        onRequestClose={() => setVisible(false)}
      >
        <TouchableOpacity
          style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.65)', justifyContent: 'flex-end' }}
          activeOpacity={1}
          onPress={() => setVisible(false)}
        >
          <TouchableOpacity activeOpacity={1}>
            <View
              style={{
                backgroundColor: '#111',
                borderTopLeftRadius: 28,
                borderTopRightRadius: 28,
                paddingTop: 12,
                paddingHorizontal: 20,
                paddingBottom: 48,
              }}
            >
              {/* Handle */}
              <View
                style={{
                  width: 36, height: 4, borderRadius: 2,
                  backgroundColor: '#333', alignSelf: 'center', marginBottom: 20,
                }}
              />

              <Text style={{ color: '#7c3aed', fontSize: 10, fontWeight: '900', letterSpacing: 2, marginBottom: 16 }}>
                DEV · SWITCH ACCOUNT
              </Text>

              {TEST_ACCOUNTS.map((acc) => {
                const isLoading = switching === acc.email;
                return (
                  <TouchableOpacity
                    key={acc.email}
                    onPress={() => switchTo(acc)}
                    disabled={switching !== null}
                    activeOpacity={0.8}
                    style={{
                      backgroundColor: '#1a1a1a',
                      borderRadius: 18,
                      padding: 16,
                      marginBottom: 10,
                      flexDirection: 'row',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      opacity: switching !== null && !isLoading ? 0.4 : 1,
                    }}
                  >
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
                      <View
                        style={{
                          width: 40, height: 40, borderRadius: 20,
                          backgroundColor: acc.color + '22',
                          alignItems: 'center', justifyContent: 'center',
                        }}
                      >
                        <Text style={{ color: acc.color, fontWeight: '900', fontSize: 14 }}>
                          {acc.label[0]}
                        </Text>
                      </View>
                      <View>
                        <Text style={{ color: '#f5f5f5', fontWeight: '700', fontSize: 15 }}>
                          {acc.label}
                        </Text>
                        <Text style={{ color: '#525252', fontSize: 12, marginTop: 1 }}>
                          {acc.sub}
                        </Text>
                      </View>
                    </View>

                    {isLoading ? (
                      <ActivityIndicator size="small" color={acc.color} />
                    ) : (
                      <Text style={{ color: acc.color, fontWeight: '800', fontSize: 12 }}>
                        LOGIN →
                      </Text>
                    )}
                  </TouchableOpacity>
                );
              })}

              <TouchableOpacity
                onPress={() => setVisible(false)}
                style={{ alignItems: 'center', paddingVertical: 14 }}
              >
                <Text style={{ color: '#525252', fontWeight: '700', fontSize: 13 }}>Dismiss</Text>
              </TouchableOpacity>
            </View>
          </TouchableOpacity>
        </TouchableOpacity>
      </Modal>
    </>
  );
}
