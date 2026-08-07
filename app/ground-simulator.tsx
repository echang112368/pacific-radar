"use client";

import Link from "next/link";
import { FormEvent, useEffect, useMemo, useRef, useState } from "react";
import {
  KSMO_GROUND_CHART,
  groundChartScreenPosition,
} from "../lib/ground-chart";
import {
  GROUND_AIRCRAFT,
  GROUND_EDGES,
  GROUND_NODES,
  GroundAircraftType,
  GroundPoint,
  KSMO_GROUND,
  PARKING_GROUP_LABELS,
  ParkingGroup,
  distanceBetween,
  groundHeading,
  nodesForParkingGroup,
  projectKsmoGroundPoint,
  shortestGroundRoute,
} from "../lib/ksmo-ground";
import {
  MAX_SIMULATOR_COMMAND_LENGTH,
  sanitizeSimulatorCommand,
} from "../lib/user-input";

type GroundStatus =
  | "PARKED"
  | "STARTING"
  | "READY"
  | "TAXIING"
  | "POSITION_HOLD"
  | "RUN_UP"
  | "HOLD_SHORT"
  | "LINING_UP"
  | "LINE_UP"
  | "TAKEOFF_ROLL"
  | "ARRIVAL_ROLL"
  | "AWAITING_TAXI";

type GroundFlightKind = "arrival" | "departure";

type RoutePoint = GroundPoint & {
  nodeId?: string;
  speedKnots?: number;
};

type GroundFlight = GroundPoint & {
  callsign: string;
  type: GroundAircraftType;
  kind: GroundFlightKind;
  status: GroundStatus;
  priorStatus?: GroundStatus;
  heading: number;
  speed: number;
  currentNode?: string;
  parkingNode?: string;
  destinationNode?: string;
  arrivalRunway?: "21";
  plannedExit?: "B2" | "B3";
  plannedStandId?: string;
  route: RoutePoint[];
  routeIndex: number;
  timerTicks: number;
  createdTick: number;
  completed?: boolean;
};

type GroundEvent = {
  tick: number;
  tone: "system" | "pilot" | "warning" | "success";
  message: string;
};

type ArrivalPreview = {
  callsign: string;
  type: GroundAircraftType;
  runway: "21";
  plannedExit: "B2" | "B3";
  plannedStandId: string;
  dueTick: number;
};

type GroundFailure = {
  reason: "collision" | "safety_limit";
  detail: string;
};

type GroundWorld = {
  tick: number;
  score: number;
  parkedArrivals: number;
  safeDepartures: number;
  safetyStrikes: number;
  aircraft: GroundFlight[];
  events: GroundEvent[];
  nextArrival: ArrivalPreview;
  nextDepartureTick: number;
  arrivalSequence: number;
  departureSequence: number;
  activeConflictKeys: string[];
  failure?: GroundFailure;
};

const TICKS_PER_SECOND = 4;
const RUNWAY_MAP_LENGTH = distanceBetween(
  KSMO_GROUND.runway.threshold03,
  KSMO_GROUND.runway.threshold21,
);
const SURFACE_PROJECTION_SCALE = RUNWAY_MAP_LENGTH / 52;
const FEET_PER_MAP_PERCENT = KSMO_GROUND.runway.lengthFeet / RUNWAY_MAP_LENGTH;
const SIMULATION_SPEEDS = [1, 1.5, 2, 3, 4] as const;
const MAX_CATCH_UP_TICKS = TICKS_PER_SECOND * 60;
const ARRIVAL_RUNWAY_BUFFER_SECONDS = 30;
const COLLISION_DISTANCE_PERCENT = 0.38 * SURFACE_PROJECTION_SCALE;
const CONFLICT_DISTANCE_PERCENT = 1.15 * SURFACE_PROJECTION_SCALE;
const RUNWAY_QUEUE_SPACING_PERCENT = 1.8 * SURFACE_PROJECTION_SCALE;
const PARKING_POINTS = 100;
const DEPARTURE_POINTS = 125;
const SAFETY_PENALTY = 75;

const STATUS_LABELS: Record<GroundStatus, string> = {
  PARKED: "At parking",
  STARTING: "Engine start",
  READY: "Ready to taxi",
  TAXIING: "Taxiing",
  POSITION_HOLD: "Holding position",
  RUN_UP: "Run-up",
  HOLD_SHORT: "Holding short",
  LINING_UP: "Entering runway",
  LINE_UP: "Lined up",
  TAKEOFF_ROLL: "Takeoff roll",
  ARRIVAL_ROLL: "Landing rollout",
  AWAITING_TAXI: "With ground",
};

const TAXIWAY_PATHS: Record<"A" | "B", GroundPoint[]> = {
  A: ["A1", "A2", "A3", "A4", "A5"].map((id) => GROUND_NODES[id]),
  B: ["B1", "B2", "B3", "B4", "B5"].map((id) => GROUND_NODES[id]),
};

const KSMO_RUNWAY_CONNECTORS = [
  ["A1", 24.6], ["A2", 31.0], ["A3", 43.4], ["A4", 62.2], ["A5", 77.2],
  ["B1", 24.7], ["B2", 31.3], ["B3", 43.7], ["B4", 62.6], ["B5", 78.0],
] as const;

const PARKING_STAND_IDS = Object.values(GROUND_NODES)
  .filter((node) => node.kind === "parking")
  .map((node) => node.id);

function projectSurfaceShape(points: readonly GroundPoint[]) {
  return points.map((point) => projectKsmoGroundPoint(point));
}

function surfaceShapePoints(points: readonly GroundPoint[]) {
  return projectSurfaceShape(points).map((point) => `${point.x},${point.y}`).join(" ");
}

const KSMO_AIRPORT_BOUNDARY = surfaceShapePoints([
  { x: 15, y: 39 }, { x: 85, y: 38 }, { x: 92, y: 45 }, { x: 94, y: 67 },
  { x: 86, y: 75 }, { x: 15, y: 76 }, { x: 9, y: 68 }, { x: 10, y: 49 },
]);

const KSMO_APRONS = [
  [{ x: 17, y: 43 }, { x: 84, y: 41.5 }, { x: 90, y: 47 }, { x: 88, y: 54.5 }, { x: 18, y: 55 }, { x: 13, y: 50 }],
  [{ x: 16, y: 59 }, { x: 88, y: 58 }, { x: 91, y: 65 }, { x: 85, y: 72 }, { x: 16, y: 74 }, { x: 10, y: 68 }],
] as const;

const KSMO_BUILDINGS = [
  // Atlantic Aviation and its north-flight-line hangars.
  [{ x: 31, y: 40 }, { x: 38.5, y: 40 }, { x: 38.5, y: 42.3 }, { x: 31, y: 42.3 }],
  [{ x: 39.2, y: 39 }, { x: 47.7, y: 39 }, { x: 47.7, y: 42 }, { x: 39.2, y: 42 }],
  [{ x: 34, y: 42.8 }, { x: 43.5, y: 42.8 }, { x: 43.5, y: 44.7 }, { x: 34, y: 44.7 }],
  // Northeast hangar and parking rows.
  [{ x: 57.5, y: 39 }, { x: 63.5, y: 39 }, { x: 63.5, y: 42.4 }, { x: 57.5, y: 42.4 }],
  [{ x: 64.5, y: 38.5 }, { x: 70.5, y: 38.5 }, { x: 70.5, y: 42.2 }, { x: 64.5, y: 42.2 }],
  [{ x: 71.5, y: 38.8 }, { x: 78.5, y: 38.8 }, { x: 78.5, y: 42.5 }, { x: 71.5, y: 42.5 }],
  // South hangars, large hangar, and Airport Administration.
  [{ x: 39, y: 69 }, { x: 42.5, y: 69 }, { x: 42.5, y: 73 }, { x: 39, y: 73 }],
  [{ x: 43.5, y: 68.3 }, { x: 47, y: 68.3 }, { x: 47, y: 72.7 }, { x: 43.5, y: 72.7 }],
  [{ x: 53.5, y: 67 }, { x: 65.5, y: 67 }, { x: 65.5, y: 74.2 }, { x: 53.5, y: 74.2 }],
  [{ x: 68.5, y: 64 }, { x: 75.5, y: 64 }, { x: 75.5, y: 68 }, { x: 72.5, y: 68 }, { x: 72.5, y: 70 }, { x: 68.5, y: 70 }],
] as const;

const KSMO_PERIMETER_ROADS = [
  [{ x: 12, y: 35 }, { x: 94, y: 35 }],
  [{ x: 13, y: 78 }, { x: 92, y: 78 }],
  [{ x: 8, y: 39 }, { x: 9, y: 75 }],
  [{ x: 96, y: 39 }, { x: 97, y: 74 }],
] as const;

function runwayRoutePoint(horizontalX: number, speedKnots: number): RoutePoint {
  return {
    ...projectKsmoGroundPoint({ x: horizontalX, y: 56.7 }),
    speedKnots,
  };
}

