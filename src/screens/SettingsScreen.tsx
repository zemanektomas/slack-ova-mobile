import { SettingsSheet } from '../components/SettingsSheet';

/**
 * Settings — full screen tab (v0.8.0).
 *
 * Renderuje SettingsSheet v inline mode — bez Modal wrapperu, bez backdrop,
 * bez close X. Uzivatel navigate pres tab bar.
 *
 * SettingsSheet je stale hlavni komponent pro pouzdrete i modal (backward
 * compat pro dev). V v0.8.0.x muzeme rename na SettingsPanel + ponechat
 * modal jako SettingsSheet thin wrapper.
 */
export default function SettingsScreen() {
  return (
    <SettingsSheet
      visible={true}
      onClose={() => { /* no-op v inline mode */ }}
      mode="inline"
    />
  );
}
