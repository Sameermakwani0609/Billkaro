import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Dimensions,
  FlatList,
  Modal,
  RefreshControl,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import {
  Category,
  deleteCategory,
  getAllCategories,
  getCategoryUsageCount,
  insertCategory,
  searchCategoriesByName,
  updateCategory,
} from '../../lib/db';

const { width } = Dimensions.get('window');

export default function CategoryManagementScreen() {
  const [categories, setCategories] = useState<Category[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [showAddModal, setShowAddModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<Category | null>(
    null,
  );
  const [usageCount, setUsageCount] = useState({
    products: 0,
    purchaseItems: 0,
  });
  const [categoryName, setCategoryName] = useState('');
  const [isDuplicate, setIsDuplicate] = useState(false);

  // Load categories on component mount
  useEffect(() => {
    loadCategories();
  }, []);

  // Check for duplicates in real-time
  useEffect(() => {
    if (categoryName.trim().length >= 2) {
      const duplicate = categories.some(
        cat => cat.name.toLowerCase() === categoryName.trim().toLowerCase()
      );
      setIsDuplicate(duplicate);
    } else {
      setIsDuplicate(false);
    }
  }, [categoryName, categories]);

  const loadCategories = async () => {
    try {
      setIsLoading(true);
      const allCategories = await getAllCategories();
      setCategories(allCategories);
    } catch (error) {
      console.error('Error loading categories:', error);
      Alert.alert('Error', 'Failed to load categories');
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  };

  const handleRefresh = () => {
    setIsRefreshing(true);
    loadCategories();
  };

  const handleSearch = async (text: string) => {
    setSearchQuery(text);

    if (text.length === 0) {
      loadCategories();
      return;
    }

    try {
      const searchResults = await searchCategoriesByName(text);
      setCategories(searchResults);
    } catch (error) {
      console.error('Error searching categories:', error);
    }
  };

  const handleAddCategory = async () => {
    if (!categoryName.trim()) {
      Alert.alert('Error', 'Please enter category name');
      return;
    }

    if (categoryName.trim().length < 2) {
      Alert.alert('Error', 'Category name must be at least 2 characters long');
      return;
    }

    const trimmedName = categoryName.trim();

    // Check if category already exists locally first
    const existingCategory = categories.find(
      cat => cat.name.toLowerCase() === trimmedName.toLowerCase()
    );

    if (existingCategory) {
      Alert.alert(
        'Category Exists', 
        `A category with name "${trimmedName}" already exists. Please use a different name.`
      );
      return;
    }

    setIsSubmitting(true);

    try {
      await insertCategory(trimmedName);

      Alert.alert('Success', 'Category added successfully!');

      // Reset form and close modal
      setCategoryName('');
      setShowAddModal(false);
      setIsDuplicate(false);

      // Reload categories
      loadCategories();
    } catch (error: any) {
      console.error('Error adding category:', error);
      
      // More specific error handling for unique constraint
      if (error.message?.includes('UNIQUE constraint failed') || 
          error.message?.includes('SQLITE_CONSTRAINT_UNIQUE') ||
          error.toString().includes('UNIQUE')) {
        Alert.alert(
          'Category Exists', 
          `A category with name "${trimmedName}" already exists. Please use a different name.`
        );
      } else {
        Alert.alert('Error', 'Failed to add category. Please try again.');
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleEditCategory = async () => {
    if (!selectedCategory || !categoryName.trim()) {
      return;
    }

    if (categoryName.trim().length < 2) {
      Alert.alert('Error', 'Category name must be at least 2 characters long');
      return;
    }

    const trimmedName = categoryName.trim();

    // Check if category already exists (excluding the current one being edited)
    const existingCategory = categories.find(
      cat => 
        cat.name.toLowerCase() === trimmedName.toLowerCase() && 
        cat.id !== selectedCategory.id
    );

    if (existingCategory) {
      Alert.alert(
        'Category Exists', 
        `A category with name "${trimmedName}" already exists. Please use a different name.`
      );
      return;
    }

    setIsSubmitting(true);

    try {
      await updateCategory(selectedCategory.id, trimmedName);

      Alert.alert('Success', 'Category updated successfully!');

      // Reset form and close modal
      setCategoryName('');
      setShowEditModal(false);
      setSelectedCategory(null);
      setIsDuplicate(false);

      // Reload categories
      loadCategories();
    } catch (error: any) {
      console.error('Error updating category:', error);

      if (error.message?.includes('already exists') || 
          error.message?.includes('UNIQUE constraint failed') ||
          error.toString().includes('UNIQUE')) {
        Alert.alert('Error', 'Category name already exists');
      } else if (error.message?.includes('not found')) {
        Alert.alert('Error', 'Category not found');
      } else {
        Alert.alert('Error', 'Failed to update category');
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteCategory = async () => {
    if (!selectedCategory) return;

    setIsSubmitting(true);

    try {
      await deleteCategory(selectedCategory.id);

      Alert.alert('Success', 'Category deleted successfully!');

      // Close modal and reset
      setShowDeleteModal(false);
      setSelectedCategory(null);

      // Reload categories
      loadCategories();
    } catch (error: any) {
      console.error('Error deleting category:', error);

      if (error.message?.includes('being used by')) {
        Alert.alert('Cannot Delete', error.message);
      } else if (error.message?.includes('not found')) {
        Alert.alert('Error', 'Category not found');
      } else {
        Alert.alert('Error', 'Failed to delete category');
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const openEditModal = (category: Category) => {
    setSelectedCategory(category);
    setCategoryName(category.name);
    setIsDuplicate(false);
    setShowEditModal(true);
  };

  const openDeleteModal = async (category: Category) => {
    setSelectedCategory(category);

    try {
      const usage = await getCategoryUsageCount(category.id);
      setUsageCount(usage);
    } catch (error) {
      console.error('Error getting category usage:', error);
      setUsageCount({ products: 0, purchaseItems: 0 });
    }

    setShowDeleteModal(true);
  };

  const resetForm = () => {
    setCategoryName('');
    setSearchQuery('');
    setSelectedCategory(null);
    setUsageCount({ products: 0, purchaseItems: 0 });
    setIsDuplicate(false);
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-IN', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    });
  };

  const getCategoryColor = (index: number) => {
    const colors = [
      '#E0F2FE',
      '#F0FDF4',
      '#FEF7CD',
      '#FCE7F3',
      '#E0E7FF',
      '#FFEDD5',
      '#FEF3C7',
      '#DCFCE7',
      '#F3E8FF',
      '#CCFBF1',
    ];
    return colors[index % colors.length];
  };

  const getCategoryIcon = (index: number) => {
    const icons = ['📦', '🏷️', '📁', '🗂️', '📊', '🏢', '🛍️', '📋', '📎', '🔖'];
    return icons[index % icons.length];
  };

  const renderCategoryItem = ({
    item,
    index,
  }: {
    item: Category;
    index: number;
  }) => (
    <View style={styles.categoryCard}>
      <View
        style={[
          styles.categoryColorBar,
          { backgroundColor: getCategoryColor(index) },
        ]}
      />
      <View style={styles.categoryContent}>
        <View style={styles.categoryHeader}>
          <View style={styles.categoryTitleContainer}>
            <Text style={styles.categoryIcon}>{getCategoryIcon(index)}</Text>
            <View style={styles.categoryTextContainer}>
              <Text style={styles.categoryName}>{item.name}</Text>
              <Text style={styles.categoryId}>ID: #{item.id}</Text>
            </View>
          </View>
          <View style={styles.actionButtons}>
            <TouchableOpacity
              style={[styles.actionButton, styles.editButton]}
              onPress={() => openEditModal(item)}
            >
              <Text style={styles.editButtonIcon}>✏️</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.actionButton, styles.deleteButton]}
              onPress={() => openDeleteModal(item)}
            >
              <Text style={styles.deleteButtonIcon}>🗑️</Text>
            </TouchableOpacity>
          </View>
        </View>
        <View style={styles.categoryFooter}>
          <View style={styles.dateBadge}>
            <Text style={styles.dateBadgeText}>
              📅 {formatDate(item.createdAt)}
            </Text>
          </View>
        </View>
      </View>
    </View>
  );

  const getCategoryCountText = () => {
    const count = categories.length;
    if (count === 0) return 'No categories yet';
    if (count === 1) return '1 category';
    return `${count} categories`;
  };

  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#2563EB" />
        <Text style={styles.loadingText}>Loading categories...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerContent}>
          <Text style={styles.title}>Category Management</Text>
          <View style={styles.categoryCountContainer}>
            <View style={styles.countBadge}>
              <Text style={styles.countNumber}>{categories.length}</Text>
              <Text style={styles.countLabel}>
                categor{categories.length !== 1 ? 'ies' : 'y'}
              </Text>
            </View>
          </View>
        </View>
        <Text style={styles.subtitle}>
          Organize your products with categories
        </Text>
      </View>

      {/* Search and Add Button */}
      <View style={styles.actionsContainer}>
        <View style={styles.searchContainer}>
          <Text style={styles.searchIcon}>🔍</Text>
          <TextInput
            style={styles.searchInput}
            placeholder="Search categories..."
            placeholderTextColor="#94A3B8"
            value={searchQuery}
            onChangeText={handleSearch}
          />
          {searchQuery.length > 0 && (
            <TouchableOpacity onPress={() => handleSearch('')}>
              <Text style={styles.clearSearch}>✕</Text>
            </TouchableOpacity>
          )}
        </View>

        <TouchableOpacity
          style={styles.addButton}
          onPress={() => setShowAddModal(true)}
        >
          <Text style={styles.addButtonIcon}>+</Text>
          <Text style={styles.addButtonText}>Add New</Text>
        </TouchableOpacity>
      </View>

      {/* Results Header */}
      {categories.length > 0 && (
        <View style={styles.resultsHeader}>
          <Text style={styles.resultsText}>
            {getCategoryCountText()}
            {searchQuery && ` for "${searchQuery}"`}
          </Text>
        </View>
      )}

      {/* Categories List */}
      {categories.length === 0 ? (
        <View style={styles.emptyState}>
          <Text style={styles.emptyStateIcon}>📁</Text>
          <Text style={styles.emptyStateTitle}>
            {searchQuery ? 'No categories found' : 'No categories yet'}
          </Text>
          <Text style={styles.emptyStateSubtitle}>
            {searchQuery
              ? 'Try a different search term'
              : 'Create your first category to organize products'}
          </Text>
          {!searchQuery && (
            <TouchableOpacity
              style={styles.emptyStateButton}
              onPress={() => setShowAddModal(true)}
            >
              <Text style={styles.emptyStateButtonIcon}>+</Text>
              <Text style={styles.emptyStateButtonText}>
                Create First Category
              </Text>
            </TouchableOpacity>
          )}
        </View>
      ) : (
        <FlatList
          data={categories}
          renderItem={renderCategoryItem}
          keyExtractor={(item) => item.id.toString()}
          contentContainerStyle={styles.listContainer}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl
              refreshing={isRefreshing}
              onRefresh={handleRefresh}
              colors={['#2563EB']}
              tintColor="#2563EB"
            />
          }
        />
      )}

      {/* Add Category Modal */}
      <Modal
        visible={showAddModal}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setShowAddModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContainer}>
            {/* Modal Header */}
            <View style={styles.modalHeader}>
              <View style={styles.modalTitleContainer}>
                <Text style={styles.modalIcon}>📁</Text>
                <Text style={styles.modalTitle}>Add New Category</Text>
              </View>
              <TouchableOpacity
                style={styles.closeButton}
                onPress={() => {
                  setShowAddModal(false);
                  resetForm();
                }}
              >
                <Text style={styles.closeButtonText}>✕</Text>
              </TouchableOpacity>
            </View>

            {/* Category Form */}
            <View style={styles.formContainer}>
              <View style={styles.formGroup}>
                <Text style={styles.label}>Category Name *</Text>
                <TextInput
                  style={[
                    styles.input,
                    isDuplicate && styles.duplicateInput
                  ]}
                  placeholder="Enter category name"
                  placeholderTextColor="#94A3B8"
                  value={categoryName}
                  onChangeText={setCategoryName}
                  autoFocus
                  maxLength={50}
                />
                {isDuplicate && (
                  <Text style={styles.duplicateWarning}>
                    ⚠️ A category with this name already exists
                  </Text>
                )}
                <Text style={styles.charCount}>
                  {categoryName.length}/50 characters
                </Text>
              </View>
            </View>

            {/* Action Buttons */}
            <View style={styles.modalActions}>
              <TouchableOpacity
                style={[styles.modalButton, styles.cancelButton]}
                onPress={() => {
                  setShowAddModal(false);
                  resetForm();
                }}
                disabled={isSubmitting}
              >
                <Text style={styles.cancelButtonText}>Cancel</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[
                  styles.modalButton,
                  styles.saveButton,
                  (!categoryName.trim() || isSubmitting || isDuplicate) &&
                    styles.saveButtonDisabled,
                ]}
                onPress={handleAddCategory}
                disabled={!categoryName.trim() || isSubmitting || isDuplicate}
              >
                {isSubmitting ? (
                  <ActivityIndicator size="small" color="#FFFFFF" />
                ) : (
                  <>
                    <Text style={styles.saveButtonIcon}>+</Text>
                    <Text style={styles.saveButtonText}>Add Category</Text>
                  </>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Edit Category Modal */}
      <Modal
        visible={showEditModal}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setShowEditModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContainer}>
            {/* Modal Header */}
            <View style={styles.modalHeader}>
              <View style={styles.modalTitleContainer}>
                <Text style={styles.modalIcon}>✏️</Text>
                <Text style={styles.modalTitle}>Edit Category</Text>
              </View>
              <TouchableOpacity
                style={styles.closeButton}
                onPress={() => {
                  setShowEditModal(false);
                  resetForm();
                }}
              >
                <Text style={styles.closeButtonText}>✕</Text>
              </TouchableOpacity>
            </View>

            {/* Category Form */}
            <View style={styles.formContainer}>
              <View style={styles.formGroup}>
                <Text style={styles.label}>Category Name *</Text>
                <TextInput
                  style={[
                    styles.input,
                    isDuplicate && styles.duplicateInput
                  ]}
                  placeholder="Enter category name"
                  placeholderTextColor="#94A3B8"
                  value={categoryName}
                  onChangeText={setCategoryName}
                  autoFocus
                  maxLength={50}
                />
                {isDuplicate && (
                  <Text style={styles.duplicateWarning}>
                    ⚠️ A category with this name already exists
                  </Text>
                )}
                <Text style={styles.charCount}>
                  {categoryName.length}/50 characters
                </Text>
              </View>
              {selectedCategory && (
                <View style={styles.categoryInfo}>
                  <Text style={styles.categoryInfoText}>
                    Category ID: #{selectedCategory.id}
                  </Text>
                  <Text style={styles.categoryInfoText}>
                    Created: {formatDate(selectedCategory.createdAt)}
                  </Text>
                </View>
              )}
            </View>

            {/* Action Buttons */}
            <View style={styles.modalActions}>
              <TouchableOpacity
                style={[styles.modalButton, styles.cancelButton]}
                onPress={() => {
                  setShowEditModal(false);
                  resetForm();
                }}
                disabled={isSubmitting}
              >
                <Text style={styles.cancelButtonText}>Cancel</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[
                  styles.modalButton,
                  styles.saveButton,
                  (!categoryName.trim() || isSubmitting || isDuplicate) &&
                    styles.saveButtonDisabled,
                ]}
                onPress={handleEditCategory}
                disabled={!categoryName.trim() || isSubmitting || isDuplicate}
              >
                {isSubmitting ? (
                  <ActivityIndicator size="small" color="#FFFFFF" />
                ) : (
                  <>
                    <Text style={styles.saveButtonIcon}>💾</Text>
                    <Text style={styles.saveButtonText}>Update Category</Text>
                  </>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Delete Confirmation Modal */}
      <Modal
        visible={showDeleteModal}
        animationType="fade"
        transparent={true}
        onRequestClose={() => setShowDeleteModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContainer, styles.deleteModalContainer]}>
            {/* Warning Icon */}
            <View style={styles.warningIconContainer}>
              <Text style={styles.warningIcon}>⚠️</Text>
            </View>

            {/* Modal Header */}
            <View style={styles.modalHeader}>
              <Text style={styles.deleteModalTitle}>Delete Category</Text>
              <Text style={styles.deleteModalSubtitle}>
                Are you sure you want to delete this category? This action
                cannot be undone.
              </Text>
            </View>

            {/* Category Details */}
            {selectedCategory && (
              <View style={styles.deleteContent}>
                <View style={styles.categoryDetailCard}>
                  <Text style={styles.categoryDetailName}>
                    {selectedCategory.name}
                  </Text>
                  <Text style={styles.categoryDetailId}>
                    ID: #{selectedCategory.id}
                  </Text>
                  <Text style={styles.categoryDetailDate}>
                    Created: {formatDate(selectedCategory.createdAt)}
                  </Text>
                </View>

                {/* Usage Warning */}
                {(usageCount.products > 0 || usageCount.purchaseItems > 0) && (
                  <View style={styles.usageWarning}>
                    <Text style={styles.usageWarningTitle}>
                      ⚠️ Cannot Delete
                    </Text>
                    <Text style={styles.usageWarningText}>
                      This category is currently being used by:
                    </Text>
                    {usageCount.products > 0 && (
                      <Text style={styles.usageCountText}>
                        • {usageCount.products} product
                        {usageCount.products !== 1 ? 's' : ''}
                      </Text>
                    )}
                    {usageCount.purchaseItems > 0 && (
                      <Text style={styles.usageCountText}>
                        • {usageCount.purchaseItems} purchase item
                        {usageCount.purchaseItems !== 1 ? 's' : ''}
                      </Text>
                    )}
                    <Text style={styles.usageWarningNote}>
                      Please reassign or delete these items first.
                    </Text>
                  </View>
                )}
              </View>
            )}

            {/* Action Buttons */}
            <View style={styles.modalActions}>
              <TouchableOpacity
                style={[styles.modalButton, styles.cancelButton]}
                onPress={() => {
                  setShowDeleteModal(false);
                  resetForm();
                }}
                disabled={isSubmitting}
              >
                <Text style={styles.cancelButtonText}>Cancel</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[
                  styles.modalButton,
                  styles.deleteConfirmButton,
                  (usageCount.products > 0 ||
                    usageCount.purchaseItems > 0 ||
                    isSubmitting) &&
                    styles.deleteButtonDisabled,
                ]}
                onPress={handleDeleteCategory}
                disabled={
                  usageCount.products > 0 ||
                  usageCount.purchaseItems > 0 ||
                  isSubmitting
                }
              >
                {isSubmitting ? (
                  <ActivityIndicator size="small" color="#FFFFFF" />
                ) : (
                  <>
                    <Text style={styles.deleteConfirmButtonIcon}>🗑️</Text>
                    <Text style={styles.deleteConfirmButtonText}>
                      Delete Category
                    </Text>
                  </>
                )}
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
  header: {
    padding: 24,
    paddingBottom: 20,
    backgroundColor: '#1E3A8A',
    borderBottomLeftRadius: 28,
    borderBottomRightRadius: 28,
    elevation: 8,
    shadowColor: '#1E3A8A',
    shadowOffset: { width: 0, height: 5 },
    shadowOpacity: 0.3,
    shadowRadius: 12,
  },
  headerContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  title: {
    fontSize: 28,
    fontWeight: '900',
    color: '#FFFFFF',
    letterSpacing: 0.5,
    flex: 1,
  },
  categoryCountContainer: {
    alignItems: 'flex-end',
  },
  countBadge: {
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.3)',
  },
  countNumber: {
    fontSize: 20,
    fontWeight: '900',
    color: '#FFFFFF',
    marginBottom: -2,
  },
  countLabel: {
    fontSize: 12,
    color: '#E0E7FF',
    fontWeight: '600',
    letterSpacing: 0.3,
  },
  subtitle: {
    fontSize: 16,
    color: '#E0E7FF',
    fontWeight: '500',
    letterSpacing: 0.3,
  },
  actionsContainer: {
    flexDirection: 'row',
    padding: 16,
    gap: 12,
    alignItems: 'center',
  },
  searchContainer: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    borderWidth: 2,
    borderColor: '#E2E8F0',
    paddingHorizontal: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  searchIcon: {
    fontSize: 16,
    marginRight: 12,
    color: '#64748B',
  },
  searchInput: {
    flex: 1,
    paddingVertical: 14,
    fontSize: 16,
    color: '#1E293B',
    fontWeight: '600',
  },
  clearSearch: {
    fontSize: 16,
    color: '#64748B',
    fontWeight: '600',
    padding: 4,
  },
  addButton: {
    backgroundColor: '#2563EB',
    paddingHorizontal: 20,
    paddingVertical: 14,
    borderRadius: 16,
    shadowColor: '#2563EB',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 12,
    elevation: 6,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  addButtonIcon: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: '800',
  },
  addButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '800',
    letterSpacing: 0.3,
  },
  resultsHeader: {
    paddingHorizontal: 24,
    paddingVertical: 12,
    backgroundColor: '#F1F5F9',
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
  },
  resultsText: {
    fontSize: 14,
    color: '#64748B',
    fontWeight: '600',
    letterSpacing: 0.3,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F8FAFC',
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: '#64748B',
    fontWeight: '600',
  },
  listContainer: {
    padding: 16,
    paddingBottom: 30,
  },
  categoryCard: {
    backgroundColor: '#FFFFFF',
    marginBottom: 16,
    borderRadius: 20,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 4,
    borderWidth: 1.5,
    borderColor: '#F1F5F9',
  },
  categoryColorBar: {
    height: 4,
    width: '100%',
  },
  categoryContent: {
    padding: 20,
  },
  categoryHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 16,
  },
  categoryTitleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  categoryIcon: {
    fontSize: 24,
    marginRight: 12,
  },
  categoryTextContainer: {
    flex: 1,
  },
  categoryName: {
    fontSize: 18,
    fontWeight: '800',
    color: '#1E293B',
    letterSpacing: 0.3,
    marginBottom: 4,
  },
  categoryId: {
    fontSize: 12,
    color: '#64748B',
    fontWeight: '600',
    letterSpacing: 0.3,
  },
  categoryFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  dateBadge: {
    backgroundColor: '#F8FAFC',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  dateBadgeText: {
    fontSize: 12,
    color: '#64748B',
    fontWeight: '600',
    letterSpacing: 0.3,
  },
  actionButtons: {
    flexDirection: 'row',
    gap: 8,
  },
  actionButton: {
    width: 40,
    height: 40,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
  },
  editButton: {
    backgroundColor: '#F0F9FF',
    borderColor: '#0EA5E9',
  },
  editButtonIcon: {
    fontSize: 16,
  },
  deleteButton: {
    backgroundColor: '#FEF2F2',
    borderColor: '#EF4444',
  },
  deleteButtonIcon: {
    fontSize: 16,
  },
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 40,
  },
  emptyStateIcon: {
    fontSize: 80,
    marginBottom: 20,
    opacity: 0.7,
  },
  emptyStateTitle: {
    fontSize: 22,
    fontWeight: '800',
    color: '#1E293B',
    marginBottom: 8,
    textAlign: 'center',
  },
  emptyStateSubtitle: {
    fontSize: 16,
    color: '#64748B',
    textAlign: 'center',
    fontWeight: '500',
    marginBottom: 24,
    lineHeight: 22,
  },
  emptyStateButton: {
    backgroundColor: '#2563EB',
    paddingHorizontal: 24,
    paddingVertical: 14,
    borderRadius: 16,
    shadowColor: '#2563EB',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 6,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  emptyStateButtonIcon: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: '800',
  },
  emptyStateButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '800',
    letterSpacing: 0.3,
  },
  // Modal Styles
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modalContainer: {
    backgroundColor: '#FFFFFF',
    borderRadius: 24,
    padding: 0,
    width: width * 0.9,
    maxHeight: '80%',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 10,
    },
    shadowOpacity: 0.25,
    shadowRadius: 20,
    elevation: 10,
  },
  deleteModalContainer: {
    maxHeight: '70%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    padding: 24,
    paddingBottom: 20,
    backgroundColor: '#F8FAFC',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
  },
  modalTitleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  modalIcon: {
    fontSize: 20,
    marginRight: 12,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '800',
    color: '#1E293B',
    flex: 1,
  },
  closeButton: {
    padding: 4,
    backgroundColor: '#F1F5F9',
    borderRadius: 12,
    width: 32,
    height: 32,
    justifyContent: 'center',
    alignItems: 'center',
  },
  closeButtonText: {
    fontSize: 16,
    color: '#64748B',
    fontWeight: '600',
  },
  formContainer: {
    padding: 24,
  },
  formGroup: {
    marginBottom: 20,
  },
  label: {
    fontSize: 16,
    fontWeight: '700',
    color: '#475569',
    marginBottom: 8,
    letterSpacing: 0.3,
  },
  input: {
    borderWidth: 2,
    borderColor: '#E2E8F0',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: 16,
    backgroundColor: '#FFFFFF',
    color: '#1E293B',
    fontWeight: '600',
  },
  duplicateInput: {
    borderColor: '#EF4444',
    backgroundColor: '#FEF2F2',
  },
  duplicateWarning: {
    color: '#DC2626',
    fontSize: 12,
    fontWeight: '600',
    marginTop: 4,
  },
  charCount: {
    fontSize: 12,
    color: '#64748B',
    marginTop: 4,
    fontWeight: '500',
    textAlign: 'right',
  },
  categoryInfo: {
    backgroundColor: '#F8FAFC',
    padding: 16,
    borderRadius: 12,
    borderLeftWidth: 4,
    borderLeftColor: '#2563EB',
  },
  categoryInfoText: {
    fontSize: 12,
    color: '#64748B',
    fontWeight: '600',
    marginBottom: 2,
  },
  modalActions: {
    flexDirection: 'row',
    gap: 12,
    padding: 24,
    paddingTop: 0,
  },
  modalButton: {
    flex: 1,
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    gap: 8,
  },
  cancelButton: {
    backgroundColor: '#F8FAFC',
    borderWidth: 2,
    borderColor: '#E2E8F0',
  },
  saveButton: {
    backgroundColor: '#2563EB',
    shadowColor: '#2563EB',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 6,
  },
  saveButtonDisabled: {
    backgroundColor: '#94A3B8',
    shadowOpacity: 0,
    elevation: 0,
  },
  cancelButtonText: {
    color: '#64748B',
    fontSize: 16,
    fontWeight: '800',
    letterSpacing: 0.3,
  },
  saveButtonIcon: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  saveButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '800',
    letterSpacing: 0.3,
  },
  // Delete Modal Specific Styles
  warningIconContainer: {
    alignItems: 'center',
    paddingTop: 24,
  },
  warningIcon: {
    fontSize: 48,
  },
  deleteModalTitle: {
    fontSize: 20,
    fontWeight: '800',
    color: '#DC2626',
    marginBottom: 8,
  },
  deleteModalSubtitle: {
    fontSize: 14,
    color: '#64748B',
    lineHeight: 20,
  },
  deleteContent: {
    padding: 24,
    paddingTop: 0,
  },
  categoryDetailCard: {
    backgroundColor: '#F8FAFC',
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    marginBottom: 16,
  },
  categoryDetailName: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1E293B',
    marginBottom: 4,
  },
  categoryDetailId: {
    fontSize: 12,
    color: '#64748B',
    fontWeight: '600',
    marginBottom: 2,
  },
  categoryDetailDate: {
    fontSize: 12,
    color: '#64748B',
    fontWeight: '600',
  },
  usageWarning: {
    backgroundColor: '#FEF2F2',
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#FECACA',
  },
  usageWarningTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#DC2626',
    marginBottom: 8,
  },
  usageWarningText: {
    fontSize: 14,
    color: '#7F1D1D',
    marginBottom: 8,
    fontWeight: '600',
  },
  usageCountText: {
    fontSize: 14,
    color: '#7F1D1D',
    marginLeft: 8,
    marginBottom: 4,
    fontWeight: '500',
  },
  usageWarningNote: {
    fontSize: 12,
    color: '#DC2626',
    fontStyle: 'italic',
    marginTop: 8,
    fontWeight: '500',
  },
  deleteConfirmButton: {
    backgroundColor: '#DC2626',
    shadowColor: '#DC2626',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 6,
  },
  deleteButtonDisabled: {
    backgroundColor: '#94A3B8',
    shadowOpacity: 0,
    elevation: 0,
  },
  deleteConfirmButtonIcon: {
    color: '#FFFFFF',
    fontSize: 16,
  },
  deleteConfirmButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '800',
    letterSpacing: 0.3,
  },
});