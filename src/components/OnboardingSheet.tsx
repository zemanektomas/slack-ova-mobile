/**
 * Onboarding modal — F5 v0.7.3.
 *
 * Zobrazí se jednou při prvním otevření apky (marker v AsyncStorage).
 * 3 slidy: vítej, safety disclaimer, výběr úrovně.
 */

import { useState } from 'react';
import {
  Modal,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { useTheme } from '../theme';
import { useLevelStore, UserLevel } from '../store/levelStore';

interface Props {
  visible: boolean;
  onClose: () => void;
}

export function OnboardingSheet({ visible, onClose }: Props) {
  const t = useTheme();
  const { t: tr } = useTranslation();
  const [slide, setSlide] = useState(0);
  const setLevel = useLevelStore((s) => s.setLevel);
  const setOnboardingSeen = useLevelStore((s) => s.setOnboardingSeen);

  const handleFinish = (level: UserLevel) => {
    setLevel(level);
    setOnboardingSeen(true);
    setSlide(0);
    onClose();
  };

  const handleSkip = () => {
    setOnboardingSeen(true);
    setSlide(0);
    onClose();
  };

  return (
    <Modal visible={visible} animationType="fade" transparent statusBarTranslucent>
      <View style={styles.backdrop}>
        <View style={[styles.sheet, { backgroundColor: t.surface }]}>
          <Text style={[styles.title, { color: t.text }]}>
            {tr('onboarding.title')}
          </Text>

          {slide === 0 && (
            <View style={styles.slideBody}>
              <MaterialCommunityIcons name="map-outline" size={48} color={t.accent} />
              <Text style={[styles.slideTitle, { color: t.text }]}>
                {tr('onboarding.slide1Title')}
              </Text>
              <Text style={[styles.slideText, { color: t.textMuted }]}>
                {tr('onboarding.slide1Body')}
              </Text>
            </View>
          )}

          {slide === 1 && (
            <View style={styles.slideBody}>
              <MaterialCommunityIcons name="shield-alert-outline" size={48} color="#e11d48" />
              <Text style={[styles.slideTitle, { color: t.text }]}>
                {tr('onboarding.slide2Title')}
              </Text>
              <Text style={[styles.slideText, { color: t.textMuted }]}>
                {tr('onboarding.slide2Body')}
              </Text>
            </View>
          )}

          {slide === 2 && (
            <View style={styles.slideBody}>
              <MaterialCommunityIcons name="account-cog-outline" size={48} color={t.accent} />
              <Text style={[styles.slideTitle, { color: t.text }]}>
                {tr('onboarding.slide3Title')}
              </Text>
              <Text style={[styles.slideText, { color: t.textMuted, marginBottom: 16 }]}>
                {tr('onboarding.slide3Body')}
              </Text>
              {(['novice', 'normal', 'pro'] as UserLevel[]).map((l) => (
                <Pressable
                  key={l}
                  onPress={() => handleFinish(l)}
                  style={[styles.levelBtn, { borderColor: t.border, backgroundColor: t.surfaceAlt }]}
                >
                  <Text style={[styles.levelBtnLabel, { color: t.text }]}>
                    {tr(`level.${l}`)}
                  </Text>
                  <Text style={[styles.levelBtnHint, { color: t.textMuted }]}>
                    {tr(`level.${l}Hint`)}
                  </Text>
                </Pressable>
              ))}
            </View>
          )}

          {/* Navigation */}
          {slide < 2 ? (
            <View style={styles.footer}>
              <Pressable onPress={handleSkip} style={styles.skipBtn}>
                <Text style={{ color: t.textDim }}>{tr('onboarding.skip')}</Text>
              </Pressable>
              <View style={styles.dots}>
                {[0, 1, 2].map((i) => (
                  <View
                    key={i}
                    style={[
                      styles.dot,
                      { backgroundColor: i === slide ? t.accent : t.border },
                    ]}
                  />
                ))}
              </View>
              <Pressable
                onPress={() => setSlide(slide + 1)}
                style={[styles.nextBtn, { backgroundColor: t.accent }]}
              >
                <Text style={{ color: t.accentOn, fontWeight: '600' }}>
                  {tr('onboarding.next')}
                </Text>
              </Pressable>
            </View>
          ) : (
            <View style={styles.footerOnlyDots}>
              <View style={styles.dots}>
                {[0, 1, 2].map((i) => (
                  <View
                    key={i}
                    style={[
                      styles.dot,
                      { backgroundColor: i === slide ? t.accent : t.border },
                    ]}
                  />
                ))}
              </View>
            </View>
          )}
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.7)',
    justifyContent: 'center',
    padding: 20,
  },
  sheet: {
    borderRadius: 16,
    padding: 20,
    maxWidth: 460,
    alignSelf: 'center',
    width: '100%',
  },
  title: {
    fontSize: 20,
    fontWeight: '700',
    textAlign: 'center',
    marginBottom: 8,
  },
  slideBody: {
    alignItems: 'center',
    paddingVertical: 12,
  },
  slideTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginTop: 12,
    marginBottom: 8,
    textAlign: 'center',
  },
  slideText: {
    fontSize: 13,
    lineHeight: 19,
    textAlign: 'center',
    marginBottom: 4,
  },
  levelBtn: {
    borderWidth: 1,
    borderRadius: 8,
    padding: 12,
    marginBottom: 8,
    alignSelf: 'stretch',
  },
  levelBtnLabel: { fontSize: 14, fontWeight: '600' },
  levelBtnHint: { fontSize: 11, marginTop: 2 },
  footer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 20,
  },
  footerOnlyDots: {
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 12,
  },
  skipBtn: {
    padding: 8,
  },
  dots: {
    flexDirection: 'row',
    gap: 6,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  nextBtn: {
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 8,
  },
});
