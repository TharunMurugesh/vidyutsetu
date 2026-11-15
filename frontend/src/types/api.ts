export type ConformanceStatusType = 'PASS' | 'CONDITIONAL' | 'FAIL' | 'INCOMPLETE';
export type IssueSeverityType = 'ERROR' | 'WARNING';
export type ValidationStageType = 'SOURCE' | 'ADAPTER' | 'CANONICAL' | 'TARGET' | 'ANOMALY';

export interface DiagnosticIssue {
  code: string;
  field: string;
  message: string;
  severity: IssueSeverityType;
  stage: ValidationStageType;
  suggested_fix?: string | null;
}

export interface ConformanceEvaluation {
  status: ConformanceStatusType;
  summary: string;
  total_assertions: number;
  mandatory_failure_count: number;
  warning_count: number;
  untested_assertions: number;
}

export interface StageBlame {
  error_count: number;
  warning_count: number;
}

export interface FlaggedAnomaly {
  reading_index: number;
  meter_serial_number: string;
  anomaly_score: number;
  method: string;
  contributing_features: string[];
  description: string;
}

export interface AnomalySummary {
  total_readings: number;
  anomaly_count: number;
  anomaly_rate: number;
  has_anomalies: boolean;
  flagged_readings: FlaggedAnomaly[];
}

export interface CanonicalReading {
  meter_serial_number: string;
  timestamp: string;
  active_energy_import_kwh: number;
  active_energy_export_kwh?: number | null;
  reactive_energy_lag_kvarh?: number | null;
  reactive_energy_lead_kvarh?: number | null;
  apparent_energy_kvah?: number | null;
  voltage_v?: number | null;
  current_a?: number | null;
  power_factor?: number | null;
  frequency_hz?: number | null;
  reading_quality?: string;
  anomaly_score?: number | null;
  is_anomaly?: boolean;
}

export interface CanonicalPayload {
  header: {
    message_id: string;
    source_system: string;
    created_at: string;
    standard_version: string;
  };
  readings: CanonicalReading[];
  events: Array<{
    event_id: string;
    meter_serial_number: string;
    timestamp: string;
    event_code: string;
    event_type: string;
    severity: string;
  }>;
}

export interface TestExecutionResult {
  run_id: string;
  execution_time: string;
  source_vendor: string;
  target_vendor?: string | null;
  total_records: number;
  valid_records: number;
  invalid_records: number;
  conformance: ConformanceEvaluation;
  blame_attribution: Record<string, StageBlame>;
  anomaly_detection: AnomalySummary;
  issues: DiagnosticIssue[];
  canonical_payload: CanonicalPayload;
  target_output: any;
  duration_ms: number;
}

export interface TestRunSummary {
  run_id: string;
  execution_time: string | null;
  source_vendor: string;
  target_vendor?: string | null;
  total_records: number;
  valid_records?: number;
  invalid_records?: number;
  conformance_status: ConformanceStatusType;
  summary: string;
  duration_ms?: number;
}

export interface WorkbenchStats {
  total_test_runs: number;
  average_interoperability_score: number;
  active_vendor_adapters: number;
  vendor_usage: Record<string, number>;
  recent_runs: TestRunSummary[];
}

export interface VendorProfile {
  vendor_id: string;
  name: string;
  system_type: 'HES' | 'MDMS';
  format_type: 'json' | 'csv' | 'xml';
  protocol: string;
  version: string;
  description: string;
  default_mappings: Array<{
    source_field: string;
    canonical_field: string;
    multiplier?: number;
    description?: string;
  }>;
  obis_code_mappings: Record<string, string>;
  event_mappings: Record<string, string>;
  source_schema?: any;
  target_schema?: any;
}

export interface RegressionComparison {
  baseline: {
    run_id: string;
    conformance_status: ConformanceStatusType;
    total_issues: number;
    source_vendor: string;
    target_vendor?: string | null;
  };
  candidate: {
    run_id: string;
    conformance_status: ConformanceStatusType;
    total_issues: number;
    source_vendor: string;
    target_vendor?: string | null;
  };
  regression_detected: boolean;
  improvement_detected: boolean;
  resolved_issues: Array<{ code: string; field: string; stage: string }>;
  new_issues: Array<{ code: string; field: string; stage: string }>;
  persistent_issues: Array<{ code: string; field: string; stage: string }>;
  summary: {
    resolved_count: number;
    new_count: number;
    persistent_count: number;
  };
}

export interface ContractDiffResult {
  vendor_a: string;
  vendor_b: string;
  format_match: boolean;
  protocol_match: boolean;
  obis_codes: {
    only_a: string[];
    only_b: string[];
    shared: string[];
  };
  event_mappings: {
    only_a: string[];
    only_b: string[];
    shared: string[];
  };
}