const RUNWAY_21_TAKEOFF_ROUTE: RoutePoint[] = [
  runwayRoutePoint(76.8, 18),
  runwayRoutePoint(67.0, 45),
  runwayRoutePoint(57.0, 70),
  runwayRoutePoint(47.0, 95),
  runwayRoutePoint(36.0, 110),
  runwayRoutePoint(23.2, 120),
];

const SURFACE_LABELS = [
  { text: "ATLANTIC FBO", ...projectKsmoGroundPoint({ x: 35.5, y: 43.7 }) },
  { text: "NORTHEAST / JSX", ...projectKsmoGroundPoint({ x: 68.5, y: 40.7 }) },
  { text: "TRANSIENT", ...projectKsmoGroundPoint({ x: 79.2, y: 68.6 }) },
  { text: "SOUTH HANGARS", ...projectKsmoGroundPoint({ x: 42.0, y: 75.0 }) },
  { text: "HANGAR", ...projectKsmoGroundPoint({ x: 56.5, y: 75.0 }) },
  { text: "AIRPORT ADMIN", ...projectKsmoGroundPoint({ x: 68.4, y: 72.0 }) },
  { text: "TWR", ...projectKsmoGroundPoint({ x: 55.5, y: 45.3 }) },
  { text: "H1", ...projectKsmoGroundPoint({ x: 61.0, y: 66.2 }) },
  { text: "FIELD ELEV 127", ...projectKsmoGroundPoint({ x: 15.8, y: 66.2 }) },
  { text: "FIELD ELEV 170", ...projectKsmoGroundPoint({ x: 80.0, y: 48.5 }) },
] as const;

const ARRIVAL_TYPES: GroundAircraftType[] = [
  "AT46",
  "C172",
  "PC12",
  "PA28",
  "DA42",
  "C25A",
];

const DEPARTURE_TYPES: GroundAircraftType[] = [
  "C172",
  "PA28",
  "PC12",
  "DA42",
  "C25A",
  "AT46",
];

const GROUND_COMMANDS = [
  ["N172SM START", "Approve engine start. Turbine starts retain the published one-minute advisory interval."],
  ["N172SM TAXI RWY 21 VIA A", "Taxi a departure to the Runway 21 hold line using Taxiway A."],
  ["N172SM RUNUP", "Complete a propeller-aircraft run-up at A2/A5/B2/B5."],
  ["N172SM HOLD", "Stop at the present position without deleting the remaining route."],
  ["N172SM CONTINUE", "Resume the previously cleared surface route."],
  ["N172SM LINEUP RWY 21", "Enter Runway 21 and line up when the runway and arrival window are clear."],
  ["N172SM TAKEOFF RWY 21", "Release the lined-up departure. The player controls this takeoff decision."],
  ["N520SM TAXI FBO1 VIA B", "Assign an arrival specifically to Atlantic stand FBO1."],
  ["N520SM TAXI TR3", "Assign an eligible piston aircraft specifically to transient stand TR3."],
  ["JSX501 TAXI JSX2", "Assign the ATR 42-600 specifically to JSX apron stand JSX2."],
  ["HELP · PAUSE · STATS · EXIT", "Open the guide, freeze traffic, view performance, or finish the shift."],
] as const;

function appendEvent(
  world: GroundWorld,
  tone: GroundEvent["tone"],
  message: string,
) {
  return {
    ...world,
    events: [...world.events, { tick: world.tick, tone, message }].slice(-40),
  };
}

function flightAtParking(
  callsign: string,
  type: GroundAircraftType,
  parkingNode: string,
  createdTick = 0,
): GroundFlight {
  const stand = GROUND_NODES[parkingNode];
  return {
    callsign,
    type,
    kind: "departure",
    status: "PARKED",
    x: stand.x,
    y: stand.y,
    heading: 210,
    speed: 0,
    currentNode: parkingNode,
    parkingNode,
    route: [],
    routeIndex: 0,
    timerTicks: 0,
    createdTick,
  };
}

function arrivalCallsign(sequence: number, type: GroundAircraftType) {
  if (type === "AT46") return `JSX${501 + sequence * 2}`;
  return `N${520 + sequence * 37}SM`;
}

function departureCallsign(sequence: number, type: GroundAircraftType) {
  if (type === "AT46") return `JSX${620 + sequence * 2}`;
  return `N${300 + sequence * 41}${type === "PC12" ? "PC" : "SM"}`;
}

function makeArrivalPreview(
  sequence: number,
  dueTick: number,
  world?: GroundWorld,
): ArrivalPreview {
  const type = ARRIVAL_TYPES[sequence % ARRIVAL_TYPES.length];
  const performance = GROUND_AIRCRAFT[type];
  const compatibleStands = performance.allowedParking.flatMap((group) => nodesForParkingGroup(group));
  const plannedStand = world
    ? firstOpenStand(world, performance.allowedParking, true) ?? compatibleStands[sequence % compatibleStands.length]
    : compatibleStands[sequence % compatibleStands.length];
  if (!plannedStand) throw new Error(`No parking stand configured for ${type}.`);
  return {
    callsign: arrivalCallsign(sequence, type),
    type,
    runway: "21",
    plannedExit: performance.arrivalExit,
    plannedStandId: plannedStand.id,
    dueTick,
  };
}

function initialGroundWorld(): GroundWorld {
  return {
    tick: 0,
    score: 0,
    parkedArrivals: 0,
    safeDepartures: 0,
    safetyStrikes: 0,
    aircraft: [
      flightAtParking("N172SM", "C172", "FBO1"),
      flightAtParking("N814PC", "PC12", "FBO2"),
    ],
    events: [
      {
        tick: 0,
        tone: "system",
        message: "SMO GROUND 121.9 · Runway 21 active · Taxiways Alpha and Bravo open.",
      },
      {
        tick: 0,
        tone: "system",
        message: "JSX501 inbound Runway 21, planned exit B2, parking JSX1. Tower owns the landing; keep the runway protected.",
      },
    ],
    nextArrival: makeArrivalPreview(0, 52 * TICKS_PER_SECOND),
    nextDepartureTick: 72 * TICKS_PER_SECOND,
    arrivalSequence: 0,
    departureSequence: 0,
    activeConflictKeys: [],
  };
}

function secondsUntilArrival(world: GroundWorld) {
  return Math.max(0, Math.ceil((world.nextArrival.dueTick - world.tick) / TICKS_PER_SECOND));
}

function formatCountdown(seconds: number) {
  const minutes = Math.floor(seconds / 60);
  const remainder = seconds % 60;
  return `${String(minutes).padStart(2, "0")}:${String(remainder).padStart(2, "0")}`;
}

function runwayOccupied(world: GroundWorld, exceptCallsign?: string) {
  return world.aircraft.some(
    (flight) =>
      !flight.completed &&
      flight.callsign !== exceptCallsign &&
      ["LINING_UP", "LINE_UP", "TAKEOFF_ROLL", "ARRIVAL_ROLL"].includes(
        flight.status,
      ),
  );
}

function arrivalRollRoute(type: GroundAircraftType): RoutePoint[] {
  const performance = GROUND_AIRCRAFT[type];
  if (performance.arrivalExit === "B2") {
    return [
      { ...KSMO_GROUND.runway.threshold21, speedKnots: performance.landingSpeedKnots },
      runwayRoutePoint(65.0, Math.max(52, performance.landingSpeedKnots * 0.7)),
      runwayRoutePoint(50.0, 32),
      runwayRoutePoint(34.0, 18),
      { ...GROUND_NODES.B2, nodeId: "B2", speedKnots: performance.taxiKnots },
    ];
  }
  return [
    { ...KSMO_GROUND.runway.threshold21, speedKnots: performance.landingSpeedKnots },
    runwayRoutePoint(64.0, Math.max(42, performance.landingSpeedKnots * 0.72)),
    runwayRoutePoint(47.0, 24),
    { ...GROUND_NODES.B3, nodeId: "B3", speedKnots: performance.taxiKnots },
  ];
}

function spawnArrival(world: GroundWorld) {
  const preview = world.nextArrival;
  const performance = GROUND_AIRCRAFT[preview.type];
  const spawnPoint = projectKsmoGroundPoint({ x: 85.2, y: 56.7 });
  const flight: GroundFlight = {
    callsign: preview.callsign,
    type: preview.type,
    kind: "arrival",
    status: "ARRIVAL_ROLL",
    x: spawnPoint.x,
    y: spawnPoint.y,
    heading: groundHeading(spawnPoint, KSMO_GROUND.runway.threshold21),
    speed: performance.landingSpeedKnots,
    route: arrivalRollRoute(preview.type),
    routeIndex: 0,
    timerTicks: 0,
    createdTick: world.tick,
    arrivalRunway: preview.runway,
    plannedExit: preview.plannedExit,
    plannedStandId: preview.plannedStandId,
  };
  const nextSequence = world.arrivalSequence + 1;
  const intervalSeconds = 78 + (nextSequence % 4) * 9;
  const spawnedWorld = {
    ...world,
    aircraft: [...world.aircraft, flight],
    arrivalSequence: nextSequence,
  };
  return appendEvent(
    {
      ...spawnedWorld,
      nextArrival: makeArrivalPreview(
        nextSequence,
        world.tick + intervalSeconds * TICKS_PER_SECOND,
        spawnedWorld,
      ),
    },
    "system",
    `${flight.callsign} touchdown Runway 21 · planned exit ${flight.plannedExit} · parking ${flight.plannedStandId} · Tower-controlled rollout in progress.`,
  );
}

