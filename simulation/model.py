from __future__ import annotations

from dataclasses import dataclass, field
from enum import StrEnum


class FlightKind(StrEnum):
    ARRIVAL = "arrival"
    DEPARTURE = "departure"


class AircraftState(StrEnum):
    INBOUND = "inbound"
    APPROACH = "approach"
    FINAL = "final"
    GO_AROUND = "go_around"
    HOLDING = "holding"
    HOLD_SHORT = "hold_short"
    LINING_UP = "lining_up"
    LINE_UP = "line_up"
    TAKEOFF_READY = "takeoff_ready"
    TAKEOFF_ROLL = "takeoff_roll"
    DEPARTURE = "departure"
    LANDED = "landed"
    HANDOFF = "handoff"


@dataclass(frozen=True, slots=True)
class Runway:
    name: str
    reciprocal: str
    heading_deg: int
    length_ft: int
    elevation_ft: int

    def has_end(self, name: str) -> bool:
        return name in {self.name, self.reciprocal}

    def heading_for(self, name: str) -> int:
        if name == self.name:
            return self.heading_deg
        if name == self.reciprocal:
            return (self.heading_deg + 180) % 360
        raise ValueError(f"Unknown runway end: {name}")


@dataclass(slots=True)
class Aircraft:
    callsign: str
    kind: FlightKind
    state: AircraftState
    x_nm: float
    y_nm: float
    heading_deg: float
    altitude_ft: float
    speed_kt: float
    target_heading_deg: float | None = None
    target_altitude_ft: float | None = None
    target_speed_kt: float | None = None
    landing_cleared: bool = False
    approach_cleared: bool = False
    departure_altitude_assigned: bool = False
    assigned_runway: str | None = None
    ground_sequence_seconds: float = 0
    takeoff_after_lineup: bool = False
    requested_fix: str | None = None
    expedite: bool = False

    def __post_init__(self) -> None:
        if self.target_heading_deg is None:
            self.target_heading_deg = self.heading_deg
        if self.target_altitude_ft is None:
            self.target_altitude_ft = self.altitude_ft
        if self.target_speed_kt is None:
            self.target_speed_kt = self.speed_kt


@dataclass(frozen=True, slots=True)
class SimulationEvent:
    tick: int
    event_type: str
    callsign: str | None
    detail: dict[str, object] = field(default_factory=dict)
