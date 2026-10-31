import type { ColorValue } from 'react-native';
import Svg, { Circle, Path, Rect } from 'react-native-svg';

type IconProps = { color: ColorValue; size?: number };

/** Library tab: a small crescent with one star. */
export function MoonIcon({ color, size = 26 }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path
        d="M14.5 3.5a8.5 8.5 0 1 0 6 13.6A7 7 0 0 1 14.5 3.5Z"
        stroke={color}
        strokeWidth={1.8}
        strokeLinejoin="round"
      />
      <Path d="M19 3.5l.6 1.4 1.4.6-1.4.6-.6 1.4-.6-1.4-1.4-.6 1.4-.6.6-1.4Z" fill={color} />
    </Svg>
  );
}

/** My Sounds tab: a rounded microphone. */
export function MicIcon({ color, size = 26 }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Rect x={9} y={3} width={6} height={11} rx={3} stroke={color} strokeWidth={1.8} />
      <Path
        d="M5.5 11a6.5 6.5 0 0 0 13 0M12 17.5V21"
        stroke={color}
        strokeWidth={1.8}
        strokeLinecap="round"
      />
    </Svg>
  );
}

/** Settings tab: soft sliders rather than a mechanical gear. */
export function SlidersIcon({ color, size = 26 }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path d="M4 7h16M4 17h16" stroke={color} strokeWidth={1.8} strokeLinecap="round" />
      <Circle cx={9} cy={7} r={2.4} fill={color} />
      <Circle cx={15} cy={17} r={2.4} fill={color} />
    </Svg>
  );
}
