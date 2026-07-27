from __future__ import annotations

from dataclasses import dataclass, field
from math import cos, hypot, radians, sin

from .model import Aircraft, AircraftState, FlightKind, Runway, SimulationEvent


@dataclass(slots=True)
class Simulation:
    runway: Runway
    aircraft: dict[str, Aircraft]
    tick_seconds: float = 1.0
    tick: int = 0
    events: list[SimulationEvent] = field(default_factory=list)

    def runway_occupant(self) -> Aircraft | None:
        occupied_states = {
            AircraftState.LINE_UP,
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

        action = tokens[0]
        value = tokens[1] if len(tokens) > 1 else None

        if action in {"H", "HDG", "HEADING"} and value:
            aircraft.target_heading_deg = int(value) % 360
            return self._event(
                "clearance_accepted",
                callsign,
                clearance="heading",
                value=aircraft.target_heading_deg,
            )

        if action in {"A", "ALT", "ALTITUDE"} and value:
            aircraft.target_altitude_ft = max(self.runway.elevation_ft, int(value))
            return self._event(
                "clearance_accepted",
                callsign,
                clearance="altitude",
                value=aircraft.target_altitude_ft,
            )

        if action in {"S", "SPD", "SPEED"} and value:
            aircraft.target_speed_kt = max(60, int(value))
            return self._event(
                "clearance_accepted",
                callsign,
                clearance="speed",
                value=aircraft.target_speed_kt,
            )

        if action == "APP":
            if aircraft.kind is not FlightKind.ARRIVAL or aircraft.altitude_ft > 3_500:
                return self._event(
                    "command_rejected",
                    callsign,
                    reason="aircraft is not eligible for approach clearance",
                )
            aircraft.approach_cleared = True
            aircraft.state = AircraftState.APPROACH
            return self._event(
                "clearance_accepted",
                callsign,
                clearance="approach",
                runway=self.runway.name,
            )

        if action in {"LDG", "LAND"}:
            if not aircraft.approach_cleared:
                return self._event(
                    "command_rejected",
                    callsign,
                    reason="approach clearance required",
                )
            occupant = self.runway_occupant()
            if occupant:
                return self._event(
                    "unsafe_clearance_blocked",
                    callsign,
                    reason="runway occupied",
                    occupant=occupant.callsign,
                )
            aircraft.landing_cleared = True
            return self._event(
                "clearance_accepted",
                callsign,
                clearance="landing",
                runway=self.runway.name,
            )

        if action == "LUAW":
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
            aircraft.state = AircraftState.LINE_UP
            return self._event(
                "clearance_accepted",
                callsign,
                clearance="line_up_and_wait",
                runway=self.runway.name,
            )

        if action in {"TO", "T"}:
            if aircraft.state is not AircraftState.LINE_UP:
                return self._event(
                    "command_rejected",
                    callsign,
                    reason="line up and wait required",
                )
            final = next(
                (
                    candidate
                    for candidate in self.aircraft.values()
                    if candidate.state is AircraftState.FINAL
                ),
                None,
            )
            if final:
                return self._event(
                    "unsafe_clearance_blocked",
                    callsign,
                    reason="arrival on final",
                    occupant=final.callsign,
                )
            aircraft.state = AircraftState.TAKEOFF_ROLL
            aircraft.target_speed_kt = 80
            return self._event(
                "clearance_accepted",
                callsign,
                clearance="takeoff",
                runway=self.runway.name,
            )

        if action == "GA":
            aircraft.state = AircraftState.GO_AROUND
            aircraft.landing_cleared = False
            aircraft.target_altitude_ft = 3_000
            aircraft.target_heading_deg = self.runway.heading_deg
            return self._event(
                "clearance_accepted",
                callsign,
                clearance="go_around",
            )

        return self._event(
            "command_rejected",
            callsign,
            reason=f"unknown command: {command}",
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
        aircraft.heading_deg = self._turn(
            aircraft.heading_deg,
            aircraft.target_heading_deg or aircraft.heading_deg,
            degrees=3 * self.tick_seconds,
        )
        aircraft.altitude_ft = self._move(
            aircraft.altitude_ft,
            aircraft.target_altitude_ft or aircraft.altitude_ft,
            amount=500 / 60 * self.tick_seconds,
        )
        aircraft.speed_kt = self._move(
            aircraft.speed_kt,
            aircraft.target_speed_kt or aircraft.speed_kt,
            amount=5 * self.tick_seconds,
        )

        if aircraft.state in {
            AircraftState.HOLD_SHORT,
            AircraftState.LINE_UP,
            AircraftState.LANDED,
            AircraftState.HANDOFF,
        }:
            return

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
                AircraftState.LINE_UP,
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
