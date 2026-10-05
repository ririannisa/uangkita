import Svg, { Circle, Ellipse, G, Path, Rect, Text } from "react-native-svg";

// Native SVG version of the wallet illustration on the web login.
export function WalletArt() {
  return (
    <Svg width={118} height={118} viewBox="0 0 300 300">
      <Ellipse cx="150" cy="158" rx="132" ry="114" fill="#c6e8dc" />
      <G transform="rotate(7 150 130)">
        <Rect
          x="52"
          y="60"
          width="197"
          height="90"
          rx="12"
          fill="#fff7d6"
          stroke="#dfcf8c"
        />
        <Text x="68" y="88" fill="#8d7540" fontSize="16">
          rencana kecil, mimpi besar
        </Text>
      </G>
      <G transform="rotate(-9 150 170)">
        <Rect x="32" y="98" width="238" height="169" rx="23" fill="#8870bc" />
        <Rect
          x="32"
          y="90"
          width="238"
          height="169"
          rx="23"
          fill="#aa95e0"
          stroke="#7960b5"
          strokeWidth="2"
        />
        <Rect
          x="41"
          y="99"
          width="220"
          height="151"
          rx="15"
          fill="none"
          stroke="#695292"
          strokeDasharray="5 5"
        />
        <Text x="56" y="129" fill="#f7eeff" fontSize="22" fontWeight="700">
          Rp
        </Text>
        <Ellipse cx="117" cy="158" rx="4" ry="6" fill="#3b3450" />
        <Ellipse cx="148" cy="158" rx="4" ry="6" fill="#3b3450" />
        <Path
          d="M123 178 Q133 192 145 178"
          fill="none"
          stroke="#3b3450"
          strokeWidth="3"
          strokeLinecap="round"
        />
        <Text x="56" y="231" fill="white" fontSize="14">
          dompet happy club
        </Text>
        <Rect
          x="214"
          y="155"
          width="69"
          height="46"
          rx="12"
          fill="#cbbbeb"
          stroke="#8068b5"
          strokeWidth="2"
        />
        <Circle
          cx="248"
          cy="178"
          r="7"
          fill="#ffdf7b"
          stroke="#c8a652"
          strokeWidth="2"
        />
      </G>
    </Svg>
  );
}
