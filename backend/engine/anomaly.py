"""Anomaly Detection Engine for VidyutSetu AMI Workbench.

Uses Isolation Forest per meter when enough readings exist (>= 5),
falls back to Z-score for smaller windows. Detects:
- Energy delta spikes / sudden drops (possible tamper / rollover)
- Voltage excursions beyond the meter's own historical envelope
- Current anomalies (reverse current, sensor fault)
- Power factor collapse
"""

from __future__ import annotations

import math
from dataclasses import dataclass, field
from typing import List, Dict, Optional, Tuple

import numpy as np

from backend.models.canonical import CanonicalMeterReading, DiagnosticIssue, IssueSeverity, ValidationStage

# Minimum readings per meter to run Isolation Forest; below this use Z-score
_IF_MIN_SAMPLES = 5
_IF_CONTAMINATION = 0.05   # expected anomaly rate
_ZSCORE_THRESHOLD = 3.0    # standard deviations for Z-score fallback
_IF_N_ESTIMATORS = 100


@dataclass
class ReadingAnomaly:
    meter_serial_number: str
    reading_index: int           # index within the input readings list
    anomaly_score: float         # 0.0 (normal) → 1.0 (highly anomalous)
    is_anomaly: bool
    method: str                  # "isolation_forest" | "zscore" | "single_reading"
    contributing_features: List[str] = field(default_factory=list)
    description: str = ""


@dataclass
class AnomalyReport:
    total_readings: int
    anomaly_count: int
    anomaly_rate: float          # 0.0 – 1.0
    per_meter: Dict[str, List[ReadingAnomaly]]
    flat: List[ReadingAnomaly]   # all anomalies, index-sorted

    @property
    def has_anomalies(self) -> bool:
        return self.anomaly_count > 0


def _feature_matrix(readings: List[CanonicalMeterReading]) -> Tuple[np.ndarray, List[str]]:
    """Build a numeric feature matrix from a list of readings for one meter."""
    names = ["energy_kwh", "energy_delta", "voltage_v", "current_a", "power_factor", "frequency_hz"]
    rows = []
    prev_energy = None
    for r in readings:
        energy = r.active_energy_import_kwh or 0.0
        delta = (energy - prev_energy) if prev_energy is not None else 0.0
        prev_energy = energy
        rows.append([
            energy,
            delta,
            r.voltage_v if r.voltage_v is not None else 230.0,
            r.current_a if r.current_a is not None else 5.0,
            r.power_factor if r.power_factor is not None else 0.9,
            r.frequency_hz if r.frequency_hz is not None else 50.0,
        ])
    return np.array(rows, dtype=float), names


def _isolation_forest(
    readings: List[CanonicalMeterReading],
    meter_sn: str,
    global_offset: int,
) -> List[ReadingAnomaly]:
    from sklearn.ensemble import IsolationForest

    X, feat_names = _feature_matrix(readings)
    clf = IsolationForest(
        n_estimators=_IF_N_ESTIMATORS,
        contamination=_IF_CONTAMINATION,
        random_state=42,
    )
    clf.fit(X)
    raw_scores = clf.score_samples(X)       # more negative = more anomalous
    preds = clf.predict(X)                  # -1 = anomaly, 1 = normal

    # Normalize raw_scores to 0–1 (higher = more anomalous)
    min_s, max_s = raw_scores.min(), raw_scores.max()
    span = max_s - min_s if max_s != min_s else 1.0
    norm = [(max_s - s) / span for s in raw_scores]

    results = []
    for i, (pred, score) in enumerate(zip(preds, norm)):
        is_anom = pred == -1
        contrib = _top_contributors(X, i, feat_names) if is_anom else []
        results.append(ReadingAnomaly(
            meter_serial_number=meter_sn,
            reading_index=global_offset + i,
            anomaly_score=round(float(score), 4),
            is_anomaly=is_anom,
            method="isolation_forest",
            contributing_features=contrib,
            description=_describe(contrib) if is_anom else "",
        ))
    return results


