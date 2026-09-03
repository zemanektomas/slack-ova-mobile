/**
 * Community Sheet — F5 v0.7.3
 *
 * Ukazuje ISA members + slackline groups per country ze Slackmap community API.
 * Otevírá se z detailu lajny (podle state → country code) nebo Settings.
 */

import { useMemo, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Linking,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { useTheme, Theme } from '../theme';
import { useFontStore } from '../store/fontStore';
import {
  CommunityData,
  ISAMember,
  SlacklineGroup,
  getCommunityForCountry,
} from '../api/community';

interface Props {
  visible: boolean;
  countryCode: string | null;
  onClose: () => void;
}

export function CommunitySheet({ visible, countryCode, onClose }: Props) {
  const fs = useFontStore((s) => s.fontScale);
  const styles = useMemo(() => makeStyles(fs), [fs]);
  const t = useTheme();
  const { t: tr } = useTranslation();
  const [data, setData] = useState<CommunityData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!visible || !countryCode) {
      setData(null);
      setError(null);
      return;
    }
    setLoading(true);
    setError(null);
    getCommunityForCountry(countryCode)
      .then((d) => {
        if (d) setData(d);
        else setError(tr('community.loadFailed'));
      })
      .catch(() => setError(tr('community.loadFailed')))
      .finally(() => setLoading(false));
  }, [visible, countryCode]);

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
            <View style={{ flex: 1 }}>
              <Text style={[styles.title, { color: t.text }]}>
                {tr('community.title')}
              </Text>
              {data?.name && (
                <Text style={[styles.subtitle, { color: t.textMuted }]}>{data.name}</Text>
              )}
            </View>
            <Pressable onPress={onClose} hitSlop={10}>
              <MaterialCommunityIcons name="close" size={24} color={t.textMuted} />
            </Pressable>
          </View>

          <ScrollView style={styles.scroll} contentContainerStyle={{ paddingBottom: 24 }}>
            {loading && (
              <View style={{ padding: 40, alignItems: 'center' }}>
                <ActivityIndicator size="small" color={t.accent} />
              </View>
            )}

            {!loading && error && (
              <Text style={[styles.errorText, { color: t.textDim }]}>{error}</Text>
            )}

            {!loading && !error && data && (
              <>
                {/* ISA members */}
                {data.isaMembers.length > 0 && (
                  <View style={styles.section}>
                    <Text style={[styles.sectionLabel, { color: t.textDim }]}>
                      {tr('community.isaMembers')}
                    </Text>
                    {data.isaMembers.map((m, idx) => (
                      <ISAMemberRow key={idx} member={m} theme={t} tr={tr} />
                    ))}
                  </View>
                )}

                {/* Slackline groups */}
                {data.slacklineGroups.length > 0 && (
                  <View style={styles.section}>
                    <Text style={[styles.sectionLabel, { color: t.textDim }]}>
                      {tr('community.slacklineGroups')}
                    </Text>
                    {data.slacklineGroups.map((g) => (
                      <GroupRow key={g.id} group={g} theme={t} tr={tr} />
                    ))}
                  </View>
                )}

                {data.isaMembers.length === 0 && data.slacklineGroups.length === 0 && (
                  <Text style={[styles.errorText, { color: t.textDim }]}>
                    {tr('community.empty')}
                  </Text>
                )}

                <Text style={[styles.footerNote, { color: t.textDim }]}>
                  {tr('community.footerNote')}
                </Text>
              </>
            )}
          </ScrollView>

          <View style={[styles.footer, { borderTopColor: t.border }]}>
            <Pressable
              onPress={onClose}
              style={[styles.footerBtn, { backgroundColor: t.accent }]}
            >
              <Text style={{ color: t.accentOn, fontWeight: '600' }}>{tr('common.done')}</Text>
            </Pressable>
          </View>
        </View>
      </View>
    </Modal>
  );
}

// -----------------------------------------------------------------------------

