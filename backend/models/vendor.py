"""Vendor Profile and Mapping Configuration Models."""

from __future__ import annotations
from typing import Dict, List, Optional, Any
from pydantic import BaseModel, Field


class FieldMappingRule(BaseModel):
    source_field: str = Field(..., description="Field key in vendor payload")
    canonical_field: str = Field(..., description="Target field in CanonicalMeterReading")
    data_type: str = Field(default="float", description="Expected type: string, float, integer, datetime")
    multiplier: float = Field(default=1.0, description="Multiplier to convert to canonical units (e.g. 0.001 for Wh -> kWh)")
    date_format: Optional[str] = Field(default=None, description="Custom datetime format string if non-ISO")
    default_value: Optional[Any] = Field(default=None)


class VendorProfile(BaseModel):
    vendor_id: str = Field(..., description="Unique identifier e.g. alpha-hes, beta-hes")
    name: str = Field(..., description="Display name e.g. Alpha DLMS/COSEM HES")
    system_type: str = Field(..., description="HES or MDMS")
    format_type: str = Field(..., description="json, csv, or xml")
    protocol: str = Field(..., description="DLMS/COSEM, CIM_IEC61968, PROPRIETARY_CSV, PROPRIETARY_JSON")
    version: str = Field(default="1.0")
    description: str = Field(default="")
    default_mappings: List[FieldMappingRule] = Field(default_factory=list)
    obis_code_mappings: Dict[str, str] = Field(default_factory=dict, description="OBIS code to canonical attribute mapping")
    event_mappings: Dict[str, str] = Field(default_factory=dict, description="Raw event code to canonical EventCode enum")
