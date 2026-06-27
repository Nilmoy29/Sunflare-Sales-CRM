import type { ConfigContext, ExpoConfig } from "expo/config";

const easProjectId =
  process.env.EAS_PROJECT_ID ?? "8fb4854d-1f13-4aae-8e30-d93dbeb9b95d";

export default ({ config }: ConfigContext): ExpoConfig => ({
  ...config,
  name: "Sunflare",
  slug: "sunflare-mobile",
  version: "0.1.0",
  orientation: "portrait",
  scheme: "sunflare",
  userInterfaceStyle: "automatic",
  icon: "./assets/icon.png",
  runtimeVersion: {
    policy: "appVersion",
  },
  updates: {
    enabled: true,
    checkAutomatically: "NEVER",
    fallbackToCacheTimeout: 0,
    url: `https://u.expo.dev/${easProjectId}`,
  },
  ios: {
    supportsTablet: false,
    bundleIdentifier: "com.sunflare.mobile",
  },
  android: {
    package: "com.sunflare.mobile",
    adaptiveIcon: {
      backgroundColor: "#E6F4FE",
      foregroundImage: "./assets/android-icon-foreground.png",
      backgroundImage: "./assets/android-icon-background.png",
      monochromeImage: "./assets/android-icon-monochrome.png",
    },
  },
  plugins: [
    "expo-router",
    "expo-dev-client",
    "expo-secure-store",
    "expo-sqlite",
    "expo-updates",
    [
      "expo-notifications",
      {
        icon: "./assets/icon.png",
        color: "#15803d",
      },
    ],
    "@react-native-community/datetimepicker",
    [
      "expo-location",
      {
        locationWhenInUsePermission:
          "Sunflare uses your location to show your position on the canvassing map.",
        locationAlwaysAndWhenInUsePermission:
          "Sunflare records your route during an active shift so managers can verify field coverage.",
        isAndroidBackgroundLocationEnabled: true,
        isAndroidForegroundServiceEnabled: true,
      },
    ],
    [
      "@rnmapbox/maps",
      {
        RNMapboxMapsVersion: "11.23.1",
      },
    ],
  ],
  experiments: {
    typedRoutes: false,
  },
  extra: {
    supabaseUrl: process.env.EXPO_PUBLIC_SUPABASE_URL,
    supabaseAnonKey: process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY,
    mapboxAccessToken: process.env.EXPO_PUBLIC_MAPBOX_ACCESS_TOKEN,
    apiUrl: process.env.EXPO_PUBLIC_API_URL,
    eas: {
      projectId: easProjectId,
    },
  },
});
