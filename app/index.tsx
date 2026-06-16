import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';
import {
  AlertCircle,
  ArrowUpRight,
  BarChart3,
  ChevronDown,
  CreditCard,
  DollarSign,
  FileText,
  Package,
  Plus,
  Receipt,
  Settings,
  ShoppingCart,
  Tag,
  TrendingUp,
  UserPlus,
  Users,
  Zap,
} from 'lucide-react-native';
import React, { useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Animated,
  Dimensions,
  Easing,
  FlatList,
  Modal,
  Platform,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import {
  getAllBills,
  getAllCustomers,
  getAllPayments,
  isAppAccessible,
} from '../lib/db';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

// ─── helpers ────────────────────────────────────────────────────
const todayRange = () => {
  const start = new Date();
  start.setHours(0, 0, 0, 0);
  const end = new Date(start);
  end.setDate(end.getDate() + 1);
  return { start, end };
};

const isToday = (dateStr: string) => {
  const { start, end } = todayRange();
  const d = new Date(dateStr);
  return d >= start && d < end;
};

// ─── types ──────────────────────────────────────────────────────
type QuickAction = {
  title: string;
  icon: React.ComponentType<any>;
  route: string;
  description: string;
  color: string;
  bgColor: string;
};

type Activity = {
  id: string;
  type: 'bill' | 'credit_bill' | 'customer' | 'payment';
  title: string;
  description: string;
  amount?: number;
  customerName?: string;
  date: string;
  timestamp: number;
  icon: React.ComponentType<any>;
  iconColor: string;
  bgColor: string;
  route?: string;
};

// ─── page size ──────────────────────────────────────────────────
const DASHBOARD_LIMIT = 5;
const PAGE_SIZE = 10;

// ════════════════════════════════════════════════════════════════
export default function Dashboard() {
  const [greeting, setGreeting] = useState('Good Morning');
  const [licenseChecked, setLicenseChecked] = useState(false);
  const [todaySales, setTodaySales] = useState({
    total: '₹0',
    change: '+0%',
    percentage: 0,
    todayTotal: 0,
    yesterdayTotal: 0,
  });
  const [loading, setLoading] = useState(true);

  // All today's activities (for the modal view-all)
  const [allTodayActivities, setAllTodayActivities] = useState<Activity[]>([]);
  // First 5 shown on dashboard
  const [dashboardActivities, setDashboardActivities] = useState<Activity[]>(
    [],
  );
  const [loadingActivity, setLoadingActivity] = useState(false);

  // View-All modal state
  const [viewAllVisible, setViewAllVisible] = useState(false);
  const [visiblePage, setVisiblePage] = useState(1);
  const [loadingMore, setLoadingMore] = useState(false);

  // ── greeting ──────────────────────────────────────────────────
  useEffect(() => {
    const hour = new Date().getHours();
    if (hour < 12) setGreeting('Good Morning');
    else if (hour < 17) setGreeting('Good Afternoon');
    else setGreeting('Good Evening');

    checkLicenseAccess();
    fetchTodaySales();
    fetchRecentActivities();
  }, []);

  // ── build today's activity list ───────────────────────────────
  const fetchRecentActivities = async () => {
    try {
      setLoadingActivity(true);
      const activities: Activity[] = [];
      const { start, end } = todayRange();

      // ── Bills created today ──────────────────────────────────
      const allBills = await getAllBills();
      const todayBills = allBills.filter((bill) => {
        const d = new Date(bill.billingDate);
        return d >= start && d < end;
      });

      for (const bill of todayBills) {
        const isCreditBill = bill.billType === 'Credit';
        activities.push({
          id: `bill_${bill.id}`,
          type: isCreditBill ? 'credit_bill' : 'bill',
          title: isCreditBill
            ? '💰 Credit Bill Created'
            : '💵 New Bill Generated',
          description: `Bill #${bill.id} · ${bill.customerName}`,
          amount: bill.totalAmount,
          customerName: bill.customerName,
          date: bill.billingDate,
          timestamp: new Date(bill.billingDate).getTime(),
          icon: isCreditBill ? FileText : Receipt,
          iconColor: isCreditBill ? '#F59E0B' : '#10B981',
          bgColor: isCreditBill ? '#FFFBEB' : '#ECFDF5',
          route: '/view-bills',
        });
      }

      // ── Payments received today ──────────────────────────────
      const allPayments = await getAllPayments();
      const todayPayments = allPayments.filter((p) => isToday(p.paymentDate));

      for (const payment of todayPayments) {
        activities.push({
          id: `payment_${payment.id}`,
          type: 'payment',
          title: '💳 Payment Received',
          description: `₹${payment.amount.toLocaleString('en-IN')} via ${payment.paymentMethod}`,
          amount: payment.amount,
          date: payment.paymentDate,
          timestamp: new Date(payment.paymentDate).getTime(),
          icon: DollarSign,
          iconColor: '#3B82F6',
          bgColor: '#EFF6FF',
          route: '/UnpaidCreditBillsScreen',
        });
      }

      // ── New customers added today ────────────────────────────
      // customers table has no createdAt; we use bills to detect
      // customers whose FIRST bill is today — a safe proxy for "added today".
      // We also collect any customer referenced in today's bills.
      const seenCustomerIds = new Set<number>();
      const allCustomers = await getAllCustomers();

      // Gather customer IDs from today's bills
      for (const bill of todayBills) {
        if (!seenCustomerIds.has(bill.customerId)) {
          seenCustomerIds.add(bill.customerId);
          const customer = allCustomers.find((c) => c.id === bill.customerId);
          if (customer) {
            // Only show as "new" if their totalPurchases roughly matches today's bill
            // i.e. this is likely their very first interaction.
            // A simpler heuristic: customer has only one bill (today's)
            const customerBills = allBills.filter(
              (b) => b.customerId === bill.customerId,
            );
            if (customerBills.length === 1) {
              activities.push({
                id: `customer_${customer.id}`,
                type: 'customer',
                title: '👤 New Customer Added',
                description: `${customer.name} · ${customer.phone}`,
                customerName: customer.name,
                date: bill.billingDate,
                timestamp: new Date(bill.billingDate).getTime() - 1, // just before the bill
                icon: UserPlus,
                iconColor: '#8B5CF6',
                bgColor: '#F5F3FF',
                route: '/customers',
              });
            }
          }
        }
      }

      // Sort newest first
      activities.sort((a, b) => b.timestamp - a.timestamp);

      setAllTodayActivities(activities);
      setDashboardActivities(activities.slice(0, DASHBOARD_LIMIT));
    } catch (error) {
      console.error('Error fetching recent activities:', error);
      setAllTodayActivities([]);
      setDashboardActivities([]);
    } finally {
      setLoadingActivity(false);
    }
  };

  // ── paginated slice for modal ─────────────────────────────────
  const visibleModalActivities = allTodayActivities.slice(
    0,
    visiblePage * PAGE_SIZE,
  );
  const hasMore = visibleModalActivities.length < allTodayActivities.length;

  const loadMoreActivities = () => {
    if (loadingMore || !hasMore) return;
    setLoadingMore(true);
    setTimeout(() => {
      setVisiblePage((p) => p + 1);
      setLoadingMore(false);
    }, 300);
  };

  const openViewAll = () => {
    setVisiblePage(1);
    setViewAllVisible(true);
  };

  // ── today's sales ─────────────────────────────────────────────
  const fetchTodaySales = async () => {
    try {
      setLoading(true);
      const { todayTotal, yesterdayTotal, percentage } = await getDailySales();
      const isPositive = percentage >= 0;
      setTodaySales({
        total: `₹${todayTotal.toLocaleString('en-IN')}`,
        change: `${isPositive ? '+' : ''}${percentage.toFixed(1)}%`,
        percentage,
        todayTotal,
        yesterdayTotal,
      });
    } catch {
      setTodaySales({
        total: '₹0',
        change: '+0%',
        percentage: 0,
        todayTotal: 0,
        yesterdayTotal: 0,
      });
    } finally {
      setLoading(false);
    }
  };

  const getDailySales = async () => {
    const allBills = await getAllBills();
    const { start: today, end: tomorrow } = todayRange();
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);

    const todayBills = allBills.filter((b) => {
      const d = new Date(b.billingDate);
      return d >= today && d < tomorrow;
    });
    const yesterdayBills = allBills.filter((b) => {
      const d = new Date(b.billingDate);
      return d >= yesterday && d < today;
    });

    const todayTotal = todayBills.reduce((s, b) => s + b.totalAmount, 0);
    const yesterdayTotal = yesterdayBills.reduce(
      (s, b) => s + b.totalAmount,
      0,
    );
    let percentage = 0;
    if (yesterdayTotal > 0)
      percentage = ((todayTotal - yesterdayTotal) / yesterdayTotal) * 100;
    else if (todayTotal > 0) percentage = 100;

    return { todayTotal, yesterdayTotal, percentage };
  };

  // ── license check ─────────────────────────────────────────────
  const checkLicenseAccess = () => {
    try {
      const { accessible, daysLeft, type } = isAppAccessible();
      if (!accessible) {
        Alert.alert(
          'License Expired',
          'Your trial period has ended. Please purchase a license to continue.',
          [{ text: 'Activate Now', onPress: () => router.push('/activation') }],
          { cancelable: false },
        );
      } else if (daysLeft && daysLeft <= 5 && type === 'trial') {
        Alert.alert(
          'Trial Expiring Soon',
          `Your trial will expire in ${daysLeft} days.`,
          [
            { text: 'Remind Later', style: 'cancel' },
            { text: 'Activate Now', onPress: () => router.push('/activation') },
          ],
        );
      }
    } catch {
    } finally {
      setLicenseChecked(true);
    }
  };

  // ── date formatter ────────────────────────────────────────────
  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const todayStart = new Date(
      now.getFullYear(),
      now.getMonth(),
      now.getDate(),
    );
    const yesterdayStart = new Date(todayStart);
    yesterdayStart.setDate(yesterdayStart.getDate() - 1);

    if (date >= todayStart) return 'Today';
    if (date >= yesterdayStart) return 'Yesterday';
    const diff = Math.ceil((now.getTime() - date.getTime()) / 86400000);
    if (diff < 7) return `${diff} days ago`;
    return date.toLocaleDateString('en-IN', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
    });
  };

  // ── quick actions ─────────────────────────────────────────────
  const quickActions: QuickAction[] = [
    {
      title: 'New Bill',
      icon: ShoppingCart,
      route: '/billing',
      description: 'Create invoice',
      color: '#3B82F6',
      bgColor: '#EFF6FF',
    },
    {
      title: 'Purchase',
      icon: Plus,
      route: '/purchase',
      description: 'Add purchase',
      color: '#8B5CF6',
      bgColor: '#F5F3FF',
    },
    {
      title: 'Inventory',
      icon: Package,
      route: '/inventory',
      description: 'Manage stock',
      color: '#10B981',
      bgColor: '#ECFDF5',
    },
    {
      title: 'Customers',
      icon: Users,
      route: '/customers',
      description: 'Customer DB',
      color: '#F59E0B',
      bgColor: '#FFFBEB',
    },
    {
      title: 'View Bills',
      icon: Receipt,
      route: '/view-bills',
      description: 'Bill history',
      color: '#EF4444',
      bgColor: '#FEF2F2',
    },
    {
      title: 'Reports',
      icon: BarChart3,
      route: '/reports',
      description: 'Analytics',
      color: '#06B6D4',
      bgColor: '#ECFEFF',
    },
    {
      title: 'Purchase',
      icon: FileText,
      route: '/view-purchase',
      description: 'Manage invoices',
      color: '#6366F1',
      bgColor: '#EEF2FF',
    },
    {
      title: 'Payments',
      icon: CreditCard,
      route: '/UnpaidCreditBillsScreen',
      description: 'Payment records',
      color: '#EC4899',
      bgColor: '#FDF2F8',
    },
    {
      title: 'Categories',
      icon: Tag,
      route: '/CategoryManagement',
      description: 'Manage tags',
      color: '#14B8A6',
      bgColor: '#F0FDFA',
    },
    {
      title: 'Settings',
      icon: Settings,
      route: '/settings',
      description: 'App settings',
      color: '#64748B',
      bgColor: '#F8FAFC',
    },
  ];

  // ── animations ────────────────────────────────────────────────
  const headerSlide = useRef(new Animated.Value(-60)).current;
  const headerOpacity = useRef(new Animated.Value(0)).current;
  const pulse = useRef(new Animated.Value(1)).current;
  const float1 = useRef(new Animated.Value(0)).current;
  const float2 = useRef(new Animated.Value(0)).current;
  const statsAnim = useRef(new Animated.Value(0)).current;
  const actionAnimations = useRef(
    quickActions.map(() => new Animated.Value(0)),
  ).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(headerSlide, {
        toValue: 0,
        duration: 700,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }),
      Animated.timing(headerOpacity, {
        toValue: 1,
        duration: 600,
        useNativeDriver: true,
      }),
    ]).start();

    Animated.loop(
      Animated.sequence([
        Animated.timing(pulse, {
          toValue: 1.15,
          duration: 2800,
          easing: Easing.inOut(Easing.sin),
          useNativeDriver: true,
        }),
        Animated.timing(pulse, {
          toValue: 1,
          duration: 2800,
          easing: Easing.inOut(Easing.sin),
          useNativeDriver: true,
        }),
      ]),
    ).start();

    Animated.loop(
      Animated.sequence([
        Animated.timing(float1, {
          toValue: 1,
          duration: 4000,
          easing: Easing.inOut(Easing.sin),
          useNativeDriver: true,
        }),
        Animated.timing(float1, {
          toValue: 0,
          duration: 4000,
          easing: Easing.inOut(Easing.sin),
          useNativeDriver: true,
        }),
      ]),
    ).start();

    Animated.loop(
      Animated.sequence([
        Animated.timing(float2, {
          toValue: 1,
          duration: 3200,
          easing: Easing.inOut(Easing.sin),
          useNativeDriver: true,
          delay: 800,
        }),
        Animated.timing(float2, {
          toValue: 0,
          duration: 3200,
          easing: Easing.inOut(Easing.sin),
          useNativeDriver: true,
        }),
      ]),
    ).start();

    Animated.spring(statsAnim, {
      toValue: 1,
      tension: 60,
      friction: 8,
      useNativeDriver: true,
    }).start();

    setTimeout(() => {
      Animated.stagger(
        55,
        actionAnimations.map((a) =>
          Animated.spring(a, {
            toValue: 1,
            tension: 65,
            friction: 8,
            useNativeDriver: true,
          }),
        ),
      ).start();
    }, 300);
  }, [todaySales]);

  const f1Y = float1.interpolate({ inputRange: [0, 1], outputRange: [0, -18] });
  const f2Y = float2.interpolate({ inputRange: [0, 1], outputRange: [0, 12] });
  const translateY = statsAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [30, 0],
  });

  // ── activity row renderer (shared by dashboard + modal) ───────
  const renderActivityRow = (activity: Activity, index: number) => {
    const ActivityIcon = activity.icon;
    return (
      <TouchableOpacity
        key={activity.id}
        onPress={() => {
          if (activity.route) router.push(activity.route as any);
        }}
        activeOpacity={0.7}
        style={styles.activityItem}
      >
        <View
          style={[
            styles.activityIconContainer,
            { backgroundColor: activity.bgColor },
          ]}
        >
          <ActivityIcon size={20} color={activity.iconColor} />
        </View>

        <View style={styles.activityContent}>
          <View style={styles.activityHeader}>
            <Text style={styles.activityTitle} numberOfLines={1}>
              {activity.title}
            </Text>
            <Text style={styles.activityTime}>{formatDate(activity.date)}</Text>
          </View>
          <Text style={styles.activityDescription} numberOfLines={1}>
            {activity.description}
          </Text>
          {activity.amount !== undefined && (
            <Text style={styles.activityAmount}>
              ₹{activity.amount.toLocaleString('en-IN')}
            </Text>
          )}
        </View>

        <ArrowUpRight size={16} color="#94A3B8" />
      </TouchableOpacity>
    );
  };

  // ── modal footer ──────────────────────────────────────────────
  const ModalFooter = () => {
    if (!hasMore)
      return (
        <View style={styles.modalFooterEnd}>
          <Text style={styles.modalFooterEndText}>
            All {allTodayActivities.length} activities shown
          </Text>
        </View>
      );
    return (
      <TouchableOpacity
        style={styles.loadMoreBtn}
        onPress={loadMoreActivities}
        activeOpacity={0.8}
      >
        {loadingMore ? (
          <ActivityIndicator size="small" color="#3B82F6" />
        ) : (
          <>
            <Text style={styles.loadMoreText}>Load More</Text>
            <ChevronDown size={16} color="#3B82F6" />
          </>
        )}
      </TouchableOpacity>
    );
  };

  // ── loading screen ────────────────────────────────────────────
  if (!licenseChecked || loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#3B82F6" />
        <Text style={styles.loadingText}>Loading dashboard...</Text>
      </View>
    );
  }

  // ════════════════════════════════════════════════════════════════
  return (
    <View style={styles.container}>
      <StatusBar backgroundColor="#0F172A" barStyle="light-content" />

      {/* ── HEADER ─────────────────────────────────────────── */}
      <Animated.View
        style={[
          styles.header,
          { opacity: headerOpacity, transform: [{ translateY: headerSlide }] },
        ]}
      >
        <LinearGradient
          colors={['#0F172A', '#1E3A8A', '#1D4ED8']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={StyleSheet.absoluteFill}
        />
        <Animated.View
          style={[
            styles.orb1,
            { transform: [{ translateY: f1Y }, { scale: pulse }] },
          ]}
        />
        <Animated.View
          style={[styles.orb2, { transform: [{ translateY: f2Y }] }]}
        />
        <View style={styles.orb3} />

        <View style={styles.headerTop}>
          <View>
            <Text style={styles.greetingText}>{greeting} 👋</Text>
            <Text style={styles.shopName}>Bill-Karo</Text>
          </View>
        </View>

        <View style={styles.taglineRow}>
          <Zap size={13} color="#93C5FD" />
          <Text style={styles.tagline}>Your business, powered smartly</Text>
          <Zap size={13} color="#93C5FD" />
        </View>
      </Animated.View>

      <ScrollView
        style={styles.scroll}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        {/* ── TODAY'S SALE BANNER ──────────────────────────── */}
        <Animated.View
          style={[
            styles.saleBanner,
            { opacity: statsAnim, transform: [{ translateY }] },
          ]}
        >
          <LinearGradient
            colors={['#1E3A8A', '#2563EB', '#3B82F6']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={StyleSheet.absoluteFill}
          />
          <View style={styles.saleOrb1} />
          <View style={styles.saleOrb2} />

          <View style={styles.saleBannerInner}>
            <View style={styles.saleLeft}>
              <Text style={styles.saleBannerLabel}>TODAY'S SALE</Text>
              <Text style={styles.saleBannerValue}>{todaySales.total}</Text>
              <View style={styles.salePill}>
                <ArrowUpRight
                  size={11}
                  color={todaySales.percentage >= 0 ? '#4ADE80' : '#EF4444'}
                />
                <Text
                  style={[
                    styles.salePillText,
                    {
                      color: todaySales.percentage >= 0 ? '#4ADE80' : '#F87171',
                    },
                  ]}
                >
                  {todaySales.change} from yesterday
                </Text>
              </View>
            </View>
            <View style={styles.saleIconCircle}>
              <TrendingUp size={28} color="#2563EB" />
            </View>
          </View>

          <View style={styles.saleBannerBarBg}>
            <View
              style={[
                styles.saleBannerBarFill,
                {
                  width: `${Math.min(Math.abs(todaySales.percentage), 100)}%`,
                  backgroundColor:
                    todaySales.percentage >= 0 ? '#4ADE80' : '#F87171',
                },
              ]}
            />
          </View>
        </Animated.View>

        {/* ── QUICK ACTIONS ────────────────────────────────── */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Quick Actions</Text>
          </View>

          <View style={styles.actionsGrid}>
            {quickActions.map((action, index) => {
              const anim = actionAnimations[index];
              const scale = anim.interpolate({
                inputRange: [0, 1],
                outputRange: [0.85, 1],
              });
              return (
                <Animated.View
                  key={index}
                  style={[
                    styles.actionWrap,
                    { opacity: anim, transform: [{ scale }] },
                  ]}
                >
                  <TouchableOpacity
                    style={styles.actionCard}
                    onPress={() => router.push(action.route as any)}
                    activeOpacity={0.7}
                  >
                    <View
                      style={[
                        styles.actionAccent,
                        { backgroundColor: action.color },
                      ]}
                    />
                    <View style={styles.actionBody}>
                      <View
                        style={[
                          styles.actionIconWrap,
                          { backgroundColor: action.bgColor },
                        ]}
                      >
                        <action.icon size={20} color={action.color} />
                      </View>
                      <Text style={styles.actionTitle}>{action.title}</Text>
                      <Text style={styles.actionDesc}>
                        {action.description}
                      </Text>
                    </View>
                    <View
                      style={[
                        styles.actionArrow,
                        { backgroundColor: action.color },
                      ]}
                    >
                      <ArrowUpRight size={10} color="#FFFFFF" />
                    </View>
                  </TouchableOpacity>
                </Animated.View>
              );
            })}
          </View>
        </View>

        {/* ── RECENT ACTIVITY (today, max 5) ───────────────── */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <View>
              <Text style={styles.sectionTitle}>Today's Activity</Text>
              {allTodayActivities.length > 0 && (
                <Text style={styles.sectionSubtitle}>
                  {allTodayActivities.length} event
                  {allTodayActivities.length !== 1 ? 's' : ''} today
                </Text>
              )}
            </View>

            {allTodayActivities.length > DASHBOARD_LIMIT && (
              <TouchableOpacity
                onPress={openViewAll}
                style={styles.seeAllButton}
              >
                <Text style={styles.seeAllText}>View All</Text>
                <ArrowUpRight size={12} color="#3B82F6" />
              </TouchableOpacity>
            )}
          </View>

          {loadingActivity ? (
            <View style={styles.loadingActivityContainer}>
              <ActivityIndicator size="small" color="#3B82F6" />
              <Text style={styles.loadingActivityText}>
                Loading today's activity…
              </Text>
            </View>
          ) : dashboardActivities.length > 0 ? (
            <View style={styles.activitiesList}>
              {dashboardActivities.map((a, i) => renderActivityRow(a, i))}

              {/* "View All" nudge when there are more */}
              {allTodayActivities.length > DASHBOARD_LIMIT && (
                <TouchableOpacity
                  style={styles.viewMoreBanner}
                  onPress={openViewAll}
                  activeOpacity={0.85}
                >
                  <Text style={styles.viewMoreBannerText}>
                    +{allTodayActivities.length - DASHBOARD_LIMIT} more
                    activities today
                  </Text>
                  <ArrowUpRight size={14} color="#3B82F6" />
                </TouchableOpacity>
              )}
            </View>
          ) : (
            <View style={styles.emptyCard}>
              <View style={styles.emptyIconCircle}>
                <AlertCircle size={32} color="#94A3B8" />
              </View>
              <Text style={styles.emptyTitle}>No Activity Today</Text>
              <Text style={styles.emptySubtitle}>
                Start by creating a bill, adding a customer, or recording a
                payment
              </Text>
              <TouchableOpacity
                style={styles.emptyAction}
                onPress={() => router.push('/billing' as any)}
                activeOpacity={0.8}
              >
                <LinearGradient
                  colors={['#3B82F6', '#1D4ED8']}
                  style={styles.emptyActionGrad}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 0 }}
                >
                  <Text style={styles.emptyActionText}>Create First Bill</Text>
                  <ArrowUpRight size={14} color="#FFFFFF" />
                </LinearGradient>
              </TouchableOpacity>
            </View>
          )}
        </View>
      </ScrollView>

      {/* ══ VIEW ALL MODAL (today, 10×10 pagination) ═══════════ */}
      <Modal
        visible={viewAllVisible}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setViewAllVisible(false)}
      >
        <View style={styles.modalContainer}>
          {/* Modal header */}
          <View style={styles.modalHeader}>
            <View>
              <Text style={styles.modalTitle}>Today's Activity</Text>
              <Text style={styles.modalSubtitle}>
                {allTodayActivities.length} event
                {allTodayActivities.length !== 1 ? 's' : ''} ·{' '}
                {new Date().toLocaleDateString('en-IN', {
                  day: '2-digit',
                  month: 'long',
                  year: 'numeric',
                })}
              </Text>
            </View>
            <TouchableOpacity
              style={styles.modalCloseBtn}
              onPress={() => setViewAllVisible(false)}
              activeOpacity={0.7}
            >
              <Text style={styles.modalCloseText}>✕</Text>
            </TouchableOpacity>
          </View>

          {/* Activity type filter chips (visual only, no filter logic needed for today) */}
          <View style={styles.chipRow}>
            {[
              { label: `All (${allTodayActivities.length})`, color: '#3B82F6' },
              {
                label: `Bills (${allTodayActivities.filter((a) => a.type === 'bill' || a.type === 'credit_bill').length})`,
                color: '#10B981',
              },
              {
                label: `Payments (${allTodayActivities.filter((a) => a.type === 'payment').length})`,
                color: '#3B82F6',
              },
              {
                label: `Customers (${allTodayActivities.filter((a) => a.type === 'customer').length})`,
                color: '#8B5CF6',
              },
            ].map((chip, i) => (
              <View
                key={i}
                style={[
                  styles.chip,
                  i === 0 && {
                    backgroundColor: '#EFF6FF',
                    borderColor: '#3B82F6',
                  },
                ]}
              >
                <Text
                  style={[
                    styles.chipText,
                    i === 0 && { color: '#3B82F6', fontWeight: '700' },
                  ]}
                >
                  {chip.label}
                </Text>
              </View>
            ))}
          </View>

          {/* List */}
          <FlatList
            data={visibleModalActivities}
            keyExtractor={(item) => item.id}
            contentContainerStyle={styles.modalList}
            showsVerticalScrollIndicator={false}
            renderItem={({ item, index }) => renderActivityRow(item, index)}
            ListFooterComponent={<ModalFooter />}
            ItemSeparatorComponent={() => <View style={{ height: 10 }} />}
          />
        </View>
      </Modal>
    </View>
  );
}

