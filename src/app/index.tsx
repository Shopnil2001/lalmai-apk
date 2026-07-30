import React, { useState, useEffect, useRef } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  ScrollView, 
  Image, 
  Dimensions, 
  TouchableOpacity, 
  Linking,
  ActivityIndicator,
  Platform
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../context/AuthContext';
import { dbService } from '../services/dbService';
import { HomepageSettings } from '../services/mockData';
import { Colors, Spacing, Typography, Shadows } from '../constants/theme';
import Button from '../components/Button';
import Card from '../components/Card';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const SLIDER_HEIGHT = 280;

export default function WelcomeLandingPage() {
  const router = useRouter();
  const { isAuthenticated, isAdmin } = useAuth();
  
  const [settings, setSettings] = useState<HomepageSettings | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [activeSlide, setActiveSlide] = useState<number>(0);
  
  const sliderScrollViewRef = useRef<ScrollView>(null);

  useEffect(() => {
    async function loadHomepageData() {
      try {
        const homepageData = await dbService.getHomepageSettings();
        setSettings(homepageData);
      } catch (error) {
        console.error('Failed to load homepage settings:', error);
      } finally {
        setLoading(false);
      }
    }
    loadHomepageData();
  }, []);

  const handleScroll = (event: any) => {
    const slide = Math.round(event.nativeEvent.contentOffset.x / SCREEN_WIDTH);
    if (slide !== activeSlide) {
      setActiveSlide(slide);
    }
  };

  const handleGetStarted = () => {
    if (isAuthenticated) {
      if (isAdmin) {
        router.replace('/(admin)/dashboard');
      } else {
        router.replace('/(tabs)/fees' as any);
      }
    } else {
      router.replace('/(auth)/login');
    }
  };
  const openPhone = (phone: string) => {
    Linking.openURL(`tel:${phone}`).catch(err => {
      console.error('Failed to dial phone number:', err);
    });
  };

  const openWhatsapp = (phone: string) => {
    // Clean phone number from spaces/dashes
    const cleanNum = phone.replace(/[^0-9+]/g, '');
    Linking.openURL(`https://wa.me/${cleanNum}`).catch(err => {
      console.error('Failed to open WhatsApp chat:', err);
    });
  };

  const openFacebook = (url: string) => {
    Linking.openURL(url).catch(err => {
      console.error('Failed to open Facebook page:', err);
    });
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={Colors.light.accent} />
        <Text style={styles.loadingText}>Loading Lalmai Upozila Rent A Car...</Text>
      </View>
    );
  }

  // Fallback defaults if load fails
  const sliders = settings?.sliders || [];
  const gallery = settings?.gallery || [];
  const contactInfo = settings?.contactInfo || { phone: '', whatsapp: '', facebook: '' };

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView 
        style={styles.container}
        contentContainerStyle={styles.contentContainer}
        showsVerticalScrollIndicator={false}
      >
        {/* Header App Brand Logo */}
        <View style={styles.brandHeader}>
          <Image 
            source={require('../../assets/images/logo.png')} 
            style={styles.brandLogo} 
            resizeMode="contain"
          />
          <View style={styles.brandTextContainer}>
            <Text style={styles.brandName}>Lalmai Upozila Rent A Car</Text>
            <Text style={styles.brandTagline}>Your Safe & Trusted Journey Partner</Text>
          </View>
        </View>

        {/* Sliders Area */}
        {sliders.length > 0 && (
          <View style={styles.sliderWrapper}>
            <ScrollView
              ref={sliderScrollViewRef}
              horizontal
              pagingEnabled
              showsHorizontalScrollIndicator={false}
              onScroll={handleScroll}
              scrollEventThrottle={16}
              style={styles.sliderScrollView}
            >
              {sliders.map((slide, index) => (
                <View key={index} style={styles.slide}>
                  <Image 
                    source={{ uri: slide.imageUrl }} 
                    style={styles.slideImage} 
                    resizeMode="cover"
                  />
                  {/* Text Overlay */}
                  <View style={styles.slideOverlay}>
                    <Text style={styles.slideText}>{slide.text}</Text>
                  </View>
                </View>
              ))}
            </ScrollView>
            
            {/* Slide Indicators / Dots */}
            <View style={styles.dotsContainer}>
              {sliders.map((_, index) => (
                <View 
                  key={index} 
                  style={[
                    styles.dot, 
                    activeSlide === index ? styles.activeDot : null
                  ]} 
                />
              ))}
            </View>
          </View>
        )}

        {/* CTA Get Started Section */}
        <View style={styles.ctaWrapper}>
          <Button
            title="Get Started"
            variant="primary"
            onPress={handleGetStarted}
            style={styles.ctaButton}
            rightIcon="chevron-forward"
          />
        </View>

        {/* Beautiful image gallery in two columns */}
        {gallery.length > 0 && (
          <View style={styles.sectionBlock}>
            <Text style={styles.sectionTitle}>LRC Gallery</Text>
            <View style={styles.galleryGrid}>
              {gallery.map((imgUrl, index) => (
                <Card key={index} style={styles.galleryGridCard} elevation="sm">
                  <Image 
                    source={{ uri: imgUrl }} 
                    style={styles.galleryImage} 
                    resizeMode="cover"
                  />
                </Card>
              ))}
            </View>
          </View>
        )}

        {/* Contact Info Section */}
        <View style={[styles.sectionBlock, styles.contactBlock]}>
          <Text style={styles.sectionTitle}>Contact & Support</Text>
          <Text style={styles.contactSubtitle}>Get in touch with our committee for rentals or general help</Text>
          
          <Card style={styles.contactsContainer} elevation="sm">
            {contactInfo.phone ? (
              <TouchableOpacity 
                activeOpacity={0.8}
                style={styles.contactItem}
                onPress={() => openPhone(contactInfo.phone)}
              >
                <View style={[styles.iconCircle, { backgroundColor: Colors.light.accentLight }]}>
                  <Ionicons name="call" size={20} color={Colors.light.accent} />
                </View>
                <View style={styles.contactDetails}>
                  <Text style={styles.contactLabel}>Phone Call</Text>
                  <Text style={styles.contactVal}>{contactInfo.phone}</Text>
                </View>
                <Ionicons name="chevron-forward" size={16} color={Colors.light.textLight} />
              </TouchableOpacity>
            ) : null}

            {contactInfo.phone && contactInfo.whatsapp ? <View style={styles.contactDivider} /> : null}

            {contactInfo.whatsapp ? (
              <TouchableOpacity 
                activeOpacity={0.8}
                style={styles.contactItem}
                onPress={() => openWhatsapp(contactInfo.whatsapp)}
              >
                <View style={[styles.iconCircle, { backgroundColor: '#E8F5E9' }]}>
                  <Ionicons name="logo-whatsapp" size={20} color="#2E7D32" />
                </View>
                <View style={styles.contactDetails}>
                  <Text style={styles.contactLabel}>WhatsApp Support</Text>
                  <Text style={styles.contactVal}>{contactInfo.whatsapp}</Text>
                </View>
                <Ionicons name="chevron-forward" size={16} color={Colors.light.textLight} />
              </TouchableOpacity>
            ) : null}

            {(contactInfo.phone || contactInfo.whatsapp) && contactInfo.facebook ? <View style={styles.contactDivider} /> : null}

            {contactInfo.facebook ? (
              <TouchableOpacity 
                activeOpacity={0.8}
                style={styles.contactItem}
                onPress={() => openFacebook(contactInfo.facebook)}
              >
                <View style={[styles.iconCircle, { backgroundColor: '#E3F2FD' }]}>
                  <Ionicons name="logo-facebook" size={20} color="#1565C0" />
                </View>
                <View style={styles.contactDetails}>
                  <Text style={styles.contactLabel}>Official Facebook Page</Text>
                  <Text style={styles.contactVal} numberOfLines={1}>facebook.com/lalmairentcar</Text>
                </View>
                <Ionicons name="chevron-forward" size={16} color={Colors.light.textLight} />
              </TouchableOpacity>
            ) : null}
          </Card>
        </View>

        <Text style={styles.footerText}>© {new Date().getFullYear()} Lalmai Upozila Rent A Car Driver Association</Text>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: Colors.light.background,
  },
  container: {
    flex: 1,
  },
  contentContainer: {
    paddingBottom: Spacing.xl,
  },
  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.light.background,
  },
  loadingText: {
    marginTop: Spacing.md,
    ...Typography.bodyMedium,
    color: Colors.light.textSecondary,
    fontWeight: '600',
  },
  brandHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.lg,
    paddingTop: Platform.OS === 'ios' ? 0 : Spacing.md,
    paddingBottom: Spacing.sm,
  },
  brandLogo: {
    width: 44,
    height: 44,
    marginRight: Spacing.sm,
  },
  brandTextContainer: {
    flex: 1,
  },
  brandName: {
    ...Typography.h2,
    fontWeight: '800',
    color: Colors.light.primary,
    lineHeight: 24,
  },
  brandTagline: {
    ...Typography.bodySmall,
    color: Colors.light.accent,
    fontWeight: '600',
  },
  sliderWrapper: {
    width: SCREEN_WIDTH,
    height: SLIDER_HEIGHT,
    position: 'relative',
    marginTop: Spacing.sm,
  },
  sliderScrollView: {
    width: SCREEN_WIDTH,
    height: SLIDER_HEIGHT,
  },
  slide: {
    width: SCREEN_WIDTH,
    height: SLIDER_HEIGHT,
    position: 'relative',
  },
  slideImage: {
    width: SCREEN_WIDTH,
    height: SLIDER_HEIGHT,
  },
  slideOverlay: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: 'rgba(15, 23, 42, 0.65)',
    paddingVertical: Spacing.md,
    paddingHorizontal: Spacing.lg,
  },
  slideText: {
    ...Typography.bodyLarge,
    color: '#FFFFFF',
    fontWeight: '700',
    textAlign: 'center',
    lineHeight: 22,
  },
  dotsContainer: {
    position: 'absolute',
    bottom: Spacing.sm,
    right: Spacing.lg,
    flexDirection: 'row',
    alignItems: 'center',
  },
  dot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: 'rgba(255, 255, 255, 0.4)',
    marginHorizontal: 3,
  },
  activeDot: {
    width: 14,
    backgroundColor: Colors.light.accent,
  },
  ctaWrapper: {
    alignItems: 'center',
    paddingHorizontal: Spacing.lg,
    marginVertical: Spacing.lg,
  },
  ctaButton: {
    width: '100%',
    height: 48,
    borderRadius: 24,
    shadowColor: Colors.light.accent,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 6,
    elevation: 4,
  },
  sectionBlock: {
    paddingHorizontal: Spacing.lg,
    marginTop: Spacing.sm,
    marginBottom: Spacing.md,
  },
  sectionTitle: {
    ...Typography.h3,
    color: Colors.light.primary,
    fontWeight: '800',
    marginBottom: Spacing.sm,
  },
  galleryGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  galleryGridCard: {
    width: '48.5%',
    aspectRatio: 1.4,
    borderRadius: 12,
    overflow: 'hidden',
    padding: 0,
    marginBottom: Spacing.md,
  },
  galleryImage: {
    width: '100%',
    height: '100%',
  },
  contactBlock: {
    marginTop: Spacing.md,
  },
  contactSubtitle: {
    ...Typography.bodySmall,
    color: Colors.light.textSecondary,
    marginTop: -4,
    marginBottom: Spacing.md,
  },
  contactsContainer: {
    padding: Spacing.md,
    borderRadius: 16,
  },
  contactItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: Spacing.sm,
  },
  iconCircle: {
    width: 38,
    height: 38,
    borderRadius: 19,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: Spacing.md,
  },
  contactDetails: {
    flex: 1,
  },
  contactLabel: {
    ...Typography.bodySmall,
    color: Colors.light.textSecondary,
    fontWeight: '600',
  },
  contactVal: {
    ...Typography.bodyMedium,
    color: Colors.light.primary,
    fontWeight: '700',
    marginTop: 1,
  },
  contactDivider: {
    height: 1,
    backgroundColor: Colors.light.surfaceDarker,
    marginVertical: Spacing.xs,
  },
  footerText: {
    ...Typography.bodySmall,
    color: Colors.light.textLight,
    textAlign: 'center',
    fontSize: 10,
    marginTop: Spacing.lg,
  }
});
