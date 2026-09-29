import { useDevScenarioStore } from "@/stores/dev-scenario.store";
import { AppError } from "@/utils/app-error";

const BASE_LATENCY_MS = 450;
const JITTER_MS = 400;
const SLOW_LATENCY_MS = 3500;

function wait(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/** Plain-data deep copy so callers can never mutate the mock "database". */
export function clone<T>(value: T): T {
  return JSON.parse(JSON.stringify(value)) as T;
}

async function simulateNetwork(): Promise<void> {
  const { scenario } = useDevScenarioStore.getState();
  await wait(scenario === "slow" ? SLOW_LATENCY_MS : BASE_LATENCY_MS + Math.random() * JITTER_MS);
  if (scenario === "offline") throw new AppError("NETWORK_UNAVAILABLE");
  if (scenario === "error") throw new AppError("SERVICE_UNAVAILABLE");
}

/**
 * Simulated read: latency, dev-scenario failures and an optional empty
 * variant. Always returns a copy of the mock data.
 */
export async function mockQuery<T>(produce: () => T, empty?: () => T): Promise<T> {
  await simulateNetwork();
  const { scenario } = useDevScenarioStore.getState();
  return clone(scenario === "empty" && empty ? empty() : produce());
}

/** Simulated write: latency and dev-scenario failures (never "empty"). */
export async function mockMutation<T>(perform: () => T): Promise<T> {
  await simulateNetwork();
  return clone(perform());
}

/** Simulated upload reporting progress in ~10 steps. */
export async function mockUpload(onProgress: (progress: number) => void): Promise<void> {
  const { scenario } = useDevScenarioStore.getState();
  const steps = 10;
  for (let step = 1; step <= steps; step += 1) {
    await wait(scenario === "slow" ? 600 : 150);
    if (scenario === "error" && step === 6) throw new AppError("UPLOAD_FAILED");
    if (scenario === "offline") throw new AppError("NETWORK_UNAVAILABLE");
    onProgress(step / steps);
  }
}

export function mockId(prefix: string): string {
  return `${prefix}_${Date.now().toString(36)}${Math.random().toString(36).slice(2, 7)}`;
}
