import type { AppAction } from "@/types/domain";
import { devLog } from "@/utils/logger";
import { actionFromLink } from "../notification-actions";

/**
 * Seam for push notifications (not active yet).
 *
 * Missing pieces: `expo-notifications` + FCM/APNs credentials (EAS), and a
 * backend device-registration endpoint (proposed: POST /v1/me/devices
 * { token, platform }). Neither the business API nor consumidor-gerador-api
 * exposes one today, so registration is a no-op.
 */
export interface PushDevice {
  token: string;
  platform: "ios" | "android";
}

export interface PushRegistration {
  readonly enabled: boolean;
  register(device: PushDevice): Promise<void>;
  unregister(): Promise<void>;
}

export const pushRegistration: PushRegistration = {
  enabled: false,
  register: () => {
    devLog.info("push", "device registration skipped (no backend endpoint yet)");
    return Promise.resolve();
  },
  unregister: () => Promise.resolve()
};

/** Push payloads will carry the same `link` as in-app notifications. */
export function actionFromPushPayload(data: Readonly<Record<string, unknown>>): AppAction | null {
  const link = data.link;
  return typeof link === "string" ? actionFromLink(link) : null;
}
