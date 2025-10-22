import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';
import {
  BarChart3,
  CreditCard,
  FileText,
  Package,
  Plus,
  Receipt,
  ShoppingCart,
  TrendingUp,
  Users,
  Zap,
} from 'lucide-react-native';
import React, { useEffect, useRef } from 'react';
import {
  Animated,
  Easing,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';

type QuickAction = {
  title: string;
  icon: React.ComponentType<any>;
  route: string;
  description: string;
};

export default function Dashboard() {
  const quickActions: QuickAction[] = [
    {
      title: 'New Bill',
      icon: ShoppingCart,
      route: '/billing',
      description: 'Create new invoice',
    },
    {
      title: 'Add Purchase',
      icon: Plus,
      route: '/purchase',
      description: 'Add new purchase',
    },
    {
      title: 'Inventory',
      icon: Package,
      route: '/inventory',
      description: 'Manage stock',
    },
    {
      title: 'Customers',
      icon: Users,
      route: '/customers',
      description: 'Customer database',
    },
    {
      title: 'View Bills',
      icon: Receipt,
      route: '/view-bills',
      description: 'Bill history',
    },
    {
      title: 'Reports',
      icon: BarChart3,
      route: '/reports',
      description: 'Analytics & reports',
    },
    {
      title: 'Invoices',
      icon: FileText,
      route: '/invoices',
      description: 'Manage invoices',
    },
    {
      title: 'Payments',
      icon: CreditCard,
      route: '/payments',
      description: 'Payment records',
    },
  ];

  // Animation values
  const titleScale = useRef(new Animated.Value(0)).current;
  const titleOpacity = useRef(new Animated.Value(0)).current;
  const bgPulse = useRef(new Animated.Value(0)).current;
  const floatingAnim1 = useRef(new Animated.Value(0)).current;
  const floatingAnim2 = useRef(new Animated.Value(0)).current;
  const floatingAnim3 = useRef(new Animated.Value(0)).current;
  const actionAnimations = useRef(
    quickActions.map(() => new Animated.Value(0)),
  ).current;

  useEffect(() => {
    // Background pulse animation
    Animated.loop(
      Animated.sequence([
        Animated.timing(bgPulse, {
          toValue: 1,
          duration: 3000,
          easing: Easing.inOut(Easing.sin),
          useNativeDriver: true,
        }),
        Animated.timing(bgPulse, {
          toValue: 0,
          duration: 3000,
          easing: Easing.inOut(Easing.sin),
          useNativeDriver: true,
        }),
      ]),
    ).start();

    // Floating animations
    Animated.loop(
      Animated.sequence([
        Animated.timing(floatingAnim1, {
          toValue: 1,
          duration: 4000,
          easing: Easing.inOut(Easing.sin),
          useNativeDriver: true,
        }),
        Animated.timing(floatingAnim1, {
          toValue: 0,
          duration: 4000,
          easing: Easing.inOut(Easing.sin),
          useNativeDriver: true,
        }),
      ]),
    ).start();

    Animated.loop(
      Animated.sequence([
        Animated.timing(floatingAnim2, {
          toValue: 1,
          duration: 3500,
          easing: Easing.inOut(Easing.sin),
          useNativeDriver: true,
          delay: 1000,
        }),
        Animated.timing(floatingAnim2, {
          toValue: 0,
          duration: 3500,
          easing: Easing.inOut(Easing.sin),
          useNativeDriver: true,
        }),
      ]),
    ).start();

    Animated.loop(
      Animated.sequence([
        Animated.timing(floatingAnim3, {
          toValue: 1,
          duration: 4500,
          easing: Easing.inOut(Easing.sin),
          useNativeDriver: true,
          delay: 500,
        }),
        Animated.timing(floatingAnim3, {
          toValue: 0,
          duration: 4500,
          easing: Easing.inOut(Easing.sin),
          useNativeDriver: true,
        }),
      ]),
    ).start();

    // Title animation
    Animated.parallel([
      Animated.timing(titleScale, {
        toValue: 1,
        duration: 800,
        easing: Easing.elastic(1.2),
        useNativeDriver: true,
      }),
      Animated.timing(titleOpacity, {
        toValue: 1,
        duration: 600,
        useNativeDriver: true,
      }),
    ]).start();

    // Quick actions staggered animation
    Animated.stagger(
      100,
      actionAnimations.map((anim) =>
        Animated.timing(anim, {
          toValue: 1,
          duration: 600,
          easing: Easing.out(Easing.cubic),
          useNativeDriver: true,
        }),
      ),
    ).start();
  }, []);

  const bgColors = bgPulse.interpolate({
    inputRange: [0, 1],
    outputRange: ['#1E40AF', '#1D4ED8'],
  });

  const float1 = floatingAnim1.interpolate({
    inputRange: [0, 1],
    outputRange: [0, -15],
  });

  const float2 = floatingAnim2.interpolate({
    inputRange: [0, 1],
    outputRange: [0, 10],
  });

  const float3 = floatingAnim3.interpolate({
    inputRange: [0, 1],
    outputRange: [0, -8],
  });

  const titleScaleInterpolate = titleScale.interpolate({
    inputRange: [0, 1],
    outputRange: [0.5, 1],
  });

  return (
    <View style={styles.container}>
      <StatusBar backgroundColor="#1E3A8A" barStyle="light-content" />

      {/* ANIMATED HEADER */}
      <Animated.View style={[styles.header, { backgroundColor: bgColors }]}>
        {/* Floating Elements */}
        <Animated.View
          style={[
            styles.floatingCircle1,
            { transform: [{ translateY: float1 }] },
          ]}
        />
        <Animated.View
          style={[
            styles.floatingCircle2,
            { transform: [{ translateY: float2 }] },
          ]}
        />
        <Animated.View
          style={[
            styles.floatingCircle3,
            { transform: [{ translateY: float3 }] },
          ]}
        />

        <View style={styles.headerContent}>
          <Animated.Text
            style={[
              styles.headerTitle,
              {
                opacity: titleOpacity,
                transform: [{ scale: titleScaleInterpolate }],
              },
            ]}
          >
            Bill-Karo
          </Animated.Text>
          <View style={styles.subtitleContainer}>
            <Zap size={16} color="#E0E7FF" />
            <Text style={styles.headerSubtitle}>
              Your business, your billing partner
            </Text>
            <Zap size={16} color="#E0E7FF" />
          </View>
        </View>
      </Animated.View>

      <ScrollView
        style={styles.content}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: 50 }}
      >
        {/* TODAY'S SALE */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Today's Sale</Text>
            <View style={styles.sectionTitleLine} />
          </View>

          <View style={styles.salesCard}>
            <LinearGradient
              colors={['#2563EB', '#1D4ED8', '#3730A3']}
              style={styles.salesGradient}
            >
              <View style={styles.salesContent}>
                <View style={styles.salesLeft}>
                  <Text style={styles.salesLabel}>TOTAL SALE</Text>
                  <Text style={styles.salesValue}>₹12,450</Text>
                  <View style={styles.salesTrend}>
                    <TrendingUp size={16} color="#10B981" />
                    <Text style={styles.trendText}>+12% from yesterday</Text>
                  </View>
                </View>
                <View style={styles.salesRight}>
                  <View style={styles.salesIconCircle}>
                    <TrendingUp size={32} color="#2563EB" />
                  </View>
                </View>
              </View>
            </LinearGradient>
          </View>
        </View>

        {/* QUICK ACTIONS */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Quick Actions</Text>
            <View style={styles.sectionTitleLine} />
          </View>

          <View style={styles.quickActionsGrid}>
            {quickActions.map((action, index) => {
              const scaleAnim = actionAnimations[index].interpolate({
                inputRange: [0, 1],
                outputRange: [0.8, 1],
              });

              const opacityAnim = actionAnimations[index].interpolate({
                inputRange: [0, 1],
                outputRange: [0, 1],
              });

              return (
                <Animated.View
                  key={index}
                  style={[
                    styles.actionCardWrapper,
                    {
                      opacity: opacityAnim,
                      transform: [{ scale: scaleAnim }],
                    },
                  ]}
                >
                  <TouchableOpacity
                    style={styles.actionCard}
                    onPress={() => router.push(action.route as any)}
                    activeOpacity={0.7}
                  >
                    <View style={styles.actionContent}>
                      <View style={styles.actionHeader}>
                        <View style={styles.actionIconContainer}>
                          <action.icon size={24} color="#1E3A8A" />
                        </View>
                        <View style={styles.actionBadge}>
                          <Text style={styles.actionBadgeText}>Quick</Text>
                        </View>
                      </View>

                      <Text style={styles.actionLabel}>{action.title}</Text>
                      <Text style={styles.actionDescription}>
                        {action.description}
                      </Text>

                      <View style={styles.actionFooter}>
                        <View style={styles.actionArrow}>
                          <View style={styles.arrowCircle}>
                            <Text style={styles.arrowText}>→</Text>
                          </View>
                        </View>
                      </View>
                    </View>
                  </TouchableOpacity>
                </Animated.View>
              );
            })}
          </View>
        </View>

        {/* RECENT ACTIVITY */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Recent Activity</Text>
            <View style={styles.sectionTitleLine} />
          </View>
          <View style={styles.activityCard}>
            <View style={styles.activityPlaceholder}>
              <BarChart3 size={48} color="#CBD5E1" />
              <Text style={styles.placeholderTitle}>No Activity Yet</Text>
              <Text style={styles.placeholderText}>
                Your recent transactions will appear here
              </Text>
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

  /* ANIMATED HEADER */
  header: {
    paddingTop: 60,
    paddingBottom: 28,
    paddingHorizontal: 24,
    borderBottomLeftRadius: 28,
    borderBottomRightRadius: 28,
    elevation: 8,
    shadowColor: '#1E3A8A',
    shadowOffset: { width: 0, height: 5 },
    shadowOpacity: 0.3,
    shadowRadius: 12,
    alignItems: 'center',
    overflow: 'hidden',
  },
  headerContent: {
    alignItems: 'center',
    zIndex: 2,
  },
  headerTitle: {
    fontSize: 38,
    fontWeight: '900',
    color: '#FFFFFF',
    letterSpacing: 2,
    textShadowColor: 'rgba(0, 0, 0, 0.3)',
    textShadowOffset: { width: 0, height: 4 },
    textShadowRadius: 8,
  },
  subtitleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 12,
    gap: 8,
  },
  headerSubtitle: {
    fontSize: 15,
    color: '#E0E7FF',
    fontWeight: '600',
    letterSpacing: 0.5,
  },

  /* FLOATING ELEMENTS */
  floatingCircle1: {
    position: 'absolute',
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    top: 20,
    left: -30,
    zIndex: 1,
  },
  floatingCircle2: {
    position: 'absolute',
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    top: 80,
    right: -20,
    zIndex: 1,
  },
  floatingCircle3: {
    position: 'absolute',
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    bottom: 30,
    left: '40%',
    zIndex: 1,
  },

  /* CONTENT */
  content: {
    flex: 1,
    paddingHorizontal: 20,
    marginTop: 10,
  },

  /* SECTIONS */
  section: {
    marginBottom: 30,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 22,
    fontWeight: '800',
    color: '#1E3A8A',
    letterSpacing: 0.8,
  },
  sectionTitleLine: {
    height: 3,
    width: 36,
    backgroundColor: '#2563EB',
    borderRadius: 3,
    marginLeft: 12,
  },

  /* SALES CARD */
  salesCard: {
    borderRadius: 24,
    overflow: 'hidden',
    shadowColor: '#2563EB',
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.25,
    shadowRadius: 20,
    elevation: 10,
  },
  salesGradient: {
    borderRadius: 24,
    padding: 28,
  },
  salesContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  salesLeft: {
    flex: 1,
  },
  salesLabel: {
    fontSize: 14,
    fontWeight: '700',
    color: '#E0E7FF',
    marginBottom: 8,
    letterSpacing: 1,
    opacity: 0.9,
  },
  salesValue: {
    fontSize: 42,
    fontWeight: '900',
    color: '#FFFFFF',
    marginBottom: 12,
    letterSpacing: 0.5,
  },
  salesTrend: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(16, 185, 129, 0.2)',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 16,
    alignSelf: 'flex-start',
  },
  trendText: {
    fontSize: 13,
    color: '#10B981',
    fontWeight: '700',
    marginLeft: 6,
  },
  salesRight: {
    marginLeft: 16,
  },
  salesIconCircle: {
    width: 80,
    height: 80,
    borderRadius: 25,
    backgroundColor: '#FFFFFF',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.2,
    shadowRadius: 16,
    elevation: 8,
  },

  /* ENHANCED QUICK ACTIONS - CLEAN & PROFESSIONAL */
  quickActionsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    gap: 14,
  },
  actionCardWrapper: {
    width: '48%',
    marginBottom: 14,
  },
  actionCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 4,
    height: 140,
    borderWidth: 1.5,
    borderColor: '#F1F5F9',
  },
  actionContent: {
    flex: 1,
    padding: 18,
    justifyContent: 'space-between',
  },
  actionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  actionIconContainer: {
    width: 48,
    height: 48,
    borderRadius: 12,
    backgroundColor: '#F8FAFC',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1.5,
    borderColor: '#E2E8F0',
  },
  actionBadge: {
    backgroundColor: '#1E3A8A',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  actionBadgeText: {
    fontSize: 10,
    fontWeight: '800',
    color: '#FFFFFF',
    letterSpacing: 0.5,
  },
  actionLabel: {
    fontSize: 16,
    fontWeight: '800',
    color: '#1E293B',
    marginTop: 8,
    letterSpacing: 0.5,
  },
  actionDescription: {
    fontSize: 12,
    color: '#64748B',
    fontWeight: '500',
    marginTop: 2,
    letterSpacing: 0.3,
    lineHeight: 16,
  },
  actionFooter: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    marginTop: 8,
  },
  actionArrow: {
    alignItems: 'flex-end',
  },
  arrowCircle: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#1E3A8A',
    justifyContent: 'center',
    alignItems: 'center',
  },
  arrowText: {
    fontSize: 14,
    fontWeight: '900',
    color: '#FFFFFF',
  },

  /* ACTIVITY CARD */
  activityCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 28,
    borderWidth: 2,
    borderColor: '#F1F5F9',
    shadowColor: '#E2E8F0',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 3,
  },
  activityPlaceholder: {
    alignItems: 'center',
    paddingVertical: 24,
  },
  placeholderTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#475569',
    marginTop: 20,
    marginBottom: 8,
  },
  placeholderText: {
    color: '#94A3B8',
    textAlign: 'center',
    fontSize: 14,
    lineHeight: 20,
  },
});
