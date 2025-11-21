import * as ImagePicker from 'expo-image-picker';
import { LinearGradient } from 'expo-linear-gradient';
import {
  Camera,
  Cloud,
  Download,
  CreditCard as Edit,
  FolderOpen,
  HelpCircle,
  Image as ImageIcon,
  Info,
  Store,
  Trash2,
  Upload,
  X,
} from 'lucide-react-native';
import React, { useEffect, useState } from 'react';
import {
  Alert,
  Image,
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
  backupData,
  clearAllData,
  defaultShopSettings,
  getShopSettings,
  initDB,
  restoreData,
  saveShopSettings,
  ShopSettings,
} from '../../lib/db';

interface SettingItem {
  icon: React.ComponentType<any>;
  title: string;
  description: string;
  action?: () => void;
  danger?: boolean;
}

interface SettingsSection {
  title: string;
  items: SettingItem[];
}

export default function Settings() {
  const [modalVisible, setModalVisible] = useState(false);
  const [aboutModalVisible, setAboutModalVisible] = useState(false);
  const [backupModalVisible, setBackupModalVisible] = useState(false);
  const [restoreModalVisible, setRestoreModalVisible] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [shopSettings, setShopSettings] =
    useState<ShopSettings>(defaultShopSettings);
  const [formData, setFormData] = useState<ShopSettings>(defaultShopSettings);

  // Initialize database and load settings
  useEffect(() => {
    const initializeApp = async () => {
      try {
        setIsLoading(true);
        await initDB(); // Initialize database
        await loadShopSettings();
      } catch (error) {
        console.error('Failed to initialize app:', error);
        Alert.alert('Error', 'Failed to initialize database');
      } finally {
        setIsLoading(false);
      }
    };

    initializeApp();
  }, []);

  // Load shop settings from database
  const loadShopSettings = async () => {
    try {
      const settings = await getShopSettings();
      if (settings) {
        setShopSettings(settings);
        setFormData(settings);
      } else {
        // Save default settings if no settings exist
        await saveShopSettings(defaultShopSettings);
        setShopSettings(defaultShopSettings);
        setFormData(defaultShopSettings);
      }
    } catch (error) {
      console.error('Failed to load shop settings:', error);
      Alert.alert('Error', 'Failed to load shop settings');
    }
  };

  // Generate backup filename with current date
  const generateBackupFileName = (): string => {
    const today = new Date();
    const dateString = today.toISOString().split('T')[0]; // YYYY-MM-DD
    const timeString = today.toTimeString().split(' ')[0].replace(/:/g, '-'); // HH-MM-SS
    return `BillKaro_${dateString}_${timeString}.json`;
  };

  // Image handling functions
  const pickImage = async () => {
    try {
      const { status } =
        await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert(
          'Permission required',
          'Sorry, we need camera roll permissions to upload logos.',
        );
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.8,
      });

      if (!result.canceled && result.assets && result.assets[0]) {
        setFormData({ ...formData, logo: result.assets[0].uri });
      }
    } catch (error) {
      Alert.alert('Error', 'Failed to pick image from gallery');
      console.error('Image picker error:', error);
    }
  };

  const takePhoto = async () => {
    try {
      const { status } = await ImagePicker.requestCameraPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert(
          'Permission required',
          'Sorry, we need camera permissions to take photos.',
        );
        return;
      }

      const result = await ImagePicker.launchCameraAsync({
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.8,
      });

      if (!result.canceled && result.assets && result.assets[0]) {
        setFormData({ ...formData, logo: result.assets[0].uri });
      }
    } catch (error) {
      Alert.alert('Error', 'Failed to take photo');
      console.error('Camera error:', error);
    }
  };

  const removeLogo = () => {
    Alert.alert('Remove Logo', 'Are you sure you want to remove the logo?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Remove',
        style: 'destructive',
        onPress: () => setFormData({ ...formData, logo: null }),
      },
    ]);
  };

  // Data management functions
  const handleBackup = () => {
    setBackupModalVisible(true);
  };

  const handleBackupToLocal = async () => {
    try {
      setBackupModalVisible(false);

      const backupDataString = await backupData();
      const fileName = generateBackupFileName();

      if (Platform.OS === 'web') {
        // Web implementation - download file
        const blob = new Blob([backupDataString], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = fileName;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);

        Alert.alert('Success', 'Backup file downloaded successfully!');
      } else {
        // Mobile implementation - show data for manual copy
        Alert.alert(
          'Backup Data',
          `Your backup data is ready. You can copy this data and save it as a file:\n\nFile Name: ${fileName}\n\nIn a full implementation, this would save directly to your device storage.`,
          [
            {
              text: 'Copy Data',
              onPress: () => copyToClipboard(backupDataString),
            },
            { text: 'OK' },
          ],
        );
      }
    } catch (error) {
      console.error('Local backup failed:', error);
      Alert.alert('Error', 'Failed to create local backup');
    }
  };

  const handleBackupToGoogleDrive = async () => {
    try {
      setBackupModalVisible(false);

      const backupDataString = await backupData();
      const fileName = generateBackupFileName();

      if (Platform.OS === 'web') {
        // Web implementation - download file for Google Drive upload
        const blob = new Blob([backupDataString], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = fileName;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);

        Alert.alert(
          'Backup Ready',
          `Backup file "${fileName}" has been downloaded. Please upload it to your Google Drive manually.`,
          [{ text: 'OK' }],
        );
      } else {
        // Mobile implementation - show instructions
        Alert.alert(
          'Backup to Google Drive',
          `To backup to Google Drive:\n\n1. Copy the backup data\n2. Open Google Drive\n3. Create a new file and paste the data\n4. Save as: ${fileName}`,
          [
            {
              text: 'Copy Data',
              onPress: () => copyToClipboard(backupDataString),
            },
            { text: 'OK' },
          ],
        );
      }
    } catch (error) {
      console.error('Google Drive backup failed:', error);
      Alert.alert('Error', 'Failed to prepare backup for Google Drive');
    }
  };

  // Copy data to clipboard (simplified version)
  const copyToClipboard = (text: string) => {
    if (Platform.OS === 'web') {
      navigator.clipboard.writeText(text);
      Alert.alert('Success', 'Backup data copied to clipboard!');
    } else {
      // For React Native, you would use @react-native-clipboard/clipboard
      Alert.alert(
        'Info',
        'Backup data is ready. Please manually copy it from the alert message.',
      );
    }
  };

  const handleRestore = () => {
    setRestoreModalVisible(true);
  };

  const handleRestoreFromLocal = async () => {
    try {
      setRestoreModalVisible(false);

      if (Platform.OS === 'web') {
        Alert.alert(
          'Restore Feature',
          'Please paste your backup data in the next prompt.',
          [
            { text: 'Cancel', style: 'cancel' },
            {
              text: 'Continue',
              onPress: () => promptForBackupData(),
            },
          ],
        );
      } else {
        Alert.alert(
          'Restore from Local',
          'Please paste your backup data to restore.',
          [
            { text: 'Cancel', style: 'cancel' },
            {
              text: 'Paste Data',
              onPress: () => promptForBackupData(),
            },
          ],
        );
      }
    } catch (error) {
      console.error('Restore from local failed:', error);
      Alert.alert('Error', 'Failed to restore from local');
    }
  };

  const handleRestoreFromGoogleDrive = async () => {
    try {
      setRestoreModalVisible(false);

      Alert.alert(
        'Restore from Google Drive',
        'Please copy your backup data from Google Drive and paste it in the next prompt.',
        [
          { text: 'Cancel', style: 'cancel' },
          {
            text: 'Paste Data',
            onPress: () => promptForBackupData(),
          },
        ],
      );
    } catch (error) {
      console.error('Google Drive restore failed:', error);
      Alert.alert('Error', 'Failed to restore from Google Drive');
    }
  };
  const promptForBackupData = () => {
    Alert.prompt(
      'Restore Data',
      'Paste your backup data below:',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Restore',
          onPress: (backupDataString: string | undefined) => {
            if (backupDataString && backupDataString.trim()) {
              performRestore(backupDataString);
            } else {
              Alert.alert('Error', 'Please enter valid backup data');
            }
          },
        },
      ],
      'plain-text',
    );
  };
  const performRestore = async (backupDataString: string) => {
    try {
      await restoreData(backupDataString);
      await loadShopSettings(); // Reload settings
      Alert.alert('Success', 'Data restored successfully!');
    } catch (error) {
      console.error('Restore failed:', error);
      Alert.alert(
        'Error',
        'Failed to restore data. The backup file may be corrupted.',
      );
    }
  };

  const handleClearData = () => {
    Alert.alert(
      'Clear All Data',
      '⚠️ WARNING: This action cannot be undone!\n\nThis will permanently delete all your shop settings and configuration data.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'I Understand, Clear Data',
          style: 'destructive',
          onPress: handleClearDataWithConfirmation,
        },
      ],
    );
  };

  const handleClearDataWithConfirmation = () => {
    Alert.alert(
      'Final Confirmation',
      'This is your last chance to cancel. All your data will be permanently deleted!',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'DELETE EVERYTHING',
          style: 'destructive',
          onPress: performClearData,
        },
      ],
    );
  };

  const performClearData = async () => {
    try {
      await clearAllData();

      // Reset to default settings
      setShopSettings(defaultShopSettings);
      setFormData(defaultShopSettings);

      Alert.alert('Success', 'All data has been cleared successfully.');
    } catch (error) {
      console.error('Clear data failed:', error);
      Alert.alert('Error', 'Failed to clear data');
    }
  };

  const handleContactSupport = () => {
    Alert.alert(
      'Help & Support',
      'Contact us for any assistance:\n\n📞 Phone: 9359789199\n📧 Email: SupportBillKaro@gmail.com\n\nWe are available 24/7 to help you!',
      [{ text: 'OK', style: 'default' }],
    );
  };

  const handleAboutUs = () => {
    setAboutModalVisible(true);
  };

  const settingsSections: SettingsSection[] = [
    {
      title: 'Store Management',
      items: [
        {
          icon: Store,
          title: 'Shop Details',
          description: 'Update store information and logo',
          action: () => setModalVisible(true),
        },
      ],
    },
    {
      title: 'Data Management',
      items: [
        {
          icon: Upload,
          title: 'Backup Data',
          description: 'Create backup of your store data',
          action: handleBackup,
        },
        {
          icon: Download,
          title: 'Restore Data',
          description: 'Restore data from previous backup',
          action: handleRestore,
        },
        {
          icon: Trash2,
          title: 'Clear All Data',
          description: 'Permanently delete all app data',
          action: handleClearData,
          danger: true,
        },
      ],
    },
    {
      title: 'Information',
      items: [
        {
          icon: Info,
          title: 'About Us',
          description: 'Learn more about Bill-Karo',
          action: handleAboutUs,
        },
        {
          icon: HelpCircle,
          title: 'Help & Support',
          description: 'Get help and contact support',
          action: handleContactSupport,
        },
      ],
    },
  ];

  const saveSettings = async () => {
    try {
      await saveShopSettings(formData);
      setShopSettings(formData);
      setModalVisible(false);
      Alert.alert('Success', 'Shop details updated successfully!');
    } catch (error) {
      console.error('Save settings error:', error);
      Alert.alert('Error', 'Failed to save settings');
    }
  };

  const resetForm = () => {
    setFormData(shopSettings);
  };

  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <Text style={styles.loadingText}>Loading Settings...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <StatusBar backgroundColor="#1E3A8A" barStyle="light-content" />

      {/* Header */}
      <LinearGradient
        colors={['#2563EB', '#1D4ED8', '#3730A3']}
        style={styles.header}
      >
        <Text style={styles.headerTitle}>Settings</Text>
        <Text style={styles.headerSubtitle}>Manage your store preferences</Text>
      </LinearGradient>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {/* Current Shop Info */}
        <View style={styles.shopInfoCard}>
          <View style={styles.shopInfoHeader}>
            <View style={styles.shopNameContainer}>
              {shopSettings.logo && (
                <Image
                  source={{ uri: shopSettings.logo }}
                  style={styles.shopLogo}
                />
              )}
              <Text style={styles.shopName}>{shopSettings.name}</Text>
            </View>
            <TouchableOpacity
              style={styles.editButton}
              onPress={() => setModalVisible(true)}
            >
              <Edit size={16} color="#2563EB" />
            </TouchableOpacity>
          </View>
          <Text style={styles.shopAddress}>{shopSettings.address}</Text>
          <Text style={styles.shopContact}>{shopSettings.phone}</Text>
          {shopSettings.email && (
            <Text style={styles.shopContact}>{shopSettings.email}</Text>
          )}

          <View style={styles.taglineSection}>
            <Text style={styles.taglineLabel}>Invoice Taglines:</Text>
            <Text style={styles.taglineText}>
              Top: "{shopSettings.topTagline}"
            </Text>
            <Text style={styles.taglineText}>
              Bottom: "{shopSettings.bottomTagline}"
            </Text>
          </View>
        </View>

        {/* Settings Sections */}
        {settingsSections.map((section, sectionIndex) => (
          <View key={sectionIndex} style={styles.section}>
            <Text style={styles.sectionTitle}>{section.title}</Text>
            <View style={styles.settingsCard}>
              {section.items.map((item, itemIndex) => (
                <TouchableOpacity
                  key={itemIndex}
                  style={[
                    styles.settingItem,
                    itemIndex === section.items.length - 1 &&
                      styles.lastSettingItem,
                  ]}
                  onPress={item.action}
                >
                  <View style={styles.settingItemLeft}>
                    <View
                      style={[
                        styles.settingIcon,
                        {
                          backgroundColor:
                            (item.danger ?? false) ? '#FEF2F2' : '#F0F9FF',
                        },
                      ]}
                    >
                      <item.icon
                        size={20}
                        color={(item.danger ?? false) ? '#EF4444' : '#2563EB'}
                      />
                    </View>
                    <View style={styles.settingContent}>
                      <Text
                        style={[
                          styles.settingTitle,
                          {
                            color:
                              (item.danger ?? false) ? '#EF4444' : '#1E293B',
                          },
                        ]}
                      >
                        {item.title}
                      </Text>
                      <Text style={styles.settingDescription}>
                        {item.description}
                      </Text>
                    </View>
                  </View>
                </TouchableOpacity>
              ))}
            </View>
          </View>
        ))}

        {/* Contact Info Card */}
        <View style={styles.contactCard}>
          <Text style={styles.contactTitle}>Need Immediate Help?</Text>
          <View style={styles.contactInfo}>
            <View style={styles.contactItem}>
              <Text style={styles.contactLabel}>Phone Number:</Text>
              <Text style={styles.contactValue}>9359789199</Text>
            </View>
            <View style={styles.contactItem}>
              <Text style={styles.contactLabel}>Email:</Text>
              <Text style={styles.contactValue}>SupportBillKaro@gmail.com</Text>
            </View>
          </View>
          <Text style={styles.contactNote}>
            Our support team is available 24/7 to assist you with any issues.
          </Text>
        </View>

        {/* App Info */}
        <View style={styles.appInfoCard}>
          <Text style={styles.appName}>Bill-Karo Management System</Text>
          <Text style={styles.appVersion}>Version 1.0.0</Text>
          <Text style={styles.appDescription}>
            A comprehensive billing and inventory management solution for retail
            stores
          </Text>
          <Text style={styles.databaseInfo}>
            Database: SQLite | Data: Persistent | Backup: Available
          </Text>
        </View>
      </ScrollView>

      {/* Backup Options Modal */}
      <Modal
        animationType="slide"
        transparent={true}
        visible={backupModalVisible}
        onRequestClose={() => setBackupModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Backup Options</Text>
              <TouchableOpacity onPress={() => setBackupModalVisible(false)}>
                <X size={24} color="#64748B" />
              </TouchableOpacity>
            </View>

            <View style={styles.backupOptions}>
              <Text style={styles.backupDescription}>
                Choose where to save your backup file. The backup will include
                all your shop settings, inventory, and customer data.
              </Text>

              <TouchableOpacity
                style={styles.backupOption}
                onPress={handleBackupToLocal}
              >
                <View
                  style={[styles.backupIcon, { backgroundColor: '#F0F9FF' }]}
                >
                  <FolderOpen size={24} color="#2563EB" />
                </View>
                <View style={styles.backupOptionContent}>
                  <Text style={styles.backupOptionTitle}>
                    {Platform.OS === 'web'
                      ? 'Download Backup File'
                      : 'Save to Local Storage'}
                  </Text>
                  <Text style={styles.backupOptionDescription}>
                    {Platform.OS === 'web'
                      ? 'Download backup file to your computer. You can then upload it to cloud storage.'
                      : 'Save backup file to your device storage for safekeeping.'}
                  </Text>
                </View>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.backupOption}
                onPress={handleBackupToGoogleDrive}
              >
                <View
                  style={[styles.backupIcon, { backgroundColor: '#F0F9FF' }]}
                >
                  <Cloud size={24} color="#2563EB" />
                </View>
                <View style={styles.backupOptionContent}>
                  <Text style={styles.backupOptionTitle}>
                    Save to Google Drive
                  </Text>
                  <Text style={styles.backupOptionDescription}>
                    {Platform.OS === 'web'
                      ? 'Download the backup file and manually upload it to Google Drive for cloud storage.'
                      : 'Save your backup data to Google Drive for cloud storage and easy access.'}
                  </Text>
                </View>
              </TouchableOpacity>
            </View>

            <View style={styles.modalButtons}>
              <TouchableOpacity
                style={[styles.cancelButton, styles.fullWidthButton]}
                onPress={() => setBackupModalVisible(false)}
              >
                <Text style={styles.cancelButtonText}>Cancel</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Restore Options Modal */}
      <Modal
        animationType="slide"
        transparent={true}
        visible={restoreModalVisible}
        onRequestClose={() => setRestoreModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Restore Options</Text>
              <TouchableOpacity onPress={() => setRestoreModalVisible(false)}>
                <X size={24} color="#64748B" />
              </TouchableOpacity>
            </View>

            <View style={styles.backupOptions}>
              <Text style={styles.backupDescription}>
                Choose where to restore your data from. This will replace all
                current data with the backup data.
              </Text>

              <TouchableOpacity
                style={styles.backupOption}
                onPress={handleRestoreFromLocal}
              >
                <View
                  style={[styles.backupIcon, { backgroundColor: '#F0FDF4' }]}
                >
                  <FolderOpen size={24} color="#16A34A" />
                </View>
                <View style={styles.backupOptionContent}>
                  <Text style={styles.backupOptionTitle}>
                    Restore from Local
                  </Text>
                  <Text style={styles.backupOptionDescription}>
                    Restore data from a backup file stored on your device or
                    computer.
                  </Text>
                </View>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.backupOption}
                onPress={handleRestoreFromGoogleDrive}
              >
                <View
                  style={[styles.backupIcon, { backgroundColor: '#F0FDF4' }]}
                >
                  <Cloud size={24} color="#16A34A" />
                </View>
                <View style={styles.backupOptionContent}>
                  <Text style={styles.backupOptionTitle}>
                    Restore from Google Drive
                  </Text>
                  <Text style={styles.backupOptionDescription}>
                    Restore data from a backup file stored in your Google Drive.
                  </Text>
                </View>
              </TouchableOpacity>
            </View>

            <View style={styles.modalButtons}>
              <TouchableOpacity
                style={[styles.cancelButton, styles.fullWidthButton]}
                onPress={() => setRestoreModalVisible(false)}
              >
                <Text style={styles.cancelButtonText}>Cancel</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Shop Details Modal */}
      <Modal
        animationType="slide"
        transparent={true}
        visible={modalVisible}
        onRequestClose={() => setModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Shop Details</Text>
              <TouchableOpacity
                onPress={() => {
                  resetForm();
                  setModalVisible(false);
                }}
              >
                <X size={24} color="#64748B" />
              </TouchableOpacity>
            </View>

            <ScrollView
              style={styles.formContainer}
              showsVerticalScrollIndicator={false}
            >
              {/* Logo Upload Section */}
              <View style={styles.logoSection}>
                <Text style={styles.inputLabel}>Shop Logo</Text>
                <View style={styles.logoContainer}>
                  {formData.logo ? (
                    <View style={styles.logoPreview}>
                      <Image
                        source={{ uri: formData.logo }}
                        style={styles.logoImage}
                      />
                      <TouchableOpacity
                        style={styles.removeLogoButton}
                        onPress={removeLogo}
                      >
                        <X size={16} color="#FFFFFF" />
                      </TouchableOpacity>
                    </View>
                  ) : (
                    <View style={styles.logoPlaceholder}>
                      <ImageIcon size={40} color="#64748B" />
                      <Text style={styles.logoPlaceholderText}>No Logo</Text>
                    </View>
                  )}

                  <View style={styles.logoButtons}>
                    <TouchableOpacity
                      style={styles.logoButton}
                      onPress={pickImage}
                    >
                      <ImageIcon size={20} color="#2563EB" />
                      <Text style={styles.logoButtonText}>Gallery</Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                      style={styles.logoButton}
                      onPress={takePhoto}
                    >
                      <Camera size={20} color="#2563EB" />
                      <Text style={styles.logoButtonText}>Camera</Text>
                    </TouchableOpacity>
                  </View>
                </View>
                <Text style={styles.logoHint}>
                  Recommended: Square image, 500x500px, PNG or JPG
                </Text>
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Shop Name *</Text>
                <TextInput
                  style={styles.textInput}
                  value={formData.name}
                  onChangeText={(text) =>
                    setFormData({ ...formData, name: text })
                  }
                  placeholder="Enter shop name"
                  placeholderTextColor="#64748B"
                />
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Address *</Text>
                <TextInput
                  style={[styles.textInput, styles.multilineInput]}
                  value={formData.address}
                  onChangeText={(text) =>
                    setFormData({ ...formData, address: text })
                  }
                  placeholder="Enter shop address"
                  placeholderTextColor="#64748B"
                  multiline
                  numberOfLines={3}
                />
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Phone Number *</Text>
                <TextInput
                  style={styles.textInput}
                  value={formData.phone}
                  onChangeText={(text) =>
                    setFormData({ ...formData, phone: text })
                  }
                  placeholder="Enter phone number"
                  placeholderTextColor="#64748B"
                  keyboardType="phone-pad"
                />
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Email</Text>
                <TextInput
                  style={styles.textInput}
                  value={formData.email}
                  onChangeText={(text) =>
                    setFormData({ ...formData, email: text })
                  }
                  placeholder="Enter email address"
                  placeholderTextColor="#64748B"
                  keyboardType="email-address"
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
                  placeholderTextColor="#64748B"
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
                  placeholderTextColor="#64748B"
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
                  colors={['#2563EB', '#1D4ED8', '#3730A3']}
                  style={styles.saveButtonGradient}
                >
                  <Text style={styles.saveButtonText}>Save Changes</Text>
                </LinearGradient>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* About Us Modal */}
      <Modal
        animationType="slide"
        transparent={true}
        visible={aboutModalVisible}
        onRequestClose={() => setAboutModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>About Bill-Karo</Text>
              <TouchableOpacity onPress={() => setAboutModalVisible(false)}>
                <X size={24} color="#64748B" />
              </TouchableOpacity>
            </View>

            <ScrollView
              style={styles.aboutContainer}
              showsVerticalScrollIndicator={false}
            >
              <View style={styles.aboutSection}>
                <Text style={styles.aboutHeading}>
                  Revolutionizing Retail Management
                </Text>
                <Text style={styles.aboutText}>
                  This application is developed by Sameer Makwani with the
                  vision to digitize and create a user-friendly offline billing
                  management system for retail businesses across India.
                </Text>
              </View>

              <View style={styles.aboutSection}>
                <Text style={styles.aboutSubHeading}>Our Mission</Text>
                <Text style={styles.aboutText}>
                  To empower small and medium retail businesses with robust,
                  easy-to-use billing software that works seamlessly without
                  internet connectivity, ensuring business continuity in all
                  scenarios.
                </Text>
              </View>

              <View style={styles.aboutSection}>
                <Text style={styles.aboutSubHeading}>Key Features</Text>
                <View style={styles.featureList}>
                  <Text style={styles.featureItem}>
                    • Complete offline functionality
                  </Text>
                  <Text style={styles.featureItem}>
                    • Professional invoice generation
                  </Text>
                  <Text style={styles.featureItem}>• Inventory management</Text>
                  <Text style={styles.featureItem}>• Customer management</Text>
                  <Text style={styles.featureItem}>
                    • Sales analytics and reports
                  </Text>
                  <Text style={styles.featureItem}>
                    • Data backup and restore
                  </Text>
                  <Text style={styles.featureItem}>
                    • Custom logo and branding
                  </Text>
                  <Text style={styles.featureItem}>
                    • SQLite database for data persistence
                  </Text>
                </View>
              </View>

              <View style={styles.aboutSection}>
                <Text style={styles.aboutSubHeading}>Developer</Text>
                <View style={styles.developerInfo}>
                  <Text style={styles.developerName}>Sameer Makwani</Text>
                  <Text style={styles.developerRole}>
                    Full Stack Developer & Entrepreneur
                  </Text>
                  <Text style={styles.developerContact}>📱 9359789199</Text>
                  <Text style={styles.developerContact}>
                    📧 SupportBillKaro@gmail.com
                  </Text>
                </View>
              </View>

              <View style={styles.aboutSection}>
                <Text style={styles.aboutSubHeading}>Technical Excellence</Text>
                <Text style={styles.aboutText}>
                  Built with cutting-edge technologies including React Native,
                  TypeScript, Expo framework, and SQLite database, ensuring high
                  performance, reliability, and excellent user experience.
                </Text>
              </View>
            </ScrollView>

            <View style={styles.modalButtons}>
              <TouchableOpacity
                style={[styles.cancelButton, styles.fullWidthButton]}
                onPress={() => setAboutModalVisible(false)}
              >
                <Text style={styles.cancelButtonText}>Close</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8FAFC',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F8FAFC',
  },
  loadingText: {
    fontSize: 18,
    color: '#64748B',
  },
  header: {
    paddingTop: 60,
    paddingBottom: 20,
    paddingHorizontal: 20,
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#FFFFFF',
    marginBottom: 5,
  },
  headerSubtitle: {
    fontSize: 16,
    color: '#FFFFFF',
    opacity: 0.9,
  },
  content: {
    flex: 1,
    paddingHorizontal: 20,
  },
  shopInfoCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 20,
    marginVertical: 20,
    borderWidth: 1,
    borderColor: '#F1F5F9',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  shopInfoHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 10,
  },
  shopNameContainer: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
  },
  shopLogo: {
    width: 40,
    height: 40,
    borderRadius: 8,
    marginRight: 12,
    borderWidth: 1,
    borderColor: '#F1F5F9',
  },
  shopName: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#1E293B',
    flex: 1,
  },
  editButton: {
    backgroundColor: '#F0F9FF',
    borderRadius: 12,
    width: 36,
    height: 36,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E1EFFE',
  },
  shopAddress: {
    fontSize: 14,
    color: '#64748B',
    marginBottom: 5,
  },
  shopContact: {
    fontSize: 14,
    color: '#64748B',
    marginBottom: 5,
  },
  taglineSection: {
    marginTop: 15,
    paddingTop: 15,
    borderTopWidth: 1,
    borderTopColor: '#F1F5F9',
  },
  taglineLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1E293B',
    marginBottom: 8,
  },
  taglineText: {
    fontSize: 12,
    color: '#64748B',
    marginBottom: 3,
    fontStyle: 'italic',
  },
  section: {
    marginBottom: 25,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#1E293B',
    marginBottom: 12,
  },
  settingsCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#F1F5F9',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  settingItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  lastSettingItem: {
    borderBottomWidth: 0,
  },
  settingItemLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  settingIcon: {
    width: 44,
    height: 44,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 15,
  },
  settingContent: {
    flex: 1,
  },
  settingTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 2,
  },
  settingDescription: {
    fontSize: 14,
    color: '#64748B',
  },
  contactCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 20,
    marginBottom: 25,
    borderWidth: 1,
    borderColor: '#F1F5F9',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  contactTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#1E293B',
    marginBottom: 15,
    textAlign: 'center',
  },
  contactInfo: {
    marginBottom: 15,
  },
  contactItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
    paddingVertical: 8,
    paddingHorizontal: 12,
    backgroundColor: '#F8FAFC',
    borderRadius: 8,
  },
  contactLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#64748B',
  },
  contactValue: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#2563EB',
  },
  contactNote: {
    fontSize: 12,
    color: '#64748B',
    textAlign: 'center',
    fontStyle: 'italic',
    lineHeight: 16,
  },
  appInfoCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 20,
    marginBottom: 30,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#F1F5F9',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  appName: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#1E293B',
    marginBottom: 5,
  },
  appVersion: {
    fontSize: 14,
    color: '#64748B',
    marginBottom: 10,
  },
  appDescription: {
    fontSize: 12,
    color: '#64748B',
    textAlign: 'center',
    lineHeight: 18,
    marginBottom: 10,
  },
  databaseInfo: {
    fontSize: 10,
    color: '#94A3B8',
    fontStyle: 'italic',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modalContent: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 20,
    width: '100%',
    maxHeight: '80%',
    borderWidth: 1,
    borderColor: '#F1F5F9',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#1E293B',
  },
  formContainer: {
    maxHeight: 400,
  },
  aboutContainer: {
    maxHeight: 500,
  },
  aboutSection: {
    marginBottom: 20,
  },
  aboutHeading: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#1E3A8A',
    marginBottom: 12,
    textAlign: 'center',
  },
  aboutSubHeading: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#2563EB',
    marginBottom: 8,
  },
  aboutText: {
    fontSize: 14,
    color: '#64748B',
    lineHeight: 20,
    textAlign: 'justify',
  },
  featureList: {
    marginLeft: 10,
  },
  featureItem: {
    fontSize: 14,
    color: '#64748B',
    marginBottom: 4,
    lineHeight: 20,
  },
  developerInfo: {
    backgroundColor: '#F0F9FF',
    padding: 15,
    borderRadius: 12,
    borderLeftWidth: 4,
    borderLeftColor: '#2563EB',
  },
  developerName: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#1E293B',
    marginBottom: 4,
  },
  developerRole: {
    fontSize: 14,
    color: '#64748B',
    marginBottom: 8,
    fontStyle: 'italic',
  },
  developerContact: {
    fontSize: 14,
    color: '#2563EB',
    marginBottom: 2,
    fontWeight: '500',
  },
  // Backup/Restore Options Styles
  backupOptions: {
    marginBottom: 20,
  },
  backupDescription: {
    fontSize: 14,
    color: '#64748B',
    lineHeight: 20,
    marginBottom: 20,
    textAlign: 'center',
  },
  backupOption: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F8FAFC',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  backupIcon: {
    width: 48,
    height: 48,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  backupOptionContent: {
    flex: 1,
  },
  backupOptionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1E293B',
    marginBottom: 4,
  },
  backupOptionDescription: {
    fontSize: 14,
    color: '#64748B',
    lineHeight: 18,
  },
  // Logo Upload Styles
  logoSection: {
    marginBottom: 20,
  },
  logoContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  logoPreview: {
    position: 'relative',
    marginRight: 16,
  },
  logoImage: {
    width: 80,
    height: 80,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: '#E2E8F0',
  },
  removeLogoButton: {
    position: 'absolute',
    top: -8,
    right: -8,
    backgroundColor: '#EF4444',
    borderRadius: 12,
    width: 24,
    height: 24,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#FFFFFF',
  },
  logoPlaceholder: {
    width: 80,
    height: 80,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: '#E2E8F0',
    borderStyle: 'dashed',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
    backgroundColor: '#F8FAFC',
  },
  logoPlaceholderText: {
    fontSize: 12,
    color: '#64748B',
    marginTop: 4,
  },
  logoButtons: {
    flex: 1,
    flexDirection: 'row',
    gap: 12,
  },
  logoButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#F0F9FF',
    borderRadius: 12,
    paddingVertical: 12,
    paddingHorizontal: 8,
    borderWidth: 1,
    borderColor: '#E1EFFE',
    gap: 8,
  },
  logoButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#2563EB',
  },
  logoHint: {
    fontSize: 12,
    color: '#64748B',
    fontStyle: 'italic',
  },
  inputGroup: {
    marginBottom: 20,
  },
  inputLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1E293B',
    marginBottom: 8,
  },
  textInput: {
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 16,
    color: '#1E293B',
    backgroundColor: '#FFFFFF',
  },
  multilineInput: {
    height: 80,
    textAlignVertical: 'top',
  },
  modalButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 20,
    gap: 15,
  },
  fullWidthButton: {
    flex: 1,
  },
  cancelButton: {
    flex: 1,
    backgroundColor: '#F1F5F9',
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  cancelButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#64748B',
  },
  saveButton: {
    flex: 1,
    borderRadius: 12,
    overflow: 'hidden',
  },
  saveButtonGradient: {
    paddingVertical: 14,
    alignItems: 'center',
  },
  saveButtonText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#FFFFFF',
  },
});
