import * as Device from 'expo-device';
import { LinearGradient } from 'expo-linear-gradient';
import * as Linking from 'expo-linking';
import { useNavigation } from 'expo-router';
import {
  AlertCircle,
  ArrowLeft,
  CheckCircle,
  Key,
  MessageCircle,
} from 'lucide-react-native';
import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Platform,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import {
  ACTIVATION_PLANS,
  getCurrentActivation,
  getInstallationDate,
  getTrialStatus,
  validateAndActivateKey,
} from '../lib/db';

export default function ActivationScreen() {
  const navigation = useNavigation();
  const [loading, setLoading] = useState(true);
  const [activationKey, setActivationKey] = useState('');
  const [activating, setActivating] = useState(false);
  const [activationStatus, setActivationStatus] = useState<any>(null);
  const [trialStatus, setTrialStatus] = useState<any>(null);
  const [installationDate, setInstallationDate] = useState<Date | null>(null);
  const [selectedPlan, setSelectedPlan] = useState<any>(null);
  const [generatedKey, setGeneratedKey] = useState('');
  const [showKeyModal, setShowKeyModal] = useState(false);
  const [contactModalVisible, setContactModalVisible] = useState(false);
  const [contactName, setContactName] = useState('');
  const [contactPhone, setContactPhone] = useState('');
  const [contactEmail, setContactEmail] = useState('');
  const [contactMessage, setContactMessage] = useState('');

  // Device info
  const [deviceId, setDeviceId] = useState('');
  const [deviceName, setDeviceName] = useState('');

  useEffect(() => {
    loadStatus();
    getDeviceInfo();
  }, []);

  const getDeviceInfo = async () => {
    let id = 'unknown-device';
    let name = 'Unknown Device';

    if (Platform.OS === 'web') {
      id = 'web-device-' + Math.random().toString(36).substring(7);
      name = 'Web Browser';
    } else {
      try {
        const deviceType = await Device.getDeviceTypeAsync();
        name = (await Device.modelName) || 'Mobile Device';
        id =
          (await Device.osInternalBuildId) ||
          Device.modelName ||
          'unknown-device';
      } catch (error) {
        console.error('Error getting device info:', error);
        id = 'unknown-device-' + Date.now();
        name = 'Mobile Device';
      }
    }

    setDeviceId(id);
    setDeviceName(name);
  };

  const loadStatus = async () => {
    setLoading(true);
    const activation = getCurrentActivation();
    const trial = getTrialStatus();
    const installDate = getInstallationDate();
    setActivationStatus(activation);
    setTrialStatus(trial);
    setInstallationDate(installDate);
    setLoading(false);
  };

  const handleActivateKey = async () => {
    if (!activationKey.trim()) {
      Alert.alert('Error', 'Please enter activation key');
      return;
    }

    setActivating(true);
    try {
      const result = validateAndActivateKey(
        activationKey.trim().toUpperCase(),
        deviceId,
        deviceName,
      );

      if (result.success) {
        Alert.alert('Success', result.message);
        setActivationKey('');
        await loadStatus();
      } else {
        Alert.alert('Activation Failed', result.message);
      }
    } catch (error) {
      console.error('Activation error:', error);
      Alert.alert('Error', 'Failed to activate key. Please try again.');
    } finally {
      setActivating(false);
    }
  };

  const requestViaWhatsApp = () => {
    const message =
      `*Bill-Karo Activation Request*\n\n` +
      `*Device ID:* ${deviceId}\n` +
      `*Device Name:* ${deviceName}\n` +
      `*Platform:* ${Platform.OS}\n` +
      `*Trial Status:* ${trialStatus?.isActive ? `${trialStatus.daysLeft} days remaining` : 'Expired'}\n\n` +
      `Please send me an activation key for Bill-Karo.`;

    const url = `whatsapp://send?phone=919359789199&text=${encodeURIComponent(message)}`;
    Linking.openURL(url).catch(() => {
      Alert.alert('Error', 'WhatsApp is not installed');
    });
  };

  if (loading) {
    return (
      <View style={styles.container}>
        <StatusBar backgroundColor="#0F172A" barStyle="light-content" />
        <LinearGradient
          colors={['#0F172A', '#1E3A8A', '#1D4ED8']}
          style={styles.header}
        >
          <View style={styles.headerContent}>
            <TouchableOpacity
              style={styles.backButton}
              onPress={() => navigation.goBack()}
            >
              <ArrowLeft size={24} color="#FFF" />
            </TouchableOpacity>
            <Text style={styles.headerTitle}>License Activation</Text>
            <View style={{ width: 40 }} />
          </View>
        </LinearGradient>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#3B82F6" />
          <Text style={styles.loadingText}>Loading...</Text>
        </View>
      </View>
    );
  }

  const isAccessible = activationStatus?.isValid || trialStatus?.isActive;
  const daysLeft = activationStatus?.daysLeft || trialStatus?.daysLeft || 0;

  return (
    <View style={styles.container}>
      <StatusBar backgroundColor="#0F172A" barStyle="light-content" />

      <LinearGradient
        colors={['#0F172A', '#1E3A8A', '#1D4ED8']}
        style={styles.header}
      >
        <View style={styles.headerContent}>
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => navigation.goBack()}
          >
            <ArrowLeft size={24} color="#FFF" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>License Activation</Text>
          <View style={{ width: 40 }} />
        </View>
      </LinearGradient>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {/* Status Card */}
        <View style={styles.statusCard}>
          <View style={styles.statusIconContainer}>
            {activationStatus?.isValid ? (
              <CheckCircle size={48} color="#10B981" />
            ) : trialStatus?.isActive ? (
              <AlertCircle size={48} color="#F59E0B" />
            ) : (
              <AlertCircle size={48} color="#EF4444" />
            )}
          </View>
          <Text style={styles.statusTitle}>
            {activationStatus?.isValid
              ? 'Active License'
              : trialStatus?.isActive
                ? 'Trial Period'
                : 'License Expired'}
          </Text>
          {activationStatus?.isValid ? (
            <Text style={styles.statusText}>Plan: {activationStatus.plan}</Text>
          ) : trialStatus?.isActive ? (
            <Text style={styles.statusText}>
              Free Trial - {trialStatus.daysLeft} days remaining
            </Text>
          ) : (
            <Text style={styles.statusText}>
              Your trial has ended. Please purchase a license.
            </Text>
          )}
          {installationDate && (
            <Text style={styles.statusSubtext}>
              Installed on: {installationDate.toLocaleDateString()}
            </Text>
          )}
          {activationStatus?.endDate && (
            <Text style={styles.statusSubtext}>
              Valid until: {activationStatus.endDate}
            </Text>
          )}
        </View>

        {/* Activation Section */}
        {!activationStatus?.isValid && (
          <View style={styles.activationCard}>
            <Text style={styles.sectionTitle}>Activate License</Text>
            <Text style={styles.sectionSubtitle}>
              Enter your activation key to unlock full features
            </Text>

            <View style={styles.inputContainer}>
              <Key size={20} color="#64748B" />
              <TextInput
                style={styles.input}
                placeholder="Enter activation key (e.g., MTH-XXXXXX-XXXXXX)"
                placeholderTextColor="#94A3B8"
                value={activationKey}
                onChangeText={setActivationKey}
                autoCapitalize="characters"
                autoCorrect={false}
              />
            </View>

            <TouchableOpacity
              style={[
                styles.activateButton,
                activating && styles.disabledButton,
              ]}
              onPress={handleActivateKey}
              disabled={activating}
            >
              <LinearGradient
                colors={['#3B82F6', '#1D4ED8']}
                style={styles.activateGradient}
              >
                {activating ? (
                  <ActivityIndicator color="#FFF" size="small" />
                ) : (
                  <Text style={styles.activateButtonText}>Activate Now</Text>
                )}
              </LinearGradient>
            </TouchableOpacity>
          </View>
        )}

        {/* Request via WhatsApp */}
        <View style={styles.requestCard}>
          <Text style={styles.sectionTitle}>Need an Activation Key?</Text>
          <Text style={styles.sectionSubtitle}>
            Click below to request an activation key via WhatsApp. Our support
            team will assist you.
          </Text>

          <TouchableOpacity
            style={styles.whatsappButton}
            onPress={requestViaWhatsApp}
          >
            <LinearGradient
              colors={['#25D366', '#128C7E']}
              style={styles.whatsappGradient}
            >
              <MessageCircle size={24} color="#FFF" />
              <View style={styles.whatsappTextContainer}>
                <Text style={styles.whatsappTitle}>Request via WhatsApp</Text>
                <Text style={styles.whatsappSubtitle}>
                  Click to message our support team
                </Text>
              </View>
            </LinearGradient>
          </TouchableOpacity>

          <View style={styles.contactInfo}>
            <Text style={styles.contactText}>Or contact us directly:</Text>
            <Text style={styles.contactNumber}>📞 +91 9359789199</Text>
            <Text style={styles.contactEmail}>✉️ billkarosales@gmail.com</Text>
          </View>
        </View>

        {/* Plans Info */}
        <View style={styles.plansCard}>
          <Text style={styles.sectionTitle}>Available Plans</Text>
          <View style={styles.plansList}>
            {ACTIVATION_PLANS.map((plan) => (
              <View key={plan.id} style={styles.planItem}>
                <View>
                  <Text style={styles.planName}>{plan.planName}</Text>
                  <Text style={styles.planDuration}>
                    Valid for {plan.duration} days
                  </Text>
                </View>
                <Text style={styles.planPrice}>₹{plan.price}</Text>
              </View>
            ))}
          </View>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F1F5F9' },
  header: {
    paddingTop: Platform.OS === 'ios' ? 58 : 44,
    paddingBottom: 20,
    borderBottomLeftRadius: 32,
    borderBottomRightRadius: 32,
    elevation: 12,
    shadowColor: '#1E3A8A',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.35,
    shadowRadius: 20,
  },
  headerContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
  },
  backButton: {
    padding: 8,
    backgroundColor: 'rgba(255,255,255,0.15)',
    borderRadius: 12,
  },
  headerTitle: { fontSize: 20, fontWeight: '700', color: '#FFF' },
  content: { flex: 1, padding: 20 },
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  loadingText: { marginTop: 12, fontSize: 14, color: '#64748B' },

  statusCard: {
    backgroundColor: '#FFF',
    borderRadius: 20,
    padding: 20,
    alignItems: 'center',
    marginBottom: 20,
    borderWidth: 1,
    borderColor: '#F1F5F9',
    shadowColor: '#94A3B8',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 3,
  },
  statusIconContainer: { marginBottom: 12 },
  statusTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#0F172A',
    marginBottom: 4,
  },
  statusText: { fontSize: 14, color: '#64748B', marginBottom: 2 },
  statusSubtext: { fontSize: 12, color: '#94A3B8' },

  activationCard: {
    backgroundColor: '#FFF',
    borderRadius: 20,
    padding: 20,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: '#F1F5F9',
    shadowColor: '#94A3B8',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 3,
  },
  requestCard: {
    backgroundColor: '#FFF',
    borderRadius: 20,
    padding: 20,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: '#F1F5F9',
    shadowColor: '#94A3B8',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 3,
  },
  plansCard: {
    backgroundColor: '#FFF',
    borderRadius: 20,
    padding: 20,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: '#F1F5F9',
    shadowColor: '#94A3B8',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 3,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#0F172A',
    marginBottom: 4,
  },
  sectionSubtitle: { fontSize: 13, color: '#64748B', marginBottom: 16 },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F8FAFC',
    borderRadius: 12,
    paddingHorizontal: 14,
    borderWidth: 1.5,
    borderColor: '#E2E8F0',
    marginBottom: 16,
  },
  input: {
    flex: 1,
    height: 48,
    fontSize: 14,
    color: '#0F172A',
    marginLeft: 10,
  },
  activateButton: { borderRadius: 12, overflow: 'hidden' },
  activateGradient: { paddingVertical: 14, alignItems: 'center' },
  activateButtonText: { color: '#FFF', fontSize: 16, fontWeight: '600' },
  disabledButton: { opacity: 0.6 },

  whatsappButton: { borderRadius: 12, overflow: 'hidden', marginBottom: 16 },
  whatsappGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    gap: 12,
  },
  whatsappTextContainer: { flex: 1 },
  whatsappTitle: { fontSize: 16, fontWeight: '700', color: '#FFF' },
  whatsappSubtitle: { fontSize: 12, color: 'rgba(255,255,255,0.9)' },

  contactInfo: { alignItems: 'center', paddingVertical: 12 },
  contactText: { fontSize: 12, color: '#64748B', marginBottom: 8 },
  contactNumber: {
    fontSize: 14,
    fontWeight: '600',
    color: '#0F172A',
    marginBottom: 4,
  },
  contactEmail: { fontSize: 12, color: '#3B82F6' },

  plansList: { gap: 8 },
  planItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#F8FAFC',
    borderRadius: 12,
    padding: 12,
  },
  planName: { fontSize: 14, fontWeight: '600', color: '#0F172A' },
  planDuration: { fontSize: 11, color: '#64748B' },
  planPrice: { fontSize: 16, fontWeight: '700', color: '#3B82F6' },
});
