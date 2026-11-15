"""Diagnostic Suggestion Engine for VidyutSetu."""

from typing import List
from backend.models.canonical import DiagnosticIssue


class DiagnosticSuggester:
    """Provides actionable remediation rules and configurations based on detected issues."""

    @classmethod
    def enrich_issues_with_remediation(cls, issues: List[DiagnosticIssue]) -> List[DiagnosticIssue]:
        for issue in issues:
            if not issue.suggested_fix:
                if issue.code == "POWER_FACTOR_OUT_OF_RANGE":
                    issue.suggested_fix = "Configure rule: `power_factor = raw_value * 0.01` if vendor reports percentage (0-100%)."
                elif issue.code == "MISSING_ACTIVE_IMPORT_ENERGY":
                    issue.suggested_fix = "Map vendor import register (e.g. OBIS `1.0.1.8.0.255` or column `KWH_IMP`) in adapter config."
                elif issue.code == "NON_MONOTONIC_ENERGY_REGISTER":
                    issue.suggested_fix = "Apply rollover threshold filter (> 99999 kWh) or flag meter for physical calibration inspection."
                elif issue.code == "VOLTAGE_OUT_OF_BOUNDS":
                    issue.suggested_fix = "Verify whether values are line-to-line (400V) or apply PT scaling factor (e.g. 0.001 for mV)."
                elif issue.code == "NAIVE_TIMESTAMP":
                    issue.suggested_fix = "Set default timezone to `Asia/Kolkata` (+05:30) or append UTC designator 'Z'."
        return issues
