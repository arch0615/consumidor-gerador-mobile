import { create } from "zustand";

/**
 * QA switch for the mock layer (Conta → Ferramentas de desenvolvimento, dev
 * builds only). Forces every mocked read into a given state so the loading,
 * empty, error and offline UIs can be reviewed without a backend.
 */
export const DEV_SCENARIOS = ["normal", "empty", "error", "slow", "offline"] as const;
export type DevScenario = (typeof DEV_SCENARIOS)[number];

interface DevScenarioState {
  scenario: DevScenario;
  setScenario: (scenario: DevScenario) => void;
}

export const useDevScenarioStore = create<DevScenarioState>((set) => ({
  scenario: "normal",
  setScenario: (scenario) => set({ scenario })
}));
