import { LinearGradient } from 'expo-linear-gradient';
import {
  Bell,
  CreditCard as Edit,
  FileText,
  HelpCircle,
  LogOut,
  Store,
  User,
  X,
} from 'lucide-react-native';
import React, { useState } from 'react';
import {
  Alert,
  Modal,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';

interface ShopSettings {
  name: string;
  address: string;
  phone: string;
  email: string;
  topTagline: string;
  bottomTagline: string;
}

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
  const [shopSettings, setShopSettings] = useState<ShopSettings>({
    name: 'S-Store General Store',
    address: '123 Main Street, Delhi - 110001',
    phone: '+91 9876543210',
    email: 'info@sstore.com',
    topTagline: 'Estimate',
    bottomTagline:
      'Thank you for your business! Items once purchased cannot be returned.',
  });

  const [formData, setFormData] = useState<ShopSettings>(shopSettings);

  const settingsSections: SettingsSection[] = [
    {
      title: 'Store Management',
      items: [
        {
          icon: Store,
          title: 'Shop Details',
          description: 'Update store information',
          action: () => setModalVisible(true),
        },
        {
          icon: FileText,
          title: 'Invoice Settings',
          description: 'Customize invoice format',
        },
        {
          icon: Bell,
          title: 'Notifications',
          description: 'Manage alerts and reminders',
        },
      ],
    },
    {
      title: 'Account',
      items: [
        { icon: User, title: 'Profile', description: 'Manage your account' },
        {
          icon: HelpCircle,
          title: 'Help & Support',
          description: 'Get help and contact support',
        },
        {
          icon: LogOut,
          title: 'Logout',
          description: 'Sign out of your account',
          danger: true,
        },
      ],
    },
  ];

  const saveSettings = () => {
    setShopSettings(formData);
    setModalVisible(false);
    Alert.alert('Success', 'Shop details updated successfully!');
  };

  const resetForm = () => {
    setFormData(shopSettings);
  };

  return (
    <View style={styles.container}>
      <StatusBar backgroundColor="#6B7280" barStyle="light-content" />

      {/* Header */}
      <LinearGradient colors={['#6B7280', '#4B5563']} style={styles.header}>
        <Text style={styles.headerTitle}>Settings</Text>
        <Text style={styles.headerSubtitle}>Manage your store preferences</Text>
      </LinearGradient>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {/* Current Shop Info */}
        <View style={styles.shopInfoCard}>
          <View style={styles.shopInfoHeader}>
            <Text style={styles.shopName}>{shopSettings.name}</Text>
            <TouchableOpacity
              style={styles.editButton}
              onPress={() => setModalVisible(true)}
            >
              <Edit size={16} color="#0066CC" />
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
                            (item.danger ?? false) ? '#FEE2E2' : '#F0F9FF',
                        },
                      ]}
                    >
                      <item.icon
                        size={20}
                        color={(item.danger ?? false) ? '#EF4444' : '#0066CC'}
                      />
                    </View>
                    <View style={styles.settingContent}>
                      <Text
                        style={[
                          styles.settingTitle,
                          {
                            color:
                              (item.danger ?? false) ? '#EF4444' : '#1F2937',
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

        {/* App Info */}
        <View style={styles.appInfoCard}>
          <Text style={styles.appName}>S-Store Management System</Text>
          <Text style={styles.appVersion}>Version 1.0.0</Text>
          <Text style={styles.appDescription}>
            A comprehensive billing and inventory management solution for retail
            stores
          </Text>
        </View>
      </ScrollView>

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
                <X size={24} color="#6B7280" />
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.formContainer}>
              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Shop Name *</Text>
                <TextInput
                  style={styles.textInput}
                  value={formData.name}
                  onChangeText={(text) =>
                    setFormData({ ...formData, name: text })
                  }
                  placeholder="Enter shop name"
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
                  colors={['#138808', '#0F6605']}
                  style={styles.saveButtonGradient}
                >
                  <Text style={styles.saveButtonText}>Save Changes</Text>
                </LinearGradient>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F8FAFC' },
  header: {
    paddingTop: 50,
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
  headerSubtitle: { fontSize: 16, color: '#FFFFFF', opacity: 0.9 },
  content: { flex: 1, paddingHorizontal: 20 },
  shopInfoCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 20,
    marginVertical: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  shopInfoHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  shopName: { fontSize: 20, fontWeight: 'bold', color: '#1F2937', flex: 1 },
  editButton: {
    backgroundColor: '#DBEAFE',
    borderRadius: 8,
    width: 32,
    height: 32,
    justifyContent: 'center',
    alignItems: 'center',
  },
  shopAddress: { fontSize: 14, color: '#6B7280', marginBottom: 5 },
  shopContact: { fontSize: 14, color: '#6B7280', marginBottom: 5 },
  taglineSection: {
    marginTop: 15,
    paddingTop: 15,
    borderTopWidth: 1,
    borderTopColor: '#E5E7EB',
  },
  taglineLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1F2937',
    marginBottom: 8,
  },
  taglineText: {
    fontSize: 12,
    color: '#6B7280',
    marginBottom: 3,
    fontStyle: 'italic',
  },
  section: { marginBottom: 25 },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#1F2937',
    marginBottom: 12,
  },
  settingsCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
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
    borderBottomColor: '#F3F4F6',
  },
  lastSettingItem: { borderBottomWidth: 0 },
  settingItemLeft: { flexDirection: 'row', alignItems: 'center', flex: 1 },
  settingIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 15,
  },
  settingContent: { flex: 1 },
  settingTitle: { fontSize: 16, fontWeight: '600', marginBottom: 2 },
  settingDescription: { fontSize: 14, color: '#6B7280' },
  appInfoCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 20,
    marginBottom: 30,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  appName: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#1F2937',
    marginBottom: 5,
  },
  appVersion: { fontSize: 14, color: '#6B7280', marginBottom: 10 },
  appDescription: {
    fontSize: 12,
    color: '#6B7280',
    textAlign: 'center',
    lineHeight: 18,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 20,
    width: '90%',
    maxHeight: '80%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  modalTitle: { fontSize: 20, fontWeight: 'bold', color: '#1F2937' },
  formContainer: { maxHeight: 400 },
  inputGroup: { marginBottom: 20 },
  inputLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1F2937',
    marginBottom: 8,
  },
  textInput: {
    borderWidth: 1,
    borderColor: '#D1D5DB',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 16,
    color: '#1F2937',
  },
  multilineInput: { height: 80, textAlignVertical: 'top' },
  modalButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 20,
    gap: 15,
  },
  cancelButton: {
    flex: 1,
    backgroundColor: '#F3F4F6',
    borderRadius: 8,
    paddingVertical: 12,
    alignItems: 'center',
  },
  cancelButtonText: { fontSize: 16, fontWeight: '600', color: '#6B7280' },
  saveButton: { flex: 1, borderRadius: 8, overflow: 'hidden' },
  saveButtonGradient: { paddingVertical: 12, alignItems: 'center' },
  saveButtonText: { fontSize: 16, fontWeight: 'bold', color: '#FFFFFF' },
});
