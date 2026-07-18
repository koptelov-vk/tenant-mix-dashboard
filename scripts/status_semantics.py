from __future__ import annotations

import re
from typing import Literal

TenantStatus = Literal["active", "upcoming", "closed", "unknown", "conflicting"]


def _text(value: object) -> str:
    return re.sub(r"\s+", " ", str(value or "").replace("\xa0", " ")).strip().casefold()


def canonical_status(row_status: object, confirmation: object) -> TenantStatus:
    row_value = _text(row_status)
    confirmation_value = _text(confirmation)
    value = f"{row_value} {confirmation_value}".strip()
    if not value:
        return "unknown"
    if "conflict" in value or "конфликт" in value:
        return "conflicting"
    if "unknown" in value or "неизвест" in value:
        return "unknown"
    if any(token in value for token in ("upcoming", "скоро", "planned", "заявлен", "ожида")):
        return "upcoming"
    if "closed" in value or "закры" in value:
        return "closed"
    if (
        any(token in value for token in ("active", "действ", "открыт", "confirmed", "подтвержд"))
        or confirmation_value == "ok"
    ):
        return "active"
    return "unknown"
