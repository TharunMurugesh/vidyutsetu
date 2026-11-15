"""Conformance Evaluation Engine for VidyutSetu AMI Interoperability Workbench.

Replaces the percentage-based CompatibilityScoreBreakdown with an assertion-based
evaluation that strictly follows the decision precedence:
  1. Any MANDATORY failure  → FAIL
  2. Required checks not executed → INCOMPLETE
  3. Non-blocking warnings present → CONDITIONAL
  4. All pass, no warnings → PASS

No aggregate score, no weighted averages, no compensation between requirements.
"""

from typing import List
from backend.models.canonical import (
    AssertionOutcome,
    ConformanceStatus,
    ConformanceResult,
    FieldAssertion,
    RequirementCriticality,
    ValidationCategory,
    DiagnosticIssue,
    IssueSeverity,
)


# ── Requirement classification tables ────────────────────────────────────────

# Issue codes that represent MANDATORY requirements. Any ERROR on these → FAIL.
_MANDATORY_CODES = frozenset({
    # Format / field mapping
    "JSON_PARSE_ERROR",
    "CSV_PARSE_FAILED",
    "INVALID_PAYLOAD_STRUCTURE",
    "MISSING_CSV_COLUMNS",
    "INVALID_TELEMETRY_STRUCTURE",
    # Field presence
    "MISSING_ACTIVE_IMPORT_ENERGY",
    "MISSING_ACT_WH",
    "MISSING_METER_ID",
    "MISSING_DEVICE_UID",
    "EMPTY_METER_ID",
    "INVALID_METER_SERIAL",
    # Data type / unit
    "NUMBER_COERCION_ERROR",
    "POWER_FACTOR_OUT_OF_RANGE",
    # Timestamp
    "INVALID_TIMESTAMP_FORMAT",
    "FUTURE_TIMESTAMP",
    # Data integrity / cross-record
    "NEGATIVE_ACTIVE_ENERGY",
    "NEGATIVE_CURRENT",
    "NON_MONOTONIC_ENERGY_REGISTER",
    "DUPLICATE_INTERVAL_TIMESTAMP",
})

# Issue codes that are non-blocking (physical warnings, optional checks).
_OPTIONAL_CODES = frozenset({
    "NAIVE_TIMESTAMP",
    "EXCESSIVE_CLOCK_DRIFT",
    "VOLTAGE_OUT_OF_BOUNDS",
    "VOLTAGE_NEAR_ZERO",
    "OVERCURRENT_ALARM",
    "GRID_FREQUENCY_ABNORMAL",
    "EMPTY_PAYLOAD",
    "MISSING_ACT_WH_WARNING",
})

# Issue code → validation category mapping
_CATEGORY_MAP = {
    "JSON_PARSE_ERROR": ValidationCategory.FIELD_MAPPING,
    "CSV_PARSE_FAILED": ValidationCategory.FIELD_MAPPING,
    "INVALID_PAYLOAD_STRUCTURE": ValidationCategory.FIELD_MAPPING,
    "MISSING_CSV_COLUMNS": ValidationCategory.FIELD_MAPPING,
    "INVALID_TELEMETRY_STRUCTURE": ValidationCategory.FIELD_MAPPING,
    "MISSING_ACTIVE_IMPORT_ENERGY": ValidationCategory.FIELD_PRESENCE,
    "MISSING_ACT_WH": ValidationCategory.FIELD_PRESENCE,
    "MISSING_METER_ID": ValidationCategory.FIELD_PRESENCE,
    "MISSING_DEVICE_UID": ValidationCategory.FIELD_PRESENCE,
    "EMPTY_METER_ID": ValidationCategory.FIELD_PRESENCE,
    "INVALID_METER_SERIAL": ValidationCategory.FIELD_PRESENCE,
    "EMPTY_PAYLOAD": ValidationCategory.FIELD_PRESENCE,
    "NUMBER_COERCION_ERROR": ValidationCategory.DATA_TYPE,
    "POWER_FACTOR_OUT_OF_RANGE": ValidationCategory.SEMANTIC,
    "INVALID_TIMESTAMP_FORMAT": ValidationCategory.TIMESTAMP,
    "FUTURE_TIMESTAMP": ValidationCategory.TIMESTAMP,
    "NAIVE_TIMESTAMP": ValidationCategory.TIMESTAMP,
    "EXCESSIVE_CLOCK_DRIFT": ValidationCategory.TIMESTAMP,
    "NEGATIVE_ACTIVE_ENERGY": ValidationCategory.DATA_INTEGRITY,
    "NEGATIVE_CURRENT": ValidationCategory.PHYSICAL,
    "NON_MONOTONIC_ENERGY_REGISTER": ValidationCategory.CROSS_RECORD,
    "DUPLICATE_INTERVAL_TIMESTAMP": ValidationCategory.CROSS_RECORD,
    "VOLTAGE_OUT_OF_BOUNDS": ValidationCategory.PHYSICAL,
    "VOLTAGE_NEAR_ZERO": ValidationCategory.PHYSICAL,
    "OVERCURRENT_ALARM": ValidationCategory.PHYSICAL,
    "GRID_FREQUENCY_ABNORMAL": ValidationCategory.PHYSICAL,
}


