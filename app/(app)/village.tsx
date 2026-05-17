import { useEffect, useState } from 'react';
import { View, Text, TouchableOpacity, ScrollView, Alert, Share } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import * as ImagePicker from 'expo-image-picker';
import { useAuth } from '../../hooks/useAuth';
import { supabase } from '../../lib/supabase';
import { Referral } from '../../types';
import {
  ANNUAL_PASS_PRICE_INR,
  REFERRAL_CASH_REWARD_INR,
  REFERRAL_POINTS,
  UPI_ID,
} from '../../lib/config';

const STATUS_STYLE: Record<string, { bg: string; text: string; label: string }> = {
  pending:  { bg: 'bg-sage-orange/20', text: 'text-sage-orange', label: 'Pending' },
  rewarded: { bg: 'bg-sage-green/20',  text: 'text-sage-green',  label: 'Rewarded ✓' },
  void:     { bg: 'bg-red-500/20',     text: 'text-red-400',     label: 'Void' },
};

export default function VillageScreen() {
  const { user, refreshProfile } = useAuth();
  const [referrals, setReferrals] = useState<(Referral & { referred_user: any })[]>([]);
  const [uploading, setUploading] = useState(false);

  useEffect(() => {
    if (!user) return;
    supabase
      .from('referrals')
      .select('*, referred_user:users!referred_id(name, status)')
      .eq('referrer_id', user.id)
      .then(({ data }) => setReferrals(data ?? []));
  }, [user?.id]);

  const rewardedCount = referrals.filter((r) => r.status === 'rewarded').length;
  const totalCash = rewardedCount * REFERRAL_CASH_REWARD_INR;
  const pendingPayout = referrals.filter((r) => r.status === 'rewarded' && !r.cash_paid).length * REFERRAL_CASH_REWARD_INR;

  async function uploadScreenshot() {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      quality: 0.8,
    });
    if (result.canceled || !result.assets[0]) return;
    setUploading(true);
    try {
      const asset = result.assets[0];
      const ext = asset.uri.split('.').pop() ?? 'jpg';
      const path = `payment-screenshots/${user!.id}/screenshot.${ext}`;
      const response = await fetch(asset.uri);
      const blob = await response.blob();
      const { error: uploadError } = await supabase.storage
        .from('uploads')
        .upload(path, blob, { upsert: true, contentType: `image/${ext}` });
      if (uploadError) throw uploadError;
      const { data: { publicUrl } } = supabase.storage.from('uploads').getPublicUrl(path);
      await supabase.from('users').update({ payment_screenshot_url: publicUrl }).eq('id', user!.id);
      await refreshProfile();
      Alert.alert('Done', "Payment screenshot saved. We'll verify shortly.");
    } catch (e: any) {
      Alert.alert('Upload failed', e.message);
    } finally {
      setUploading(false);
    }
  }

  async function shareReferral() {
    const link = `https://sage.app/join?ref=${user?.referral_code}`;
    await Share.share({
      message: `Join me on Sage — the endurance challenge app!\n\nCode: ${user?.referral_code}\n${link}`,
    });
  }

  async function requestPayout() {
    Alert.alert(
      'Request payout',
      `We'll transfer ₹${pendingPayout} within 48 hours via WhatsApp.`,
      [{ text: 'Got it' }]
    );
  }

  return (
    <SafeAreaView className="flex-1 bg-sage-bg">
      <ScrollView className="flex-1" showsVerticalScrollIndicator={false}>
        <View className="px-5 pt-5 pb-3">
          <Text className="text-sage-text text-3xl font-black">Village</Text>
          <Text className="text-sage-muted text-sm mt-1">Your community & membership</Text>
        </View>

        <View className="px-5">
          {/* Annual Pass card */}
          <View className="bg-sage-surface rounded-2xl p-5 mb-4">
            <View className="flex-row justify-between items-start mb-1">
              <Text className="text-sage-text font-black text-lg">Annual Pass</Text>
              <Text className="text-sage-green font-black text-lg">₹{ANNUAL_PASS_PRICE_INR}</Text>
            </View>
            <Text className="text-sage-muted text-sm mb-4">All races. Unlimited sessions. One year.</Text>

            {user?.status === 'active' ? (
              <View className="flex-row justify-between items-center">
                <View className="bg-sage-green/15 px-4 py-2 rounded-full">
                  <Text className="text-sage-green font-black text-sm">ACTIVE ✓</Text>
                </View>
                {user.plan_expires_at && (
                  <Text className="text-sage-muted text-xs">
                    Expires{' '}
                    {new Date(user.plan_expires_at).toLocaleDateString('en-IN', {
                      day: 'numeric',
                      month: 'short',
                      year: 'numeric',
                    })}
                  </Text>
                )}
              </View>
            ) : user?.payment_screenshot_url && user.status === 'pending' ? (
              <View className="bg-sage-green/10 border border-sage-green/25 rounded-xl py-3 items-center">
                <Text className="text-sage-green font-semibold text-sm">Screenshot received ✓</Text>
                <Text className="text-sage-muted text-xs mt-0.5">Verification in progress</Text>
              </View>
            ) : (
              <>
                <View className="bg-[#0a0a0a] rounded-xl p-3 mb-3 items-center">
                  <Text className="text-sage-muted text-xs mb-0.5">UPI ID</Text>
                  <Text className="text-sage-text font-black text-base">{UPI_ID}</Text>
                </View>
                <TouchableOpacity
                  onPress={uploadScreenshot}
                  disabled={uploading}
                  activeOpacity={0.8}
                  className="bg-sage-green rounded-xl py-3 items-center"
                >
                  <Text className="text-black font-black tracking-wide">
                    {uploading ? 'UPLOADING…' : 'UPLOAD PAYMENT SCREENSHOT'}
                  </Text>
                </TouchableOpacity>
              </>
            )}
          </View>

          {/* Referral card */}
          <View className="bg-sage-surface rounded-2xl p-5 mb-4">
            <Text className="text-sage-text font-black text-lg mb-1">Refer & Earn</Text>
            <Text className="text-sage-muted text-sm mb-4">
              Get{' '}
              <Text className="text-sage-green font-bold">₹{REFERRAL_CASH_REWARD_INR} cash</Text>
              {' + '}
              <Text className="text-sage-text font-bold">{REFERRAL_POINTS}pts</Text> for every friend who trains 7 days.
            </Text>

            {/* Code + share */}
            <View className="bg-[#0a0a0a] rounded-xl px-4 py-3 flex-row justify-between items-center mb-4">
              <View>
                <Text className="text-sage-muted text-[10px] font-bold tracking-widest uppercase mb-0.5">
                  Your code
                </Text>
                <Text className="text-sage-text font-black text-xl">{user?.referral_code}</Text>
              </View>
              <TouchableOpacity
                onPress={shareReferral}
                activeOpacity={0.8}
                className="bg-sage-green px-5 py-2 rounded-xl"
              >
                <Text className="text-black font-black text-sm">SHARE</Text>
              </TouchableOpacity>
            </View>

            {/* Earnings summary */}
            {referrals.length > 0 && (
              <>
                <View className="flex-row gap-3 mb-4">
                  <View className="flex-1 bg-[#0a0a0a] rounded-xl p-3 items-center">
                    <Text className="text-sage-text font-black text-xl">{referrals.length}</Text>
                    <Text className="text-sage-muted text-[10px] font-bold tracking-widest uppercase mt-0.5">
                      Invited
                    </Text>
                  </View>
                  <View className="flex-1 bg-[#0a0a0a] rounded-xl p-3 items-center">
                    <Text className="text-sage-green font-black text-xl">₹{totalCash}</Text>
                    <Text className="text-sage-muted text-[10px] font-bold tracking-widest uppercase mt-0.5">
                      Earned
                    </Text>
                  </View>
                </View>

                {/* Referral list */}
                {referrals.map((r) => {
                  const s = STATUS_STYLE[r.status] ?? STATUS_STYLE.pending;
                  return (
                    <View
                      key={r.id}
                      className="flex-row justify-between items-center py-2.5 border-b border-[#141414]"
                    >
                      <Text className="text-sage-text text-sm font-semibold">
                        {r.referred_user?.name ?? 'Friend'}
                      </Text>
                      <View className={`${s.bg} px-2.5 py-1 rounded-full`}>
                        <Text className={`${s.text} text-xs font-bold`}>{s.label}</Text>
                      </View>
                    </View>
                  );
                })}

                {pendingPayout > 0 && (
                  <TouchableOpacity
                    onPress={requestPayout}
                    activeOpacity={0.8}
                    className="mt-4 bg-sage-orange/20 border border-sage-orange/30 rounded-xl py-3 items-center"
                  >
                    <Text className="text-sage-orange font-black">REQUEST ₹{pendingPayout} PAYOUT</Text>
                  </TouchableOpacity>
                )}
              </>
            )}
          </View>
        </View>

        <View className="h-8" />
      </ScrollView>
    </SafeAreaView>
  );
}
