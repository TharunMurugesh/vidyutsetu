import {
  WorkbenchStats,
  VendorProfile,
  TestExecutionResult,
  TestRunSummary,
  RegressionComparison,
  ContractDiffResult,
} from '../types/api';

const BASE_URL = '/api';

export const api = {
  async getHealth(): Promise<{ status: string; service: string; version: string; standards_scope: string[] }> {
    const res = await fetch(`${BASE_URL}/health`);
    if (!res.ok) throw new Error(`Health check failed: ${res.statusText}`);
    return res.json();
  },

  async getStats(): Promise<WorkbenchStats> {
    const res = await fetch(`${BASE_URL}/stats`);
    if (!res.ok) throw new Error(`Stats fetch failed: ${res.statusText}`);
    return res.json();
  },

  async getVendors(): Promise<Record<string, VendorProfile>> {
    const res = await fetch(`${BASE_URL}/vendors`);
    if (!res.ok) throw new Error(`Vendors fetch failed: ${res.statusText}`);
    return res.json();
  },

  async generateSynthetic(params: {
    vendorId: string;
    meterCount?: number;
    intervals?: number;
    injectAnomalies?: boolean;
    injectTampers?: boolean;
    seed?: number | null;
  }): Promise<{ vendor_id: string; format: string; seed?: number; payload: any }> {
    const searchParams = new URLSearchParams();
    searchParams.set('vendor_id', params.vendorId);
    if (params.meterCount != null) searchParams.set('meter_count', params.meterCount.toString());
    if (params.intervals != null) searchParams.set('intervals', params.intervals.toString());
    if (params.injectAnomalies != null) searchParams.set('inject_anomalies', params.injectAnomalies.toString());
    if (params.injectTampers != null) searchParams.set('inject_tampers', params.injectTampers.toString());
    if (params.seed != null) searchParams.set('seed', params.seed.toString());

    const res = await fetch(`${BASE_URL}/generate?${searchParams.toString()}`, {
      method: 'POST',
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.detail || `Generate synthetic data failed: ${res.statusText}`);
    }
    return res.json();
  },

  async executeWorkbench(formData: FormData): Promise<TestExecutionResult> {
    const res = await fetch(`${BASE_URL}/workbench/execute`, {
      method: 'POST',
      body: formData,
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.detail || `Workbench execution failed (${res.status})`);
    }
    return res.json();
  },

  async getTestRuns(limit: number = 50): Promise<TestRunSummary[]> {
    const res = await fetch(`${BASE_URL}/test-runs?limit=${limit}`);
    if (!res.ok) throw new Error(`Fetch test runs failed: ${res.statusText}`);
    return res.json();
  },

  async getTestRunDetail(runId: string): Promise<any> {
    const res = await fetch(`${BASE_URL}/test-runs/${encodeURIComponent(runId)}`);
    if (!res.ok) throw new Error(`Fetch run detail failed: ${res.statusText}`);
    return res.json();
  },

  async compareTestRuns(runA: string, runB: string): Promise<RegressionComparison> {
    const res = await fetch(
      `${BASE_URL}/test-runs/compare?run_a=${encodeURIComponent(runA)}&run_b=${encodeURIComponent(runB)}`
    );
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.detail || `Comparison failed: ${res.statusText}`);
    }
    return res.json();
  },

  async getContracts(): Promise<{ contracts: VendorProfile[]; count: number }> {
    const res = await fetch(`${BASE_URL}/contracts`);
    if (!res.ok) throw new Error(`Fetch contracts failed: ${res.statusText}`);
    return res.json();
  },

  async diffContracts(vendorA: string, vendorB: string): Promise<ContractDiffResult> {
    const res = await fetch(`${BASE_URL}/contracts/diff/${encodeURIComponent(vendorA)}/${encodeURIComponent(vendorB)}`);
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.detail || `Contract diff failed: ${res.statusText}`);
    }
    return res.json();
  },
};