class ConformanceEvaluationEngine:
    """Evaluates interoperability conformance from validation issues.

    Consumes the existing DiagnosticIssue list produced by ValidationEngine and
    the adapter parsers. Applies mandatory/optional classification and decision
    precedence to produce a ConformanceResult with per-assertion traceability.
    """

    @classmethod
    def evaluate(
        cls,
        issues: List[DiagnosticIssue],
        total_records: int,
        format_parsed_successfully: bool = True,
    ) -> ConformanceResult:
        assertions: List[FieldAssertion] = []

        for issue in issues:
            criticality = cls._criticality(issue.code, issue.severity)
            outcome = cls._outcome(issue.severity, criticality)
            assertions.append(
                FieldAssertion(
                    requirement=issue.code,
                    category=cls._category(issue.code),
                    field=issue.field,
                    criticality=criticality,
                    outcome=outcome,
                    actual_value=issue.observed_value,
                    expected_constraint=issue.expected_format,
                    diagnostic=issue.message,
                    suggested_correction=issue.suggested_fix,
                )
            )

        # If the format failed to parse entirely and no records were obtained,
        # mark format-check as NOT_EXECUTED so we can reach INCOMPLETE.
        if not format_parsed_successfully and total_records == 0:
            assertions.append(
                FieldAssertion(
                    requirement="FORMAT_EVALUATION",
                    category=ValidationCategory.FIELD_MAPPING,
                    criticality=RequirementCriticality.MANDATORY,
                    outcome=AssertionOutcome.NOT_EXECUTED,
                    diagnostic="Format evaluation could not be completed; no records were parsed.",
                    suggested_correction="Provide a valid, non-empty payload in the declared format.",
                )
            )

        status = cls._decide(assertions, total_records, format_parsed_successfully)
        mandatory_failures = [
            a for a in assertions
            if a.outcome == AssertionOutcome.FAIL
            and a.criticality == RequirementCriticality.MANDATORY
        ]
        warnings = [a for a in assertions if a.outcome == AssertionOutcome.WARNING]

        return ConformanceResult(
            status=status,
            assertions=assertions,
            mandatory_failure_count=len(mandatory_failures),
            warning_count=len(warnings),
            total_assertions=len(assertions),
            summary=cls._summary(status, mandatory_failures, warnings, total_records),
        )

    # ── Internal helpers ──────────────────────────────────────────────────────

    @classmethod
    def _criticality(
        cls, code: str, severity: IssueSeverity
    ) -> RequirementCriticality:
        if code in _MANDATORY_CODES:
            return RequirementCriticality.MANDATORY
        if code in _OPTIONAL_CODES:
            return RequirementCriticality.OPTIONAL
        # Unknown codes: treat ERROR as MANDATORY, WARNING/INFO as OPTIONAL
        if severity == IssueSeverity.ERROR:
            return RequirementCriticality.MANDATORY
        return RequirementCriticality.OPTIONAL

    @classmethod
    def _outcome(
        cls, severity: IssueSeverity, criticality: RequirementCriticality
    ) -> AssertionOutcome:
        if severity == IssueSeverity.ERROR:
            return AssertionOutcome.FAIL
        if severity == IssueSeverity.WARNING:
            return AssertionOutcome.WARNING
        return AssertionOutcome.NOT_APPLICABLE

    @classmethod
    def _category(cls, code: str) -> ValidationCategory:
        return _CATEGORY_MAP.get(code, ValidationCategory.SEMANTIC)

    @classmethod
    def _decide(
        cls,
        assertions: List[FieldAssertion],
        total_records: int,
        format_parsed_successfully: bool,
    ) -> ConformanceStatus:
        has_mandatory_failure = any(
            a.outcome == AssertionOutcome.FAIL
            and a.criticality == RequirementCriticality.MANDATORY
            for a in assertions
        )
        # Decision precedence 1: mandatory failure → FAIL
        if has_mandatory_failure:
            return ConformanceStatus.FAIL

        has_not_executed = any(
            a.outcome == AssertionOutcome.NOT_EXECUTED for a in assertions
        )
        no_evidence = total_records == 0 and not format_parsed_successfully
        # Decision precedence 2: required checks not executed → INCOMPLETE
        if has_not_executed or no_evidence:
            return ConformanceStatus.INCOMPLETE

        has_warnings = any(a.outcome == AssertionOutcome.WARNING for a in assertions)
        # Decision precedence 3: warnings present → CONDITIONAL
        if has_warnings:
            return ConformanceStatus.CONDITIONAL

        # Decision precedence 4: everything passed
        return ConformanceStatus.PASS

    @classmethod
    def _summary(
        cls,
        status: ConformanceStatus,
        mandatory_failures: List[FieldAssertion],
        warnings: List[FieldAssertion],
        total_records: int,
    ) -> str:
        if status == ConformanceStatus.PASS:
            return (
                f"PASS — All applicable mandatory requirements satisfied across "
                f"{total_records} record(s). No blocking failures."
            )
        if status == ConformanceStatus.CONDITIONAL:
            codes = ", ".join(dict.fromkeys(w.requirement for w in warnings))
            return (
                f"CONDITIONAL — All mandatory requirements pass. "
                f"{len(warnings)} non-blocking warning(s): {codes}."
            )
        if status == ConformanceStatus.FAIL:
            first = mandatory_failures[0]
            extra = (
                f" (+{len(mandatory_failures) - 1} more)"
                if len(mandatory_failures) > 1
                else ""
            )
            return (
                f"FAIL — {len(mandatory_failures)} mandatory requirement(s) failed{extra}. "
                f"First failure: [{first.requirement}] {first.diagnostic}"
            )
        # INCOMPLETE
        return (
            "INCOMPLETE — Required checks could not be executed. "
            "No records were successfully parsed from the input payload."
        )
