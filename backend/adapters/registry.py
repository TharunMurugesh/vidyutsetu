"""Adapter Registry for VidyutSetu."""

from typing import Dict, Optional, Type
from backend.adapters.base import BaseAdapter
from backend.adapters.alpha import AlphaAdapter, DEFAULT_ALPHA_PROFILE
from backend.adapters.beta import BetaAdapter, DEFAULT_BETA_PROFILE
from backend.adapters.gamma import GammaAdapter, DEFAULT_GAMMA_PROFILE
from backend.adapters.delta import DeltaAdapter, DEFAULT_DELTA_PROFILE
from backend.models.vendor import VendorProfile

ADAPTER_CLASSES: Dict[str, Type[BaseAdapter]] = {
    "alpha-hes": AlphaAdapter,
    "beta-hes": BetaAdapter,
    "gamma-mdms": GammaAdapter,
    "delta-legacy": DeltaAdapter
}

DEFAULT_PROFILES: Dict[str, VendorProfile] = {
    "alpha-hes": DEFAULT_ALPHA_PROFILE,
    "beta-hes": DEFAULT_BETA_PROFILE,
    "gamma-mdms": DEFAULT_GAMMA_PROFILE,
    "delta-legacy": DEFAULT_DELTA_PROFILE
}


def get_adapter(vendor_id: str, custom_profile: Optional[VendorProfile] = None) -> Optional[BaseAdapter]:
    adapter_cls = ADAPTER_CLASSES.get(vendor_id)
    if not adapter_cls:
        return None
    profile = custom_profile or DEFAULT_PROFILES.get(vendor_id)
    return adapter_cls(profile=profile)


def list_registered_vendors() -> Dict[str, VendorProfile]:
    return DEFAULT_PROFILES.copy()
