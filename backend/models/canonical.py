"""Canonical Data Model (CDM) for VidyutSetu AMI Interoperability Testing Workbench.
Aligned with IEC 61968-9, DLMS/COSEM (IEC 62056), and IS 15959.
"""

from __future__ import annotations
from datetime import datetime, timezone
from decimal import Decimal
from enum import Enum
from typing import List, Optional, Dict, Any
from pydantic import BaseModel, Field, ConfigDict
import uuid


class QualityCode(str, Enum):
    VALID = "VALID"
    ESTIMATED = "ESTIMATED"
    SUSPECT = "SUSPECT"
    MALFORMED = "MALFORMED"
    OUT_OF_RANGE = "OUT_OF_RANGE"


class EventSeverity(str, Enum):
    CRITICAL = "CRITICAL"
    MAJOR = "MAJOR"
    WARNING = "WARNING"
    INFO = "INFO"


class EventCode(str, Enum):
    TAMPER_MAGNETIC = "TAMPER_MAGNETIC"
    TAMPER_COVER_OPEN = "TAMPER_COVER_OPEN"
    POWER_OUTAGE = "POWER_OUTAGE"
    POWER_RESTORED = "POWER_RESTORED"
    VOLTAGE_SAG = "VOLTAGE_SAG"
    VOLTAGE_SWELL = "VOLTAGE_SWELL"
    REVERSE_CURRENT = "REVERSE_CURRENT"
    NEUTRAL_DISTURBANCE = "NEUTRAL_DISTURBANCE"
    METER_CLOCK_DRIFT = "METER_CLOCK_DRIFT"
    COMMUNICATION_FAILURE = "COMMUNICATION_FAILURE"
    FIRMWARE_UPGRADED = "FIRMWARE_UPGRADED"
    OTHER_EVENT = "OTHER_EVENT"


class EnergyRegisterType(str, Enum):
    CUMULATIVE = "CUMULATIVE"
    INTERVAL_DELTA = "INTERVAL_DELTA"


class TimestampEdge(str, Enum):
    START = "START"
    END = "END"
    INSTANTANEOUS = "INSTANTANEOUS"


class ControlAction(str, Enum):
    DISCONNECT = "DISCONNECT"
    RECONNECT = "RECONNECT"
    LIMIT_LOAD = "LIMIT_LOAD"
    ARM_FOR_RECONNECT = "ARM_FOR_RECONNECT"


class ControlStatus(str, Enum):
    PENDING = "PENDING"
    SUCCESS = "SUCCESS"
    REJECTED = "REJECTED"
    FAILED = "FAILED"
    TIMEOUT = "TIMEOUT"


class CanonicalMeterReading(BaseModel):
    model_config = ConfigDict(extra="ignore")

    meter_serial_number: str = Field(..., description="Alphanumeric unique meter identifier")
    timestamp: datetime = Field(..., description="ISO 8601 UTC timestamp of reading")
    timestamp_edge: TimestampEdge = Field(default=TimestampEdge.END, description="Whether timestamp marks interval start, end, or instantaneous sample")
    interval_minutes: int = Field(default=15, description="Interval block length in minutes (e.g. 15, 30, 60)")

    # Energy registers — explicitly typed as cumulative or interval delta
    register_type: EnergyRegisterType = Field(default=EnergyRegisterType.CUMULATIVE, description="Whether energy values are cumulative register reads or per-interval deltas")
    active_energy_import_kwh: float = Field(..., description="Active Energy Import in kWh (cumulative or delta per register_type)")
    active_energy_export_kwh: Optional[float] = Field(default=0.0, description="Active Energy Export in kWh")
    reactive_energy_kvarh: Optional[float] = Field(default=0.0, description="Reactive Energy in kVArh")
    apparent_energy_kvah: Optional[float] = Field(default=None, description="Apparent Energy in kVAh")

    # OBIS code identity — traces which register the value came from
    obis_code: Optional[str] = Field(default=None, description="Source OBIS code (e.g. 1.0.1.8.0.255) per IS 15959")

    # Scaler / CT-PT context
    scaler_applied: bool = Field(default=True, description="True if scaler/multiplier already applied to values")
    ct_ratio: Optional[float] = Field(default=None, description="Current Transformer ratio if transformer-operated")
    pt_ratio: Optional[float] = Field(default=None, description="Potential Transformer ratio if transformer-operated")

    # Instantaneous electrical quantities
    voltage_v: Optional[float] = Field(default=None, description="Instantaneous RMS Voltage in Volts (Phase-Neutral or L1)")
    current_a: Optional[float] = Field(default=None, description="Instantaneous RMS Current in Amperes (Phase L1)")
    power_factor: Optional[float] = Field(default=None, description="Power factor between -1.0 and 1.0")
    frequency_hz: Optional[float] = Field(default=50.0, description="Instantaneous grid frequency in Hz")

    quality_code: QualityCode = Field(default=QualityCode.VALID, description="Data conformance quality status")
    raw_metadata: Dict[str, Any] = Field(default_factory=dict, description="Vendor-specific original context")

    # ML anomaly detection results (populated by AnomalyDetectionEngine)
    anomaly_score: Optional[float] = Field(default=None, description="ML anomaly score 0.0 (normal) → 1.0 (highly anomalous)")
    is_anomaly: Optional[bool] = Field(default=None, description="True if reading flagged as anomalous by ML engine")


