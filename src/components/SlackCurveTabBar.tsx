import React from 'react';
import { View, Pressable, StyleSheet, Text, useWindowDimensions } from 'react-native';
import Svg, { Path, Circle } from 'react-native-svg';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter, usePathname } from 'expo-router';
import type { BottomTabBarProps } from '@react-navigation/bottom-tabs';
import { useTheme } from '../theme';

/**
 * Slackline curve tab bar — v0.8.0-alpha4.
 *
 * Layout:
 *   Bottom row (56 px) — 6 primary tabs: Lajny / ISA / Calc / Gear / Reports / Training
 *   Right side (64 px) — Bezier curve rising to top-right corner with Settings icon
 *
 * The curve is drawn as SVG: solid fill under the shape (background surface color),
 * plus 2 px stroke along the curve edge (webbing top edge texture), plus 2 small
 * circles at the curve endpoints (anchors — where the slackline attaches).
 *
 * Design metaphor: the tab bar is a rigged slackline. Left side is flat (line at rest),
 * right side rises to the anchor point where Settings hangs.
 */

const TAB_HEIGHT = 56;
const CURVE_HEIGHT = 64;
const TOTAL_HEIGHT = TAB_HEIGHT + CURVE_HEIGHT;

/** Exported for screen paddingBottom — content sits ABOVE the curve. */
export const CURVE_TABBAR_HEIGHT = TOTAL_HEIGHT;

// Tabs shown in bottom row. Settings is separate on top-right.
const PRIMARY_TABS = [
  { name: 'index', label: 'lines', icon: 'map' },
  { name: 'isa', label: 'isa', icon: 'shield-check' },
  { name: 'calculators', label: 'calculators', icon: 'calculator-variant' },
  { name: 'gear', label: 'gear', icon: 'bag-personal' },
  { name: 'reports', label: 'reports', icon: 'clipboard-text' },
  { name: 'training', label: 'training', icon: 'dumbbell' },
] as const;

export function SlackCurveTabBar(props: BottomTabBarProps) {
  const t = useTheme();
  const router = useRouter();
  const pathname = usePathname();
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();

  const height = TOTAL_HEIGHT + insets.bottom;

  // Curve geometry — right ~35% of the screen bends up.
  const curveStartX = width * 0.6;
  const curveEndX = width * 0.9;
  const curveTopY = 6;

  // Bezier path for the background fill (solid shape covering bottom bar + right curve wing)
  const fillPath = [
    `M 0 ${CURVE_HEIGHT}`, // top-left of bottom bar
    `L ${curveStartX} ${CURVE_HEIGHT}`, // top edge of bottom bar going right
    `Q ${curveEndX - 20} ${CURVE_HEIGHT} ${curveEndX} ${curveTopY}`, // Bezier curve up
    `L ${width} ${curveTopY}`, // top edge of right wing
    `L ${width} ${height}`, // right edge all the way down
    `L 0 ${height}`, // bottom edge
    `Z`, // close back to start
  ].join(' ');

  // Stroke path — only the visible slackline (from left anchor along the curve to right anchor)
  const strokePath = [
    `M 0 ${CURVE_HEIGHT}`, // start at left anchor
    `L ${curveStartX} ${CURVE_HEIGHT}`, // flat portion (line at rest)
    `Q ${curveEndX - 20} ${CURVE_HEIGHT} ${curveEndX} ${curveTopY}`, // rise to right anchor
    `L ${width} ${curveTopY}`, // continue to right edge
  ].join(' ');

  // Active tab detection — pathname without leading slash
  const active = pathname === '/' ? 'index' : pathname.replace(/^\//, '');

  const goTo = (route: string) => {
    router.push(('/' + route) as any);
  };

  const isSettingsActive = active === 'settings';

  const tr = props.state.routes.find((r) => r.name === 'index'); // hint for labels
  // Use the passed props.descriptors for labels/i18n
  const getLabel = (routeName: string): string => {
    const route = props.state.routes.find((r) => r.name === routeName);
    if (!route) return routeName;
    const opts = props.descriptors[route.key]?.options;
    return typeof opts?.title === 'string' ? opts.title : routeName;
  };

  return (
    <View style={[styles.container, { height }]} pointerEvents="box-none">
      {/* Background SVG: fill + curve stroke + anchor circles */}
      <Svg width={width} height={height} style={StyleSheet.absoluteFill}>
        <Path d={fillPath} fill={t.surface} />
        <Path d={strokePath} stroke={t.border} strokeWidth={2} fill="none" />
        {/* Left anchor: where the slackline is fixed to the bottom bar */}
        <Circle cx={0} cy={CURVE_HEIGHT} r={4} fill={t.textDim} />
        {/* Right anchor: where the line meets the top-right corner (Settings zone) */}
        <Circle cx={width} cy={curveTopY} r={4} fill={t.textDim} />
      </Svg>

      {/* Settings — icon-only round button hanging from the raised slackline end */}
      <Pressable
        onPress={() => goTo('settings')}
        style={[
          styles.settingsBtn,
          {
            top: 18,
            right: 12,
            borderColor: isSettingsActive ? t.accent : t.border,
            backgroundColor: t.surface,
          },
        ]}
        hitSlop={12}
        accessibilityLabel={getLabel('settings')}
      >
        <MaterialCommunityIcons
          name="cog"
          size={22}
          color={isSettingsActive ? t.accent : t.textMuted}
        />
      </Pressable>

      {/* Bottom row: 6 primary tabs — sit ABOVE the system nav bar (insets.bottom) */}
      <View style={[styles.tabRow, { bottom: insets.bottom }]}>
        {PRIMARY_TABS.map((tab) => {
          const isActive = active === tab.name;
          return (
            <Pressable
              key={tab.name}
              style={styles.tabBtn}
              onPress={() => goTo(tab.name === 'index' ? '' : tab.name)}
            >
              <MaterialCommunityIcons
                name={tab.icon as any}
                size={24}
                color={isActive ? t.accent : t.textMuted}
              />
              <Text
                style={[
                  styles.tabLabel,
                  { color: isActive ? t.accent : t.textDim },
                ]}
                numberOfLines={1}
                adjustsFontSizeToFit
                minimumFontScale={0.7}
              >
                {getLabel(tab.name)}
              </Text>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
  },
  settingsBtn: {
    position: 'absolute',
    alignItems: 'center',
    justifyContent: 'center',
    width: 36,
    height: 36,
    borderRadius: 18,
    borderWidth: 1,
  },
  tabRow: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    height: TAB_HEIGHT,
    flexDirection: 'row',
    alignItems: 'center',
  },
  tabBtn: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 2,
  },
  tabLabel: {
    fontSize: 9,
    fontWeight: '500',
    paddingHorizontal: 2,
  },
});
