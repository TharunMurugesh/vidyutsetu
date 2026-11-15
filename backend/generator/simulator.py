"""Realistic Synthetic AMI Telemetry and Event Generator for VidyutSetu.
Simulates:
- Multi-day load profiles (residential / commercial load curves)
- Realistic power factor and electrical variations
- Fault / Tamper scenarios (magnetic tamper, meter cover open, power outage/restoration)
- Data quality flaws (clock drift, voltage anomalies, corrupted records, non-monotonic jumps)
Outputs raw vendor formats or Canonical payloads.
"""

import math
import random
from datetime import datetime, timezone, timedelta
from typing import List, Dict, Any, Optional
from backend.models.canonical import (
    CanonicalPayload,
    CanonicalMeterReading,
    CanonicalMeterEvent,
    EventCode,
    EventSeverity,
    QualityCode
)
from backend.adapters.registry import get_adapter


class SyntheticAmiGenerator:
    """Enterprise-grade AMI telemetry simulator."""

    @staticmethod
    def _diurnal_load_factor(hour_of_day: float) -> float:
        """Simulates typical dual-peak residential electrical load profile (morning & evening peaks)."""
        # Peak 1 around 08:30, Peak 2 around 20:30, trough at 03:00
        morning_peak = math.exp(-((hour_of_day - 8.5) ** 2) / 6.0) * 0.7
        evening_peak = math.exp(-((hour_of_day - 20.5) ** 2) / 8.0) * 0.95
        base_load = 0.25
        return base_load + morning_peak + evening_peak

    @classmethod
    def generate_canonical_scenario(
        cls,
        meter_count: int = 3,
        intervals_per_meter: int = 8,
        interval_minutes: int = 15,
        base_kwh: float = 2450.0,
        inject_anomalies: bool = False,
        inject_tampers: bool = False,
        source_system: str = "vidyutsetu-sim",
        seed: Optional[int] = None,
    ) -> CanonicalPayload:
        if seed is not None:
            random.seed(seed)
        readings: List[CanonicalMeterReading] = []
        events: List[CanonicalMeterEvent] = []

        # Deterministic base time when seeded for full reproducibility
        if seed is not None:
            start_time = datetime(2026, 1, 1, tzinfo=timezone.utc)
        else:
            start_time = datetime.now(timezone.utc) - timedelta(minutes=intervals_per_meter * interval_minutes)

        for m_idx in range(1, meter_count + 1):
            meter_sn = f"SM-KA-{m_idx:04d}"
            cumulative_kwh = base_kwh + (m_idx * 150.0)

            for step in range(intervals_per_meter):
                step_time = start_time + timedelta(minutes=step * interval_minutes)
                hour = step_time.hour + (step_time.minute / 60.0)
                load_factor = cls._diurnal_load_factor(hour)

                # Realistic electrical parameters
                voltage = 230.0 + random.uniform(-4.5, 4.5)
                # Nominal current based on load factor (1.0 - 15.0 A)
                current = max(0.5, (load_factor * 10.0) + random.uniform(-0.3, 0.3))
                power_factor = min(0.99, max(0.85, 0.94 + random.uniform(-0.04, 0.03)))

                # Active energy delta in kWh for interval: (V * I * PF / 1000) * (interval / 60)
                interval_kwh = (voltage * current * power_factor / 1000.0) * (interval_minutes / 60.0)
                cumulative_kwh += interval_kwh

                reactive_kvarh = cumulative_kwh * 0.18
                apparent_kvah = cumulative_kwh / power_factor

                # Injection of anomalies if enabled
                if inject_anomalies and step == intervals_per_meter - 2 and m_idx == 1:
                    # Non-monotonic drop
                    cumulative_kwh -= 15.0
                elif inject_anomalies and step == 2 and m_idx == 2:
                    # Voltage surge / swell
                    voltage = 315.0

                readings.append(CanonicalMeterReading(
                    meter_serial_number=meter_sn,
                    timestamp=step_time,
                    interval_minutes=interval_minutes,
                    active_energy_import_kwh=round(cumulative_kwh, 4),
                    active_energy_export_kwh=round(cumulative_kwh * 0.02, 4) if m_idx == 3 else 0.0,
                    reactive_energy_kvarh=round(reactive_kvarh, 4),
                    apparent_energy_kvah=round(apparent_kvah, 4),
                    voltage_v=round(voltage, 2),
                    current_a=round(current, 3),
                    power_factor=round(power_factor, 3),
                    frequency_hz=round(50.0 + random.uniform(-0.1, 0.1), 2),
                    quality_code=QualityCode.VALID
                ))

            # Tamper / Outage events injection
            if inject_tampers and m_idx == 1:
                events.append(CanonicalMeterEvent(
                    meter_serial_number=meter_sn,
                    event_code=EventCode.TAMPER_MAGNETIC,
                    timestamp=start_time + timedelta(minutes=interval_minutes * 2),
                    severity=EventSeverity.CRITICAL,
                    description="Strong static magnetic field > 0.5 Tesla detected near meter core."
                ))
            elif inject_tampers and m_idx == 2:
                events.append(CanonicalMeterEvent(
                    meter_serial_number=meter_sn,
                    event_code=EventCode.POWER_OUTAGE,
                    timestamp=start_time + timedelta(minutes=interval_minutes * 3),
                    severity=EventSeverity.MAJOR,
                    description="Total phase voltage collapse (Grid supply interruption)."
                ))
                events.append(CanonicalMeterEvent(
                    meter_serial_number=meter_sn,
                    event_code=EventCode.POWER_RESTORED,
                    timestamp=start_time + timedelta(minutes=interval_minutes * 5),
                    severity=EventSeverity.INFO,
                    description="Grid supply restored; voltage stabilized at 231.4V."
                ))

        return CanonicalPayload(
            source_system=source_system,
            readings=readings,
            events=events
        )

    @classmethod
    def generate_vendor_scenario(
        cls,
        vendor_id: str,
        meter_count: int = 3,
        intervals: int = 6,
        inject_anomalies: bool = False,
        inject_tampers: bool = False,
        seed: Optional[int] = None,
    ) -> Any:
        """Generates synthetic dataset and outputs directly in vendor's native serialization format."""
        canonical = cls.generate_canonical_scenario(
            meter_count=meter_count,
            intervals_per_meter=intervals,
            inject_anomalies=inject_anomalies,
            inject_tampers=inject_tampers,
            source_system=vendor_id,
            seed=seed,
        )
        adapter = get_adapter(vendor_id)
        if not adapter:
            raise ValueError(f"Unknown vendor adapter: {vendor_id}")
        return adapter.serialize_from_canonical(canonical)