class CanonicalMeterEvent(BaseModel):
    model_config = ConfigDict(extra="ignore")

    event_id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    meter_serial_number: str = Field(..., description="Target meter serial number")
    event_code: EventCode = Field(..., description="Standardized event code")
    timestamp: datetime = Field(..., description="UTC timestamp of event occurrence")
    severity: EventSeverity = Field(default=EventSeverity.WARNING)
    raw_vendor_code: Optional[str] = Field(default=None, description="Original vendor alarm string/code")
    description: Optional[str] = Field(default=None, description="Human readable description")
    details: Dict[str, Any] = Field(default_factory=dict)


class CanonicalControlCommand(BaseModel):
    model_config = ConfigDict(extra="ignore")

    command_id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    meter_serial_number: str = Field(..., description="Target meter serial number")
    action: ControlAction = Field(..., description="Requested control action")
    timestamp: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    parameter_value: Optional[float] = Field(default=None, description="Optional parameter e.g. kW limit")
    status: ControlStatus = Field(default=ControlStatus.PENDING)
    response_code: Optional[str] = None
    response_message: Optional[str] = None


class CanonicalPayload(BaseModel):
    model_config = ConfigDict(extra="ignore")

    message_id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    source_system: str = Field(..., description="ID or name of origin system / HES")
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    version: str = Field(default="1.0.0")
    readings: List[CanonicalMeterReading] = Field(default_factory=list)
    events: List[CanonicalMeterEvent] = Field(default_factory=list)
    controls: List[CanonicalControlCommand] = Field(default_factory=list)


# Diagnostics & Test Result Models

class IssueSeverity(str, Enum):
    ERROR = "ERROR"
    WARNING = "WARNING"
    INFO = "INFO"


class ValidationStage(str, Enum):
    SOURCE = "SOURCE"
    ADAPTER = "ADAPTER"
    CANONICAL = "CANONICAL"
    TARGET = "TARGET"


class DiagnosticIssue(BaseModel):
    code: str = Field(..., description="Issue code e.g. INVALID_TIMESTAMP, MISSING_REQUIRED_FIELD")
    field: Optional[str] = Field(default=None, description="Affected field path")
    severity: IssueSeverity = Field(default=IssueSeverity.ERROR)
    message: str = Field(..., description="Clear explanation of the problem")
    observed_value: Any = Field(default=None)
    expected_format: Optional[str] = Field(default=None)
    suggested_fix: Optional[str] = Field(default=None, description="Actionable recommendation or mapping override")
    stage: ValidationStage = Field(default=ValidationStage.CANONICAL, description="Pipeline stage that produced this issue — determines blame attribution")


class CompatibilityScoreBreakdown(BaseModel):
    syntactic_score: float = Field(..., description="0-100: Format, syntax, parsing integrity")
    semantic_score: float = Field(..., description="0-100: Standard units, OBIS mappings, valid types")
    data_integrity_score: float = Field(..., description="0-100: Monotonicity, electrical sanity, timestamps")
    total_score: float = Field(..., description="Weighted composite score 0-100")
    grade: str = Field(..., description="A+ (>=95), A (>=85), B (>=70), C (>=50), F (<50)")
    summary: str = Field(..., description="High-level interoperability judgment")


# ── Conformance Evaluation Engine models ─────────────────────────────────────

class AssertionOutcome(str, Enum):
    PASS = "PASS"
    FAIL = "FAIL"
    WARNING = "WARNING"
    NOT_APPLICABLE = "NOT_APPLICABLE"
    NOT_EXECUTED = "NOT_EXECUTED"


class RequirementCriticality(str, Enum):
    MANDATORY = "MANDATORY"
    OPTIONAL = "OPTIONAL"
    CONDITIONAL = "CONDITIONAL"


class ValidationCategory(str, Enum):
    FIELD_PRESENCE = "field_presence"
    FIELD_MAPPING = "field_mapping"
    DATA_TYPE = "data_type"
    UNIT_CONVERSION = "unit_conversion"
    TIMESTAMP = "timestamp"
    SEMANTIC = "semantic"
    DATA_INTEGRITY = "data_integrity"
    CROSS_RECORD = "cross_record"
    PHYSICAL = "physical"


class ConformanceStatus(str, Enum):
    PASS = "PASS"
    CONDITIONAL = "CONDITIONAL"
    FAIL = "FAIL"
    INCOMPLETE = "INCOMPLETE"


class FieldAssertion(BaseModel):
    requirement: str = Field(..., description="Requirement or issue code being evaluated")
    category: ValidationCategory = Field(..., description="Validation category")
    field: Optional[str] = Field(default=None, description="Affected field path")
    criticality: RequirementCriticality = Field(..., description="Mandatory, optional, or conditional")
    outcome: AssertionOutcome = Field(..., description="Per-assertion result")
    actual_value: Any = Field(default=None, description="Observed value from the payload")
    expected_constraint: Optional[str] = Field(default=None, description="Expected value or constraint description")
    diagnostic: str = Field(..., description="Explanation of the finding")
    suggested_correction: Optional[str] = Field(default=None, description="Actionable correction hint")


class ConformanceResult(BaseModel):
    status: ConformanceStatus = Field(..., description="Overall conformance status")
    assertions: List[FieldAssertion] = Field(default_factory=list, description="Per-requirement assertion results")
    mandatory_failure_count: int = Field(default=0)
    warning_count: int = Field(default=0)
    total_assertions: int = Field(default=0)
    summary: str = Field(..., description="Human-readable conformance verdict")


class TestExecutionReport(BaseModel):
    run_id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    execution_time: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    source_vendor: str
    target_vendor: Optional[str] = None
    total_records_processed: int = 0
    valid_records_count: int = 0
    invalid_records_count: int = 0
    issues: List[DiagnosticIssue] = Field(default_factory=list)
    score: CompatibilityScoreBreakdown
    transformation_applied: bool = False
    duration_ms: float = 0.0