function occupiedParkingNodes(world: GroundWorld) {
  return new Set(
    world.aircraft.flatMap((flight) => {
      const occupiedCurrentStand =
        flight.currentNode && GROUND_NODES[flight.currentNode]?.kind === "parking"
          ? flight.currentNode
          : undefined;
      return [flight.parkingNode, flight.destinationNode, occupiedCurrentStand].filter(
        (value): value is string => Boolean(value),
      );
    }),
  );
}

function reservedParkingNodes(world: GroundWorld) {
  const reserved = occupiedParkingNodes(world);
  for (const flight of world.aircraft) {
    if (flight.kind === "arrival" && flight.plannedStandId) reserved.add(flight.plannedStandId);
  }
  reserved.add(world.nextArrival.plannedStandId);
  return reserved;
}

function firstOpenStand(
  world: GroundWorld,
  groups: readonly ParkingGroup[],
  includeReservations = false,
) {
  const occupied = includeReservations
    ? reservedParkingNodes(world)
    : occupiedParkingNodes(world);
  return groups
    .flatMap((group) => nodesForParkingGroup(group))
    .find((node) => !occupied.has(node.id));
}

function spawnDeparture(world: GroundWorld) {
  const type = DEPARTURE_TYPES[world.departureSequence % DEPARTURE_TYPES.length];
  const performance = GROUND_AIRCRAFT[type];
  const stand = firstOpenStand(world, performance.allowedParking, true);
  const nextDepartureTick =
    world.tick + (76 + (world.departureSequence % 5) * 8) * TICKS_PER_SECOND;
  if (!stand) {
    return appendEvent(
      { ...world, nextDepartureTick: world.tick + 30 * TICKS_PER_SECOND },
      "warning",
      "No compatible parking position is open; the next departure remains off-scope.",
    );
  }
  const callsign = departureCallsign(world.departureSequence, type);
  return appendEvent(
    {
      ...world,
      aircraft: [
        ...world.aircraft,
        flightAtParking(callsign, type, stand.id, world.tick),
      ],
      departureSequence: world.departureSequence + 1,
      nextDepartureTick,
    },
    "system",
    `${callsign} · ${type} at ${stand.label} · requests engine start for departure.`,
  );
}

function moveToward(current: number, target: number, amount: number) {
  if (Math.abs(target - current) <= amount) return target;
  return current + Math.sign(target - current) * amount;
}

function targetSpeedFor(flight: GroundFlight, point: RoutePoint) {
  if (point.speedKnots !== undefined) return point.speedKnots;
  const performance = GROUND_AIRCRAFT[flight.type];
  if (point.nodeId && GROUND_NODES[point.nodeId]?.taxiway === "RAMP") {
    return performance.rampKnots;
  }
  if (flight.status === "LINING_UP") return 8;
  if (flight.status === "TAKEOFF_ROLL") return performance.takeoffSpeedKnots + 18;
  return performance.taxiKnots;
}

function moveAlongRoute(flight: GroundFlight) {
  const next = { ...flight };
  const point = next.route[next.routeIndex];
  if (!point) return { flight: next, routeComplete: true };
  const acceleration = next.status === "TAKEOFF_ROLL" ? 4.2 : 7;
  next.speed = moveToward(
    next.speed,
    targetSpeedFor(next, point),
    acceleration / TICKS_PER_SECOND,
  );
  let distanceBudget =
    (Math.max(2, next.speed) * 1.68781) /
    FEET_PER_MAP_PERCENT /
    TICKS_PER_SECOND;

  while (distanceBudget > 0 && next.routeIndex < next.route.length) {
    const target = next.route[next.routeIndex];
    const remaining = distanceBetween(next, target);
    next.heading = groundHeading(next, target);
    if (remaining <= distanceBudget) {
      next.x = target.x;
      next.y = target.y;
      if (target.nodeId) next.currentNode = target.nodeId;
      next.routeIndex += 1;
      distanceBudget -= remaining;
      continue;
    }
    const ratio = distanceBudget / remaining;
    next.x += (target.x - next.x) * ratio;
    next.y += (target.y - next.y) * ratio;
    distanceBudget = 0;
  }
  return { flight: next, routeComplete: next.routeIndex >= next.route.length };
}

function stepFlight(flight: GroundFlight, tick: number) {
  const next = { ...flight };
  if (next.status === "STARTING" || next.status === "RUN_UP") {
    next.timerTicks = Math.max(0, next.timerTicks - 1);
    if (next.timerTicks === 0) {
      const finishedRunUp = next.status === "RUN_UP";
      next.status = finishedRunUp ? "HOLD_SHORT" : "READY";
      return {
        flight: next,
        event: `${next.callsign}: ${finishedRunUp ? "run-up complete, holding short Runway 21" : "engine start complete, ready to taxi"}.`,
      };
    }
    return { flight: next };
  }

  if (
    !["TAXIING", "LINING_UP", "TAKEOFF_ROLL", "ARRIVAL_ROLL"].includes(
      next.status,
    )
  ) {
    return { flight: next };
  }

  const movement = moveAlongRoute(next);
  if (!movement.routeComplete) return { flight: movement.flight };
  const moved = movement.flight;
  moved.speed = 0;

  if (moved.status === "ARRIVAL_ROLL") {
    moved.status = "AWAITING_TAXI";
    moved.currentNode = moved.plannedExit ?? GROUND_AIRCRAFT[moved.type].arrivalExit;
    return {
      flight: moved,
      event: `${moved.callsign}: clear of Runway 21 at ${moved.currentNode}, with Ground.`,
    };
  }
  if (moved.status === "LINING_UP") {
    moved.status = "LINE_UP";
    return {
      flight: moved,
      event: `${moved.callsign}: Runway 21, lined up and waiting.`,
    };
  }
  if (moved.status === "TAKEOFF_ROLL") {
    moved.completed = true;
    return {
      flight: moved,
      event: `${moved.callsign}: airborne Runway 21 · contact Santa Monica Tower.`,
      scoreDelta: DEPARTURE_POINTS,
      completedDeparture: true,
    };
  }
  if (moved.destinationNode?.startsWith("RWY21:")) {
    moved.status = "HOLD_SHORT";
    return {
      flight: moved,
      event: `${moved.callsign}: holding short Runway 21 at ${moved.currentNode}.`,
    };
  }
  const parkedAt = moved.destinationNode;
  moved.completed = true;
  return {
    flight: moved,
    event: `${moved.callsign}: parked at ${parkedAt ? GROUND_NODES[parkedAt].label : "assigned parking"}, shutdown complete · off scope.`,
    scoreDelta: PARKING_POINTS,
    completedArrival: moved.kind === "arrival",
    tick,
  };
}

function runwayQueuePoint(taxiway: "A" | "B", x: number): GroundPoint {
  const path = TAXIWAY_PATHS[taxiway];
  const start = path[path.length - 2];
  const end = path[path.length - 1];
  const ratio = Math.max(0, Math.min(1, (x - start.x) / (end.x - start.x)));
  return {
    x,
    y: start.y + (end.y - start.y) * ratio,
  };
}

function applyRunwayQueues(flights: GroundFlight[]) {
  const next = flights.map((flight) => ({
    ...flight,
    route: [...flight.route],
  }));
  for (const taxiway of ["A", "B"] as const) {
    const destinationNode = `RWY21:${taxiway}`;
    const holdNodeId = taxiway === "A" ? "A5" : "B5";
    const approachNodeId = taxiway === "A" ? "A4" : "B4";
    const holdNode = GROUND_NODES[holdNodeId];
    const queue = next
      .filter((flight) =>
        flight.kind === "departure" &&
        flight.destinationNode === destinationNode &&
        ["TAXIING", "HOLD_SHORT", "POSITION_HOLD", "RUN_UP"].includes(flight.status) &&
        (flight.currentNode === approachNodeId || flight.currentNode === holdNodeId),
      )
      .sort((first, second) => {
        const distanceDifference = distanceBetween(first, holdNode) - distanceBetween(second, holdNode);
        return Math.abs(distanceDifference) > 0.05
          ? distanceDifference
          : first.createdTick - second.createdTick;
      });

    queue.forEach((flight, index) => {
      const desiredX = holdNode.x - index * RUNWAY_QUEUE_SPACING_PERCENT;
      const desiredPoint = runwayQueuePoint(taxiway, desiredX);
      const distanceToSlot = distanceBetween(flight, desiredPoint);
      if (flight.status === "POSITION_HOLD" || flight.status === "RUN_UP") return;

      if (distanceToSlot <= 0.08) {
        flight.x = desiredPoint.x;
        flight.y = desiredPoint.y;
        flight.speed = 0;
        flight.status = "HOLD_SHORT";
        flight.route = [];
        flight.routeIndex = 0;
        return;
      }

      if (index > 0 || flight.x > desiredPoint.x || flight.status === "HOLD_SHORT") {
        flight.status = "TAXIING";
        flight.route = [{
          ...desiredPoint,
          nodeId: index === 0 ? holdNodeId : undefined,
          speedKnots: Math.min(6, GROUND_AIRCRAFT[flight.type].taxiKnots),
        }];
        flight.routeIndex = 0;
        if (flight.x > desiredPoint.x) {
          flight.x = desiredPoint.x;
          flight.y = desiredPoint.y;
          flight.speed = 0;
        }
      }
    });
  }
  return next;
}

