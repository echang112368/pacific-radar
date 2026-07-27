import unittest

from simulation import Aircraft, AircraftState, FlightKind, Runway, Simulation


def make_simulation() -> Simulation:
    runway = Runway(
        name="21",
        reciprocal="03",
        heading_deg=210,
        length_ft=3500,
        elevation_ft=177,
    )
    return Simulation(
        runway=runway,
        aircraft={
            "N172SP": Aircraft(
                callsign="N172SP",
                kind=FlightKind.ARRIVAL,
                state=AircraftState.INBOUND,
                x_nm=8,
                y_nm=8,
                heading_deg=235,
                altitude_ft=2600,
                speed_kt=115,
            ),
            "N4382K": Aircraft(
                callsign="N4382K",
                kind=FlightKind.DEPARTURE,
                state=AircraftState.HOLD_SHORT,
                x_nm=0,
                y_nm=0,
                heading_deg=210,
                altitude_ft=177,
                speed_kt=0,
            ),
        },
    )


class SimulationTests(unittest.TestCase):
    def test_approach_is_required_before_landing_clearance(self) -> None:
        simulation = make_simulation()
        event = simulation.issue("N172SP", "LDG 21")
        self.assertEqual(event.event_type, "command_rejected")
        self.assertEqual(event.detail["reason"], "approach clearance required")

    def test_line_up_is_not_takeoff_clearance(self) -> None:
        simulation = make_simulation()
        event = simulation.issue("N4382K", "LUAW 21")
        self.assertEqual(event.event_type, "clearance_accepted")
        self.assertIs(
            simulation.aircraft["N4382K"].state,
            AircraftState.LINE_UP,
        )
        simulation.step(10)
        self.assertIs(
            simulation.aircraft["N4382K"].state,
            AircraftState.LINE_UP,
        )
        self.assertEqual(simulation.aircraft["N4382K"].speed_kt, 0)

    def test_takeoff_requires_line_up(self) -> None:
        simulation = make_simulation()
        event = simulation.issue("N4382K", "TO 21")
        self.assertEqual(event.event_type, "command_rejected")

    def test_runway_occupancy_blocks_landing_clearance(self) -> None:
        simulation = make_simulation()
        simulation.issue("N4382K", "LUAW 21")
        simulation.issue("N172SP", "APP RNAV21")
        event = simulation.issue("N172SP", "LDG 21")
        self.assertEqual(event.event_type, "unsafe_clearance_blocked")
        self.assertEqual(event.detail["occupant"], "N4382K")

    def test_replay_is_deterministic(self) -> None:
        first = make_simulation()
        second = make_simulation()
        commands = [
            ("N172SP", "H 210"),
            ("N172SP", "A 1400"),
            ("N172SP", "S 100"),
        ]
        for callsign, command in commands:
            first.issue(callsign, command)
            second.issue(callsign, command)
        first.step(120)
        second.step(120)
        self.assertEqual(first.snapshot(), second.snapshot())


if __name__ == "__main__":
    unittest.main()
