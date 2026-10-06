import { useId } from "react";
import { StyleSheet, View } from "react-native";
import Svg, {
  Defs,
  LinearGradient,
  RadialGradient,
  Rect,
  Stop,
} from "react-native-svg";

// Static SVG gradients work on Android, iOS and web without another native module.
export function NeonBackground({
  variant = "card",
}: {
  variant?: "page" | "card" | "button";
}) {
  const id = useId().replace(/:/g, "");
  return (
    <View
      pointerEvents="none"
      accessible={false}
      style={[StyleSheet.absoluteFill, { overflow: "hidden" }]}
    >
      <Svg
        aria-hidden={true}
        width="100%"
        height="100%"
        preserveAspectRatio="none"
        viewBox="0 0 100 100"
      >
        <Defs>
          <LinearGradient
            id={`${id}-surface`}
            x1="0%"
            y1="0%"
            x2="100%"
            y2="100%"
          >
            <Stop
              offset="0"
              stopColor={variant === "button" ? "#7c3aed" : "#8b5cf6"}
              stopOpacity={variant === "button" ? 1 : 0.18}
            />
            <Stop
              offset="0.55"
              stopColor={variant === "button" ? "#7e22ce" : "#a855f7"}
              stopOpacity={variant === "button" ? 1 : 0.08}
            />
            <Stop
              offset="1"
              stopColor={variant === "button" ? "#0e7490" : "#22d3ee"}
              stopOpacity={variant === "button" ? 1 : 0.05}
            />
          </LinearGradient>
          <RadialGradient id={`${id}-glow`} cx="15%" cy="0%" rx="85%" ry="55%">
            <Stop offset="0" stopColor="#8b5cf6" stopOpacity="0.3" />
            <Stop offset="1" stopColor="#8b5cf6" stopOpacity="0" />
          </RadialGradient>
        </Defs>
        <Rect
          width="100"
          height="100"
          fill={`url(#${id}-${variant === "page" ? "glow" : "surface"})`}
        />
      </Svg>
    </View>
  );
}