function addSafetyStrike(world: GroundWorld, detail: string) {
  const safetyStrikes = world.safetyStrikes + 1;
  return appendEvent(
    {
      ...world,
      safetyStrikes,
      score: Math.max(0, world.score - SAFETY_PENALTY),
      failure:
        safetyStrikes >= 3
          ? { reason: "safety_limit", detail }
          : world.failure,
    },
    "warning",
    `${detail} · Safety strike ${safetyStrikes}/3.`,
  );
}

function detectSurfaceConflicts(world: GroundWorld) {
  const movingStatuses: GroundStatus[] = [
    "TAXIING",
    "LINING_UP",
    "TAKEOFF_ROLL",
    "ARRIVAL_ROLL",
  ];
  const active = world.aircraft.filter((flight) => !flight.completed);
  const conflictKeys: string[] = [];
  let next = world;
  for (let firstIndex = 0; firstIndex < active.length; firstIndex += 1) {
    for (let secondIndex = firstIndex + 1; secondIndex < active.length; secondIndex += 1) {
      const first = active[firstIndex];
      const second = active[secondIndex];
      if (!movingStatuses.includes(first.status) && !movingStatuses.includes(second.status)) continue;
      const separation = distanceBetween(first, second);
      const key = [first.callsign, second.callsign].sort().join(":");
      if (separation < CONFLICT_DISTANCE_PERCENT) conflictKeys.push(key);
      if (separation < COLLISION_DISTANCE_PERCENT && !next.failure) {
        next = {
          ...next,
          failure: {
            reason: "collision",
            detail: `${first.callsign} and ${second.callsign} collided on the movement area.`,
          },
        };
      } else if (
        separation < CONFLICT_DISTANCE_PERCENT &&
        !world.activeConflictKeys.includes(key)
      ) {
        next = addSafetyStrike(
          next,
          `Surface conflict between ${first.callsign} and ${second.callsign}`,
        );
      }
    }
  }
  return { ...next, activeConflictKeys: conflictKeys };
}

function advanceGroundWorldOnce(previous: GroundWorld) {
  if (previous.failure) return previous;
  let world: GroundWorld = { ...previous, tick: previous.tick + 1 };

  if (world.tick >= world.nextArrival.dueTick) {
    if (runwayOccupied(world)) {
      world = addSafetyStrike(
        {
          ...world,
          nextArrival: {
            ...world.nextArrival,
            dueTick: world.tick + 32 * TICKS_PER_SECOND,
          },
        },
        `${world.nextArrival.callsign} sent around by Tower because Runway 21 was occupied`,
      );
    } else {
      world = spawnArrival(world);
    }
  }

  if (world.tick >= world.nextDepartureTick) {
    world = spawnDeparture(world);
  }

  const events: string[] = [];
  let scoreDelta = 0;
  let parkedArrivals = world.parkedArrivals;
  let safeDepartures = world.safeDepartures;
  const aircraft = world.aircraft.map((flight) => {
    const result = stepFlight(flight, world.tick);
    if (result.event) events.push(result.event);
    scoreDelta += result.scoreDelta ?? 0;
    if (result.completedArrival) parkedArrivals += 1;
    if (result.completedDeparture) safeDepartures += 1;
    return result.flight;
  });
  world = {
    ...world,
    aircraft: applyRunwayQueues(aircraft.filter((flight) => !flight.completed)),
    score: world.score + scoreDelta,
    parkedArrivals,
    safeDepartures,
  };
  for (const event of events) {
    world = appendEvent(
      world,
      event.includes("off scope") || event.includes("airborne") ? "success" : "pilot",
      event,
    );
  }
  return detectSurfaceConflicts(world);
}

function advanceGroundWorld(world: GroundWorld, ticks: number) {
  let next = world;
  for (let index = 0; index < ticks; index += 1) {
    next = advanceGroundWorldOnce(next);
    if (next.failure) break;
  }
  return next;
}

function routePointsFromNodeIds(ids: string[]) {
  return ids.slice(1).map((id) => ({ ...GROUND_NODES[id], nodeId: id }));
}

function requestedTaxiway(tokens: string[]) {
  const viaIndex = tokens.findIndex((token) => token === "VIA");
  const value = viaIndex >= 0 ? tokens[viaIndex + 1] : undefined;
  return value === "A" || value === "ALPHA"
    ? "A"
    : value === "B" || value === "BRAVO"
      ? "B"
      : undefined;
}

function normalizeParkingGroup(token: string): ParkingGroup | null {
  if (["FBO", "ATLANTIC"].includes(token)) return "FBO";
  if (["TRANSIENT", "PARKING"].includes(token)) return "TRANSIENT";
  if (["NE", "NORTHEAST"].includes(token)) return "NORTHEAST";
  if (["HANGAR", "HANGARS"].includes(token)) return "HANGAR";
  if (["JSX", "TERMINAL"].includes(token)) return "JSX";
  return null;
}

