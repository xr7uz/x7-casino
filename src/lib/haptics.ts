/** Haptisches Feedback über Capacitor (iPhone). Im Browser ohne Wirkung. */
type Style = "light" | "medium" | "heavy";
let enabled = true;
export const setHaptics = (on: boolean) => { enabled = on; };

export async function tap(style: Style = "light") {
  if (!enabled) return;
  try {
    const cap = (window as unknown as { Capacitor?: { isNativePlatform?: () => boolean } }).Capacitor;
    if (!cap?.isNativePlatform?.()) return;
    const { Haptics, ImpactStyle } = await import("@capacitor/haptics");
    await Haptics.impact({ style: style === "heavy" ? ImpactStyle.Heavy : style === "medium" ? ImpactStyle.Medium : ImpactStyle.Light });
  } catch { /* nicht verfügbar */ }
}
export async function success() {
  if (!enabled) return;
  try {
    const cap = (window as unknown as { Capacitor?: { isNativePlatform?: () => boolean } }).Capacitor;
    if (!cap?.isNativePlatform?.()) return;
    const { Haptics, NotificationType } = await import("@capacitor/haptics");
    await Haptics.notification({ type: NotificationType.Success });
  } catch { /* nicht verfügbar */ }
}
