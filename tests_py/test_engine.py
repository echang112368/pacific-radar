import unittest

from simulation import Aircraft, AircraftState, FlightKind, Runway, Simulation
from simulation.engine import (
    coordinated_turn_rate_degrees_per_second,
    landing_deceleration_knots_per_second,
    takeoff_acceleration_knots_per_second,
)


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
                max_bank_deg=30,
                final_approach_speed_kt=65,
                landing_roll_ft=575,
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
                max_bank_deg=30,
                rotation_speed_kt=60,
                initial_climb_speed_kt=79,
                takeoff_ground_roll_ft=1135,
                climb_rate_fpm=667,
            ),
        },
    )


class SimulationTests(unittest.TestCase):
    def test_coordinated_turn_rate_varies_with_speed_and_bank_limit(self) -> None:
        light_at_115 = coordinated_turn_rate_degrees_per_second(115, 30)
        transport_at_190 = coordinated_turn_rate_degrees_per_second(190, 25)
        transport_at_220 = coordinated_turn_rate_degrees_per_second(220, 25)

        self.assertAlmostEqual(light_at_115, 3)
        self.assertGreater(light_at_115, transport_at_190)
        self.assertGreater(transport_at_190, transport_at_220)
        self.assertAlmostEqual(transport_at_220, 2.315, places=3)

    def test_takeoff_acceleration_is_derived_and_tapers_with_speed(self) -> None:
        departure = make_simulation().aircraft["N4382K"]
        departure.takeoff_roll_seconds = 10
        initial_acceleration = takeoff_acceleration_knots_per_second(departure)
        departure.speed_kt = 55
        later_acceleration = takeoff_acceleration_knots_per_second(departure)

        self.assertGreater(initial_acceleration, 1.5)
        self.assertLess(initial_acceleration, 3)
        self.assertLess(later_acceleration, initial_acceleration)

    def test_landing_brakes_build_gradually_and_roll_to_a_stop(self) -> None:
        simulation = make_simulation()
        arrival = simulation.aircraft["N172SP"]
        arrival.state = AircraftState.LANDING_ROLL
        arrival.altitude_ft = simulation.runway.elevation_ft
        arrival.speed_kt = arrival.final_approach_speed_kt
        arrival.target_speed_kt = 0
        initial_deceleration = landing_deceleration_knots_per_second(arrival)

        simulation.step()
        self.assertIs(arrival.state, AircraftState.LANDING_ROLL)
        self.assertGreater(arrival.speed_kt, 0)
        self.assertLess(arrival.speed_kt, arrival.final_approach_speed_kt)
        self.assertNotEqual(arrival.x_nm, 8)
        arrival.landing_roll_seconds = 3
        self.assertGreater(
            landing_deceleration_knots_per_second(arrival),
            initial_deceleration,
        )

        simulation.step(20)
        self.assertIs(arrival.state, AircraftState.LANDED)
        self.assertEqual(arrival.speed_kt, 0)

    def test_landing_requires_three_thousand_agl_and_runway_heading(self) -> None:
        simulation = make_simulation()
        simulation.aircraft["N172SP"].altitude_ft = 4_000
        event = simulation.issue("N172SP", "L 21")
        self.assertEqual(event.event_type, "command_rejected")
        simulation.aircraft["N172SP"].altitude_ft = 2_600
        event = simulation.issue("N172SP", "L 21")
        self.assertEqual(event.event_type, "clearance_accepted")
        self.assertTrue(simulation.aircraft["N172SP"].landing_cleared)

    def test_arrival_can_land_on_reciprocal_runway_end(self) -> None:
        simulation = make_simulation()
        arrival = simulation.aircraft["N172SP"]
        arrival.heading_deg = 30
        arrival.altitude_ft = 2_600
        event = simulation.issue("N172SP", "L 03")
        self.assertEqual(event.event_type, "clearance_accepted")
        self.assertEqual(arrival.assigned_runway, "03")
        self.assertTrue(arrival.landing_cleared)

    def test_line_up_is_not_takeoff_clearance(self) -> None:
        simulation = make_simulation()
        event = simulation.issue("N4382K", "W")
        self.assertEqual(event.event_type, "clearance_accepted")
        self.assertIs(
            simulation.aircraft["N4382K"].state,
            AircraftState.LINING_UP,
        )
        simulation.step(2)
        self.assertIs(
            simulation.aircraft["N4382K"].state,
            AircraftState.LINING_UP,
        )
        simulation.step()
        self.assertIs(
            simulation.aircraft["N4382K"].state,
            AircraftState.LINE_UP,
        )
        simulation.step(9)
        self.assertIs(
            simulation.aircraft["N4382K"].state,
            AircraftState.LINE_UP,
        )
        self.assertEqual(simulation.aircraft["N4382K"].speed_kt, 0)

    def test_takeoff_requires_assigned_altitude_but_not_line_up(self) -> None:
        simulation = make_simulation()
        event = simulation.issue("N4382K", "T")
        self.assertEqual(event.event_type, "command_rejected")
        simulation.issue("N4382K", "C 5")
        event = simulation.issue("N4382K", "T")
        self.assertEqual(event.event_type, "clearance_accepted")
        self.assertIs(
            simulation.aircraft["N4382K"].state,
            AircraftState.LINING_UP,
        )
        simulation.step(2)
        self.assertIs(
            simulation.aircraft["N4382K"].state,
            AircraftState.LINING_UP,
        )
        simulation.step()
        self.assertIs(
            simulation.aircraft["N4382K"].state,
            AircraftState.TAKEOFF_READY,
        )
        simulation.step()
        self.assertIs(
            simulation.aircraft["N4382K"].state,
            AircraftState.TAKEOFF_ROLL,
        )
        self.assertEqual(simulation.aircraft["N4382K"].speed_kt, 0)
        simulation.step(5)
        self.assertGreater(simulation.aircraft["N4382K"].speed_kt, 5)
        self.assertLess(simulation.aircraft["N4382K"].speed_kt, 20)
        self.assertIs(
            simulation.aircraft["N4382K"].state,
            AircraftState.TAKEOFF_ROLL,
        )
        simulation.step(30)
        self.assertIs(
            simulation.aircraft["N4382K"].state,
            AircraftState.DEPARTURE,
        )
        self.assertGreater(simulation.aircraft["N4382K"].speed_kt, 60)
        self.assertGreater(simulation.aircraft["N4382K"].altitude_ft, 177)

    def test_departure_can_take_off_from_reciprocal_runway_end(self) -> None:
        simulation = make_simulation()
        departure = simulation.aircraft["N4382K"]
        departure.assigned_runway = "03"
        simulation.issue("N4382K", "C 5")
        event = simulation.issue("N4382K", "T")
        self.assertEqual(event.event_type, "clearance_accepted")
        self.assertEqual(departure.heading_deg, 30)
        self.assertIs(departure.state, AircraftState.LINING_UP)
        simulation.step(4)
        self.assertIs(departure.state, AircraftState.TAKEOFF_ROLL)

    def test_runway_occupancy_blocks_landing_clearance(self) -> None:
        simulation = make_simulation()
        simulation.issue("N4382K", "W")
        event = simulation.issue("N172SP", "L 21")
        self.assertEqual(event.event_type, "unsafe_clearance_blocked")
        self.assertEqual(event.detail["occupant"], "N4382K")

    def test_chained_departure_clearance(self) -> None:
        simulation = make_simulation()
        event = simulation.issue("N4382K", "C 5 C FONTI T")
        departure = simulation.aircraft["N4382K"]
        self.assertEqual(event.event_type, "clearance_accepted")
        self.assertEqual(departure.target_altitude_ft, 5_000)
        self.assertEqual(departure.requested_fix, "FONTI")
        self.assertIs(departure.state, AircraftState.LINING_UP)

    def test_ground_aircraft_does_not_climb_before_takeoff(self) -> None:
        simulation = make_simulation()
        simulation.issue("N4382K", "C 5")
        simulation.step(30)
        self.assertEqual(simulation.aircraft["N4382K"].altitude_ft, 177)

    def test_ground_distance_is_linear_with_displayed_speed(self) -> None:
        slow = make_simulation()
        fast = make_simulation()
        slow.aircraft.pop("N4382K")
        fast.aircraft.pop("N4382K")
        for simulation, speed in ((slow, 100), (fast, 200)):
            arrival = simulation.aircraft["N172SP"]
            arrival.x_nm = 0
            arrival.y_nm = 0
            arrival.heading_deg = 90
            arrival.target_heading_deg = 90
            arrival.speed_kt = speed
            arrival.target_speed_kt = speed
        slow.step(60)
        fast.step(60)
        slow_distance = slow.aircraft["N172SP"].x_nm
        fast_distance = fast.aircraft["N172SP"].x_nm
        self.assertAlmostEqual(fast_distance, slow_distance * 2, places=6)

    def test_airborne_speed_changes_at_realistic_rate(self) -> None:
        simulation = make_simulation()
        arrival = simulation.aircraft["N172SP"]
        arrival.speed_kt = 100
        arrival.target_speed_kt = 100
        simulation.issue("N172SP", "S 120")
        simulation.step()
        self.assertEqual(arrival.speed_kt, 101)

    def test_replay_is_deterministic(self) -> None:
        first = make_simulation()
        second = make_simulation()
        commands = [
            ("N172SP", "C 210"),
            ("N172SP", "C 1"),
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
