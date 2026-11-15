"""Base Adapter interface for VidyutSetu Vendor Systems."""

from abc import ABC, abstractmethod
from typing import Any, Dict, List, Tuple
from backend.models.canonical import CanonicalPayload, DiagnosticIssue, ValidationStage, IssueSeverity
from backend.models.vendor import VendorProfile


class BaseAdapter(ABC):
    """Abstract base adapter for converting between vendor raw payloads and Canonical Data Model."""

    def __init__(self, profile: VendorProfile):
        self.profile = profile

    def validate_source(self, raw_data: Any) -> List[DiagnosticIssue]:
        """Stage A: validate raw vendor data against the vendor's declared schema.

        Checks structural conformance (format type, required top-level keys,
        record-level required fields) BEFORE the adapter transforms anything.
        Subclasses override to add vendor-specific schema checks.
        """
        issues: List[DiagnosticIssue] = []
        fmt = self.profile.format_type

        if fmt == "json":
            if isinstance(raw_data, str):
                issues.append(DiagnosticIssue(
                    code="SOURCE_NOT_PARSED",
                    severity=IssueSeverity.WARNING,
                    message="Raw data is a string; expected pre-parsed JSON object.",
                    stage=ValidationStage.SOURCE,
                ))
            elif not isinstance(raw_data, dict):
                issues.append(DiagnosticIssue(
                    code="SOURCE_FORMAT_MISMATCH",
                    severity=IssueSeverity.ERROR,
                    message=f"Vendor declares JSON format but received {type(raw_data).__name__}.",
                    stage=ValidationStage.SOURCE,
                ))
        elif fmt == "csv":
            if not isinstance(raw_data, str):
                issues.append(DiagnosticIssue(
                    code="SOURCE_FORMAT_MISMATCH",
                    severity=IssueSeverity.ERROR,
                    message=f"Vendor declares CSV format but received {type(raw_data).__name__}.",
                    stage=ValidationStage.SOURCE,
                ))
            elif len(raw_data.strip()) == 0:
                issues.append(DiagnosticIssue(
                    code="SOURCE_EMPTY_PAYLOAD",
                    severity=IssueSeverity.ERROR,
                    message="CSV payload is empty.",
                    stage=ValidationStage.SOURCE,
                ))

        return issues

    @abstractmethod
    def parse_to_canonical(self, raw_data: Any) -> Tuple[CanonicalPayload, List[DiagnosticIssue]]:
        """Parse raw vendor format (JSON string, dict, or CSV text) into CanonicalPayload.
        Returns:
            Tuple of (CanonicalPayload, List[DiagnosticIssue])
        """
        pass

    @abstractmethod
    def serialize_from_canonical(self, canonical: CanonicalPayload) -> Any:
        """Serialize a CanonicalPayload into vendor-specific format (dict, JSON string, or CSV text)."""
        pass

    def validate_target(self, serialized_output: Any) -> List[DiagnosticIssue]:
        """Stage D: validate serialized target output against the target consumer's contract.

        Checks that the output produced by serialize_from_canonical conforms to
        the target vendor's expected structure. Subclasses override for specifics.
        """
        issues: List[DiagnosticIssue] = []
        fmt = self.profile.format_type
        if fmt == "json" and not isinstance(serialized_output, dict):
            issues.append(DiagnosticIssue(
                code="TARGET_FORMAT_MISMATCH",
                severity=IssueSeverity.ERROR,
                message=f"Target expects JSON dict, got {type(serialized_output).__name__}.",
                stage=ValidationStage.TARGET,
            ))
        elif fmt == "csv" and not isinstance(serialized_output, str):
            issues.append(DiagnosticIssue(
                code="TARGET_FORMAT_MISMATCH",
                severity=IssueSeverity.ERROR,
                message=f"Target expects CSV string, got {type(serialized_output).__name__}.",
                stage=ValidationStage.TARGET,
            ))
        return issues
