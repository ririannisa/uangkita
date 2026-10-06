import type { ColorSchemeName } from "react-native";

export type Theme = "auto" | "light" | "dark" | "neon";

export function themeColors(theme: Theme, system: ColorSchemeName) {
  const neon = theme === "neon";
  const dark =
    neon || theme === "dark" || (theme === "auto" && system === "dark");
  return {
    dark,
    neon,
    bg: neon ? "#060810" : dark ? "#171f25" : "#f9faf6",
    surface: neon ? "#10131f" : dark ? "#253139" : "#ffffff",
    ink: neon ? "#f4f6fc" : dark ? "#edf3f1" : "#25394a",
    muted: neon ? "#a0a8bf" : dark ? "#b4c5c0" : "#63746f",
    line: neon ? "#ffffff17" : dark ? "#3d4b53" : "#e0e6df",
    primary: neon ? "#c4a5ff" : dark ? "#bfa4ec" : "#7254ad",
    lilac: neon ? "#18132f" : dark ? "#3c304e" : "#eee5f8",
    mint: neon ? "#081820" : dark ? "#25483f" : "#def3ec",
    green: neon ? "#34d399" : dark ? "#8dd6c1" : "#367267",
    red: neon ? "#fb7185" : dark ? "#ffa3ad" : "#b64350",
    cream: neon ? "#191710" : dark ? "#4a422c" : "#fff7d6",
    peach: neon ? "#29151d" : dark ? "#4d3434" : "#fae8e1",
  };
}
