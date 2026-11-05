import type { ReactNode } from 'react';
import type { ColorValue } from 'react-native';
import Svg, { Circle, Path, Rect } from 'react-native-svg';

import type { SoundIcon as SoundIconName } from '@/data/sounds';

type IconProps = { color: ColorValue; size?: number };

const stroke = (color: ColorValue) =>
  ({
    stroke: color,
    strokeWidth: 1.8,
    strokeLinecap: 'round',
    strokeLinejoin: 'round',
    fill: 'none',
  }) as const;

const CRESCENT = 'M14.5 3.5a8.5 8.5 0 1 0 6 13.6A7 7 0 0 1 14.5 3.5Z';
const SPARKLE = 'M12 3l1.6 5.4L19 10l-5.4 1.6L12 17l-1.6-5.4L5 10l5.4-1.6L12 3Z';

// ---- Tab icons ----

/** Sounds tab: a small crescent with one star. */
export function MoonIcon({ color, size = 26 }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24">
      <Path d={CRESCENT} {...stroke(color)} />
      <Path d="M19 3.5l.6 1.4 1.4.6-1.4.6-.6 1.4-.6-1.4-1.4-.6 1.4-.6.6-1.4Z" fill={color} />
    </Svg>
  );
}

/** My Sounds tab: a rounded microphone. */
export function MicIcon({ color, size = 26 }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24">
      <Rect x={9} y={3} width={6} height={11} rx={3} {...stroke(color)} />
      <Path d="M5.5 11a6.5 6.5 0 0 0 13 0M12 17.5V21" {...stroke(color)} />
    </Svg>
  );
}

/** Settings tab: soft sliders rather than a mechanical gear. */
export function SlidersIcon({ color, size = 26 }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24">
      <Path d="M4 7h16M4 17h16" {...stroke(color)} />
      <Circle cx={9} cy={7} r={2.4} fill={color} />
      <Circle cx={15} cy={17} r={2.4} fill={color} />
    </Svg>
  );
}

// ---- Player controls ----

export function PlayIcon({ color, size = 32 }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24">
      <Path
        d="M8 5.5v13a1 1 0 0 0 1.5.86l10.4-6.5a1 1 0 0 0 0-1.72L9.5 4.64A1 1 0 0 0 8 5.5Z"
        fill={color}
      />
    </Svg>
  );
}

export function PauseIcon({ color, size = 32 }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24">
      <Rect x={6} y={5} width={4} height={14} rx={1.5} fill={color} />
      <Rect x={14} y={5} width={4} height={14} rx={1.5} fill={color} />
    </Svg>
  );
}

export function StopIcon({ color, size = 26 }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24">
      <Rect x={6} y={6} width={12} height={12} rx={3} fill={color} />
    </Svg>
  );
}

export function ChevronDownIcon({ color, size = 28 }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24">
      <Path d="M6 9.5l6 6 6-6" {...stroke(color)} />
    </Svg>
  );
}

export function CloseIcon({ color, size = 24 }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24">
      <Path d="M7 7l10 10M17 7L7 17" {...stroke(color)} />
    </Svg>
  );
}

/** "About": a small circled i. */
export function InfoIcon({ color, size = 22 }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24">
      <Circle cx={12} cy={12} r={9} {...stroke(color)} />
      <Path d="M12 11v5.5" {...stroke(color)} />
      <Circle cx={12} cy={7.8} r={1.1} fill={color} />
    </Svg>
  );
}

const HEART =
  'M12 20s-7.5-4.6-7.5-10.2A4.3 4.3 0 0 1 12 7.2a4.3 4.3 0 0 1 7.5 2.6C19.5 15.4 12 20 12 20Z';

export function HeartIcon({ color, size = 24, filled }: IconProps & { filled: boolean }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24">
      <Path d={HEART} {...stroke(color)} fill={filled ? color : 'none'} />
    </Svg>
  );
}

// ---- Sound card icons ----

const soundPaths: Record<SoundIconName, (c: ColorValue) => ReactNode> = {
  waveform: (c) => <Path d="M3 12h2.5l2-5 3 10 3-14 3 14 2-5H21" {...stroke(c)} />,
  drop: (c) => (
    <Path d="M12 3.5c3 4 6 7.4 6 10.8a6 6 0 0 1-12 0c0-3.4 3-6.8 6-10.8Z" {...stroke(c)} />
  ),
  waves: (c) => (
    <Path
      d="M3 9.5c2-2 4-2 6 0s4 2 6 0 4-2 6 0M3 15.5c2-2 4-2 6 0s4 2 6 0 4-2 6 0"
      {...stroke(c)}
    />
  ),
  wind: (c) => <Path d="M3 9h11a3 3 0 1 0-3-3M3 15h14a3 3 0 1 1-3 3M3 12h7" {...stroke(c)} />,
  leaf: (c) => <Path d="M5 19C5 11 10 5 19 5c0 9-6 14-14 14ZM5 19l8-8" {...stroke(c)} />,
  moon: (c) => <Path d={CRESCENT} {...stroke(c)} />,
  heart: (c) => <Path d={HEART} {...stroke(c)} />,
  fan: (c) => (
    <>
      <Circle cx={12} cy={12} r={9} {...stroke(c)} />
      <Path
        d="M12 12c-.5-3 0-5.5 2-6M12 12c3 1 4.5 3 4 5M12 12c-2.5 2-5 2.2-6.5.8"
        {...stroke(c)}
      />
    </>
  ),
  car: (c) => (
    <>
      <Path d="M4 15.5V12l2-5h12l2 5v3.5H4Z" {...stroke(c)} />
      <Circle cx={7.5} cy={17.5} r={1.8} {...stroke(c)} />
      <Circle cx={16.5} cy={17.5} r={1.8} {...stroke(c)} />
    </>
  ),
  train: (c) => (
    <>
      <Rect x={6} y={3} width={12} height={14} rx={3} {...stroke(c)} />
      <Path d="M6 10h12M9 21l2-4M15 21l-2-4" {...stroke(c)} />
    </>
  ),
  note: (c) => (
    <>
      <Circle cx={8} cy={17} r={3} {...stroke(c)} />
      <Path d="M11 17V4l7 3" {...stroke(c)} />
    </>
  ),
  star: (c) => <Path d={SPARKLE} {...stroke(c)} />,
  // A soft wave inside a circle: a steady tone.
  tone: (c) => (
    <>
      <Circle cx={12} cy={12} r={9} {...stroke(c)} />
      <Path d="M6.5 12c1.4-3 2.8-3 4.1 0s2.8 3 4.1 0 2.4-2.6 2.8-1.2" {...stroke(c)} />
    </>
  ),
  // A singing bowl, with a soft ring rising from it.
  bowl: (c) => (
    <>
      <Path d="M4 12h16a8 7 0 0 1-16 0Z" {...stroke(c)} />
      <Path d="M8.5 7.5c1.2-1.4 5.8-1.4 7 0M10 4.5c.8-.6 3.2-.6 4 0" {...stroke(c)} />
    </>
  ),
  // An open storybook, for bedtime stories.
  book: (c) => (
    <Path
      d="M12 6.5C10 5 7 4.5 4 5v13c3-.5 6 0 8 1.5M12 6.5c2-1.5 5-2 8-1.5v13c-3-.5-6 0-8 1.5M12 6.5v13"
      {...stroke(c)}
    />
  ),
};

export function SoundIcon({ name, color, size = 30 }: IconProps & { name: SoundIconName }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24">
      {soundPaths[name](color)}
    </Svg>
  );
}
