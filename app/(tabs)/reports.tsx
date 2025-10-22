import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, StatusBar } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { ChartBar as BarChart3, TrendingUp, Calendar, DollarSign, Package, Users } from 'lucide-react-native';

interface SalesData {
  date: string;
  amount: number;
  items: number;
  invoices: number;
}

export default function Reports() {
  const [selectedPeriod, setSelectedPeriod] = useState<'today' | 'week' | 'month'>('today');
  
  const salesData: SalesData[] = [
    { date: '2024-01-15', amount: 12450, items: 45, invoices: 8 },
    { date: '2024-01-14', amount: 8750, items: 32, invoices: 6 },
    { date: '2024-01-13', amount: 15200, items: 58, invoices: 12 },
    { date: '2024-01-12', amount: 9800, items: 38, invoices: 7 },
    { date: '2024-01-11', amount: 11300, items: 42, invoices: 9 },
  ];

  const topProducts = [
    { name: 'Basmati Rice 1kg', sold: 25, revenue: 3000 },
    { name: 'Tata Salt 1kg', sold: 50, revenue: 1250 },
    { name: 'Maggi Noodles', sold: 80, revenue: 1200 },
    { name: 'Amul Butter 500g', sold: 15, revenue: 2700 },
    { name: 'Fortune Oil 1L', sold: 20, revenue: 2800 },
  ];

  const getTotalSales = () => salesData.reduce((sum, day) => sum + day.amount, 0);
  const getTotalItems = () => salesData.reduce((sum, day) => sum + day.items, 0);
  const getTotalInvoices = () => salesData.reduce((sum, day) => sum + day.invoices, 0);
  const getAverageSale = () => Math.round(getTotalSales() / getTotalInvoices());

  const periods = [
    { key: 'today' as const, label: 'Today' },
    { key: 'week' as const, label: 'This Week' },
    { key: 'month' as const, label: 'This Month' },
  ];

  const stats = [
    { 
      title: 'Total Sales', 
      value: `₹${getTotalSales().toLocaleString()}`, 
      icon: DollarSign, 
      color: '#138808',
      change: '+12.5%'
    },
    { 
      title: 'Items Sold', 
      value: getTotalItems().toString(), 
      icon: Package, 
      color: '#0066CC',
      change: '+8.2%'
    },
    { 
      title: 'Total Invoices', 
      value: getTotalInvoices().toString(), 
      icon: BarChart3, 
      color: '#FF9933',
      change: '+15.3%'
    },
    { 
      title: 'Average Sale', 
      value: `₹${getAverageSale()}`, 
      icon: TrendingUp, 
      color: '#8B5CF6',
      change: '+5.7%'
    },
  ];

  return (
    <View style={styles.container}>
      <StatusBar backgroundColor="#EC4899" barStyle="light-content" />
      
      {/* Header */}
      <LinearGradient colors={['#EC4899', '#DB2777']} style={styles.header}>
        <Text style={styles.headerTitle}>Sales Reports</Text>
        <Text style={styles.headerSubtitle}>Track your business performance</Text>
      </LinearGradient>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {/* Period Selector */}
        <View style={styles.periodSelector}>
          {periods.map((period) => (
            <TouchableOpacity
              key={period.key}
              style={[
                styles.periodButton,
                selectedPeriod === period.key && styles.activePeriodButton
              ]}
              onPress={() => setSelectedPeriod(period.key)}
            >
              <Text style={[
                styles.periodButtonText,
                selectedPeriod === period.key && styles.activePeriodButtonText
              ]}>
                {period.label}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Stats Cards */}
        <View style={styles.statsContainer}>
          {stats.map((stat, index) => (
            <View key={index} style={styles.statCard}>
              <View style={styles.statHeader}>
                <View style={[styles.statIcon, { backgroundColor: stat.color + '20' }]}>
                  <stat.icon size={20} color={stat.color} />
                </View>
                <Text style={[styles.statChange, { color: stat.color }]}>{stat.change}</Text>
              </View>
              <Text style={styles.statValue}>{stat.value}</Text>
              <Text style={styles.statTitle}>{stat.title}</Text>
            </View>
          ))}
        </View>

        {/* Daily Sales */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Daily Sales History</Text>
          <View style={styles.salesHistoryCard}>
            {salesData.map((day, index) => (
              <View key={index} style={styles.salesHistoryItem}>
                <View style={styles.salesHistoryDate}>
                  <Calendar size={16} color="#6B7280" />
                  <Text style={styles.salesHistoryDateText}>
                    {new Date(day.date).toLocaleDateString('en-IN', { 
                      day: 'numeric', 
                      month: 'short' 
                    })}
                  </Text>
                </View>
                <View style={styles.salesHistoryDetails}>
                  <Text style={styles.salesHistoryAmount}>₹{day.amount.toLocaleString()}</Text>
                  <Text style={styles.salesHistoryItems}>{day.items} items • {day.invoices} bills</Text>
                </View>
              </View>
            ))}
          </View>
        </View>

        {/* Top Products */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Top Selling Products</Text>
          <View style={styles.topProductsCard}>
            {topProducts.map((product, index) => (
              <View key={index} style={styles.topProductItem}>
                <View style={styles.productRank}>
                  <Text style={styles.rankNumber}>{index + 1}</Text>
                </View>
                <View style={styles.productInfo}>
                  <Text style={styles.productName}>{product.name}</Text>
                  <Text style={styles.productStats}>
                    Sold: {product.sold} • Revenue: ₹{product.revenue.toLocaleString()}
                  </Text>
                </View>
                <View style={styles.productProgress}>
                  <View 
                    style={[
                      styles.progressBar, 
                      { width: `${(product.sold / 100) * 100}%` }
                    ]} 
                  />
                </View>
              </View>
            ))}
          </View>
        </View>

        {/* Performance Insights */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Performance Insights</Text>
          <View style={styles.insightsCard}>
            <View style={styles.insightItem}>
              <View style={styles.insightIcon}>
                <TrendingUp size={20} color="#138808" />
              </View>
              <View style={styles.insightContent}>
                <Text style={styles.insightTitle}>Sales Growth</Text>
                <Text style={styles.insightDescription}>
                  Your sales have increased by 15.3% compared to last week
                </Text>
              </View>
            </View>
            
            <View style={styles.insightItem}>
              <View style={styles.insightIcon}>
                <Package size={20} color="#FF9933" />
              </View>
              <View style={styles.insightContent}>
                <Text style={styles.insightTitle}>Inventory Alert</Text>
                <Text style={styles.insightDescription}>
                  5 products are running low on stock and need restocking
                </Text>
              </View>
            </View>
            
            <View style={styles.insightItem}>
              <View style={styles.insightIcon}>
                <Users size={20} color="#8B5CF6" />
              </View>
              <View style={styles.insightContent}>
                <Text style={styles.insightTitle}>Customer Activity</Text>
                <Text style={styles.insightDescription}>
                  3 new customers added this week with total purchases of ₹4,200
                </Text>
              </View>
            </View>
          </View>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8FAFC',
  },
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
  headerSubtitle: {
    fontSize: 16,
    color: '#FFFFFF',
    opacity: 0.9,
  },
  content: {
    flex: 1,
    paddingHorizontal: 20,
  },
  periodSelector: {
    flexDirection: 'row',
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 4,
    marginVertical: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  periodButton: {
    flex: 1,
    paddingVertical: 10,
    alignItems: 'center',
    borderRadius: 8,
  },
  activePeriodButton: {
    backgroundColor: '#EC4899',
  },
  periodButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#6B7280',
  },
  activePeriodButtonText: {
    color: '#FFFFFF',
  },
  statsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    marginBottom: 25,
  },
  statCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 15,
    width: '48%',
    marginBottom: 15,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  statHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  statIcon: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
  },
  statChange: {
    fontSize: 12,
    fontWeight: 'bold',
  },
  statValue: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#1F2937',
    marginBottom: 5,
  },
  statTitle: {
    fontSize: 12,
    color: '#6B7280',
  },
  section: {
    marginBottom: 30,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#1F2937',
    marginBottom: 15,
  },
  salesHistoryCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  salesHistoryItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 15,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  salesHistoryDate: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  salesHistoryDateText: {
    fontSize: 14,
    color: '#6B7280',
    marginLeft: 8,
    fontWeight: '600',
  },
  salesHistoryDetails: {
    alignItems: 'flex-end',
  },
  salesHistoryAmount: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#138808',
    marginBottom: 2,
  },
  salesHistoryItems: {
    fontSize: 12,
    color: '#6B7280',
  },
  topProductsCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  topProductItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 15,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  productRank: {
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: '#EC4899',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 15,
  },
  rankNumber: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#FFFFFF',
  },
  productInfo: {
    flex: 1,
  },
  productName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1F2937',
    marginBottom: 5,
  },
  productStats: {
    fontSize: 12,
    color: '#6B7280',
  },
  productProgress: {
    width: 60,
    height: 4,
    backgroundColor: '#E5E7EB',
    borderRadius: 2,
    marginLeft: 15,
  },
  progressBar: {
    height: '100%',
    backgroundColor: '#EC4899',
    borderRadius: 2,
  },
  insightsCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  insightItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    paddingVertical: 15,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  insightIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#F8FAFC',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 15,
  },
  insightContent: {
    flex: 1,
  },
  insightTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1F2937',
    marginBottom: 5,
  },
  insightDescription: {
    fontSize: 14,
    color: '#6B7280',
    lineHeight: 20,
  },
});