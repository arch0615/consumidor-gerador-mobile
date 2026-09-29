import { buildDashboard, buildEmptyDashboard } from "@/mock/dashboard";
import type { DashboardService } from "../dashboard.service";
import { mockQuery } from "./mock-request";

export const mockDashboardService: DashboardService = {
  getSummary: () => mockQuery(buildDashboard, buildEmptyDashboard)
};
