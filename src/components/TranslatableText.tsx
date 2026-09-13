/**
 * TranslatableText — sebeobsluzna komponenta pro on-device preklad textu.
 *
 * Pattern jako TranslatableBlock v InlineDetail.tsx, ale bez tea props.
 * Interne uklada preklad state, deteguje zdrojovy jazyk pres ML Kit.
 *
 * Pouziti napr. pro ISA warnings (description/solution jsou vzdy EN, user
 * ma nastavene CS/PL → preklad na tap).
 */

import { useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, View, TextStyle } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { useLangStore } from '../store/langStore';
import { useFontStore } from '../store/fontStore';
import { translateOnDevice, UnsupportedSourceLangError, SupportedLang } from '../i18n/translate';

interface Props {
  text: string;
  /** Barva textu. Default: inherit z parenta (undefined). */
  color?: string;
  /** Barva „Přeložit" labelu + ikony. Default = color. */
  hintColor?: string;
  style?: TextStyle;
}

interface TranslateState {
  loading: boolean;
  translated?: string;
  detectedLang?: string;
  showOriginal: boolean;
  error?: string;
}

export function TranslatableText({ text, color, hintColor, style }: Props) {
  const fs = useFontStore((s) => s.fontScale);
  const lang = useLangStore((s) => s.lang) as SupportedLang;
  const { t: tr } = useTranslation();
  const [state, setState] = useState<TranslateState>({ loading: false, showOriginal: true });

  const handleTranslate = async () => {
    if (state.translated) {
      setState({ ...state, showOriginal: !state.showOriginal });
      return;
    }
    setState({ ...state, loading: true, error: undefined });
    try {
      const result = await translateOnDevice(text, lang);
      setState({
        loading: false,
        translated: result.text,
        detectedLang: result.sourceLang,
        showOriginal: result.sourceLang === lang,
      });
    } catch (e) {
      const isUnsupported = e instanceof UnsupportedSourceLangError;
      setState({
        loading: false,
        showOriginal: true,
        error: isUnsupported ? tr('detail.translateUnsupported') : tr('detail.translateError'),
      });
    }
  };

  const showTranslated = state.translated && !state.showOriginal;
  const displayText = showTranslated ? state.translated! : text;
  const sameLang = state.detectedLang && !state.translated;
  const labelColor = hintColor ?? color;

  return (
    <View>
      <Text style={[{ color, fontSize: 13 * fs, lineHeight: 18 * fs }, style]}>{displayText}</Text>
      <Pressable
        onPress={handleTranslate}
        disabled={state.loading}
        style={styles.btn}
        hitSlop={6}
      >
        {state.loading ? (
          <ActivityIndicator size="small" color={labelColor} />
        ) : (
          <MaterialCommunityIcons name="translate" size={12} color={labelColor} />
        )}
        <Text style={[styles.label, { color: labelColor, fontSize: 11 * fs }]}>
          {state.loading
            ? tr('detail.translating')
            : showTranslated
              ? tr('detail.showOriginal')
              : sameLang
                ? tr('detail.sameLanguage')
                : tr('detail.translate')}
        </Text>
      </Pressable>
      {state.error && (
        <Text style={[styles.error, { color: labelColor }]}>{state.error}</Text>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  btn: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 4 },
  label: { fontStyle: 'italic', opacity: 0.85 },
  error: { fontSize: 11, marginTop: 2, opacity: 0.9 },
});