def _zscore_fallback(
    readings: List[CanonicalMeterReading],
    meter_sn: str,
    global_offset: int,
) -> List[ReadingAnomaly]:
    X, feat_names = _feature_matrix(readings)
    if len(X) < 2:
        return [ReadingAnomaly(
            meter_serial_number=meter_sn,
            reading_index=global_offset,
            anomaly_score=0.0,
            is_anomaly=False,
            method="single_reading",
        )]

    mean = X.mean(axis=0)
    std = X.std(axis=0)
    std[std == 0] = 1.0
    z = np.abs((X - mean) / std)
    max_z = z.max(axis=1)

    results = []
    for i, (row_z, feat_z) in enumerate(zip(max_z, z)):
        is_anom = float(row_z) > _ZSCORE_THRESHOLD
        score = min(1.0, float(row_z) / (_ZSCORE_THRESHOLD * 2))
        contrib = [feat_names[j] for j in np.argsort(feat_z)[::-1][:2] if feat_z[j] > _ZSCORE_THRESHOLD] if is_anom else []
        results.append(ReadingAnomaly(
            meter_serial_number=meter_sn,
            reading_index=global_offset + i,
            anomaly_score=round(score, 4),
            is_anomaly=is_anom,
            method="zscore",
            contributing_features=contrib,
            description=_describe(contrib) if is_anom else "",
        ))
    return results


def _top_contributors(X: np.ndarray, idx: int, names: List[str]) -> List[str]:
    """Return the feature names with the highest absolute deviation from column median."""
    row = X[idx]
    median = np.median(X, axis=0)
    std = X.std(axis=0)
    std[std == 0] = 1.0
    deviation = np.abs((row - median) / std)
    top = np.argsort(deviation)[::-1][:2]
    return [names[j] for j in top if deviation[j] > 1.5]


def _describe(features: List[str]) -> str:
    labels = {
        "energy_kwh": "cumulative energy spike",
        "energy_delta": "energy interval anomaly",
        "voltage_v": "voltage excursion",
        "current_a": "current anomaly",
        "power_factor": "power factor collapse",
        "frequency_hz": "grid frequency deviation",
    }
    if not features:
        return "Statistical outlier across multiple features."
    parts = [labels.get(f, f) for f in features]
    return "Anomaly driven by: " + " + ".join(parts) + "."


class AnomalyDetectionEngine:
    """Entry point: run anomaly detection on a list of CanonicalMeterReadings."""

    @classmethod
    def detect(cls, readings: List[CanonicalMeterReading]) -> AnomalyReport:
        # Group readings by meter
        meter_map: Dict[str, List[Tuple[int, CanonicalMeterReading]]] = {}
        for idx, r in enumerate(readings):
            meter_map.setdefault(r.meter_serial_number, []).append((idx, r))

        per_meter: Dict[str, List[ReadingAnomaly]] = {}
        all_anomalies: List[ReadingAnomaly] = []

        for meter_sn, indexed in meter_map.items():
            indices, meter_readings = zip(*indexed)
            global_offset = indices[0]

            if len(meter_readings) >= _IF_MIN_SAMPLES:
                results = _isolation_forest(list(meter_readings), meter_sn, global_offset)
            else:
                results = _zscore_fallback(list(meter_readings), meter_sn, global_offset)

            per_meter[meter_sn] = results
            all_anomalies.extend(results)

        anomalies_only = [a for a in all_anomalies if a.is_anomaly]
        return AnomalyReport(
            total_readings=len(readings),
            anomaly_count=len(anomalies_only),
            anomaly_rate=round(len(anomalies_only) / max(len(readings), 1), 4),
            per_meter=per_meter,
            flat=sorted(anomalies_only, key=lambda a: a.reading_index),
        )

    @classmethod
    def to_diagnostic_issues(cls, report: AnomalyReport) -> List[DiagnosticIssue]:
        """Convert anomaly findings into DiagnosticIssue entries for the pipeline."""
        issues = []
        for a in report.flat:
            issues.append(DiagnosticIssue(
                code="ANOMALY_DETECTED",
                severity=IssueSeverity.WARNING,
                field=f"readings[{a.reading_index}].meter_serial_number",
                message=(
                    f"Meter {a.meter_serial_number}: ML anomaly detected "
                    f"(score={a.anomaly_score:.3f}, method={a.method}). "
                    f"{a.description}"
                ),
                observed_value=str(a.anomaly_score),
                suggested_fix=(
                    "Inspect meter history for tamper events, sensor faults, "
                    "or rollover. Cross-check with field audit data."
                ),
                stage=ValidationStage.CANONICAL,
            ))
        return issues