// ── styles ───────────────────────────────────────────────────────
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

  /* HEADER */
  header: {
    paddingTop: Platform.OS === 'ios' ? 58 : 44,
    paddingBottom: 28,
    paddingHorizontal: 24,
    overflow: 'hidden',
    borderBottomLeftRadius: 32,
    borderBottomRightRadius: 32,
    elevation: 12,
    shadowColor: '#1E3A8A',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.35,
    shadowRadius: 20,
  },
  headerTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    zIndex: 10,
  },
  greetingText: {
    fontSize: 13,
    color: '#93C5FD',
    fontWeight: '500',
    letterSpacing: 0.4,
    marginBottom: 2,
  },
  shopName: {
    fontSize: 34,
    fontWeight: '900',
    color: '#FFFFFF',
    letterSpacing: 1.5,
    textShadowColor: 'rgba(59,130,246,0.5)',
    textShadowOffset: { width: 0, height: 3 },
    textShadowRadius: 10,
  },
  taglineRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 14,
    zIndex: 10,
  },
  tagline: {
    fontSize: 12,
    color: '#BFDBFE',
    fontWeight: '500',
    letterSpacing: 0.3,
  },

  orb1: {
    position: 'absolute',
    width: 160,
    height: 160,
    borderRadius: 80,
    backgroundColor: 'rgba(99,102,241,0.25)',
    top: -40,
    right: -50,
    zIndex: 0,
  },
  orb2: {
    position: 'absolute',
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: 'rgba(59,130,246,0.2)',
    bottom: -20,
    left: 30,
    zIndex: 0,
  },
  orb3: {
    position: 'absolute',
    width: 70,
    height: 70,
    borderRadius: 35,
    backgroundColor: 'rgba(255,255,255,0.06)',
    top: 30,
    left: '45%',
    zIndex: 0,
  },

  /* SCROLL */
  scroll: { flex: 1 },
  scrollContent: { paddingHorizontal: 20, paddingTop: 24, paddingBottom: 50 },

  /* SALE BANNER */
  saleBanner: {
    borderRadius: 24,
    overflow: 'hidden',
    marginBottom: 28,
    elevation: 8,
    shadowColor: '#1E3A8A',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.3,
    shadowRadius: 16,
  },
  saleOrb1: {
    position: 'absolute',
    width: 130,
    height: 130,
    borderRadius: 65,
    backgroundColor: 'rgba(255,255,255,0.08)',
    top: -40,
    right: -30,
  },
  saleOrb2: {
    position: 'absolute',
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: 'rgba(255,255,255,0.06)',
    bottom: -20,
    right: 80,
  },
  saleBannerInner: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 22,
    paddingTop: 22,
    paddingBottom: 16,
  },
  saleLeft: { flex: 1 },
  saleBannerLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: '#BFDBFE',
    letterSpacing: 1.5,
    marginBottom: 6,
  },
  saleBannerValue: {
    fontSize: 36,
    fontWeight: '900',
    color: '#FFFFFF',
    letterSpacing: 0.5,
    marginBottom: 10,
  },
  salePill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.2)',
    alignSelf: 'flex-start',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 20,
    gap: 4,
  },
  salePillText: { fontSize: 11, fontWeight: '700' },
  saleIconCircle: {
    width: 60,
    height: 60,
    borderRadius: 20,
    backgroundColor: '#FFFFFF',
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
  },
  saleBannerBarBg: {
    height: 4,
    backgroundColor: 'rgba(255,255,255,0.15)',
    marginHorizontal: 22,
    marginBottom: 18,
    borderRadius: 4,
  },
  saleBannerBarFill: { height: 4, borderRadius: 4 },

  /* SECTION */
  section: { marginBottom: 28 },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: '#0F172A',
    letterSpacing: 0.3,
  },
  sectionSubtitle: { fontSize: 12, color: '#94A3B8', marginTop: 2 },
  seeAllButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 4,
  },
  seeAllText: { fontSize: 12, color: '#3B82F6', fontWeight: '600' },

  /* QUICK ACTIONS */
  actionsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12 },
  actionWrap: { width: (SCREEN_WIDTH - 40 - 12 * 2) / 3 - 0.5 },
  actionCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 18,
    overflow: 'hidden',
    elevation: 3,
    shadowColor: '#94A3B8',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    borderWidth: 1,
    borderColor: '#F1F5F9',
    minHeight: 108,
  },
  actionAccent: { height: 3, width: '100%' },
  actionBody: { padding: 11, flex: 1 },
  actionIconWrap: {
    width: 38,
    height: 38,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 9,
  },
  actionTitle: {
    fontSize: 12,
    fontWeight: '800',
    color: '#1E293B',
    marginBottom: 2,
    letterSpacing: 0.2,
  },
  actionDesc: {
    fontSize: 9.5,
    color: '#94A3B8',
    fontWeight: '500',
    lineHeight: 13,
  },
  actionArrow: {
    position: 'absolute',
    bottom: 10,
    right: 10,
    width: 18,
    height: 18,
    borderRadius: 9,
    justifyContent: 'center',
    alignItems: 'center',
  },

  /* ACTIVITY */
  activitiesList: { gap: 10 },
  activityItem: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#F1F5F9',
    elevation: 2,
    shadowColor: '#94A3B8',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    flexDirection: 'row',
    alignItems: 'center',
    padding: 14,
    gap: 12,
  },
  activityIconContainer: {
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: 'center',
    alignItems: 'center',
  },
  activityContent: { flex: 1, gap: 3 },
  activityHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  activityTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: '#1E293B',
    flex: 1,
    marginRight: 8,
  },
  activityTime: { fontSize: 10, color: '#94A3B8', flexShrink: 0 },
  activityDescription: { fontSize: 12, color: '#64748B' },
  activityAmount: {
    fontSize: 13,
    fontWeight: '700',
    color: '#10B981',
    marginTop: 2,
  },

  /* View more nudge banner */
  viewMoreBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    backgroundColor: '#EFF6FF',
    borderRadius: 12,
    paddingVertical: 12,
    borderWidth: 1,
    borderColor: '#BFDBFE',
    marginTop: 2,
  },
  viewMoreBannerText: { fontSize: 13, color: '#3B82F6', fontWeight: '600' },

  /* Loading */
  loadingActivityContainer: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 40,
    alignItems: 'center',
    gap: 12,
  },
  loadingActivityText: { fontSize: 13, color: '#64748B' },

  /* EMPTY */
  emptyCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 22,
    padding: 28,
    alignItems: 'center',
    elevation: 3,
    shadowColor: '#94A3B8',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    borderWidth: 1,
    borderColor: '#F1F5F9',
  },
  emptyIconCircle: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: '#F8FAFC',
    borderWidth: 2,
    borderColor: '#E2E8F0',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  emptyTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: '#334155',
    marginBottom: 6,
  },
  emptySubtitle: {
    fontSize: 13,
    color: '#94A3B8',
    textAlign: 'center',
    lineHeight: 19,
    marginBottom: 20,
    maxWidth: 220,
  },
  emptyAction: {
    borderRadius: 14,
    overflow: 'hidden',
    elevation: 4,
    shadowColor: '#3B82F6',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 10,
  },
  emptyActionGrad: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 22,
    paddingVertical: 12,
  },
  emptyActionText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#FFFFFF',
    letterSpacing: 0.3,
  },

  /* ── MODAL ── */
  modalContainer: { flex: 1, backgroundColor: '#F1F5F9' },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 20,
    paddingTop: Platform.OS === 'ios' ? 20 : 16,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
    elevation: 2,
    shadowColor: '#94A3B8',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 4,
  },
  modalTitle: { fontSize: 20, fontWeight: '800', color: '#0F172A' },
  modalSubtitle: { fontSize: 12, color: '#94A3B8', marginTop: 3 },
  modalCloseBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#F1F5F9',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalCloseText: { fontSize: 14, color: '#64748B', fontWeight: '700' },

  chipRow: {
    flexDirection: 'row',
    gap: 8,
    paddingHorizontal: 20,
    paddingVertical: 12,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  chip: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 20,
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  chipText: { fontSize: 11, color: '#64748B', fontWeight: '500' },

  modalList: { padding: 16, paddingBottom: 40 },

  loadMoreBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    paddingVertical: 14,
    borderWidth: 1,
    borderColor: '#BFDBFE',
    marginTop: 12,
  },
  loadMoreText: { fontSize: 14, color: '#3B82F6', fontWeight: '700' },

  modalFooterEnd: { alignItems: 'center', paddingVertical: 20 },
  modalFooterEndText: { fontSize: 12, color: '#94A3B8' },
});
