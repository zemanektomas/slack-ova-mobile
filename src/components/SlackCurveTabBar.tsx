import React from 'react';
import { View, Pressable, StyleSheet, Text, useWindowDimensions } from 'react-native';
import Svg, { Path, Circle, Polygon } from 'react-native-svg';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter, usePathname } from 'expo-router';
import type { BottomTabBarProps } from '@react-navigation/bottom-tabs';
import { useTheme } from '../theme';

/**
 * Slackline curve tab bar — v0.8.0 (V2c design: legs + cog, no head).
 *
 * Design:
 *   Bottom row (56 px) — 6 primary tabs: Lines / ISA / Calc / Gear / Reports / Training
 *   Above it a bright white slackline runs across the full width.
 *   The line is flat on the left, then sags near the right anchor under
 *   the weight of a stick-figure standing on it — two asymmetric trapezoid
 *   legs (narrow at top, wider at foot, slightly splayed for balance).
 *   Above the legs floats the Settings ⚙ icon, tappable.
 *
 * Anchors: white filled circles at the extreme left (0, LINE_Y) and right (width, LINE_Y).
 */

const TAB_HEIGHT = 56;
const CURVE_HEIGHT = 40; // curve space above tab row (was 64)
const TOTAL_HEIGHT = TAB_HEIGHT + CURVE_HEIGHT;

/** Exported for screen paddingBottom — content sits ABOVE the curve. */
export const CURVE_TABBAR_HEIGHT = TOTAL_HEIGHT;

// Slackline geometry (SVG coord system 0..TOTAL_HEIGHT tall)
const LINE_Y = CURVE_HEIGHT; // 40 — line runs along top of tab row
const SAG_Y = LINE_Y + 18; // 58 — deepest sag under stick figure
const LEG_TOP_Y = 22;
const FEET_Y = SAG_Y - 4; // 54

// Tabs shown in bottom row. Settings hovers above the sag.
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

  const containerHeight = TOTAL_HEIGHT + insets.bottom;

  // Position of the stick figure along X (near the right anchor, but not touching it)
  const FIG_X = width * 0.88;

  // Slackline: flat left → sag under figure near right anchor → rises back to right anchor.
  // Two Bezier quadratics form the shallow "V" of the sag right under the feet.
  const linePath = [
    `M 0 ${LINE_Y}`,
    `L ${width * 0.62} ${LINE_Y}`,
    `Q ${width * 0.78} ${LINE_Y} ${FIG_X - 4} ${FEET_Y - 2}`,
    `Q ${FIG_X} ${SAG_Y} ${FIG_X + 4} ${FEET_Y - 2}`,
    `Q ${width * 0.96} ${LINE_Y + 2} ${width} ${LINE_Y}`,
  ].join(' ');

  // Left leg: narrow at top (near body centerline), wider at foot, slight splay to the left.
  const leftLegPts = [
    `${FIG_X - 2},${LEG_TOP_Y}`,
    `${FIG_X - 0.5},${LEG_TOP_Y}`,
    `${FIG_X - 3},${FEET_Y}`,
    `${FIG_X - 6},${FEET_Y}`,
  ].join(' ');

  // Right leg: narrow at top, MORE splayed to the right (asymmetric balance).
  const rightLegPts = [
    `${FIG_X + 0.5},${LEG_TOP_Y}`,
    `${FIG_X + 2},${LEG_TOP_Y}`,
    `${FIG_X + 11},${FEET_Y}`,
    `${FIG_X + 8},${FEET_Y}`,
  ].join(' ');

  const active = pathname === '/' ? 'index' : pathname.replace(/^\//, '');
  const goTo = (route: string) => {
    router.push(('/' + route) as any);
  };
  const isSettingsActive = active === 'settings';

  const getLabel = (routeName: string): string => {
    const route = props.state.routes.find((r) => r.name === routeName);
    if (!route) return routeName;
    const opts = props.descriptors[route.key]?.options;
    return typeof opts?.title === 'string' ? opts.title : routeName;
  };

  return (
    <View style={[styles.container, { height: containerHeight }]} pointerEvents="box-none">
      {/* Solid tab bar body (from slackline down to system nav area) */}
      <View
        style={{
          position: 'absolute',
          left: 0,
          right: 0,
          top: LINE_Y,
          bottom: 0,
          backgroundColor: t.surface,
        }}
      />

      {/* SVG: slackline, anchors, stick-figure legs */}
      <Svg
        width={width}
        height={TOTAL_HEIGHT}
        style={{ position: 'absolute', top: 0, left: 0 }}
      >
        {/* Slackline */}
        <Path d={linePath} stroke={t.text} strokeWidth={2.5} fill="none" strokeLinecap="round" />
        {/* Left anchor */}
        <Circle cx={0} cy={LINE_Y} r={5} fill={t.text} />
        {/* Right anchor */}
        <Circle cx={width} cy={LINE_Y} r={5} fill={t.text} />
        {/* Left leg (mildly bent) */}
        <Polygon points={leftLegPts} fill={t.text} />
        {/* Right leg (more splayed — asymmetric balance) */}
        <Polygon points={rightLegPts} fill={t.text} />
      </Svg>

      {/* Settings cog — hovering above the legs, tappable */}
      <Pressable
        onPress={() => goTo('settings')}
        style={{
          position: 'absolute',
          top: 2,
          left: FIG_X - 16,
          width: 32,
          height: 22,
          justifyContent: 'center',
          alignItems: 'center',
        }}
        hitSlop={16}
        accessibilityLabel={getLabel('settings')}
      >
        <MaterialCommunityIcons
          name="cog"
          size={20}
          color={isSettingsActive ? t.accent : t.text}
        />
      </Pressable>

      {/* Bottom row: 6 primary tabs — above system nav bar */}
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
