import type { CapacitorConfig } from "@capacitor/cli";

// PRÜFEN: appId muss eindeutig sein und zu deinem Apple-Developer-Konto passen (umgekehrte Domain).
const config: CapacitorConfig = {
  appId: "xyz.xr7uz.casino",
  appName: "X7 Casino",
  webDir: "dist",
  ios: {
    contentInset: "never",
    backgroundColor: "#0b0609",
  },
};

export default config;