function ISAMemberRow({ member, theme, tr }: { member: ISAMember; theme: Theme; tr: (k: string) => string }) {
  const fs = useFontStore((s) => s.fontScale);
  const styles = useMemo(() => makeStyles(fs), [fs]);
  return (
    <View style={[styles.card, { backgroundColor: theme.surfaceAlt, borderColor: theme.border }]}>
      <View style={styles.cardHeader}>
        <MaterialCommunityIcons name="shield-star-outline" size={16} color={theme.accent} style={{ marginRight: 6 }} />
        <Text style={[styles.cardTitle, { color: theme.text }]}>{member.name}</Text>
        {member.memberType && (
          <View style={[styles.badge, { backgroundColor: theme.surface, borderColor: theme.border }]}>
            <Text style={[styles.badgeText, { color: theme.textMuted }]}>{member.memberType}</Text>
          </View>
        )}
      </View>
      <View style={styles.linkRow}>
        {member.infoUrl && (
          <LinkChip icon="web" label="web" url={member.infoUrl} theme={theme} />
        )}
        {member.email && (
          <LinkChip icon="email-outline" label={member.email} url={`mailto:${member.email}`} theme={theme} />
        )}
      </View>
    </View>
  );
}

function GroupRow({ group, theme, tr }: { group: SlacklineGroup; theme: Theme; tr: (k: string) => string }) {
  const fs = useFontStore((s) => s.fontScale);
  const styles = useMemo(() => makeStyles(fs), [fs]);
  return (
    <View style={[styles.card, { backgroundColor: theme.surfaceAlt, borderColor: theme.border }]}>
      <View style={styles.cardHeader}>
        <MaterialCommunityIcons name="account-group-outline" size={16} color={theme.text} style={{ marginRight: 6 }} />
        <Text style={[styles.cardTitle, { color: theme.text }]}>{group.name}</Text>
      </View>
      <View style={styles.linkRow}>
        {group.webpage && (
          <LinkChip icon="web" label="web" url={group.webpage} theme={theme} />
        )}
        {group.facebookGroup && (
          <LinkChip icon="facebook" label="FB skupina" url={group.facebookGroup} theme={theme} />
        )}
        {group.facebookPage && (
          <LinkChip icon="facebook" label="FB stránka" url={group.facebookPage} theme={theme} />
        )}
        {group.instagram && (
          <LinkChip icon="instagram" label="IG" url={group.instagram} theme={theme} />
        )}
        {group.youtube && (
          <LinkChip icon="youtube" label="YT" url={group.youtube} theme={theme} />
        )}
        {group.email && (
          <LinkChip icon="email-outline" label="email" url={`mailto:${group.email}`} theme={theme} />
        )}
      </View>
    </View>
  );
}

function LinkChip({
  icon, label, url, theme,
}: {
  icon: string;
  label: string;
  url: string;
  theme: Theme;
}) {
  const fs = useFontStore((s) => s.fontScale);
  const styles = useMemo(() => makeStyles(fs), [fs]);
  return (
    <Pressable
      onPress={() => Linking.openURL(url).catch(() => {})}
      style={[styles.chip, { backgroundColor: theme.surface, borderColor: theme.border }]}
    >
      <MaterialCommunityIcons name={icon as any} size={12} color={theme.accent} style={{ marginRight: 4 }} />
      <Text style={[styles.chipText, { color: theme.accent }]} numberOfLines={1}>{label}</Text>
    </Pressable>
  );
}

// -----------------------------------------------------------------------------

const makeStyles = (fs: number) => StyleSheet.create({
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
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  title: { fontSize: 18 * fs, fontWeight: '600' },
  subtitle: { fontSize: 13 * fs, marginTop: 2 },
  scroll: { flexGrow: 0 },
  section: {
    marginHorizontal: 16,
    marginBottom: 12,
  },
  sectionLabel: {
    fontSize: 11 * fs,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    fontWeight: '600',
    marginBottom: 8,
  },
  card: {
    borderWidth: 1,
    borderRadius: 8,
    padding: 10,
    marginBottom: 6,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 6,
  },
  cardTitle: { flex: 1, fontSize: 13 * fs, fontWeight: '600' },
  badge: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    borderWidth: 1,
  },
  badgeText: { fontSize: 10 * fs, fontWeight: '500' },
  linkRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
  },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    borderWidth: 1,
    maxWidth: 200,
  },
  chipText: { fontSize: 11 * fs, fontWeight: '500' },
  errorText: { fontSize: 12 * fs, textAlign: 'center', padding: 24, fontStyle: 'italic' },
  footerNote: {
    fontSize: 10 * fs,
    fontStyle: 'italic',
    textAlign: 'center',
    marginTop: 16,
    marginHorizontal: 16,
  },
  footer: {
    flexDirection: 'row',
    padding: 12,
    borderTopWidth: 1,
  },
  footerBtn: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
});