function issueGroundCommand(previous: GroundWorld, rawCommand: string) {
  const command = rawCommand.toUpperCase().replaceAll(",", " ").trim();
  const tokens = command.split(/\s+/);
  const flightIndex = previous.aircraft.findIndex(
    (flight) => flight.callsign === tokens[0],
  );
  if (flightIndex < 0) {
    return appendEvent(previous, "warning", `${tokens[0] || "Unknown flight"}: not on Ground frequency.`);
  }
  const flight = { ...previous.aircraft[flightIndex] };
  const action = tokens[1];
  const aircraft = [...previous.aircraft];
  const accept = (updated: GroundFlight, readback: string) => {
    aircraft[flightIndex] = updated;
    return appendEvent(
      { ...previous, aircraft },
      "pilot",
      `${updated.callsign}: ${readback}.`,
    );
  };
  const reject = (message: string) => appendEvent(previous, "warning", message);

  if (["START", "SU", "STARTUP"].includes(action)) {
    if (flight.kind !== "departure" || flight.status !== "PARKED") {
      return reject(`${flight.callsign}: unable engine start from ${STATUS_LABELS[flight.status].toLowerCase()}.`);
    }
    flight.status = "STARTING";
    flight.timerTicks = GROUND_AIRCRAFT[flight.type].engineStartSeconds * TICKS_PER_SECOND;
    return accept(
      flight,
      `engine start approved, advise ready in ${GROUND_AIRCRAFT[flight.type].engineStartSeconds} seconds`,
    );
  }

  if (["HOLD", "STOP"].includes(action)) {
    if (!["TAXIING", "LINING_UP"].includes(flight.status)) {
      return reject(`${flight.callsign}: already ${STATUS_LABELS[flight.status].toLowerCase()}.`);
    }
    flight.priorStatus = flight.status;
    flight.status = "POSITION_HOLD";
    flight.speed = 0;
    return accept(flight, "hold position");
  }

  if (["CONTINUE", "RESUME", "PROCEED"].includes(action)) {
    if (flight.status !== "POSITION_HOLD") {
      return reject(`${flight.callsign}: no held taxi clearance to resume.`);
    }
    flight.status = flight.priorStatus === "LINING_UP" ? "LINING_UP" : "TAXIING";
    flight.priorStatus = undefined;
    return accept(flight, "continue taxi");
  }

  if (["RUNUP", "RUN-UP"].includes(action)) {
    if (flight.status !== "HOLD_SHORT" || GROUND_AIRCRAFT[flight.type].category === "jet" || flight.type === "AT46") {
      return reject(`${flight.callsign}: run-up unavailable from present position or aircraft type.`);
    }
    flight.status = "RUN_UP";
    flight.timerTicks = 30 * TICKS_PER_SECOND;
    return accept(flight, `run-up approved at ${flight.currentNode ?? "published area"}`);
  }

  if (["TX", "TAXI"].includes(action)) {
    if (!flight.currentNode) return reject(`${flight.callsign}: surface position is unresolved.`);
    const via = requestedTaxiway(tokens);
    const destinationToken = tokens[2];
    if (["RWY", "RUNWAY"].includes(destinationToken)) {
      if (flight.kind !== "departure" || flight.status !== "READY") {
        return reject(`${flight.callsign}: engine start must be complete before taxi.`);
      }
      const runway = tokens[3] === "21" || tokens[3] === "03" ? tokens[3] : "21";
      if (runway !== KSMO_GROUND.activeRunway) {
        return reject(`${flight.callsign}: Runway ${runway} is not active; expect Runway 21.`);
      }
      const taxiwayChoices: ("A" | "B")[] = via ? [via] : ["A", "B"];
      let route: string[] | null = null;
      let selectedTaxiway: "A" | "B" | null = null;
      for (const taxiway of taxiwayChoices) {
        const candidate = shortestGroundRoute(
          flight.currentNode,
          taxiway === "A" ? "A5" : "B5",
          taxiway,
        );
        if (candidate && (!route || candidate.length < route.length)) {
          route = candidate;
          selectedTaxiway = taxiway;
        }
      }
      if (!route || !selectedTaxiway) {
        return reject(`${flight.callsign}: no route to Runway 21 via ${via ?? "the requested taxiway"}.`);
      }
      flight.status = "TAXIING";
      flight.parkingNode = undefined;
      flight.destinationNode = `RWY21:${selectedTaxiway}`;
      const queuePosition = previous.aircraft.filter((other) =>
        other.callsign !== flight.callsign &&
        other.destinationNode === flight.destinationNode &&
        !other.completed,
      ).length + 1;
      flight.route = routePointsFromNodeIds(route);
      flight.routeIndex = 0;
      return accept(
        flight,
        `taxi Runway 21 via ${selectedTaxiway === "A" ? "Alpha" : "Bravo"}, hold short${queuePosition > 1 ? `, number ${queuePosition} in sequence` : ""}`,
      );
    }

    if (flight.kind !== "arrival" || flight.status !== "AWAITING_TAXI") {
      return reject(`${flight.callsign}: parking taxi clearance is only available after runway exit.`);
    }
    const explicitStand = GROUND_NODES[destinationToken];
    const requestedGroup = explicitStand?.parkingGroup ?? normalizeParkingGroup(destinationToken);
    if (!requestedGroup) {
      return reject(`${flight.callsign}: use a parking group or stand ID: FBO1-FBO3, NE1-NE3, JSX1-JSX2, TR1-TR4, or SH1-SH4.`);
    }
    if (!GROUND_AIRCRAFT[flight.type].allowedParking.includes(requestedGroup)) {
      return reject(
        `${flight.callsign}: ${flight.type} cannot use ${PARKING_GROUP_LABELS[requestedGroup]}; use ${GROUND_AIRCRAFT[flight.type].allowedParking.map((group) => PARKING_GROUP_LABELS[group]).join(" or ")}.`,
      );
    }
    const occupied = occupiedParkingNodes(previous);
    const stand = explicitStand?.parkingGroup
      ? !occupied.has(explicitStand.id)
        ? explicitStand
        : undefined
      : nodesForParkingGroup(requestedGroup).find((node) => !occupied.has(node.id));
    if (!stand) return reject(`${flight.callsign}: no open ${PARKING_GROUP_LABELS[requestedGroup]} position.`);
    const nodeRoute = shortestGroundRoute(flight.currentNode, stand.id, via);
    if (!nodeRoute) {
      return reject(`${flight.callsign}: unable route to ${stand.label}${via ? ` via ${via}` : ""}.`);
    }
    flight.status = "TAXIING";
    flight.destinationNode = stand.id;
    flight.plannedStandId = stand.id;
    flight.route = routePointsFromNodeIds(nodeRoute);
    flight.routeIndex = 0;
    return accept(
      flight,
      `taxi ${PARKING_GROUP_LABELS[requestedGroup]} via ${via === "A" ? "Alpha" : via === "B" ? "Bravo" : "published taxiways"}, parking ${stand.label}`,
    );
  }

  const lineupAction =
    ["LINEUP", "LU", "LINE-UP"].includes(action) ||
    (action === "LINE" && tokens[2] === "UP");
  if (lineupAction) {
    if (flight.status !== "HOLD_SHORT") {
      return reject(`${flight.callsign}: must be holding short before line up.`);
    }
    const holdNodeId = flight.destinationNode === "RWY21:A" ? "A5" : "B5";
    const holdNode = GROUND_NODES[holdNodeId];
    const distanceToHold = distanceBetween(flight, holdNode);
    const aircraftAhead = previous.aircraft.filter((other) =>
      other.callsign !== flight.callsign &&
      other.destinationNode === flight.destinationNode &&
      ["TAXIING", "HOLD_SHORT", "POSITION_HOLD", "RUN_UP"].includes(other.status) &&
      (
        distanceBetween(other, holdNode) < distanceToHold - 0.05 ||
        (Math.abs(distanceBetween(other, holdNode) - distanceToHold) <= 0.05 && other.createdTick < flight.createdTick)
      ),
    );
    if (aircraftAhead.length > 0) {
      return reject(`${flight.callsign}: hold position, number ${aircraftAhead.length + 1} in sequence at ${holdNodeId}.`);
    }
    if (runwayOccupied(previous, flight.callsign)) {
      return reject(`${flight.callsign}: hold short, Runway 21 occupied.`);
    }
    if (secondsUntilArrival(previous) < ARRIVAL_RUNWAY_BUFFER_SECONDS) {
      return reject(`${flight.callsign}: hold short, arrival ${previous.nextArrival.callsign} inside ${ARRIVAL_RUNWAY_BUFFER_SECONDS} seconds.`);
    }
    flight.status = "LINING_UP";
    flight.destinationNode = undefined;
    flight.routeIndex = 0;
    flight.route = [
      { ...KSMO_GROUND.runway.threshold21, speedKnots: 8 },
      runwayRoutePoint(76.7, 5),
    ];
    return accept(flight, "Runway 21, line up and wait");
  }

  if (["TAKEOFF", "TO", "T"].includes(action)) {
    if (flight.status !== "LINE_UP") {
      return reject(`${flight.callsign}: takeoff requires line up on Runway 21.`);
    }
    if (secondsUntilArrival(previous) < ARRIVAL_RUNWAY_BUFFER_SECONDS) {
      return reject(`${flight.callsign}: hold position, insufficient gap ahead of ${previous.nextArrival.callsign}.`);
    }
    flight.status = "TAKEOFF_ROLL";
    flight.route = RUNWAY_21_TAKEOFF_ROUTE;
    flight.routeIndex = 0;
    flight.speed = 0;
    return accept(flight, "Runway 21, cleared for takeoff");
  }

  return reject(
    `${flight.callsign}: command not understood. Try START, TAXI, RUNUP, HOLD, CONTINUE, LINEUP, or TAKEOFF.`,
  );
}

function flightLocation(flight: GroundFlight) {
  if (flight.status === "ARRIVAL_ROLL") return `RWY ${flight.arrivalRunway ?? "21"} → ${flight.plannedExit ?? GROUND_AIRCRAFT[flight.type].arrivalExit}`;
  if (flight.status === "TAKEOFF_ROLL") return "RWY 21";
  if (flight.status === "LINE_UP" || flight.status === "LINING_UP") return "RWY 21";
  if (flight.currentNode) return GROUND_NODES[flight.currentNode]?.label ?? flight.currentNode;
  return "MOVEMENT AREA";
}

function nextRoutingNode(flight: GroundFlight) {
  if (flight.status === "LINING_UP" || flight.status === "LINE_UP") return "RWY 21";
  const remainingNode = flight.route
    .slice(flight.routeIndex)
    .find((point) => {
      if (!point.nodeId) return false;
      const node = GROUND_NODES[point.nodeId];
      return /^[AB][1-5]$/.test(point.nodeId) || node?.kind === "parking";
    });
  if (remainingNode?.nodeId) {
    return GROUND_NODES[remainingNode.nodeId]?.label ?? remainingNode.nodeId;
  }
  if (flight.destinationNode === "RWY21:A") return "A5";
  if (flight.destinationNode === "RWY21:B") return "B5";
  if (flight.destinationNode && GROUND_NODES[flight.destinationNode]?.kind === "parking") {
    return GROUND_NODES[flight.destinationNode].label;
  }
  return null;
}

function statusTimer(flight: GroundFlight) {
  if (!["STARTING", "RUN_UP"].includes(flight.status)) return null;
  return formatCountdown(Math.ceil(flight.timerTicks / TICKS_PER_SECOND));
}

