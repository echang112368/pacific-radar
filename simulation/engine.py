from __future__ import annotations

from dataclasses import dataclass, field
from math import cos, hypot, radians, sin

from .model import Aircraft, AircraftState, FlightKind, Runway, SimulationEvent

AIRBORNE_SPEED_CHANGE_KT_PER_SECOND = 2
TAKEOFF_ACCELERATION_KT_PER_SECOND = 5
LINE_UP_SECONDS = 3
TAKEOFF_POWER_SECONDS = 1


@dataclass(slots=True)
class Simulation:
    runway: Runway
    aircraft: dict[str, Aircraft]
    tick_seconds: float = 1.0
    tick: int = 0
    events: list[SimulationEvent] = field(default_factory=list)

    def runway_occupant(self) -> Aircraft | None:
        occupied_states = {
            AircraftState.LINING_UP,
            AircraftState.LINE_UP,
            AircraftState.TAKEOFF_READY,
            AircraftState.TAKEOFF_ROLL,
            AircraftState.LANDED,
        }
        return next(
            (aircraft for aircraft in self.aircraft.values() if aircraft.state in occupied_states),
            None,
        )

    def issue(self, callsign: str, command: str) -> SimulationEvent:
        aircraft = self.aircraft[callsign]
        tokens = command.upper().replace(",", "").split()
        if not tokens:
            return self._event("command_rejected", callsign, reason="empty command")

        cursor = 0
        clearances: list[str] = []

        while cursor < len(tokens):
            action = tokens[cursor]

            if action in {"C", "CLEAR"}:
                if cursor + 1 >= len(tokens):
                    return self._event(
                        "command_rejected", callsign, reason="clearance value missing"
                    )
                value = tokens[cursor + 1]
                if value.isdigit() and len(value) == 3:
                    aircraft.target_heading_deg = int(value) % 360
                    clearances.append("heading")
                elif value.isdigit() and len(value) <= 2:
                    aircraft.target_altitude_ft = max(
                        self.runway.elevation_ft, int(value) * 1_000
                    )
                    aircraft.departure_altitude_assigned = (
                        aircraft.kind is FlightKind.DEPARTURE
                        or aircraft.departure_altitude_assigned
                    )
                    expedite = (
                        cursor + 2 < len(tokens) and tokens[cursor + 2] in {"X", "EX"}
                    )
                    aircraft.expedite = expedite
                    clearances.append("altitude_expedite" if expedite else "altitude")
                    cursor += 1 if expedite else 0
                else:
                    aircraft.requested_fix = value
                    clearances.append("direct")
                cursor += 2
                continue

            if action in {"S", "SPD", "SPEED"} and cursor + 1 < len(tokens):
                aircraft.target_speed_kt = max(60, int(tokens[cursor + 1]))
                clearances.append("speed")
                cursor += 2
                continue

            if action in {"L", "LDG", "LAND"}:
                runway = (
                    tokens[cursor + 1].replace("RWY", "")
                    if cursor + 1 < len(tokens)
                    else aircraft.assigned_runway or self.runway.name
                )
                if not self.runway.has_end(runway):
                    return self._event(
                        "command_rejected", callsign, reason="unknown runway end"
                    )
                if (
                    aircraft.kind is not FlightKind.ARRIVAL
                    or aircraft.altitude_ft - self.runway.elevation_ft > 3_000
                    or self._angular_difference(
                        aircraft.heading_deg, self.runway.heading_for(runway)
                    )
                    > 60
                ):
                    return self._event(
                        "command_rejected",
                        callsign,
                        reason="arrival is not eligible for landing clearance",
                    )
                occupant = self.runway_occupant()
                if occupant:
                    return self._event(
                        "unsafe_clearance_blocked",
                        callsign,
                        reason="runway occupied",
                        occupant=occupant.callsign,
                    )
                aircraft.approach_cleared = True
                aircraft.landing_cleared = True
                aircraft.assigned_runway = runway
                aircraft.state = AircraftState.APPROACH
                clearances.append("landing")
                cursor += 2 if cursor + 1 < len(tokens) else 1
                continue

            if action in {"W", "LW", "LUAW"}:
                if aircraft.state is not AircraftState.HOLD_SHORT:
                    return self._event(
                        "command_rejected",
                        callsign,
                        reason="aircraft is not holding short",
                    )
                occupant = self.runway_occupant()
                final = next(
                    (
                        candidate
                        for candidate in self.aircraft.values()
                        if candidate.state is AircraftState.FINAL
                    ),
                    None,
                )
                if occupant or final:
                    return self._event(
                        "unsafe_clearance_blocked",
                        callsign,
                        reason="runway not available",
                        occupant=(occupant or final).callsign,
                    )
                aircraft.state = AircraftState.LINING_UP
                assigned_runway = aircraft.assigned_runway or self.runway.name
                aircraft.assigned_runway = assigned_runway
                aircraft.heading_deg = self.runway.heading_for(assigned_runway)
                aircraft.target_heading_deg = aircraft.heading_deg
                aircraft.speed_kt = 0
                aircraft.target_speed_kt = 0
                aircraft.ground_sequence_seconds = LINE_UP_SECONDS
                aircraft.takeoff_after_lineup = False
                clearances.append("line_up_and_wait")
                cursor += 1
                continue

            if action in {"T", "TO"}:
                if aircraft.state not in {
                    AircraftState.HOLD_SHORT,
                    AircraftState.LINING_UP,
                    AircraftState.LINE_UP,
                }:
                    return self._event(
                        "command_rejected", callsign, reason="aircraft is not runway-ready"
                    )
                if not aircraft.departure_altitude_assigned:
                    return self._event(
                        "command_rejected",
                        callsign,
                        reason="departure altitude required",
                    )
                occupant = next(
                    (
                        candidate
                        for candidate in self.aircraft.values()
                        if candidate.callsign != callsign
                        and candidate.state
                        in {
                            AircraftState.LINE_UP,
                            AircraftState.LINING_UP,
                            AircraftState.TAKEOFF_READY,
                            AircraftState.TAKEOFF_ROLL,
                            AircraftState.LANDED,
                        }
                    ),
                    None,
                )
                final = next(
                    (
                        candidate
                        for candidate in self.aircraft.values()
                        if candidate.state is AircraftState.FINAL
                    ),
                    None,
                )
                if occupant or final:
                    return self._event(
                        "unsafe_clearance_blocked",
                        callsign,
                        reason="runway not available",
                        occupant=(occupant or final).callsign,
                    )
                assigned_runway = aircraft.assigned_runway or self.runway.name
                aircraft.assigned_runway = assigned_runway
                aircraft.heading_deg = self.runway.heading_for(assigned_runway)
                aircraft.target_heading_deg = aircraft.heading_deg
                aircraft.speed_kt = 0
                aircraft.target_speed_kt = 0
                if aircraft.state is AircraftState.LINE_UP:
                    aircraft.state = AircraftState.TAKEOFF_READY
                    aircraft.ground_sequence_seconds = TAKEOFF_POWER_SECONDS
                elif aircraft.state is AircraftState.HOLD_SHORT:
                    aircraft.state = AircraftState.LINING_UP
                    aircraft.ground_sequence_seconds = LINE_UP_SECONDS
                aircraft.takeoff_after_lineup = True
                clearances.append("takeoff")
                cursor += 1
                continue

            if action in {"H", "HOLD"} and cursor + 1 < len(tokens):
                if aircraft.state in {
                    AircraftState.HOLD_SHORT,
                    AircraftState.LINING_UP,
                    AircraftState.LINE_UP,
                    AircraftState.TAKEOFF_READY,
                    AircraftState.TAKEOFF_ROLL,
                }:
                    return self._event(
                        "command_rejected", callsign, reason="ground aircraft cannot hold"
                    )
                aircraft.state = AircraftState.HOLDING
                aircraft.requested_fix = tokens[cursor + 1]
                clearances.append("hold")
                cursor += 2
                continue

            if action in {"A", "ABORT", "GA"}:
                if aircraft.kind is FlightKind.ARRIVAL and aircraft.state in {
                    AircraftState.APPROACH,
                    AircraftState.FINAL,
                }:
                    aircraft.state = AircraftState.GO_AROUND
                    aircraft.landing_cleared = False
                    aircraft.target_altitude_ft = 3_000
                    aircraft.target_heading_deg = self.runway.heading_for(
                        aircraft.assigned_runway or self.runway.name
                    )
                    clearances.append("go_around")
                    cursor += 1
                    continue
                if (
                    aircraft.kind is FlightKind.DEPARTURE
                    and aircraft.state
                    in {
                        AircraftState.LINING_UP,
                        AircraftState.LINE_UP,
                        AircraftState.TAKEOFF_READY,
                        AircraftState.TAKEOFF_ROLL,
                    }
                ):
                    aircraft.state = AircraftState.HOLD_SHORT
                    aircraft.speed_kt = 0
                    aircraft.target_speed_kt = 0
                    aircraft.ground_sequence_seconds = 0
                    aircraft.takeoff_after_lineup = False
                    clearances.append("abort_takeoff")
                    cursor += 1
                    continue
                return self._event(
                    "command_rejected", callsign, reason="nothing to abort"
                )

            return self._event(
                "command_rejected",
                callsign,
                reason=f"unknown command near: {' '.join(tokens[cursor:])}",
            )

        return self._event(
            "clearance_accepted",
            callsign,
            clearances=clearances,
        )

    def step(self, steps: int = 1) -> None:
        for _ in range(steps):
            self.tick += 1
            for aircraft in self.aircraft.values():
                self._step_aircraft(aircraft)
            self._detect_separation()

    def snapshot(self) -> tuple[tuple[object, ...], ...]:
        return tuple(
            (
                aircraft.callsign,
                aircraft.state,
                round(aircraft.x_nm, 6),
                round(aircraft.y_nm, 6),
                round(aircraft.heading_deg, 3),
                round(aircraft.altitude_ft, 1),
                round(aircraft.speed_kt, 1),
            )
            for aircraft in sorted(self.aircraft.values(), key=lambda item: item.callsign)
        )

    def _step_aircraft(self, aircraft: Aircraft) -> None:
        if aircraft.state is AircraftState.LINING_UP:
            aircraft.ground_sequence_seconds = max(
                0, aircraft.ground_sequence_seconds - self.tick_seconds
            )
            aircraft.speed_kt = 8
            if aircraft.ground_sequence_seconds == 0:
                aircraft.speed_kt = 0
                if aircraft.takeoff_after_lineup:
                    aircraft.state = AircraftState.TAKEOFF_READY
                    aircraft.ground_sequence_seconds = TAKEOFF_POWER_SECONDS
                else:
                    aircraft.state = AircraftState.LINE_UP
            return

        if aircraft.state is AircraftState.TAKEOFF_READY:
            aircraft.ground_sequence_seconds = max(
                0, aircraft.ground_sequence_seconds - self.tick_seconds
            )
            aircraft.speed_kt = 0
            if aircraft.ground_sequence_seconds == 0:
                aircraft.state = AircraftState.TAKEOFF_ROLL
                aircraft.target_speed_kt = 80
            return

        if aircraft.state in {
            AircraftState.HOLD_SHORT,
            AircraftState.LINE_UP,
            AircraftState.LANDED,
            AircraftState.HANDOFF,
        }:
            return

        aircraft.heading_deg = self._turn(
            aircraft.heading_deg,
            aircraft.target_heading_deg or aircraft.heading_deg,
            degrees=3 * self.tick_seconds,
        )
        if aircraft.state is not AircraftState.TAKEOFF_ROLL:
            aircraft.altitude_ft = self._move(
                aircraft.altitude_ft,
                aircraft.target_altitude_ft or aircraft.altitude_ft,
                amount=(1_000 if aircraft.expedite else 500)
                / 60
                * self.tick_seconds,
            )
            if aircraft.altitude_ft == aircraft.target_altitude_ft:
                aircraft.expedite = False
        aircraft.speed_kt = self._move(
            aircraft.speed_kt,
            aircraft.target_speed_kt or aircraft.speed_kt,
            amount=(
                TAKEOFF_ACCELERATION_KT_PER_SECOND
                if aircraft.state is AircraftState.TAKEOFF_ROLL
                else AIRBORNE_SPEED_CHANGE_KT_PER_SECOND
            )
            * self.tick_seconds,
        )

        distance_nm = aircraft.speed_kt / 3600 * self.tick_seconds
        heading = radians(aircraft.heading_deg)
        aircraft.x_nm += sin(heading) * distance_nm
        aircraft.y_nm += cos(heading) * distance_nm

        if aircraft.state is AircraftState.TAKEOFF_ROLL and aircraft.speed_kt >= 72:
            aircraft.state = AircraftState.DEPARTURE
            aircraft.target_altitude_ft = max(aircraft.target_altitude_ft or 0, 2_500)

    def _detect_separation(self) -> None:
        airborne = [
            aircraft
            for aircraft in self.aircraft.values()
            if aircraft.state
            not in {
                AircraftState.HOLD_SHORT,
                AircraftState.LINING_UP,
                AircraftState.LINE_UP,
                AircraftState.TAKEOFF_READY,
                AircraftState.TAKEOFF_ROLL,
                AircraftState.LANDED,
                AircraftState.HANDOFF,
            }
        ]
        for index, first in enumerate(airborne):
            for second in airborne[index + 1 :]:
                lateral = hypot(first.x_nm - second.x_nm, first.y_nm - second.y_nm)
                vertical = abs(first.altitude_ft - second.altitude_ft)
                if lateral < 3 and vertical < 1_000:
                    self._event(
                        "loss_of_separation",
                        None,
                        first=first.callsign,
                        second=second.callsign,
                        lateral_nm=round(lateral, 2),
                        vertical_ft=round(vertical),
                    )

    def _event(
        self,
        event_type: str,
        callsign: str | None,
        **detail: object,
    ) -> SimulationEvent:
        event = SimulationEvent(
            tick=self.tick,
            event_type=event_type,
            callsign=callsign,
            detail=detail,
        )
        self.events.append(event)
        return event

    @staticmethod
    def _move(current: float, target: float, amount: float) -> float:
        if abs(target - current) <= amount:
            return target
        return current + amount if target > current else current - amount

    @staticmethod
    def _turn(current: float, target: float, degrees: float) -> float:
        delta = (target - current + 540) % 360 - 180
        if abs(delta) <= degrees:
            return target % 360
        return (current + (degrees if delta > 0 else -degrees)) % 360

    @staticmethod
    def _angular_difference(first: float, second: float) -> float:
        return abs((first - second + 540) % 360 - 180)
