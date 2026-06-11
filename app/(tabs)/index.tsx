import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';
import {
  ArrowUpRight,
  BarChart3,
  CreditCard,
  FileText,
  Package,
  Plus,
  Receipt,
  Settings,
  ShoppingCart,
  Tag,
  TrendingUp,
  Users,
  Zap,
} from 'lucide-react-native';
import React, { useEffect, useRef, useState } from 'react';
import {
  Animated,
  Dimensions,
  Easing,
  Platform,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

type QuickAction = {
  title: string;
  icon: React.ComponentType<any>;
  route: string;
  description: string;
  color: string;
  bgColor: string;
};

type StatCard = {
  label: string;
  value: string;
  change: string;
  icon: React.ComponentType<any>;
  color: string;
};

export default function Dashboard() {
  const [greeting, setGreeting] = useState('Good Morning');

  useEffect(() => {
    const hour = new Date().getHours();
    if (hour < 12) setGreeting('Good Morning');
    else if (hour < 17) setGreeting('Good Afternoon');
    else setGreeting('Good Evening');
  }, []);

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
      title: 'Invoices',
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

  const stats: StatCard[] = [
    {
      label: "Today's Sale",
      value: '₹12,450',
      change: '+12%',
      icon: TrendingUp,
      color: '#3B82F6',
    },
  ];

  // ── Animations ──────────────────────────────────────────
  const headerSlide = useRef(new Animated.Value(-60)).current;
  const headerOpacity = useRef(new Animated.Value(0)).current;

  const pulse = useRef(new Animated.Value(1)).current;
  const float1 = useRef(new Animated.Value(0)).current;
  const float2 = useRef(new Animated.Value(0)).current;

  const statsAnim = useRef(stats.map(() => new Animated.Value(0))).current;
  const actionAnimations = useRef(
    quickActions.map(() => new Animated.Value(0)),
  ).current;

  useEffect(() => {
    // Header slide-in
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

    // Ambient pulse on the accent blob
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

    // Floating orbs
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

    // Stat cards stagger
    Animated.stagger(
      120,
      statsAnim.map((a) =>
        Animated.spring(a, {
          toValue: 1,
          tension: 60,
          friction: 8,
          useNativeDriver: true,
        }),
      ),
    ).start();

    // Quick actions stagger (delayed after stats)
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
  }, []);

  const f1Y = float1.interpolate({ inputRange: [0, 1], outputRange: [0, -18] });
  const f2Y = float2.interpolate({ inputRange: [0, 1], outputRange: [0, 12] });

  return (
    <View style={styles.container}>
      <StatusBar backgroundColor="#0F172A" barStyle="light-content" />

      {/* ── HEADER ───────────────────────────────────────── */}
      <Animated.View
        style={[
          styles.header,
          {
            opacity: headerOpacity,
            transform: [{ translateY: headerSlide }],
          },
        ]}
      >
        <LinearGradient
          colors={['#0F172A', '#1E3A8A', '#1D4ED8']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={StyleSheet.absoluteFill}
        />

        {/* Floating orbs */}
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

        {/* Top bar */}
        <View style={styles.headerTop}>
          <View>
            <Text style={styles.greetingText}>{greeting} 👋</Text>
            <Text style={styles.shopName}>Bill-Karo</Text>
          </View>
          {/* Bell icon removed */}
        </View>

        {/* Tagline */}
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
        {/* ── TODAY'S SALE BANNER ───────────────────────── */}
        {stats.map((stat, i) => {
          const cardAnim = statsAnim[i];
          const translateY = cardAnim.interpolate({
            inputRange: [0, 1],
            outputRange: [30, 0],
          });
          return (
            <Animated.View
              key={i}
              style={[
                styles.saleBanner,
                { opacity: cardAnim, transform: [{ translateY }] },
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
                  <Text style={styles.saleBannerValue}>{stat.value}</Text>
                  <View style={styles.salePill}>
                    <ArrowUpRight size={11} color="#16A34A" />
                    <Text style={styles.salePillText}>
                      {stat.change} from yesterday
                    </Text>
                  </View>
                </View>
                <View style={styles.saleIconCircle}>
                  <stat.icon size={28} color="#2563EB" />
                </View>
              </View>

              <View style={styles.saleBannerBarBg}>
                <View style={styles.saleBannerBarFill} />
              </View>
            </Animated.View>
          );
        })}

        {/* ── QUICK ACTIONS ─────────────────────────────── */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Quick Actions</Text>
            <TouchableOpacity style={styles.seeAllBtn}></TouchableOpacity>
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
                    {/* Colored top accent strip */}
                    <View
                      style={[
                        styles.actionAccent,
                        { backgroundColor: action.color },
                      ]}
                    />

                    <View style={styles.actionBody}>
                      {/* Icon */}
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

                    {/* Arrow chip */}
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

        {/* ── RECENT ACTIVITY ───────────────────────────── */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Recent Activity</Text>
          </View>

          <View style={styles.emptyCard}>
            <View style={styles.emptyIconCircle}>
              <BarChart3 size={32} color="#94A3B8" />
            </View>
            <Text style={styles.emptyTitle}>No Transactions Yet</Text>
            <Text style={styles.emptySubtitle}>
              Create your first bill to start tracking activity
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
                <Text style={styles.emptyActionText}>Create Bill</Text>
                <ArrowUpRight size={14} color="#FFFFFF" />
              </LinearGradient>
            </TouchableOpacity>
          </View>
        </View>
      </ScrollView>
    </View>
  );
}

// ─────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F1F5F9',
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
  bellBtn: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: 'rgba(255,255,255,0.12)',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.2)',
    marginTop: 4,
  },
  bellDot: {
    position: 'absolute',
    top: 9,
    right: 9,
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#EF4444',
    borderWidth: 1.5,
    borderColor: '#1E3A8A',
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

  /* Floating orbs */
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

  /* TODAY'S SALE BANNER */
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
  saleLeft: {
    flex: 1,
  },
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
    backgroundColor: 'rgba(22,163,74,0.2)',
    alignSelf: 'flex-start',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 20,
    gap: 4,
  },
  salePillText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#4ADE80',
  },
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
  saleBannerBarFill: {
    height: 4,
    width: '72%',
    backgroundColor: '#4ADE80',
    borderRadius: 4,
  },

  /* SECTION */
  section: { marginBottom: 28 },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: '#0F172A',
    letterSpacing: 0.3,
  },
  seeAllBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
  },
  seeAllText: {
    fontSize: 13,
    color: '#3B82F6',
    fontWeight: '600',
  },

  /* QUICK ACTIONS GRID */
  actionsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  actionWrap: {
    width: (SCREEN_WIDTH - 40 - 12 * 2) / 3 - 0.5, // 3 columns
  },
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
  actionAccent: {
    height: 3,
    width: '100%',
  },
  actionBody: {
    padding: 11,
    flex: 1,
  },
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

  /* EMPTY ACTIVITY */
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
});