export function GroundSimulator() {
  const [world, setWorld] = useState<GroundWorld>(initialGroundWorld);
  const [command, setCommand] = useState("");
  const [selected, setSelected] = useState<string | null>(null);
  const [paused, setPaused] = useState(false);
  const [speedIndex, setSpeedIndex] = useState(0);
  const [showHelp, setShowHelp] = useState(false);
  const [showStats, setShowStats] = useState(false);
  const [showFinishConfirm, setShowFinishConfirm] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const lastUpdateRef = useRef<number | null>(null);
  const pendingTicksRef = useRef(0);
  const simulationSpeed = SIMULATION_SPEEDS[speedIndex];
  const selectedFlight = world.aircraft.find((flight) => flight.callsign === selected);
  const occupiedStandIds = occupiedParkingNodes(world);
  const arrivalSeconds = secondsUntilArrival(world);
  const simSeconds = Math.floor(world.tick / TICKS_PER_SECOND);
  const visibleFlights = useMemo(
    () =>
      [...world.aircraft].sort((first, second) => {
        if (first.kind !== second.kind) return first.kind === "arrival" ? -1 : 1;
        return first.createdTick - second.createdTick;
      }),
    [world.aircraft],
  );

  useEffect(() => {
    if (paused || world.failure) {
      lastUpdateRef.current = null;
      pendingTicksRef.current = 0;
      return;
    }
    lastUpdateRef.current = Date.now();
    const interval = window.setInterval(() => {
      const now = Date.now();
      const prior = lastUpdateRef.current ?? now;
      lastUpdateRef.current = now;
      pendingTicksRef.current +=
        ((now - prior) / 1000) * TICKS_PER_SECOND * simulationSpeed;
      const ticks = Math.min(
        Math.floor(pendingTicksRef.current),
        MAX_CATCH_UP_TICKS,
      );
      if (ticks < 1) return;
      pendingTicksRef.current -= ticks;
      setWorld((current) => advanceGroundWorld(current, ticks));
    }, 100);
    return () => window.clearInterval(interval);
  }, [paused, simulationSpeed, world.failure]);

  useEffect(() => {
    const focusCommand = (event: KeyboardEvent) => {
      if (event.key === "/" && !showHelp && !showStats) {
        event.preventDefault();
        inputRef.current?.focus();
      }
    };
    window.addEventListener("keydown", focusCommand);
    return () => window.removeEventListener("keydown", focusCommand);
  }, [showHelp, showStats]);

  const transmit = (event: FormEvent) => {
    event.preventDefault();
    const trimmed = sanitizeSimulatorCommand(command).trim();
    if (!trimmed) return;
    const global = trimmed.toUpperCase();
    if (global === "HELP") setShowHelp(true);
    else if (global === "PAUSE") setPaused((value) => !value);
    else if (global === "STATS") setShowStats(true);
    else if (["EXIT", "QUIT"].includes(global)) setShowFinishConfirm(true);
    else setWorld((current) => issueGroundCommand(current, trimmed));
    setCommand("");
  };

  const reset = () => {
    setWorld(initialGroundWorld());
    setSelected(null);
    setCommand("");
    setPaused(false);
  };

  return (
    <main className="sim-shell ground-sim-shell">
      <header className="top-bar ground-top-bar">
        <Link
          aria-label="Finish ground shift and return to game selection"
          className="brand-block"
          href="/"
          onClick={(event) => {
            event.preventDefault();
            setShowFinishConfirm(true);
          }}
        >
          <div className="brand-mark" aria-hidden="true">PR</div>
          <div>
            <p className="eyebrow">PACIFIC RADAR · GROUND</p>
            <h1>Santa Monica Ground</h1>
          </div>
        </Link>
        <div className="status-ribbon" aria-label="Santa Monica surface conditions">
          <div><span>FIELD</span><strong>SMO · 170&apos;</strong></div>
          <div><span>ACTIVE</span><strong>RWY 21</strong></div>
          <div><span>WIND</span><strong>240° / 08 KT</strong></div>
          <div className={arrivalSeconds <= 30 ? "arrival-alert" : ""}>
            <span>NEXT ARR</span>
            <strong>{formatCountdown(arrivalSeconds)}</strong>
          </div>
          <div><span>SIM</span><strong>{formatCountdown(simSeconds)}</strong></div>
        </div>
        <div className="header-actions">
          <button className="ghost-button" onClick={() => setShowHelp(true)}>Command guide</button>
          <button className={paused ? "primary-button" : "ghost-button"} onClick={() => setPaused((value) => !value)}>
            {paused ? "Resume" : "Pause"}
          </button>
        </div>
      </header>

      <section className="workspace ground-workspace">
        <div className="radar-column">
          <div className="radar-frame ground-frame">
            <div className={`ground-map ${paused ? "simulation-paused" : ""}`} aria-label="Interactive simulated airport surface display of Santa Monica Airport">
              <div className="ground-chart-layer" />
              <div className="ground-map-tint" />

              <svg className="ground-surface-layer" viewBox={KSMO_GROUND_CHART.viewBox} preserveAspectRatio="xMidYMid meet" aria-label="KSMO runway, taxiways, run-up areas, and parking positions">
                <g className="ground-chart-geometry">
                <g className="ground-airport-context">
                  <polygon className="ground-airport-boundary" points={KSMO_AIRPORT_BOUNDARY} />
                  {KSMO_PERIMETER_ROADS.map((points, index) => <polyline className="ground-perimeter-road" key={`road-${index}`} points={surfaceShapePoints(points)} />)}
                  {KSMO_APRONS.map((points, index) => <polygon className="ground-apron-shape" key={`apron-${index}`} points={surfaceShapePoints(points)} />)}
                  {KSMO_BUILDINGS.map((points, index) => <polygon className="ground-building-shape" key={`building-${index}`} points={surfaceShapePoints(points)} />)}
                </g>
                <line className="ground-runway-outline" x1={KSMO_GROUND.runway.pavement03.x} y1={KSMO_GROUND.runway.pavement03.y} x2={KSMO_GROUND.runway.pavement21.x} y2={KSMO_GROUND.runway.pavement21.y} />
                <line className="ground-runway-active" x1={KSMO_GROUND.runway.threshold03.x} y1={KSMO_GROUND.runway.threshold03.y} x2={KSMO_GROUND.runway.threshold21.x} y2={KSMO_GROUND.runway.threshold21.y} />
                <g className="ground-threshold-markings">
                  {[55.3, 56.0, 56.7, 57.4, 58.1].map((y) => {
                    const first = projectKsmoGroundPoint({ x: 26.2, y });
                    const second = projectKsmoGroundPoint({ x: 28.2, y });
                    return <line key={`03-${y}`} x1={first.x} x2={second.x} y1={first.y} y2={second.y} />;
                  })}
                  {[55.3, 56.0, 56.7, 57.4, 58.1].map((y) => {
                    const first = projectKsmoGroundPoint({ x: 76.2, y });
                    const second = projectKsmoGroundPoint({ x: 78.2, y });
                    return <line key={`21-${y}`} x1={first.x} x2={second.x} y1={first.y} y2={second.y} />;
                  })}
                </g>
                {Object.entries(TAXIWAY_PATHS).map(([taxiway, points]) => <polyline className="ground-taxiway-pavement" key={`${taxiway}-pavement`} points={points.map((point) => `${point.x},${point.y}`).join(" ")} />)}
                {KSMO_RUNWAY_CONNECTORS.map(([nodeId, horizontalX]) => {
                  const node = GROUND_NODES[nodeId];
                  const runwayPoint = projectKsmoGroundPoint({ x: horizontalX, y: 56.7 });
                  const runwayEdge = {
                    x: node.x + (runwayPoint.x - node.x) * 0.72,
                    y: node.y + (runwayPoint.y - node.y) * 0.72,
                  };
                  return <line className="ground-intersection-pavement" key={`${nodeId}-intersection-pavement`} x1={node.x} y1={node.y} x2={runwayEdge.x} y2={runwayEdge.y} />;
                })}
                {Object.entries(TAXIWAY_PATHS).map(([taxiway, points]) => <polyline className="ground-taxiway-line" key={taxiway} points={points.map((point) => `${point.x},${point.y}`).join(" ")} />)}
                {KSMO_RUNWAY_CONNECTORS.map(([nodeId, horizontalX]) => {
                  const node = GROUND_NODES[nodeId];
                  const runwayPoint = projectKsmoGroundPoint({ x: horizontalX, y: 56.7 });
                  const isArrivalExit = nodeId === "B2" || nodeId === "B3";
                  return <line className={`ground-runway-access ${isArrivalExit ? "ground-runway-exit" : ""}`} key={`${nodeId}-intersection-line`} x1={node.x} y1={node.y} x2={runwayPoint.x} y2={runwayPoint.y} />;
                })}
                {GROUND_EDGES.filter((edge) => {
                  const first = GROUND_NODES[edge.from];
                  const second = GROUND_NODES[edge.to];
                  const isRampOrBypass = first.taxiway === "RAMP" || second.taxiway === "RAMP" || first.taxiway === "BYPASS" || second.taxiway === "BYPASS";
                  return isRampOrBypass && first.kind !== "parking" && second.kind !== "parking";
                }).map((edge) => (
                  <line className="ground-taxiway-pavement ground-ramp-pavement" key={`${edge.from}-${edge.to}-pavement`} x1={GROUND_NODES[edge.from].x} y1={GROUND_NODES[edge.from].y} x2={GROUND_NODES[edge.to].x} y2={GROUND_NODES[edge.to].y} />
                ))}
                {GROUND_EDGES.filter((edge) => {
                  const first = GROUND_NODES[edge.from];
                  const second = GROUND_NODES[edge.to];
                  const isRampOrBypass = first.taxiway === "RAMP" || second.taxiway === "RAMP" || first.taxiway === "BYPASS" || second.taxiway === "BYPASS";
                  return isRampOrBypass && first.kind !== "parking" && second.kind !== "parking";
                }).map((edge) => (
                  <line className="ground-taxiway-line ground-ramp-link" key={`${edge.from}-${edge.to}`} x1={GROUND_NODES[edge.from].x} y1={GROUND_NODES[edge.from].y} x2={GROUND_NODES[edge.to].x} y2={GROUND_NODES[edge.to].y} />
                ))}
                {GROUND_EDGES.filter((edge) => GROUND_NODES[edge.from].kind === "parking" || GROUND_NODES[edge.to].kind === "parking").map((edge) => {
                  const first = GROUND_NODES[edge.from];
                  const second = GROUND_NODES[edge.to];
                  const stand = first.kind === "parking" ? first : second;
                  const approach = first.kind === "parking" ? second : first;
                  const direction = stand.y >= approach.y ? 1 : -1;
                  const halfWidth = stand.parkingGroup === "JSX" ? 1.35 : 1.05;
                  const openY = approach.y + direction * 0.12;
                  const backY = stand.y + direction * 0.82;
                  const labelY = openY + direction * 0.66;
                  const bayPath = `M ${stand.x - halfWidth} ${openY} L ${stand.x - halfWidth} ${backY} L ${stand.x + halfWidth} ${backY} L ${stand.x + halfWidth} ${openY}`;
                  return (
                    <g className="ground-parking-stand" key={`stand-${stand.id}`}>
                      <path className="ground-parking-bay" d={bayPath} />
                      <line className="ground-parking-lead-in" x1={approach.x} y1={approach.y} x2={stand.x} y2={stand.y} />
                      <line className="ground-parking-stop" x1={stand.x - 0.48} x2={stand.x + 0.48} y1={stand.y} y2={stand.y} />
                      <text className="ground-parking-label" x={stand.x} y={labelY}>{stand.id}</text>
                    </g>
                  );
                })}
                {["A2", "A5", "B2", "B5"].map((nodeId) => {
                  const node = GROUND_NODES[nodeId];
                  return <g key={`runup-pad-${nodeId}`}><circle className="ground-runup-pad" cx={node.x} cy={node.y} r="2.2" /><circle className="ground-runup-mark" cx={node.x} cy={node.y} r="1.25" /></g>;
                })}
                {["A1", "A2", "A3", "A4", "A5", "B1", "B2", "B3", "B4", "B5"].map((nodeId) => {
                  const node = GROUND_NODES[nodeId];
                  return <g className="ground-node-mark" key={nodeId}><circle cx={node.x} cy={node.y} r="0.55" /><text x={node.x + 0.8} y={node.y - 0.8}>{node.label}</text></g>;
                })}
                {KSMO_RUNWAY_CONNECTORS.map(([nodeId, horizontalX]) => {
                  const node = GROUND_NODES[nodeId];
                  const runwayPoint = projectKsmoGroundPoint({ x: horizontalX, y: 56.7 });
                  const holdPoint = {
                    x: node.x + (runwayPoint.x - node.x) * 0.46,
                    y: node.y + (runwayPoint.y - node.y) * 0.46,
                  };
                  return <g className="ground-hold-mark" key={`hold-${nodeId}`} transform={`translate(${holdPoint.x} ${holdPoint.y})`}><line x1="-1.1" x2="1.1" y1="-0.28" y2="-0.28" /><line x1="-1.1" x2="1.1" y1="0.28" y2="0.28" /></g>;
                })}
                {([["21", 74.0], ["03", 29.0]] as const).map(([runway, horizontalX]) => {
                  const point = projectKsmoGroundPoint({ x: horizontalX, y: 57.5 });
                  return <text className={`ground-runway-number ground-runway-number-${runway}`} key={runway} x={point.x} y={point.y}>{runway}</text>;
                })}
                <g className="ground-site-symbol ground-tower-symbol" transform="translate(55.5 47)">
                  <circle r="0.85" />
                  <line x1="-1.25" x2="1.25" y1="0" y2="0" />
                  <line x1="0" x2="0" y1="-1.25" y2="1.25" />
                </g>
                <g className="ground-site-symbol ground-helipad-symbol" transform="translate(61 64.8)">
                  <circle r="1.05" />
                  <text x="0" y="0.38">H</text>
                </g>
                {SURFACE_LABELS.map((label) => <text className="ground-area-label" key={label.text} x={label.x} y={label.y}>{label.text}</text>)}
                </g>
              </svg>

              <div className="arrival-board" aria-live="polite">
                <span>NEXT TOWER ARRIVAL</span>
                <strong>{world.nextArrival.callsign}</strong>
                <small>{world.nextArrival.type} · RWY {world.nextArrival.runway} · EXIT {world.nextArrival.plannedExit} · {formatCountdown(arrivalSeconds)}</small>
                <small className="arrival-board-parking">PARK {world.nextArrival.plannedStandId}</small>
              </div>

              <div className="ground-map-key" aria-label="Surface map legend">
                <span><i className="runup-key" /> run-up</span>
                <span><i className="hold-key" /> hold short</span>
              </div>

              {PARKING_STAND_IDS.map((standId) => {
                const stand = GROUND_NODES[standId];
                const chartPosition = groundChartScreenPosition(stand, KSMO_GROUND_CHART);
                const occupied = occupiedStandIds.has(standId);
                const compatible = Boolean(
                  selectedFlight?.kind === "arrival" &&
                  selectedFlight.status === "AWAITING_TAXI" &&
                  stand.parkingGroup &&
                  GROUND_AIRCRAFT[selectedFlight.type].allowedParking.includes(stand.parkingGroup),
                );
                return (
                  <button
                    aria-label={`${stand.label} parking position, ${occupied ? "occupied" : compatible ? "available for selected arrival" : "available"}`}
                    className={`ground-parking-selector ${occupied ? "occupied" : "open"}`}
                    disabled={occupied || !compatible}
                    key={`selector-${standId}`}
                    onClick={() => {
                      if (!selectedFlight) return;
                      setCommand(`${selectedFlight.callsign} TAXI ${standId}`);
                      inputRef.current?.focus();
                    }}
                    style={{ left: `${chartPosition.left}%`, top: `${chartPosition.top}%` }}
                    title={occupied ? `${stand.label} occupied` : `Prepare clearance to ${stand.label}`}
                    type="button"
                  />
                );
              })}

              {visibleFlights.map((flight) => {
                const chartPosition = groundChartScreenPosition(flight, KSMO_GROUND_CHART);
                return (
                <button
                  aria-label={`${flight.callsign}, ${flight.type}, ${STATUS_LABELS[flight.status]}`}
                  className={`ground-aircraft ${flight.kind} ${selected === flight.callsign ? "selected" : ""} ground-aircraft-${GROUND_AIRCRAFT[flight.type].category}`}
                  key={flight.callsign}
                  onClick={() => {
                    setSelected(flight.callsign);
                    setCommand(`${flight.callsign} `);
                    inputRef.current?.focus();
                  }}
                  style={{ left: `${chartPosition.left}%`, top: `${chartPosition.top}%`, transform: `translate(-50%, -50%) rotate(${flight.heading}deg)` }}
                  type="button"
                >
                  <svg aria-hidden="true" viewBox="0 0 28 28"><path d="M14 1.5 17 11l8.5 4v2.7L17 16.5l-1 7 3 2v1.5l-5-1-5 1v-1.5l3-2-1-7-8.5 1.2V15l8.5-4z" /></svg>
                  <span style={{ transform: `rotate(${-flight.heading}deg)` }}><strong>{flight.callsign}</strong><small>{flight.type} · {Math.round(flight.speed)}KT</small></span>
                </button>
                );
              })}

              <div className="ground-chart-ident" aria-hidden="true">KSMO · OPER MODE</div>
              <div className="map-attribution">SIMULATED AIRPORT SURFACE DISPLAY · FAA KSMO DIAGRAM 26134 · NOT FOR NAVIGATION</div>
              {paused ? <div className="pause-indicator" role="status"><strong>Ground shift paused</strong><span>Traffic, arrivals, and the simulation clock are frozen</span></div> : null}
            </div>
          </div>
        </div>

        <aside className="side-panel ground-side-panel">
          <section className="panel-section radio-section">
            <div className="section-heading"><div><p className="eyebrow">SMO GROUND · 121.900</p><h2>Radio log</h2></div><span className="live-indicator">LIVE</span></div>
            <div className="event-log" aria-live="polite">
              {world.events.slice(-2).reverse().map((item, index) => (
                <div className={`event-row ${item.tone}`} key={`${item.tick}-${index}`}><span>{formatCountdown(Math.floor(item.tick / TICKS_PER_SECOND))}</span><p>{item.message}</p></div>
              ))}
            </div>
          </section>

          <section className="command-deck" aria-label="Ground clearance console">
            <form className="command-form" onSubmit={transmit}>
              <div className="command-input-wrap"><span className="prompt-symbol">›</span><input ref={inputRef} aria-label="Ground control command" autoComplete="off" maxLength={MAX_SIMULATOR_COMMAND_LENGTH} spellCheck={false} value={command} onChange={(event) => setCommand(sanitizeSimulatorCommand(event.target.value))} /><button type="submit">Send</button></div>
            </form>
          </section>

          <section className="score-card ground-score-card">
            <div className="score-total"><span>SCORE</span><strong>{world.score.toLocaleString()}</strong></div>
            <div className="score-metrics"><span><strong>{world.parkedArrivals}</strong> parked</span><span><strong>{world.safeDepartures}</strong> departed</span><span><strong>{world.safetyStrikes}/3</strong> strikes</span></div>
          </section>

          <section className="panel-section strips-section">
            <div className="section-heading"><div><p className="eyebrow">YOUR MOVEMENT AREA</p><h2>Ground traffic</h2></div><span>{visibleFlights.length} active · 1 inbound</span></div>
            <div className="strip-stack ground-strip-stack">
              <div className="flight-strip ground-flight-strip arrival ground-inbound-strip" aria-label={`${world.nextArrival.callsign}, inbound Runway ${world.nextArrival.runway}, planned exit ${world.nextArrival.plannedExit}, planned parking ${world.nextArrival.plannedStandId}`}>
                <span className="strip-cell strip-ident"><small>INBOUND</small><strong>{world.nextArrival.callsign}</strong><em>{world.nextArrival.type} · {GROUND_AIRCRAFT[world.nextArrival.type].label}</em></span>
                <span className="strip-cell"><small>STATUS</small><strong>{formatCountdown(arrivalSeconds)}</strong></span>
                <span className="strip-cell"><small>LAND / EXIT</small><strong>{world.nextArrival.runway} / {world.nextArrival.plannedExit}</strong></span>
                <span className="strip-cell"><small>PARK</small><strong>{world.nextArrival.plannedStandId}</strong></span>
              </div>
              {visibleFlights.map((flight) => {
                const assignedStand = flight.destinationNode && GROUND_NODES[flight.destinationNode]?.kind === "parking"
                  ? GROUND_NODES[flight.destinationNode]
                  : undefined;
                const nextNode = nextRoutingNode(flight);
                const detailLabel = assignedStand ? "ASSIGNED" : flight.kind === "arrival" ? "EXIT / PARK" : "SPD";
                const detailValue = assignedStand
                  ? assignedStand.label
                  : flight.kind === "arrival"
                    ? `${flight.plannedExit ?? GROUND_AIRCRAFT[flight.type].arrivalExit} / ${flight.plannedStandId ?? "TBD"}`
                    : `${Math.round(flight.speed)}KT`;
                return (
                  <button className={`flight-strip ground-flight-strip ${flight.kind} ${selected === flight.callsign ? "selected" : ""}`} key={flight.callsign} onClick={() => { setSelected(flight.callsign); setCommand(`${flight.callsign} `); inputRef.current?.focus(); }}>
                    <span className="strip-cell strip-ident"><small>CALLSIGN</small><strong>{flight.callsign}</strong><em>{flight.type} · {GROUND_AIRCRAFT[flight.type].label}</em></span>
                    <span className="strip-cell"><small>STATUS</small><strong>{statusTimer(flight) ?? STATUS_LABELS[flight.status]}</strong></span>
                    <span className="strip-cell"><small>POSITION</small><strong>{flightLocation(flight)}</strong>{nextNode ? <em className="ground-next-node">NEXT {nextNode}</em> : null}</span>
                    <span className="strip-cell"><small>{detailLabel}</small><strong>{detailValue}</strong></span>
                  </button>
                );
              })}
            </div>
          </section>

          <footer className="side-footer">
            <div className="speed-control-heading"><span>Simulation speed</span><strong>{simulationSpeed === 1 ? "Real life" : `${simulationSpeed}×`}</strong></div>
            <input className="simulation-speed-slider" type="range" min="0" max={SIMULATION_SPEEDS.length - 1} step="1" value={speedIndex} aria-label="Ground simulation speed" onChange={(event) => setSpeedIndex(Number.parseInt(event.currentTarget.value, 10))} />
            <div className="speed-scale" aria-hidden="true">{SIMULATION_SPEEDS.map((speed, index) => <span className={speedIndex === index ? "active" : ""} key={speed}>{speed === 1 ? "Real life" : `${speed}×`}</span>)}</div>
          </footer>
        </aside>
      </section>

      {showHelp ? (
        <div className="modal-backdrop" role="presentation">
          <section className="command-modal ground-command-modal" role="dialog" aria-modal="true" aria-labelledby="ground-command-title">
            <div className="modal-header"><div><p className="eyebrow">SMO SURFACE REFERENCE</p><h2 id="ground-command-title">Ground command guide</h2></div><button aria-label="Close ground command guide" onClick={() => setShowHelp(false)}>×</button></div>
            <p className="modal-intro">Use CALLSIGN + COMMAND. Tower lands arrivals automatically; Ground receives them after the displayed runway exit. Select an arrival after it clears the runway, then click an open labeled stand to prepare its specific parking clearance.</p>
            <div className="ground-fact-row"><span><strong>03/21</strong>3,500 × 150 FT</span><span><strong>A / B</strong>PARALLEL TAXIWAYS</span><span><strong>4</strong>RUN-UP AREAS</span><span><strong>0</strong>AIRLINE GATES</span><span><strong>2</strong>JSX APRON STANDS</span></div>
            <div className="command-grid ground-command-grid">{GROUND_COMMANDS.map(([example, description]) => <div key={example}><code>{example}</code><span>{description}</span></div>)}</div>
            <div className="safety-note ground-safety-note">
              <strong>Surface rules</strong>
              <p>Keep Runway 21 empty before the displayed incoming-flight timer reaches zero. Lineup and takeoff commands are blocked inside a 30-second arrival window; an occupied runway forces a Tower go-around and a safety strike.</p>
              <p>Normal taxi is type-limited to 12–15 knots and ramps to 5–6 knots. Engine-start times vary by aircraft; turbine starts retain a 60-second advisory interval. Taxi and runway-roll travel use the real 3,500-foot field scale.</p>
              <p>SMO has no conventional airline gates. Specific stand IDs are FBO1–FBO3, NE1–NE3, JSX1–JSX2, TR1–TR4, and SH1–SH4. Turbine aircraft cannot use the transient area near Airport Administration.</p>
              <p>Parking an arrival scores +100 and removes it from the map after shutdown. A safe takeoff scores +125. A surface conflict or blocked arriving runway costs 75 points; three safety strikes end the shift.</p>
            </div>
            <button className="primary-button wide-button" onClick={() => setShowHelp(false)}>Return to ground view</button>
          </section>
        </div>
      ) : null}

      {showStats ? (
        <div className="modal-backdrop" role="presentation"><section className="command-modal stats-modal" role="dialog" aria-modal="true" aria-labelledby="ground-stats-title"><div className="modal-header"><div><p className="eyebrow">LIVE PERFORMANCE</p><h2 id="ground-stats-title">Ground statistics</h2></div><button aria-label="Close ground statistics" onClick={() => setShowStats(false)}>×</button></div><div className="stats-grid"><div><span>Score</span><strong>{world.score}</strong></div><div><span>Parked</span><strong>{world.parkedArrivals}</strong></div><div><span>Departed</span><strong>{world.safeDepartures}</strong></div><div><span>Safety strikes</span><strong>{world.safetyStrikes}/3</strong></div></div><button className="primary-button wide-button" onClick={() => setShowStats(false)}>Return to surface</button></section></div>
      ) : null}

      {showFinishConfirm ? (
        <div className="modal-backdrop finish-backdrop" role="presentation" onMouseDown={(event) => { if (event.currentTarget === event.target) setShowFinishConfirm(false); }}><section className="command-modal finish-modal" role="alertdialog" aria-modal="true" aria-labelledby="ground-finish-title"><p className="eyebrow">END GROUND SHIFT</p><h2 id="ground-finish-title">Finish ground shift?</h2><p>Your score is {world.score.toLocaleString()} with {world.parkedArrivals} arrivals parked and {world.safeDepartures} safe departures.</p><div className="finish-actions"><button autoFocus className="ghost-button" onClick={() => setShowFinishConfirm(false)}>Keep playing</button><Link className="primary-button finish-confirm-button" href="/" replace>Finish shift</Link></div></section></div>
      ) : null}

      {world.failure ? (
        <div className="modal-backdrop failure-backdrop" role="presentation"><section className="command-modal failure-modal" role="alertdialog" aria-modal="true" aria-labelledby="ground-failure-title"><div className="failure-symbol" aria-hidden="true">!</div><p className="eyebrow">GROUND SHIFT FAILED</p><h2 id="ground-failure-title">{world.failure.reason === "collision" ? "Surface collision" : "Safety limit exceeded"}</h2><p className="failure-explanation">{world.failure.detail} The movement area is closed and the simulation has stopped.</p><div className="failure-summary"><div><span>Score</span><strong>{world.score}</strong></div><div><span>Parked</span><strong>{world.parkedArrivals}</strong></div><div><span>Strikes</span><strong>{world.safetyStrikes}/3</strong></div></div><button className="failure-restart" onClick={reset}>Start new ground shift</button></section></div>
      ) : null}
    </main>
  );
}
