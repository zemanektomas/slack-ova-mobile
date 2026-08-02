/**
 * Kalkulátor modal — F5 v0.7.4.
 *
 * Wrapper pro 4 kalkulátory (angle / force / ma / deviation).
 * Použit z ISASafetySheet CardView, když karta má relatedCalculator.
 */

import { Modal, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { useTheme } from '../../theme';
import { AnchorAngleCalculator } from './AnchorAngleCalculator';
import { ForceEstimator } from './ForceEstimator';
import { MACalculator } from './MACalculator';
import { DeviationCalculator } from './DeviationCalculator';

export type CalculatorType = 'angle' | 'force' | 'ma' | 'deviation';

interface Props {
  visible: boolean;
  type: CalculatorType | null;
  onClose: () => void;
}

const TITLES: Record<CalculatorType, string> = {
  angle: 'calc.angle.title',
  force: 'calc.force.title',
  ma: 'calc.ma.title',
  deviation: 'calc.deviation.title',
};

const ICONS: Record<CalculatorType, string> = {
  angle: 'angle-acute',
  force: 'lightning-bolt',
  ma: 'cog-outline',
  deviation: 'call-split',
};

export function CalculatorsSheet({ visible, type, onClose }: Props) {
  const t = useTheme();
  const { t: tr } = useTranslation();

  if (!type) return null;

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent
      onRequestClose={onClose}
      statusBarTranslucent
    >
      <View style={styles.backdrop}>
        <Pressable style={styles.backdropDismiss} onPress={onClose} />
        <View style={[styles.sheet, { backgroundColor: t.surface }]}>
          <View style={styles.header}>
            <MaterialCommunityIcons
              name={ICONS[type] as any}
              size={22}
              color={t.text}
              style={{ marginRight: 10 }}
            />
            <Text style={[styles.title, { color: t.text, flex: 1 }]}>{tr(TITLES[type])}</Text>
            <Pressable onPress={onClose} hitSlop={10}>
              <MaterialCommunityIcons name="close" size={24} color={t.textMuted} />
            </Pressable>
          </View>

          <ScrollView
            style={styles.scroll}
            contentContainerStyle={{ paddingBottom: 24, paddingHorizontal: 16 }}
            keyboardShouldPersistTaps="handled"
          >
            {type === 'angle' && <AnchorAngleCalculator />}
            {type === 'force' && <ForceEstimator />}
            {type === 'ma' && <MACalculator />}
            {type === 'deviation' && <DeviationCalculator />}
          </ScrollView>

          <View style={[styles.footer, { borderTopColor: t.border }]}>
            <Pressable onPress={onClose} style={[styles.footerBtn, { backgroundColor: t.accent }]}>
              <Text style={{ color: t.accentOn, fontWeight: '600' }}>{tr('common.done')}</Text>
            </Pressable>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.6)',
    justifyContent: 'flex-end',
  },
  backdropDismiss: { flex: 1 },
  sheet: {
    maxHeight: '92%',
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    paddingTop: 8,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  title: { fontSize: 18, fontWeight: '600' },
  scroll: { flexGrow: 0 },
  footer: {
    flexDirection: 'row',
    padding: 16,
    borderTopWidth: 1,
  },
  footerBtn: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
});
