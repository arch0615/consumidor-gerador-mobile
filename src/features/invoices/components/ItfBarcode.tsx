import { useState } from "react";
import { View } from "react-native";
import Svg, { Rect } from "react-native-svg";

/** Interleaved 2 of 5 digit patterns (N = narrow, W = wide). */
const PATTERNS = ["NNWWN", "WNNNW", "NWNNW", "WWNNN", "NNWNW", "WNWNN", "NWWNN", "NNNWW", "WNNWN", "NWNWN"] as const;
const WIDE = 3;
const QUIET_ZONE = 16;

interface Element {
  bar: boolean;
  width: number;
}

function encode(digits: string): Element[] {
  const elements: Element[] = [
    { bar: true, width: 1 },
    { bar: false, width: 1 },
    { bar: true, width: 1 },
    { bar: false, width: 1 }
  ];
  for (let i = 0; i + 1 < digits.length; i += 2) {
    const bars = PATTERNS[Number(digits[i])] ?? PATTERNS[0];
    const spaces = PATTERNS[Number(digits[i + 1])] ?? PATTERNS[0];
    for (let k = 0; k < 5; k += 1) {
      elements.push({ bar: true, width: bars[k] === "W" ? WIDE : 1 });
      elements.push({ bar: false, width: spaces[k] === "W" ? WIDE : 1 });
    }
  }
  elements.push({ bar: true, width: WIDE }, { bar: false, width: 1 }, { bar: true, width: 1 });
  return elements;
}

/** Absolute x / width of each bar for the given module width. */
function positionBars(elements: readonly Element[], unit: number): { x: number; width: number }[] {
  const bars: { x: number; width: number }[] = [];
  let x = 0;
  for (const element of elements) {
    if (element.bar) bars.push({ x, width: element.width * unit });
    x += element.width * unit;
  }
  return bars;
}

/**
 * Boleto barcode (ITF-25, 44 digits) drawn as SVG — scannable by bank apps
 * from another screen. Always rendered black on white regardless of theme.
 */
export function ItfBarcode({ digits, height = 72 }: { digits: string; height?: number }) {
  const [width, setWidth] = useState(0);
  const elements = encode(digits.length % 2 === 0 ? digits : `0${digits}`);
  const modules = elements.reduce((sum, element) => sum + element.width, 0);
  const bars = positionBars(elements, width / modules);
  return (
    // White quiet zone on both sides so scanners find the start/stop patterns.
    <View style={{ backgroundColor: "#FFFFFF", paddingHorizontal: QUIET_ZONE, paddingVertical: 8, borderRadius: 8 }} accessible accessibilityRole="image" accessibilityLabel="Código de barras do boleto">
      <View onLayout={(event) => setWidth(event.nativeEvent.layout.width)} style={{ height }}>
      {width > 0 ? (
        <Svg width={width} height={height}>
          {bars.map((bar, index) => (
            <Rect key={index} x={bar.x} y={0} width={bar.width} height={height} fill="#000000" />
          ))}
        </Svg>
      ) : null}
      </View>
    </View>
  );
}
