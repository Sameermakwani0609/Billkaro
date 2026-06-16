import * as FileSystem from 'expo-file-system/legacy';
import { LinearGradient } from 'expo-linear-gradient';
import { useNavigation } from 'expo-router';
import * as Sharing from 'expo-sharing';
import {
  AlertTriangle,
  ArrowLeft,
  Cloud,
  Download,
  Edit,
  FolderOpen,
  Heart,
  Info,
  Key,
  Mail,
  Phone,
  Share2,
  Shield,
  Star,
  Store,
  Upload,
  X,
  Zap,
} from 'lucide-react-native';
import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Linking,
  Modal,
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
  AppSettings,
  backupDatabase,
  getAppSettings,
  getCurrentActivation,
  getTrialStatus,
  restoreDatabase,
  saveAppSettings,
} from '../lib/db';

// ─── Safe DocumentPicker import ────────────────────────────────────────────────
import * as DocumentPickerModule from 'expo-document-picker';
const DocumentPicker = Platform.OS !== 'web' ? DocumentPickerModule : null;

export default function Settings() {
  const navigation = useNavigation();
  const [loading, setLoading] = useState(true);
  const [modalVisible, setModalVisible] = useState(false);
  const [aboutModalVisible, setAboutModalVisible] = useState(false);
  const [backupModalVisible, setBackupModalVisible] = useState(false);
  const [restoreModalVisible, setRestoreModalVisible] = useState(false);
  const [backupInProgress, setBackupInProgress] = useState(false);
  const [restoreInProgress, setRestoreInProgress] = useState(false);
  const [activationStatus, setActivationStatus] = useState<any>(null);
  const [trialStatus, setTrialStatus] = useState<any>(null);
  const [shopSettings, setShopSettings] = useState<AppSettings>({
    shopName: '',
    shopAddress: '',
    shopPhone: '',
    shopEmail: '',
    topTagline: '',
    bottomTagline: '',
  });
  const [formData, setFormData] = useState<AppSettings>(shopSettings);

  // Support contact information
  const SUPPORT_PHONE = '9359789199';
  const SUPPORT_EMAIL = 'billkarosales@gmail.com';

  // BillKaro folder path
  const BILLKARO_DIR = `${FileSystem.documentDirectory}BillKaro/`;

  useEffect(() => {
    loadSettings();
    createBillKaroFolder();
    loadLicenseStatus();
  }, []);

  const loadLicenseStatus = () => {
    const activation = getCurrentActivation();
    const trial = getTrialStatus();
    setActivationStatus(activation);
    setTrialStatus(trial);
  };

  const createBillKaroFolder = async () => {
    try {
      const dirInfo = await FileSystem.getInfoAsync(BILLKARO_DIR);
      if (!dirInfo.exists) {
        await FileSystem.makeDirectoryAsync(BILLKARO_DIR, {
          intermediates: true,
        });
      }
    } catch (error) {
      console.error('Error creating BillKaro folder:', error);
    }
  };

  const loadSettings = async () => {
    try {
      setLoading(true);
      const settings = await getAppSettings();
      setShopSettings(settings);
      setFormData(settings);
    } catch (error) {
      console.error('Error loading settings:', error);
      Alert.alert('Error', 'Failed to load shop settings');
    } finally {
      setLoading(false);
    }
  };

  const saveSettings = async () => {
    try {
      await saveAppSettings(formData);
      setShopSettings(formData);
      setModalVisible(false);
      Alert.alert('Success', 'Shop details updated successfully!');
    } catch (error) {
      console.error('Error saving settings:', error);
      Alert.alert('Error', 'Failed to save settings');
    }
  };

  const resetForm = () => setFormData(shopSettings);

  const handleCallSupport = () => {
    Linking.openURL(`tel:${SUPPORT_PHONE}`);
  };

  const handleEmailSupport = () => {
    Linking.openURL(`mailto:${SUPPORT_EMAIL}`);
  };

  const buildBackupFileName = () => {
    const now = new Date();
    const pad = (n: number) => String(n).padStart(2, '0');
    return `Backup_${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(
      now.getDate(),
    )}_${pad(now.getHours())}-${pad(now.getMinutes())}-${pad(
      now.getSeconds(),
    )}.json`;
  };

  const createLocalBackup = async (): Promise<string> => {
    const fileName = buildBackupFileName();
    const result = await backupDatabase();

    const backupContent = await FileSystem.readAsStringAsync(result, {
      encoding: FileSystem.EncodingType.UTF8,
    });

    const filePath = `${BILLKARO_DIR}${fileName}`;
    await FileSystem.writeAsStringAsync(filePath, backupContent, {
      encoding: FileSystem.EncodingType.UTF8,
    });

    return filePath;
  };

  // Backup Option 1: Share File (WhatsApp, Email, etc.)
  const handleShareBackup = async () => {
    try {
      setBackupInProgress(true);

      if (Platform.OS === 'web') {
        const fileName = buildBackupFileName();
        const result = await backupDatabase();
        const a = document.createElement('a');
        a.href = result;
        a.download = fileName;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        setTimeout(() => URL.revokeObjectURL(result), 100);
        Alert.alert('Success', `Backup downloaded as ${fileName}!`);
        setBackupModalVisible(false);
        return;
      }

      const filePath = await createLocalBackup();
      const fileName = filePath.split('/').pop();

      const isSharingAvailable = await Sharing.isAvailableAsync();

      if (!isSharingAvailable) {
        Alert.alert('Error', 'Sharing is not available on this device');
        return;
      }

      await Sharing.shareAsync(filePath, {
        mimeType: 'application/json',
        dialogTitle: 'Share Backup File',
      });

      Alert.alert(
        '✅ Backup Shared!',
        `Backup file "${fileName}" is ready to share via WhatsApp, Email, or any other app.`,
        [{ text: 'OK', onPress: () => setBackupModalVisible(false) }],
      );
    } catch (error) {
      console.error('Share backup error:', error);
      Alert.alert('Error', 'Failed to share backup file');
    } finally {
      setBackupInProgress(false);
    }
  };

  // Backup Option 2: Direct Upload to Google Drive
  const handleUploadToGoogleDrive = async () => {
    try {
      setBackupInProgress(true);

      const filePath = await createLocalBackup();
      const fileName = filePath.split('/').pop();

      const isSharingAvailable = await Sharing.isAvailableAsync();

      if (!isSharingAvailable) {
        Alert.alert('Error', 'Sharing is not available on this device');
        return;
      }

      await Sharing.shareAsync(filePath, {
        mimeType: 'application/json',
        dialogTitle: 'Save to Google Drive',
      });

      Alert.alert(
        '📤 Google Drive Upload',
        `Select "Google Drive" from the sharing options to save your backup.\n\n📁 File: ${fileName}`,
        [{ text: 'OK', onPress: () => setBackupModalVisible(false) }],
      );
    } catch (error) {
      console.error('Google Drive upload error:', error);
      Alert.alert('Error', 'Failed to open sharing options. Please try again.');
    } finally {
      setBackupInProgress(false);
    }
  };

  const showBackupLocation = async () => {
    Alert.alert(
      '📁 Backup Location',
      `Your backups are temporarily saved in:\n\n${BILLKARO_DIR}\n\n📱 How to find your backups:\n1. Open any File Manager app\n2. Navigate to: Internal Storage\n3. Go to: Android/data/host.exp.exponent/files/BillKaro/\n\n📝 Files are named: Backup_YYYY-MM-DD_HH-MM-SS.json\n\n💡 Tip: Use "Share File" to save backups permanently.`,
      [{ text: 'OK' }],
    );
  };

  // Restore Option 1: Select from File Manager
  const handleRestoreFromFileManager = async () => {
    setRestoreModalVisible(false);

    if (Platform.OS === 'web') {
      handleRestoreWeb();
      return;
    }

    if (!DocumentPicker) {
      Alert.alert(
        'Error',
        'Document picker is not available on this platform.',
      );
      setRestoreInProgress(false);
      return;
    }

    try {
      setRestoreInProgress(true);

      const pickerResult = await DocumentPicker.getDocumentAsync({
        type: ['application/json', 'application/octet-stream', '*/*'],
        copyToCacheDirectory: true,
      });

      if (pickerResult.canceled) {
        setRestoreInProgress(false);
        return;
      }

      const assets = (pickerResult as any).assets;
      const fileUri = assets?.[0]?.uri;
      const fileName = assets?.[0]?.name || 'backup file';

      if (!fileUri) {
        Alert.alert('Error', 'Could not read the selected file.');
        setRestoreInProgress(false);
        return;
      }

      confirmAndRestore(fileUri, fileName);
    } catch (err) {
      console.error('File picker error:', err);
      Alert.alert('Error', 'Failed to open file picker.');
      setRestoreInProgress(false);
    }
  };

  // Restore Option 2: Restore from Google Drive
  const handleRestoreFromGoogleDrive = async () => {
    setRestoreModalVisible(false);

    if (Platform.OS === 'web') {
      handleRestoreWeb();
      return;
    }

    if (!DocumentPicker) {
      Alert.alert(
        'Error',
        'Document picker is not available on this platform.',
      );
      setRestoreInProgress(false);
      return;
    }

    try {
      setRestoreInProgress(true);

      Alert.alert(
        '📤 Select from Google Drive',
        'In the file picker, tap the menu (☰) and select "Google Drive" to browse your Drive files.',
        [
          {
            text: 'OK',
            onPress: async () => {
              const pickerResult = await DocumentPicker.getDocumentAsync({
                type: ['application/json', 'application/octet-stream', '*/*'],
                copyToCacheDirectory: true,
              });

              if (pickerResult.canceled) {
                setRestoreInProgress(false);
                return;
              }

              const assets = (pickerResult as any).assets;
              const fileUri = assets?.[0]?.uri;
              const fileName = assets?.[0]?.name || 'backup file';

              if (!fileUri) {
                Alert.alert('Error', 'Could not read the selected file.');
                setRestoreInProgress(false);
                return;
              }

              confirmAndRestore(fileUri, fileName);
            },
          },
          {
            text: 'Cancel',
            onPress: () => setRestoreInProgress(false),
            style: 'cancel',
          },
        ],
      );
    } catch (err) {
      console.error('Drive picker error:', err);
      Alert.alert('Error', 'Failed to open Google Drive picker.');
      setRestoreInProgress(false);
    }
  };

  const resolveToReadableUri = async (uri: string): Promise<string> => {
    if (
      uri.startsWith(FileSystem.cacheDirectory || 'file://') ||
      uri.startsWith(FileSystem.documentDirectory || 'file://')
    ) {
      return uri;
    }

    const cacheDir = FileSystem.cacheDirectory || '';
    const destPath = `${cacheDir}restore_tmp_${Date.now()}.json`;

    await FileSystem.copyAsync({ from: uri, to: destPath });
    return destPath;
  };

  const confirmAndRestore = (fileUri: string, fileName: string) => {
    Alert.alert(
      '⚠️ Confirm Restore',
      `Restore from "${fileName}"?\n\n⚠️ This will REPLACE ALL current data and cannot be undone!`,
      [
        {
          text: 'Cancel',
          style: 'cancel',
          onPress: () => setRestoreInProgress(false),
        },
        {
          text: 'Restore',
          style: 'destructive',
          onPress: async () => {
            let tmpPath: string | null = null;
            try {
              const readableUri = await resolveToReadableUri(fileUri);
              tmpPath = readableUri !== fileUri ? readableUri : null;

              await restoreDatabase(readableUri);

              Alert.alert('✅ Success', 'Database restored successfully!', [
                {
                  text: 'OK',
                  onPress: () => {
                    loadSettings();
                  },
                },
              ]);
            } catch (err: any) {
              console.error('Restore error:', err);
              const msg = err?.message?.includes('content://')
                ? 'Could not read the file. Please try selecting it again.'
                : err?.message?.includes('corrupted') ||
                    err?.message?.includes('JSON')
                  ? 'The file appears corrupted or is not a valid backup.'
                  : 'Failed to restore. Please make sure the file is a valid BillKaro backup.';
              Alert.alert('Restore Failed', msg);
            } finally {
              if (tmpPath) {
                FileSystem.deleteAsync(tmpPath, { idempotent: true }).catch(
                  () => {},
                );
              }
              setRestoreInProgress(false);
            }
          },
        },
      ],
    );
  };

  const handleRestoreWeb = () => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'application/json';

    input.onchange = async (event: Event) => {
      const file = (event.target as HTMLInputElement).files?.[0];
      if (!file) {
        setRestoreInProgress(false);
        return;
      }

      try {
        const text = await file.text();
        const blob = new Blob([text], { type: 'application/json' });
        const url = URL.createObjectURL(blob);

        await restoreDatabase(url);
        URL.revokeObjectURL(url);

        Alert.alert('Success', 'Database restored! The page will now reload.', [
          { text: 'OK', onPress: () => window.location.reload() },
        ]);
      } catch (err) {
        console.error('Restore error:', err);
        Alert.alert(
          'Error',
          'Failed to restore. The backup file may be corrupted.',
        );
      } finally {
        setRestoreInProgress(false);
      }
    };

    input.click();
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#3B82F6" />
        <Text style={styles.loadingText}>Loading settings…</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <StatusBar backgroundColor="#0F172A" barStyle="light-content" />

      <LinearGradient
        colors={['#0F172A', '#1E3A8A', '#1D4ED8']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.header}
      >
        <View style={styles.headerContent}>
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => navigation.goBack()}
          >
            <ArrowLeft size={24} color="#FFFFFF" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Settings</Text>
          <View style={styles.placeholder} />
        </View>
        <View style={styles.headerBadge}>
          <Text style={styles.headerBadgeText}>
            Manage your store preferences
          </Text>
        </View>
      </LinearGradient>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {/* Shop Info Card */}
        <View style={styles.shopInfoCard}>
          <View style={styles.shopInfoHeader}>
            <View style={styles.shopIconContainer}>
              <Store size={20} color="#3B82F6" />
            </View>
            <Text style={styles.shopName}>
              {shopSettings.shopName || 'Your Shop Name'}
            </Text>
            <TouchableOpacity
              style={styles.editButton}
              onPress={() => setModalVisible(true)}
            >
              <Edit size={16} color="#3B82F6" />
            </TouchableOpacity>
          </View>
          {shopSettings.shopAddress ? (
            <Text style={styles.shopAddress}>{shopSettings.shopAddress}</Text>
          ) : null}
          {shopSettings.shopPhone ? (
            <Text style={styles.shopContact}>{shopSettings.shopPhone}</Text>
          ) : null}
          {shopSettings.shopEmail ? (
            <Text style={styles.shopContact}>{shopSettings.shopEmail}</Text>
          ) : null}

          {shopSettings.topTagline || shopSettings.bottomTagline ? (
            <View style={styles.taglineSection}>
              <Text style={styles.taglineLabel}>Invoice Taglines:</Text>
              {shopSettings.topTagline ? (
                <Text style={styles.taglineText}>
                  📌 {shopSettings.topTagline}
                </Text>
              ) : null}
              {shopSettings.bottomTagline ? (
                <Text style={styles.taglineText}>
                  💬 {shopSettings.bottomTagline}
                </Text>
              ) : null}
            </View>
          ) : null}
        </View>

        {/* License Activation Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>License</Text>
          <View style={styles.settingsCard}>
            <TouchableOpacity
              style={styles.settingItem}
              onPress={() => navigation.navigate('activation' as never)}
            >
              <View style={styles.settingItemLeft}>
                <View
                  style={[styles.settingIcon, { backgroundColor: '#EFF6FF' }]}
                >
                  <Key size={20} color="#3B82F6" />
                </View>
                <View style={styles.settingContent}>
                  <Text style={styles.settingTitle}>Activate License</Text>
                  <Text style={styles.settingDescription}>
                    {activationStatus?.isValid
                      ? `Active - ${activationStatus.daysLeft} days remaining`
                      : trialStatus?.isActive
                        ? `Trial - ${trialStatus.daysLeft} days remaining`
                        : 'Activate your license key'}
                  </Text>
                </View>
              </View>
            </TouchableOpacity>
          </View>
        </View>

        {/* Support Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Support & Help</Text>
          <View style={styles.settingsCard}>
            <TouchableOpacity
              style={styles.settingItem}
              onPress={handleCallSupport}
            >
              <View style={styles.settingItemLeft}>
                <View
                  style={[styles.settingIcon, { backgroundColor: '#EFF6FF' }]}
                >
                  <Phone size={20} color="#3B82F6" />
                </View>
                <View style={styles.settingContent}>
                  <Text style={styles.settingTitle}>Call Support</Text>
                  <Text style={styles.settingDescription}>
                    {SUPPORT_PHONE} - Speak with our support team
                  </Text>
                </View>
              </View>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.settingItem, styles.lastSettingItem]}
              onPress={handleEmailSupport}
            >
              <View style={styles.settingItemLeft}>
                <View
                  style={[styles.settingIcon, { backgroundColor: '#F3E8FF' }]}
                >
                  <Mail size={20} color="#8B5CF6" />
                </View>
                <View style={styles.settingContent}>
                  <Text style={styles.settingTitle}>Email Support</Text>
                  <Text style={styles.settingDescription}>
                    {SUPPORT_EMAIL} - Get help via email
                  </Text>
                </View>
              </View>
            </TouchableOpacity>
          </View>
        </View>

        {/* Data Management */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Data Management</Text>
          <View style={styles.settingsCard}>
            <TouchableOpacity
              style={styles.settingItem}
              onPress={() => setBackupModalVisible(true)}
            >
              <View style={styles.settingItemLeft}>
                <View
                  style={[styles.settingIcon, { backgroundColor: '#EFF6FF' }]}
                >
                  <Download size={20} color="#3B82F6" />
                </View>
                <View style={styles.settingContent}>
                  <Text style={styles.settingTitle}>Backup Database</Text>
                  <Text style={styles.settingDescription}>
                    Create a backup of all your data
                  </Text>
                </View>
              </View>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.settingItem, styles.lastSettingItem]}
              onPress={() => setRestoreModalVisible(true)}
            >
              <View style={styles.settingItemLeft}>
                <View
                  style={[styles.settingIcon, { backgroundColor: '#FEF3C7' }]}
                >
                  <Upload size={20} color="#F59E0B" />
                </View>
                <View style={styles.settingContent}>
                  <Text style={styles.settingTitle}>Restore Database</Text>
                  <Text style={styles.settingDescription}>
                    Restore data from a backup file
                  </Text>
                </View>
              </View>
            </TouchableOpacity>
          </View>
        </View>

        {/* Store Management */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Store Management</Text>
          <View style={styles.settingsCard}>
            <TouchableOpacity
              style={styles.settingItem}
              onPress={() => setModalVisible(true)}
            >
              <View style={styles.settingItemLeft}>
                <View
                  style={[styles.settingIcon, { backgroundColor: '#EFF6FF' }]}
                >
                  <Store size={20} color="#3B82F6" />
                </View>
                <View style={styles.settingContent}>
                  <Text style={styles.settingTitle}>Shop Details</Text>
                  <Text style={styles.settingDescription}>
                    Update store information
                  </Text>
                </View>
              </View>
            </TouchableOpacity>
          </View>
        </View>

        {/* About App */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>About App</Text>
          <View style={styles.settingsCard}>
            <TouchableOpacity
              style={styles.settingItem}
              onPress={() => setAboutModalVisible(true)}
            >
              <View style={styles.settingItemLeft}>
                <View
                  style={[styles.settingIcon, { backgroundColor: '#F3E8FF' }]}
                >
                  <Info size={20} color="#8B5CF6" />
                </View>
                <View style={styles.settingContent}>
                  <Text style={styles.settingTitle}>About Bill-Karo</Text>
                  <Text style={styles.settingDescription}>
                    Version 1.0.0 | Learn more about the app
                  </Text>
                </View>
              </View>
            </TouchableOpacity>
          </View>
        </View>

        {/* Footer */}
        <View style={styles.appInfoCard}>
          <LinearGradient
            colors={['#0F172A', '#1E3A8A']}
            style={styles.appInfoGradient}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
          >
            <Text style={styles.appName}>Bill-Karo</Text>
            <Text style={styles.appVersion}>Version 1.0.0</Text>
            <Text style={styles.appDescription}>
              A comprehensive billing and inventory management solution for
              retail and Wholesale stores – made in India, for India.
            </Text>
          </LinearGradient>
        </View>
      </ScrollView>

      {/* ─── Backup Modal (2 Options: Share File & Google Drive) ───────────────────────────────────── */}
      <Modal
        animationType="fade"
        transparent
        visible={backupModalVisible}
        onRequestClose={() => !backupInProgress && setBackupModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.confirmModalContent}>
            <LinearGradient
              colors={['#0F172A', '#1E3A8A']}
              style={styles.modalHeaderGradient}
            >
              <Text style={styles.modalTitle}>Backup Database</Text>
              <TouchableOpacity
                onPress={() =>
                  !backupInProgress && setBackupModalVisible(false)
                }
              >
                <X size={24} color="#FFFFFF" />
              </TouchableOpacity>
            </LinearGradient>

            <View style={styles.confirmIconContainer}>
              <Download size={48} color="#3B82F6" />
            </View>

            <Text style={styles.confirmMessage}>
              Choose how to save your backup. Includes all customers, products,
              bills, and settings.
            </Text>

            <View style={styles.backupOptionsContainer}>
              {/* Option 1: Share File */}
              <TouchableOpacity
                style={styles.backupOptionButton}
                onPress={handleShareBackup}
                disabled={backupInProgress}
              >
                <LinearGradient
                  colors={['#3B82F6', '#1D4ED8']}
                  style={styles.backupOptionGradient}
                >
                  {backupInProgress ? (
                    <ActivityIndicator color="#fff" size="small" />
                  ) : (
                    <>
                      <Share2 size={32} color="#fff" />
                      <Text style={styles.backupOptionTitle}>Share File</Text>
                      <Text style={styles.backupOptionDescription}>
                        Share via WhatsApp, Email, or save to device
                      </Text>
                    </>
                  )}
                </LinearGradient>
              </TouchableOpacity>

              {/* Option 2: Google Drive */}
              <TouchableOpacity
                style={styles.backupOptionButton}
                onPress={handleUploadToGoogleDrive}
                disabled={backupInProgress}
              >
                <LinearGradient
                  colors={['#EA4335', '#C62828']}
                  style={styles.backupOptionGradient}
                >
                  {backupInProgress ? (
                    <ActivityIndicator color="#fff" size="small" />
                  ) : (
                    <>
                      <Cloud size={32} color="#fff" />
                      <Text style={styles.backupOptionTitle}>Google Drive</Text>
                      <Text style={styles.backupOptionDescription}>
                        Upload directly to your Google Drive
                      </Text>
                    </>
                  )}
                </LinearGradient>
              </TouchableOpacity>
            </View>

            <TouchableOpacity onPress={showBackupLocation}>
              <Text style={styles.locationText}>
                <FolderOpen size={12} color="#64748B" /> Tap to see where
                backups are saved
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.cancelButton, { marginTop: 12 }]}
              onPress={() => setBackupModalVisible(false)}
              disabled={backupInProgress}
            >
              <Text style={styles.cancelButtonText}>Close</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* ─── Restore Modal (2 Options: File Manager & Google Drive) ───────────────────────────────── */}
      <Modal
        animationType="fade"
        transparent
        visible={restoreModalVisible}
        onRequestClose={() =>
          !restoreInProgress && setRestoreModalVisible(false)
        }
      >
        <View style={styles.modalOverlay}>
          <View style={styles.confirmModalContent}>
            <LinearGradient
              colors={['#0F172A', '#1E3A8A']}
              style={styles.modalHeaderGradient}
            >
              <Text style={styles.modalTitle}>Restore Database</Text>
              <TouchableOpacity
                onPress={() =>
                  !restoreInProgress && setRestoreModalVisible(false)
                }
              >
                <X size={24} color="#FFFFFF" />
              </TouchableOpacity>
            </LinearGradient>

            <View style={styles.confirmIconContainer}>
              <AlertTriangle size={48} color="#F59E0B" />
            </View>

            <Text style={styles.confirmMessage}>
              Choose where your backup file is stored. This will replace ALL
              current data.
            </Text>

            <Text style={styles.warningText}>
              ⚠️ This action cannot be undone! Make sure you have a recent
              backup.
            </Text>

            <View style={styles.restoreOptionsContainer}>
              {/* Option 1: File Manager */}
              <TouchableOpacity
                style={styles.restoreOptionButton}
                onPress={handleRestoreFromFileManager}
                disabled={restoreInProgress}
              >
                <LinearGradient
                  colors={['#3B82F6', '#1D4ED8']}
                  style={styles.restoreOptionGradient}
                >
                  {restoreInProgress ? (
                    <ActivityIndicator color="#fff" size="small" />
                  ) : (
                    <>
                      <FolderOpen size={32} color="#fff" />
                      <Text style={styles.restoreOptionTitle}>
                        File Manager
                      </Text>
                      <Text style={styles.restoreOptionDescription}>
                        Select from phone storage
                      </Text>
                    </>
                  )}
                </LinearGradient>
              </TouchableOpacity>

              {/* Option 2: Google Drive */}
              <TouchableOpacity
                style={styles.restoreOptionButton}
                onPress={handleRestoreFromGoogleDrive}
                disabled={restoreInProgress}
              >
                <LinearGradient
                  colors={['#EA4335', '#C62828']}
                  style={styles.restoreOptionGradient}
                >
                  {restoreInProgress ? (
                    <ActivityIndicator color="#fff" size="small" />
                  ) : (
                    <>
                      <Cloud size={32} color="#fff" />
                      <Text style={styles.restoreOptionTitle}>
                        Google Drive
                      </Text>
                      <Text style={styles.restoreOptionDescription}>
                        Restore from Google Drive
                      </Text>
                    </>
                  )}
                </LinearGradient>
              </TouchableOpacity>
            </View>

            <TouchableOpacity
              style={[styles.cancelButton, { marginTop: 12 }]}
              onPress={() => setRestoreModalVisible(false)}
              disabled={restoreInProgress}
            >
              <Text style={styles.cancelButtonText}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* ─── Shop Details Modal ──────────────────────────────────────────────── */}
      <Modal
        animationType="slide"
        transparent
        visible={modalVisible}
        onRequestClose={() => {
          resetForm();
          setModalVisible(false);
        }}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <LinearGradient
              colors={['#0F172A', '#1E3A8A']}
              style={styles.modalHeaderGradient}
            >
              <Text style={styles.modalTitle}>Shop Details</Text>
              <TouchableOpacity
                onPress={() => {
                  resetForm();
                  setModalVisible(false);
                }}
              >
                <X size={24} color="#FFFFFF" />
              </TouchableOpacity>
            </LinearGradient>

            <ScrollView style={styles.formContainer}>
              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Shop Name *</Text>
                <TextInput
                  style={styles.textInput}
                  value={formData.shopName}
                  onChangeText={(text) =>
                    setFormData({ ...formData, shopName: text })
                  }
                  placeholder="Enter shop name"
                  placeholderTextColor="#94A3B8"
                />
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Address *</Text>
                <TextInput
                  style={[styles.textInput, styles.multilineInput]}
                  value={formData.shopAddress}
                  onChangeText={(text) =>
                    setFormData({ ...formData, shopAddress: text })
                  }
                  placeholder="Enter shop address"
                  placeholderTextColor="#94A3B8"
                  multiline
                  numberOfLines={3}
                />
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Phone Number *</Text>
                <TextInput
                  style={styles.textInput}
                  value={formData.shopPhone}
                  onChangeText={(text) =>
                    setFormData({ ...formData, shopPhone: text })
                  }
                  placeholder="Enter phone number"
                  placeholderTextColor="#94A3B8"
                  keyboardType="phone-pad"
                />
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Email</Text>
                <TextInput
                  style={styles.textInput}
                  value={formData.shopEmail}
                  onChangeText={(text) =>
                    setFormData({ ...formData, shopEmail: text })
                  }
                  placeholder="Enter email address"
                  placeholderTextColor="#94A3B8"
                  keyboardType="email-address"
                  autoCapitalize="none"
                />
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Top Tagline (Bill Header)</Text>
                <TextInput
                  style={styles.textInput}
                  value={formData.topTagline}
                  onChangeText={(text) =>
                    setFormData({ ...formData, topTagline: text })
                  }
                  placeholder="e.g., Estimate, Non-GST Bill, etc."
                  placeholderTextColor="#94A3B8"
                />
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>
                  Bottom Tagline (Bill Footer)
                </Text>
                <TextInput
                  style={[styles.textInput, styles.multilineInput]}
                  value={formData.bottomTagline}
                  onChangeText={(text) =>
                    setFormData({ ...formData, bottomTagline: text })
                  }
                  placeholder="e.g., Thank you message, return policy, etc."
                  placeholderTextColor="#94A3B8"
                  multiline
                  numberOfLines={3}
                />
              </View>
            </ScrollView>

            <View style={styles.modalButtons}>
              <TouchableOpacity
                style={styles.cancelButton}
                onPress={() => {
                  resetForm();
                  setModalVisible(false);
                }}
              >
                <Text style={styles.cancelButtonText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.saveButton}
                onPress={saveSettings}
              >
                <LinearGradient
                  colors={['#3B82F6', '#1D4ED8']}
                  style={styles.saveButtonGradient}
                >
                  <Text style={styles.saveButtonText}>Save Changes</Text>
                </LinearGradient>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* ─── About App Modal ─────────────────────────────────────────────────── */}
      <Modal
        animationType="slide"
        transparent={true}
        visible={aboutModalVisible}
        onRequestClose={() => setAboutModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.aboutModalContent}>
            <LinearGradient
              colors={['#0F172A', '#1E3A8A']}
              style={styles.aboutModalHeader}
            >
              <View style={styles.aboutHeaderIcon}>
                <Heart size={32} color="#FFFFFF" fill="#FFFFFF" />
              </View>
              <Text style={styles.aboutModalTitle}>Bill-Karo</Text>
              <TouchableOpacity
                style={styles.aboutCloseButton}
                onPress={() => setAboutModalVisible(false)}
              >
                <X size={24} color="#FFFFFF" />
              </TouchableOpacity>
            </LinearGradient>

            <ScrollView
              style={styles.aboutModalBody}
              showsVerticalScrollIndicator={false}
            >
              <View style={styles.versionBadge}>
                <Text style={styles.versionText}>Version 1.0.0</Text>
              </View>

              <View style={styles.aboutSection}>
                <Text style={styles.aboutSectionTitle}>📱 About the App</Text>
                <Text style={styles.aboutText}>
                  Bill-Karo is a comprehensive billing and inventory management
                  solution designed specifically for Indian retail & Wholesale
                  stores. It helps you manage your business efficiently with
                  features like billing, inventory tracking, customer
                  management, and financial reporting.
                </Text>
              </View>

              <View style={styles.aboutSection}>
                <Text style={styles.aboutSectionTitle}>✨ Key Features</Text>
                <View style={styles.featureItem}>
                  <Zap size={18} color="#3B82F6" />
                  <Text style={styles.featureText}>Fast & Easy Billing</Text>
                </View>
                <View style={styles.featureItem}>
                  <Store size={18} color="#3B82F6" />
                  <Text style={styles.featureText}>Inventory Management</Text>
                </View>
                <View style={styles.featureItem}>
                  <Shield size={18} color="#3B82F6" />
                  <Text style={styles.featureText}>
                    Secure Data Backup & Restore
                  </Text>
                </View>
              </View>

              <View style={styles.aboutSection}>
                <Text style={styles.aboutSectionTitle}>👨‍💻 Developer</Text>
                <Text style={styles.aboutText}>Sameer Makwani</Text>
                <Text style={styles.aboutSubText}>
                  Full Stack Developer | Building solutions for India's growth
                </Text>
              </View>

              <View style={styles.aboutSection}>
                <Text style={styles.aboutSectionTitle}>📞 Support</Text>
                <TouchableOpacity
                  style={styles.supportLink}
                  onPress={handleCallSupport}
                >
                  <Phone size={16} color="#3B82F6" />
                  <Text style={styles.supportLinkText}>{SUPPORT_PHONE}</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.supportLink}
                  onPress={handleEmailSupport}
                >
                  <Mail size={16} color="#3B82F6" />
                  <Text style={styles.supportLinkText}>{SUPPORT_EMAIL}</Text>
                </TouchableOpacity>
              </View>

              <View style={styles.aboutSection}>
                <Text style={styles.aboutSectionTitle}>📍 Location</Text>
                <Text style={styles.aboutText}>Maharashtra, India</Text>
              </View>

              <View style={styles.ratingContainer}>
                <Text style={styles.ratingText}>Rate this app</Text>
                <View style={styles.starsContainer}>
                  {[1, 2, 3, 4, 5].map((star) => (
                    <TouchableOpacity key={star}>
                      <Star size={24} color="#F59E0B" fill="#F59E0B" />
                    </TouchableOpacity>
                  ))}
                </View>
              </View>

              <View style={styles.thanksContainer}>
                <Text style={styles.thanksText}>
                  Thank you for using Bill-Karo! 🎉
                </Text>
                <Text style={styles.thanksSubText}>
                  Made with ❤️ in India for Indian businesses
                </Text>
              </View>
            </ScrollView>

            <TouchableOpacity
              style={styles.aboutDoneButton}
              onPress={() => setAboutModalVisible(false)}
            >
              <LinearGradient
                colors={['#3B82F6', '#1D4ED8']}
                style={styles.aboutDoneGradient}
              >
                <Text style={styles.aboutDoneText}>Got it</Text>
              </LinearGradient>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F1F5F9' },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F1F5F9',
  },
  loadingText: {
    marginTop: 12,
    fontSize: 14,
    color: '#64748B',
    fontWeight: '500',
  },
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
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    marginBottom: 8,
  },
  backButton: {
    padding: 8,
    backgroundColor: 'rgba(255,255,255,0.15)',
    borderRadius: 12,
  },
  placeholder: {
    width: 40,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: '900',
    color: '#FFFFFF',
    letterSpacing: 1,
  },
  headerBadge: {
    alignItems: 'center',
    marginTop: 4,
  },
  headerBadgeText: {
    fontSize: 13,
    color: '#93C5FD',
    fontWeight: '500',
  },
  content: { flex: 1, paddingHorizontal: 20, paddingTop: 20 },
  shopInfoCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 20,
    marginBottom: 20,
    shadowColor: '#94A3B8',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 3,
    borderWidth: 1,
    borderColor: '#F1F5F9',
  },
  shopInfoHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  shopIconContainer: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#EFF6FF',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  shopName: { fontSize: 18, fontWeight: '700', color: '#0F172A', flex: 1 },
  editButton: {
    backgroundColor: '#EFF6FF',
    borderRadius: 10,
    width: 32,
    height: 32,
    justifyContent: 'center',
    alignItems: 'center',
  },
  shopAddress: {
    fontSize: 14,
    color: '#64748B',
    marginBottom: 4,
    lineHeight: 20,
  },
  shopContact: { fontSize: 14, color: '#64748B', marginBottom: 4 },
  taglineSection: {
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#F1F5F9',
  },
  taglineLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: '#475569',
    marginBottom: 6,
  },
  taglineText: {
    fontSize: 11,
    color: '#64748B',
    marginBottom: 2,
    fontStyle: 'italic',
  },
  section: { marginBottom: 24 },
  sectionTitle: {
    fontSize: 17,
    fontWeight: '800',
    color: '#0F172A',
    marginBottom: 12,
    letterSpacing: 0.3,
  },
  settingsCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    shadowColor: '#94A3B8',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 3,
    borderWidth: 1,
    borderColor: '#F1F5F9',
  },
  settingItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  lastSettingItem: { borderBottomWidth: 0 },
  settingItemLeft: { flexDirection: 'row', alignItems: 'center', flex: 1 },
  settingIcon: {
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 14,
  },
  settingContent: { flex: 1 },
  settingTitle: {
    fontSize: 15,
    fontWeight: '600',
    marginBottom: 2,
    color: '#0F172A',
  },
  settingDescription: { fontSize: 13, color: '#64748B' },
  appInfoCard: {
    marginBottom: 30,
    borderRadius: 20,
    overflow: 'hidden',
  },
  appInfoGradient: {
    padding: 20,
    alignItems: 'center',
  },
  appName: {
    fontSize: 18,
    fontWeight: '700',
    color: '#FFFFFF',
    marginBottom: 4,
  },
  appVersion: { fontSize: 12, color: '#93C5FD', marginBottom: 8 },
  appDescription: {
    fontSize: 12,
    color: '#93C5FD',
    textAlign: 'center',
    lineHeight: 18,
  },

  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    backgroundColor: '#FFFFFF',
    borderRadius: 24,
    width: '90%',
    maxHeight: '85%',
    overflow: 'hidden',
  },
  confirmModalContent: {
    backgroundColor: '#FFFFFF',
    borderRadius: 24,
    width: '90%',
    overflow: 'hidden',
  },
  modalHeaderGradient: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
  },
  modalTitle: { fontSize: 18, fontWeight: '700', color: '#FFFFFF' },
  formContainer: { padding: 20, maxHeight: 500 },
  inputGroup: { marginBottom: 18 },
  inputLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#475569',
    marginBottom: 8,
    letterSpacing: 0.3,
  },
  textInput: {
    borderWidth: 1.5,
    borderColor: '#E2E8F0',
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 15,
    color: '#0F172A',
    backgroundColor: '#FFFFFF',
  },
  multilineInput: { minHeight: 80, textAlignVertical: 'top' },
  modalButtons: {
    flexDirection: 'row',
    padding: 20,
    borderTopWidth: 1,
    borderTopColor: '#F1F5F9',
    gap: 12,
  },
  cancelButton: {
    flex: 1,
    backgroundColor: '#F1F5F9',
    borderRadius: 12,
    paddingVertical: 12,
    alignItems: 'center',
  },
  cancelButtonText: { fontSize: 15, fontWeight: '600', color: '#64748B' },
  saveButton: { flex: 1, borderRadius: 12, overflow: 'hidden' },
  saveButtonGradient: { paddingVertical: 12, alignItems: 'center' },
  saveButtonText: { fontSize: 15, fontWeight: '700', color: '#FFFFFF' },
  confirmIconContainer: { alignItems: 'center', marginVertical: 20 },
  confirmMessage: {
    fontSize: 14,
    color: '#475569',
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: 8,
    paddingHorizontal: 20,
  },
  warningText: {
    fontSize: 12,
    color: '#F59E0B',
    textAlign: 'center',
    marginBottom: 20,
    fontWeight: '600',
  },
  locationText: {
    fontSize: 11,
    color: '#64748B',
    textAlign: 'center',
    marginTop: 12,
    marginBottom: 16,
    fontStyle: 'italic',
  },

  // Backup Options (2 Options)
  backupOptionsContainer: {
    paddingHorizontal: 20,
    gap: 12,
    marginBottom: 16,
  },
  backupOptionButton: {
    borderRadius: 16,
    overflow: 'hidden',
  },
  backupOptionGradient: {
    padding: 20,
    alignItems: 'center',
    gap: 8,
  },
  backupOptionTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#fff',
  },
  backupOptionDescription: {
    fontSize: 12,
    color: 'rgba(255,255,255,0.9)',
    textAlign: 'center',
  },

  // Restore Options (2 Options)
  restoreOptionsContainer: {
    paddingHorizontal: 20,
    gap: 12,
    marginBottom: 16,
  },
  restoreOptionButton: {
    borderRadius: 16,
    overflow: 'hidden',
  },
  restoreOptionGradient: {
    padding: 20,
    alignItems: 'center',
    gap: 8,
  },
  restoreOptionTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#fff',
  },
  restoreOptionDescription: {
    fontSize: 12,
    color: 'rgba(255,255,255,0.9)',
    textAlign: 'center',
  },

  // About Modal Styles
  aboutModalContent: {
    backgroundColor: '#FFFFFF',
    borderRadius: 28,
    width: '90%',
    maxHeight: '85%',
    overflow: 'hidden',
  },
  aboutModalHeader: {
    alignItems: 'center',
    paddingTop: 40,
    paddingBottom: 20,
    paddingHorizontal: 20,
    position: 'relative',
  },
  aboutHeaderIcon: {
    width: 70,
    height: 70,
    borderRadius: 35,
    backgroundColor: 'rgba(255,255,255,0.2)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
  },
  aboutModalTitle: {
    fontSize: 24,
    fontWeight: '800',
    color: '#FFFFFF',
    letterSpacing: 1,
  },
  aboutCloseButton: {
    position: 'absolute',
    top: 20,
    right: 20,
    padding: 8,
    backgroundColor: 'rgba(255,255,255,0.15)',
    borderRadius: 20,
  },
  aboutModalBody: {
    padding: 24,
  },
  versionBadge: {
    backgroundColor: '#EFF6FF',
    paddingHorizontal: 16,
    paddingVertical: 6,
    borderRadius: 20,
    alignSelf: 'center',
    marginBottom: 20,
  },
  versionText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#3B82F6',
  },
  aboutSection: {
    marginBottom: 24,
  },
  aboutSectionTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#0F172A',
    marginBottom: 10,
  },
  aboutText: {
    fontSize: 14,
    color: '#475569',
    lineHeight: 22,
  },
  aboutSubText: {
    fontSize: 13,
    color: '#64748B',
    marginTop: 4,
    fontStyle: 'italic',
  },
  featureItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
    gap: 10,
  },
  featureText: {
    fontSize: 14,
    color: '#475569',
  },
  supportLink: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
    gap: 10,
  },
  supportLinkText: {
    fontSize: 14,
    color: '#3B82F6',
    fontWeight: '500',
  },
  ratingContainer: {
    alignItems: 'center',
    marginBottom: 24,
    paddingVertical: 16,
    borderTopWidth: 1,
    borderTopColor: '#F1F5F9',
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  ratingText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#0F172A',
    marginBottom: 8,
  },
  starsContainer: {
    flexDirection: 'row',
    gap: 12,
  },
  thanksContainer: {
    alignItems: 'center',
    marginBottom: 20,
  },
  thanksText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#0F172A',
    marginBottom: 6,
  },
  thanksSubText: {
    fontSize: 12,
    color: '#64748B',
    textAlign: 'center',
  },
  aboutDoneButton: {
    margin: 20,
    borderRadius: 14,
    overflow: 'hidden',
  },
  aboutDoneGradient: {
    paddingVertical: 14,
    alignItems: 'center',
  },
  aboutDoneText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#FFFFFF',
  },
});
