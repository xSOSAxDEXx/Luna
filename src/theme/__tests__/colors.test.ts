import { night } from '../colors';

type Rgb = [number, number, number];

function hexToRgb(hex: string): Rgb {
  const n = parseInt(hex.slice(1), 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}

/** WCAG relative luminance and contrast ratio. */
function luminance([r, g, b]: Rgb) {
  const lin = (c: number) => {
    const s = c / 255;
    return s <= 0.03928 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4;
  };
  return 0.2126 * lin(r) + 0.7152 * lin(g) + 0.0722 * lin(b);
}
function contrast(a: string, b: string) {
  const [hi, lo] = [luminance(hexToRgb(a)), luminance(hexToRgb(b))].sort((x, y) => y - x);
  return (hi + 0.05) / (lo + 0.05);
}

/** Hue in degrees and saturation 0..1 (HSL). */
function hueSat(hex: string) {
  const [r, g, b] = hexToRgb(hex).map((c) => c / 255);
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  const l = (max + min) / 2;
  const d = max - min;
  if (d === 0) return { hue: 0, sat: 0 };
  const sat = d / (1 - Math.abs(2 * l - 1));
  let hue = max === r ? ((g - b) / d) % 6 : max === g ? (b - r) / d + 2 : (r - g) / d + 4;
  hue *= 60;
  if (hue < 0) hue += 360;
  return { hue, sat };
}

function allColors(obj: object): string[] {
  return Object.values(obj).flatMap((v) => (typeof v === 'string' ? [v] : allColors(v)));
}

describe('night palette', () => {
  const swatches = allColors(night);

  it('never uses pure white', () => {
    expect(swatches.map((c) => c.toUpperCase())).not.toContain('#FFFFFF');
  });

  it('has no bright, saturated blue (bad for night vision and sleep)', () => {
    // Blue hues sit roughly between 190° and 250°. Allow dusky, muted blues
    // (low saturation) and the deep sky surfaces (very dark).
    for (const c of swatches) {
      const { hue, sat } = hueSat(c);
      const bright = luminance(hexToRgb(c)) > 0.15;
      const vividBlue = hue >= 190 && hue <= 250 && sat > 0.6;
      expect({ color: c, brightVividBlue: bright && vividBlue }).toEqual({
        color: c,
        brightVividBlue: false,
      });
    }
  });

  it.each([
    ['text', night.text],
    ['textSecondary', night.textSecondary],
    ['textMuted', night.textMuted],
    ['moon', night.moon],
  ])('%s is readable on every surface (WCAG AA, 4.5:1)', (_name, fg) => {
    for (const bg of [night.sky, night.skyDeep, night.surface, night.surfaceRaised]) {
      expect(contrast(fg, bg)).toBeGreaterThanOrEqual(4.5);
    }
  });

  it('keeps text on a moon-gold fill readable', () => {
    expect(contrast(night.onMoon, night.moon)).toBeGreaterThanOrEqual(4.5);
  });
});
