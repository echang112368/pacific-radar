"use client";

import Link from "next/link";
import { FormEvent, useEffect, useMemo, useRef, useState } from "react";
import {
  KLAX_GROUND_CHART,
  groundChartScreenPosition,
} from "../lib/ground-chart";
import {
  KLAX_GROUND,
  LAX_GATE_GROUP_LABELS,
  LAX_GROUND_AIRCRAFT,
  LAX_GROUND_EDGES,
  LAX_GROUND_NODES,
  LAX_RUNWAYS,
  LaxAircraftType,
  LaxGateGroup,
  LaxGroundPoint,
  LaxRunwayId,
  LaxTaxiway,
  laxDistance,
  laxGroundHeading,
  laxNodesForGateGroup,
  shortestLaxGroundRoute,
} from "../lib/klax-ground";

type Status =
  | "PARKED"
  | "STARTING"
  | "READY"
  | "TAXIING"
  | "POSITION_HOLD"
  | "HOLD_SHORT"
  | "LINING_UP"
  | "LINE_UP"
  | "TAKEOFF_ROLL"
  | "ARRIVAL_ROLL"
  | "AWAITING_TAXI";

type RoutePoint = LaxGroundPoint & { nodeId?: string; speedKnots?: number };

type Flight = LaxGroundPoint & {
  callsign: string;
  type: LaxAircraftType;
  kind: "arrival" | "departure";
  status: Status;
  priorStatus?: Status;
  runway: LaxRunwayId;
  heading: number;
  speed: number;
  currentNode?: string;
  parkingNode?: string;
  destinationNode?: string;
  route: RoutePoint[];
  routeIndex: number;
  timerTicks: number;
  createdTick: number;
  completed?: boolean;
};

type RadioEvent = {
  tick: number;
  tone: "system" | "pilot" | "warning" | "success";
  message: string;
};

type ArrivalPreview = {
  callsign: string;
  type: LaxAircraftType;
  runway: "24R" | "25L";
  dueTick: number;
};

type World = {
  tick: number;
  score: number;
  parkedArrivals: number;
  safeDepartures: number;
  safetyStrikes: number;
  aircraft: Flight[];
  events: RadioEvent[];
  nextArrival: ArrivalPreview;
  nextDepartureTick: number;
  arrivalSequence: number;
  departureSequence: number;
  activeConflictKeys: string[];
  failure?: { reason: "collision" | "safety_limit"; detail: string };
};

const TICKS_PER_SECOND = 4;
const FEET_PER_MAP_PERCENT = 235;
const SIMULATION_SPEEDS = [1, 1.5, 2, 3, 4] as const;
const MAX_CATCH_UP_TICKS = TICKS_PER_SECOND * 60;
const ARRIVAL_RUNWAY_BUFFER_SECONDS = 35;
const COLLISION_DISTANCE_PERCENT = 0.33;
const CONFLICT_DISTANCE_PERCENT = 0.88;
const PARKING_POINTS = 100;
const DEPARTURE_POINTS = 125;
const SAFETY_PENALTY = 75;
const ARRIVAL_GATE_SERVICE_SECONDS = 45;

const STATUS_LABELS: Record<Status, string> = {
  PARKED: "At gate",
  STARTING: "Engine start",
  READY: "Ready to taxi",
  TAXIING: "Taxiing",
  POSITION_HOLD: "Holding position",
  HOLD_SHORT: "Holding short",
  LINING_UP: "Entering runway",
  LINE_UP: "Lined up",
  TAKEOFF_ROLL: "Takeoff roll",
  ARRIVAL_ROLL: "Landing rollout",
  AWAITING_TAXI: "With ground",
};

const TAXIWAY_PATHS: Record<"E" | "D" | "C" | "H", LaxGroundPoint[]> = {
  E: ["E1", "E2", "E3", "E4", "E5"].map((id) => LAX_GROUND_NODES[id]),
  D: ["D1", "D2", "D3", "D4", "D5"].map((id) => LAX_GROUND_NODES[id]),
  C: ["C1", "C2", "C3", "C4", "C5", "C6"].map((id) => LAX_GROUND_NODES[id]),
  H: ["H1", "H2", "H3", "H4", "H5"].map((id) => LAX_GROUND_NODES[id]),
};

const LAX_APRONS = [
  "10,40.7 74,40.7 76,48.5 70,50.2 70,58.8 10,58.8",
  "19,45 67,45 69,55.5 18,55.5",
] as const;

const LAX_TERMINAL_BUILDINGS = [
  "18,47.2 25,47.2 25,54.8 18,54.8",
  "27,44.8 34,44.8 34,51.2 27,51.2",
  "36.3,44.5 43,44.5 43,51.1 36.3,51.1",
  "48.2,44.4 54.8,44.4 54.8,51 48.2,51",
  "31.5,52 37.8,52 37.8,57.4 31.5,57.4",
  "39.3,52 44.8,52 44.8,57.4 39.3,57.4",
  "46.3,52 51.8,52 51.8,57.4 46.3,57.4",
  "55,51.5 64.5,51.5 64.5,57.2 55,57.2",
] as const;

const LAX_SERVICE_ROADS = [
  "7,25.5 80,25.5 84,30.5",
  "7,72.5 80,72.5 84,68",
  "11.5,38.5 77.5,38.5",
  "11.5,61.5 77.5,61.5",
] as const;

const ARRIVAL_TYPES: LaxAircraftType[] = ["B738", "A21N", "B789", "B739", "A359", "B77W", "E175"];
const DEPARTURE_TYPES: LaxAircraftType[] = ["B738", "A21N", "B739", "B38M", "E175", "B789", "B763"];
const ARRIVAL_PREFIXES = ["AAL", "DAL", "UAL", "ASA", "SWA", "QFA", "KAL", "BAW"];
const DEPARTURE_PREFIXES = ["SWA", "UAL", "DAL", "AAL", "ASA", "JBU"];

const GROUND_COMMANDS = [
  ["SWA172 START", "Approve engine start. Start time varies by aircraft type."],
  ["SWA172 TAXI RWY 24L VIA D", "Taxi to the north departure runway using Taxiway D."],
  ["DAL452 TAXI RWY 25R VIA C", "Taxi to the south departure runway using Taxiway C."],
  ["SWA172 HOLD", "Stop immediately while retaining the remaining taxi clearance."],
  ["SWA172 CONTINUE", "Resume the taxi route that was placed on hold."],
  ["SWA172 LINEUP RWY 24L", "Enter the assigned inner runway when its pair is protected."],
  ["SWA172 TAKEOFF RWY 24L", "Release a lined-up departure; Ground owns this game decision."],
  ["AAL104 TAXI TBIT VIA D", "Send an arrival to an open compatible Terminal B gate."],
  ["UAL826 TAXI WEST", "Send a compatible international arrival to the West Gates."],
  ["ASA331 TAXI G72 VIA C", "Assign an exact modeled gate when it is open and compatible."],
  ["HELP · PAUSE · STATS · EXIT", "Open the rules, freeze traffic, review the shift, or finish."],
] as const;

function formatCountdown(seconds: number) {
  const safe = Math.max(0, Math.floor(seconds));
  return `${String(Math.floor(safe / 60)).padStart(2, "0")}:${String(safe % 60).padStart(2, "0")}`;
}

function appendEvent(world: World, tone: RadioEvent["tone"], message: string): World {
  return { ...world, events: [...world.events, { tick: world.tick, tone, message }].slice(-40) };
}

function makeDeparture(
  callsign: string,
  type: LaxAircraftType,
  gate: string,
  runway: "24L" | "25R",
  createdTick = 0,
): Flight {
  const point = LAX_GROUND_NODES[gate];
  return {
    callsign,
    type,
    kind: "departure",
    status: "PARKED",
    runway,
    x: point.x,
    y: point.y,
    heading: 180,
    speed: 0,
    currentNode: gate,
    parkingNode: gate,
    route: [],
    routeIndex: 0,
    timerTicks: 0,
    createdTick,
  };
}

function arrivalPreview(sequence: number, dueTick: number): ArrivalPreview {
  const type = ARRIVAL_TYPES[sequence % ARRIVAL_TYPES.length];
  return {
    callsign: `${ARRIVAL_PREFIXES[sequence % ARRIVAL_PREFIXES.length]}${104 + sequence * 37}`,
    type,
    runway: sequence % 2 === 0 ? "24R" : "25L",
    dueTick,
  };
}

function initialWorld(): World {
  return {
    tick: 0,
    score: 0,
    parkedArrivals: 0,
    safeDepartures: 0,
    safetyStrikes: 0,
    aircraft: [
      makeDeparture("SWA172", "B738", "G12", "24L"),
      makeDeparture("DAL452", "A21N", "G34", "25R"),
      makeDeparture("UAL826", "B789", "G202", "24L"),
    ],
    events: [
      { tick: 0, tone: "system", message: "Los Angeles Ground, west operations. Arrivals 24R and 25L; departures 24L and 25R." },
      { tick: 0, tone: "pilot", message: "SWA172, Terminal 1, request engine start." },
    ],
    nextArrival: arrivalPreview(0, 60 * TICKS_PER_SECOND),
    nextDepartureTick: 145 * TICKS_PER_SECOND,
    arrivalSequence: 0,
    departureSequence: 0,
    activeConflictKeys: [],
  };
}

function secondsUntilArrival(world: World) {
  return Math.max(0, Math.ceil((world.nextArrival.dueTick - world.tick) / TICKS_PER_SECOND));
}

function runwayPairOccupied(world: World, arrivalRunway: "24R" | "25L", except?: string) {
  const pair = LAX_RUNWAYS[arrivalRunway].pairedRunway;
  return world.aircraft.some(
    (flight) =>
      flight.callsign !== except &&
      !flight.completed &&
      ["LINING_UP", "LINE_UP", "TAKEOFF_ROLL", "ARRIVAL_ROLL"].includes(flight.status) &&
      (flight.runway === arrivalRunway || flight.runway === pair),
  );
}

function addSafetyStrike(world: World, detail: string): World {
  const strikes = world.safetyStrikes + 1;
  const next = appendEvent(
    { ...world, score: world.score - SAFETY_PENALTY, safetyStrikes: strikes },
    "warning",
    `${detail}. −${SAFETY_PENALTY} points.`,
  );
  return strikes >= 3
    ? { ...next, failure: { reason: "safety_limit", detail: "Three surface safety events were recorded." } }
    : next;
}

function spawnArrival(world: World): World {
  const preview = world.nextArrival;
  const runway = LAX_RUNWAYS[preview.runway];
  const north = preview.runway === "24R";
  const handoff = north ? "D2" : "C2";
  const route: RoutePoint[] = north
    ? [
        { x: 46, y: 31.9, speedKnots: 115 },
        { x: 35, y: 31.9, speedKnots: 78 },
        { x: 25.5, y: 31.9, speedKnots: 38 },
        { ...LAX_GROUND_NODES.E2, nodeId: "E2", speedKnots: 18 },
        { ...LAX_GROUND_NODES.D2, nodeId: "D2", speedKnots: 15 },
      ]
    : [
        { x: 59, y: 67.3, speedKnots: 118 },
        { x: 47, y: 67.3, speedKnots: 80 },
        { x: 36, y: 67.3, speedKnots: 40 },
        { ...LAX_GROUND_NODES.H2, nodeId: "H2", speedKnots: 18 },
        { ...LAX_GROUND_NODES.C2, nodeId: "C2", speedKnots: 15 },
      ];
  const flight: Flight = {
    callsign: preview.callsign,
    type: preview.type,
    kind: "arrival",
    status: "ARRIVAL_ROLL",
    runway: preview.runway,
    x: runway.thresholdEast.x,
    y: runway.thresholdEast.y,
    heading: -90,
    speed: LAX_GROUND_AIRCRAFT[preview.type].landingSpeedKnots,
    destinationNode: `HANDOFF:${handoff}`,
    route,
    routeIndex: 0,
    timerTicks: 0,
    createdTick: world.tick,
  };
  const sequence = world.arrivalSequence + 1;
  return appendEvent(
    {
      ...world,
      aircraft: [...world.aircraft, flight],
      nextArrival: arrivalPreview(sequence, world.tick + (78 + (sequence % 3) * 18) * TICKS_PER_SECOND),
      arrivalSequence: sequence,
    },
    "system",
    `${flight.callsign} landed Runway ${preview.runway}; Tower will cross the paired inner runway and hand off at ${handoff}.`,
  );
}

function occupiedGateNodes(world: World) {
  return new Set(
    world.aircraft.flatMap((flight) =>
      flight.parkingNode && !flight.completed ? [flight.parkingNode] : [],
    ),
  );
}

function spawnDeparture(world: World): World {
  const sequence = world.departureSequence + 1;
  const type = DEPARTURE_TYPES[sequence % DEPARTURE_TYPES.length];
  const occupied = occupiedGateNodes(world);
  const allowed = LAX_GROUND_AIRCRAFT[type].allowedGates;
  const gate = Object.values(LAX_GROUND_NODES).find(
    (node) => node.kind === "gate" && node.gateGroup && allowed.includes(node.gateGroup) && !occupied.has(node.id),
  );
  if (!gate) {
    return {
      ...appendEvent(world, "warning", "Departure release delayed: no compatible modeled gate is open."),
      nextDepartureTick: world.tick + 45 * TICKS_PER_SECOND,
    };
  }
  const callsign = `${DEPARTURE_PREFIXES[sequence % DEPARTURE_PREFIXES.length]}${331 + sequence * 43}`;
  const flight = makeDeparture(callsign, type, gate.id, sequence % 2 === 0 ? "24L" : "25R", world.tick);
  return appendEvent(
    {
      ...world,
      aircraft: [...world.aircraft, flight],
      departureSequence: sequence,
      nextDepartureTick: world.tick + (145 + (sequence % 3) * 25) * TICKS_PER_SECOND,
    },
    "pilot",
    `${callsign}, ${gate.label}, request engine start for Runway ${flight.runway}.`,
  );
}

function routePointsFromNodeIds(ids: string[], type: LaxAircraftType) {
  return ids.slice(1).map((id) => {
    const node = LAX_GROUND_NODES[id];
    const performance = LAX_GROUND_AIRCRAFT[type];
    return {
      ...node,
      nodeId: id,
      speedKnots: node.taxiway === "RAMP" ? performance.rampKnots : performance.taxiKnots,
    };
  });
}

function moveFlight(flight: Flight): { flight: Flight; event?: string; scoreDelta?: number; parked?: boolean; departed?: boolean } {
  const next = { ...flight };
  if (next.status === "STARTING") {
    next.timerTicks -= 1;
    if (next.timerTicks <= 0) {
      next.status = "READY";
      return { flight: next, event: `${next.callsign}: engine start complete, ready to taxi.` };
    }
    return { flight: next };
  }
  if (next.kind === "arrival" && next.status === "PARKED") {
    next.timerTicks -= 1;
    if (next.timerTicks <= 0) {
      next.completed = true;
      return {
        flight: next,
        event: `${next.callsign}: chocks in at ${LAX_GROUND_NODES[next.parkingNode ?? ""]?.label}; off scope.`,
        scoreDelta: PARKING_POINTS,
        parked: true,
      };
    }
    return { flight: next };
  }
  if (!["TAXIING", "LINING_UP", "TAKEOFF_ROLL", "ARRIVAL_ROLL"].includes(next.status)) return { flight: next };
  const target = next.route[next.routeIndex];
  if (!target) return { flight: next };
  const targetSpeed = target.speedKnots ?? LAX_GROUND_AIRCRAFT[next.type].taxiKnots;
  next.speed += Math.max(-2.5, Math.min(1.25, targetSpeed - next.speed));
  const distance = laxDistance(next, target);
  const travel = Math.max(0.01, (Math.max(next.speed, 2) * 1.68781) / TICKS_PER_SECOND / FEET_PER_MAP_PERCENT);
  next.heading = laxGroundHeading(next, target);
  if (distance <= travel) {
    next.x = target.x;
    next.y = target.y;
    next.currentNode = target.nodeId ?? next.currentNode;
    next.routeIndex += 1;
  } else {
    next.x += ((target.x - next.x) / distance) * travel;
    next.y += ((target.y - next.y) / distance) * travel;
  }
  if (next.routeIndex < next.route.length) return { flight: next };

  next.speed = 0;
  next.route = [];
  next.routeIndex = 0;
  if (next.status === "ARRIVAL_ROLL") {
    const handoff = next.destinationNode?.split(":")[1];
    next.currentNode = handoff;
    next.destinationNode = undefined;
    next.status = "AWAITING_TAXI";
    return { flight: next, event: `${next.callsign}: clear of Runway ${next.runway} at ${handoff}, with Ground.` };
  }
  if (next.status === "TAKEOFF_ROLL") {
    next.completed = true;
    return { flight: next, event: `${next.callsign}: airborne Runway ${next.runway}, off scope.`, scoreDelta: DEPARTURE_POINTS, departed: true };
  }
  if (next.status === "LINING_UP") {
    next.status = "LINE_UP";
    return { flight: next, event: `${next.callsign}: lined up Runway ${next.runway}.` };
  }
  if (next.destinationNode?.startsWith("RWY:")) {
    next.status = "HOLD_SHORT";
    return { flight: next, event: `${next.callsign}: holding short Runway ${next.runway}.` };
  }
  if (next.destinationNode && LAX_GROUND_NODES[next.destinationNode]?.kind === "gate") {
    next.parkingNode = next.destinationNode;
    next.currentNode = next.destinationNode;
    next.destinationNode = undefined;
    next.status = "PARKED";
    next.timerTicks = ARRIVAL_GATE_SERVICE_SECONDS * TICKS_PER_SECOND;
    return { flight: next, event: `${next.callsign}: at ${LAX_GROUND_NODES[next.parkingNode].label}, setting chocks.` };
  }
  return { flight: next };
}

function detectConflicts(world: World) {
  const active = world.aircraft.filter((flight) => !flight.completed);
  const keys: string[] = [];
  let next = world;
  for (let first = 0; first < active.length; first += 1) {
    for (let second = first + 1; second < active.length; second += 1) {
      const a = active[first];
      const b = active[second];
      if (![a.status, b.status].some((status) => ["TAXIING", "LINING_UP", "TAKEOFF_ROLL", "ARRIVAL_ROLL"].includes(status))) continue;
      const separation = laxDistance(a, b);
      const key = [a.callsign, b.callsign].sort().join(":");
      if (separation < CONFLICT_DISTANCE_PERCENT) keys.push(key);
      if (separation < COLLISION_DISTANCE_PERCENT && !next.failure) {
        next = { ...next, failure: { reason: "collision", detail: `${a.callsign} and ${b.callsign} collided on the movement area.` } };
      } else if (separation < CONFLICT_DISTANCE_PERCENT && !world.activeConflictKeys.includes(key)) {
        next = addSafetyStrike(next, `Surface conflict between ${a.callsign} and ${b.callsign}`);
      }
    }
  }
  return { ...next, activeConflictKeys: keys };
}

function advanceOnce(previous: World) {
  if (previous.failure) return previous;
  let world: World = { ...previous, tick: previous.tick + 1 };
  if (world.tick >= world.nextArrival.dueTick) {
    const incoming = world.nextArrival;
    if (runwayPairOccupied(world, incoming.runway)) {
      world = addSafetyStrike(
        { ...world, nextArrival: { ...incoming, dueTick: world.tick + 40 * TICKS_PER_SECOND } },
        `${incoming.callsign} sent around by Tower because the ${incoming.runway}/${LAX_RUNWAYS[incoming.runway].pairedRunway} complex was occupied`,
      );
    } else {
      world = spawnArrival(world);
    }
  }
  if (world.tick >= world.nextDepartureTick) world = spawnDeparture(world);
  const events: Array<{ message: string; tone: RadioEvent["tone"] }> = [];
  let score = world.score;
  let parked = world.parkedArrivals;
  let departed = world.safeDepartures;
  const aircraft = world.aircraft.map((flight) => {
    const result = moveFlight(flight);
    if (result.event) events.push({ message: result.event, tone: result.parked || result.departed ? "success" : "pilot" });
    score += result.scoreDelta ?? 0;
    if (result.parked) parked += 1;
    if (result.departed) departed += 1;
    return result.flight;
  }).filter((flight) => !flight.completed);
  world = { ...world, aircraft, score, parkedArrivals: parked, safeDepartures: departed };
  for (const event of events) world = appendEvent(world, event.tone, event.message);
  return detectConflicts(world);
}

function advanceWorld(world: World, ticks: number) {
  let next = world;
  for (let index = 0; index < ticks; index += 1) {
    next = advanceOnce(next);
    if (next.failure) break;
  }
  return next;
}

function requestedTaxiway(tokens: string[]): LaxTaxiway | undefined {
  const index = tokens.indexOf("VIA");
  const token = index >= 0 ? tokens[index + 1] : undefined;
  const aliases: Record<string, LaxTaxiway> = {
    C: "C", CHARLIE: "C", D: "D", DELTA: "D", N: "N", NOVEMBER: "N", P: "P", PAPA: "P",
  };
  return token ? aliases[token] : undefined;
}

function normalizeGateGroup(token: string): LaxGateGroup | null {
  if (["T1", "TERMINAL1"].includes(token)) return "T1";
  if (["T2", "T3", "T23", "TERMINAL2", "TERMINAL3"].includes(token)) return "T23";
  if (["TBIT", "TB", "TERMINALB", "B"].includes(token)) return "TBIT";
  if (["T4", "TERMINAL4"].includes(token)) return "T4";
  if (["T6", "TERMINAL6"].includes(token)) return "T6";
  if (["T7", "T8", "T78", "TERMINAL7", "TERMINAL8"].includes(token)) return "T78";
  if (["WEST", "WESTGATES", "WGC"].includes(token)) return "WEST";
  return null;
}

function issueCommand(previous: World, raw: string) {
  const tokens = raw.toUpperCase().replaceAll(",", " ").trim().split(/\s+/);
  const index = previous.aircraft.findIndex((flight) => flight.callsign === tokens[0]);
  if (index < 0) return appendEvent(previous, "warning", `${tokens[0] || "Unknown flight"}: not on Ground frequency.`);
  const flight = { ...previous.aircraft[index] };
  const aircraft = [...previous.aircraft];
  const action = tokens[1];
  const accept = (updated: Flight, readback: string) => {
    aircraft[index] = updated;
    return appendEvent({ ...previous, aircraft }, "pilot", `${updated.callsign}: ${readback}.`);
  };
  const reject = (message: string) => appendEvent(previous, "warning", message);

  if (["START", "STARTUP", "SU"].includes(action)) {
    if (flight.kind !== "departure" || flight.status !== "PARKED") return reject(`${flight.callsign}: unable start from ${STATUS_LABELS[flight.status].toLowerCase()}.`);
    flight.status = "STARTING";
    flight.timerTicks = LAX_GROUND_AIRCRAFT[flight.type].engineStartSeconds * TICKS_PER_SECOND;
    return accept(flight, `engine start approved, advise ready in ${LAX_GROUND_AIRCRAFT[flight.type].engineStartSeconds} seconds`);
  }
  if (["HOLD", "STOP"].includes(action)) {
    if (!["TAXIING", "LINING_UP"].includes(flight.status)) return reject(`${flight.callsign}: already ${STATUS_LABELS[flight.status].toLowerCase()}.`);
    flight.priorStatus = flight.status;
    flight.status = "POSITION_HOLD";
    flight.speed = 0;
    return accept(flight, "hold position");
  }
  if (["CONTINUE", "RESUME", "PROCEED"].includes(action)) {
    if (flight.status !== "POSITION_HOLD") return reject(`${flight.callsign}: no held taxi clearance to resume.`);
    flight.status = flight.priorStatus === "LINING_UP" ? "LINING_UP" : "TAXIING";
    flight.priorStatus = undefined;
    return accept(flight, "continue taxi");
  }
  if (["TAXI", "TX"].includes(action)) {
    if (!flight.currentNode) return reject(`${flight.callsign}: surface position unresolved.`);
    const via = requestedTaxiway(tokens);
    if (["RWY", "RUNWAY"].includes(tokens[2])) {
      if (flight.kind !== "departure" || flight.status !== "READY") return reject(`${flight.callsign}: engine start must be complete before taxi.`);
      const runway = tokens[3] as LaxRunwayId;
      if (!KLAX_GROUND.departureRunways.includes(runway as "24L" | "25R")) return reject(`${flight.callsign}: west operations departures use Runway 24L or 25R.`);
      const destination = runway === "24L" ? "N24L" : "S25R";
      const defaultVia: LaxTaxiway = runway === "24L" ? "D" : "C";
      const route = shortestLaxGroundRoute(flight.currentNode, destination, via ?? defaultVia);
      if (!route) return reject(`${flight.callsign}: no route to Runway ${runway} via ${via ?? defaultVia}.`);
      flight.runway = runway;
      flight.status = "TAXIING";
      flight.parkingNode = undefined;
      flight.destinationNode = `RWY:${runway}`;
      flight.route = routePointsFromNodeIds(route, flight.type);
      flight.routeIndex = 0;
      return accept(flight, `taxi Runway ${runway} via ${via ?? defaultVia}, hold short`);
    }
    if (flight.kind !== "arrival" || flight.status !== "AWAITING_TAXI") return reject(`${flight.callsign}: gate taxi clearance is available only after runway exit.`);
    const destinationToken = tokens[2];
    const explicitGate = LAX_GROUND_NODES[destinationToken];
    const group = explicitGate?.gateGroup ?? normalizeGateGroup(destinationToken);
    if (!group) return reject(`${flight.callsign}: use T1, T3, TBIT, T4, T6, T7, WEST, or a modeled gate number.`);
    if (!LAX_GROUND_AIRCRAFT[flight.type].allowedGates.includes(group)) {
      return reject(`${flight.callsign}: ${flight.type} requires ${LAX_GROUND_AIRCRAFT[flight.type].allowedGates.map((item) => LAX_GATE_GROUP_LABELS[item]).join(" or ")}.`);
    }
    const occupied = occupiedGateNodes(previous);
    const gate = explicitGate?.gateGroup
      ? !occupied.has(explicitGate.id) ? explicitGate : undefined
      : laxNodesForGateGroup(group).find((node) => !occupied.has(node.id));
    if (!gate) return reject(`${flight.callsign}: no open ${LAX_GATE_GROUP_LABELS[group]} position.`);
    const route = shortestLaxGroundRoute(flight.currentNode, gate.id, via);
    if (!route) return reject(`${flight.callsign}: unable route to ${gate.label}${via ? ` via ${via}` : ""}.`);
    flight.status = "TAXIING";
    flight.destinationNode = gate.id;
    flight.route = routePointsFromNodeIds(route, flight.type);
    flight.routeIndex = 0;
    return accept(flight, `taxi ${LAX_GATE_GROUP_LABELS[group]}${via ? ` via ${via}` : " via published taxiways"}, gate ${gate.label.replace("GATE ", "")}`);
  }

  const lineup = ["LINEUP", "LU", "LINE-UP"].includes(action) || (action === "LINE" && tokens[2] === "UP");
  if (lineup) {
    if (flight.status !== "HOLD_SHORT") return reject(`${flight.callsign}: must be holding short before line up.`);
    const pairedArrival = LAX_RUNWAYS[flight.runway].pairedRunway as "24R" | "25L";
    if (runwayPairOccupied(previous, pairedArrival, flight.callsign)) return reject(`${flight.callsign}: hold short, runway complex occupied.`);
    if (previous.nextArrival.runway === pairedArrival && secondsUntilArrival(previous) < ARRIVAL_RUNWAY_BUFFER_SECONDS) {
      return reject(`${flight.callsign}: hold short, ${previous.nextArrival.callsign} inside ${ARRIVAL_RUNWAY_BUFFER_SECONDS} seconds on ${pairedArrival}.`);
    }
    const runway = LAX_RUNWAYS[flight.runway];
    flight.status = "LINING_UP";
    flight.destinationNode = undefined;
    flight.routeIndex = 0;
    flight.route = [
      { ...runway.thresholdEast, speedKnots: 8 },
      { x: runway.thresholdEast.x - 1.8, y: runway.thresholdEast.y, speedKnots: 5 },
    ];
    return accept(flight, `Runway ${flight.runway}, line up and wait`);
  }
  if (["TAKEOFF", "TO", "T"].includes(action)) {
    if (flight.status !== "LINE_UP") return reject(`${flight.callsign}: takeoff requires line up on the assigned runway.`);
    const pairedArrival = LAX_RUNWAYS[flight.runway].pairedRunway as "24R" | "25L";
    if (previous.nextArrival.runway === pairedArrival && secondsUntilArrival(previous) < ARRIVAL_RUNWAY_BUFFER_SECONDS) {
      return reject(`${flight.callsign}: hold position, insufficient gap ahead of ${previous.nextArrival.callsign}.`);
    }
    const runway = LAX_RUNWAYS[flight.runway];
    const takeoff = LAX_GROUND_AIRCRAFT[flight.type].takeoffSpeedKnots;
    flight.status = "TAKEOFF_ROLL";
    flight.speed = 0;
    flight.routeIndex = 0;
    flight.route = [
      { x: runway.thresholdEast.x - 8, y: runway.thresholdEast.y, speedKnots: 55 },
      { x: runway.thresholdEast.x - 20, y: runway.thresholdEast.y, speedKnots: 105 },
      { ...runway.thresholdWest, speedKnots: takeoff },
      { x: Math.max(2, runway.thresholdWest.x - 8), y: runway.thresholdWest.y, speedKnots: takeoff + 10 },
    ];
    return accept(flight, `Runway ${flight.runway}, cleared for takeoff`);
  }
  return reject(`${flight.callsign}: command not understood. Try START, TAXI, HOLD, CONTINUE, LINEUP, or TAKEOFF.`);
}

function location(flight: Flight) {
  if (["ARRIVAL_ROLL", "TAKEOFF_ROLL", "LINE_UP", "LINING_UP"].includes(flight.status)) return `RWY ${flight.runway}`;
  return flight.currentNode ? LAX_GROUND_NODES[flight.currentNode]?.label ?? flight.currentNode : "MOVEMENT AREA";
}

function statusTimer(flight: Flight) {
  if (flight.status === "STARTING" || (flight.kind === "arrival" && flight.status === "PARKED")) {
    return `${STATUS_LABELS[flight.status]} · ${formatCountdown(Math.ceil(flight.timerTicks / TICKS_PER_SECOND))}`;
  }
  return STATUS_LABELS[flight.status];
}

function runwayThresholdMarks(runway: LaxRunwayId) {
  const surface = LAX_RUNWAYS[runway];
  return [surface.thresholdWest.x + 0.6, surface.thresholdEast.x - 0.6].flatMap((x, end) =>
    [-0.75, -0.25, 0.25, 0.75].map((offset) => (
      <line key={`${runway}-${end}-${offset}`} x1={x} x2={x} y1={surface.thresholdWest.y + offset - 0.16} y2={surface.thresholdWest.y + offset + 0.16} />
    )),
  );
}

export function LaxGroundSimulator() {
  const [world, setWorld] = useState<World>(initialWorld);
  const [command, setCommand] = useState("");
  const [selected, setSelected] = useState<string | null>(null);
  const [paused, setPaused] = useState(false);
  const [speedIndex, setSpeedIndex] = useState(0);
  const [showHelp, setShowHelp] = useState(false);
  const [showStats, setShowStats] = useState(false);
  const [showFinish, setShowFinish] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const lastUpdateRef = useRef<number | null>(null);
  const pendingTicksRef = useRef(0);
  const simulationSpeed = SIMULATION_SPEEDS[speedIndex];
  const arrivalSeconds = secondsUntilArrival(world);
  const visibleFlights = useMemo(() => [...world.aircraft].sort((a, b) => a.kind === b.kind ? a.createdTick - b.createdTick : a.kind === "arrival" ? -1 : 1), [world.aircraft]);

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
      pendingTicksRef.current += ((now - prior) / 1000) * TICKS_PER_SECOND * simulationSpeed;
      const ticks = Math.min(Math.floor(pendingTicksRef.current), MAX_CATCH_UP_TICKS);
      if (ticks < 1) return;
      pendingTicksRef.current -= ticks;
      setWorld((current) => advanceWorld(current, ticks));
    }, 100);
    return () => window.clearInterval(interval);
  }, [paused, simulationSpeed, world.failure]);

  useEffect(() => {
    const focus = (event: KeyboardEvent) => {
      if (event.key === "/" && !showHelp && !showStats) {
        event.preventDefault();
        inputRef.current?.focus();
      }
    };
    window.addEventListener("keydown", focus);
    return () => window.removeEventListener("keydown", focus);
  }, [showHelp, showStats]);

  const transmit = (event: FormEvent) => {
    event.preventDefault();
    const value = command.trim();
    if (!value) return;
    const global = value.toUpperCase();
    if (global === "HELP") setShowHelp(true);
    else if (global === "PAUSE") setPaused((current) => !current);
    else if (global === "STATS") setShowStats(true);
    else if (["EXIT", "QUIT"].includes(global)) setShowFinish(true);
    else setWorld((current) => issueCommand(current, value));
    setCommand("");
  };

  const reset = () => {
    setWorld(initialWorld());
    setSelected(null);
    setCommand("");
    setPaused(false);
  };

  return (
    <main className="sim-shell ground-sim-shell lax-ground-shell">
      <header className="top-bar ground-top-bar">
        <Link className="brand-block" href="/" aria-label="Finish LAX ground shift" onClick={(event) => { event.preventDefault(); setShowFinish(true); }}>
          <div className="brand-mark" aria-hidden="true">PR</div>
          <div><p className="eyebrow">PACIFIC RADAR · GROUND</p><h1>Los Angeles Ground</h1></div>
        </Link>
        <div className="status-ribbon" aria-label="Los Angeles surface conditions">
          <div><span>FIELD</span><strong>LAX · 128&apos;</strong></div>
          <div><span>FLOW</span><strong>WEST OPS</strong></div>
          <div><span>DEP</span><strong>24L · 25R</strong></div>
          <div className={arrivalSeconds <= ARRIVAL_RUNWAY_BUFFER_SECONDS ? "arrival-alert" : ""}><span>NEXT ARR</span><strong>{world.nextArrival.runway} · {formatCountdown(arrivalSeconds)}</strong></div>
          <div><span>SIM</span><strong>{formatCountdown(world.tick / TICKS_PER_SECOND)}</strong></div>
        </div>
        <div className="header-actions"><button className="ghost-button" onClick={() => setShowHelp(true)}>Command guide</button><button className={paused ? "primary-button" : "ghost-button"} onClick={() => setPaused((value) => !value)}>{paused ? "Resume" : "Pause"}</button></div>
      </header>

      <section className="workspace ground-workspace">
        <div className="radar-column"><div className="radar-frame ground-frame">
          <div className={`ground-map lax-ground-map ${paused ? "simulation-paused" : ""}`} aria-label="Interactive simulated airport surface display of Los Angeles International Airport">
            <div className="ground-chart-layer" /><div className="ground-map-tint" />
            <svg className="ground-surface-layer" viewBox={KLAX_GROUND_CHART.viewBox} preserveAspectRatio="xMidYMid meet" aria-label="LAX runways, taxiways, terminal ramps, intersections, and gates">
              <g className="ground-chart-geometry">
              <g className="ground-airport-context">
                <polygon className="ground-airport-boundary" points="5,23 82,23 89,31 89,68 82,75 5,75" />
                {LAX_SERVICE_ROADS.map((points, index) => <polyline className="ground-perimeter-road" key={`lax-road-${index}`} points={points} />)}
                {LAX_APRONS.map((points, index) => <polygon className="ground-apron-shape" key={`lax-apron-${index}`} points={points} />)}
                {LAX_TERMINAL_BUILDINGS.map((points, index) => <polygon className="ground-building-shape" key={`lax-terminal-${index}`} points={points} />)}
              </g>
              {(Object.keys(LAX_RUNWAYS) as LaxRunwayId[]).map((runway) => {
                const surface = LAX_RUNWAYS[runway];
                return <g key={runway}><line className={`ground-runway-outline lax-runway-${surface.role}`} x1={surface.thresholdWest.x} y1={surface.thresholdWest.y} x2={surface.thresholdEast.x} y2={surface.thresholdEast.y} /><line className="ground-runway-active" x1={surface.thresholdWest.x} y1={surface.thresholdWest.y} x2={surface.thresholdEast.x} y2={surface.thresholdEast.y} /><g className="ground-threshold-markings">{runwayThresholdMarks(runway)}</g></g>;
              })}
              {Object.entries(TAXIWAY_PATHS).map(([name, points]) => <polyline className="ground-taxiway-pavement" key={`${name}-pavement`} points={points.map((point) => `${point.x},${point.y}`).join(" ")} />)}
              {Object.entries(TAXIWAY_PATHS).map(([name, points]) => <polyline className="ground-taxiway-line" key={name} points={points.map((point) => `${point.x},${point.y}`).join(" ")} />)}
              {LAX_GROUND_EDGES.filter((edge) => {
                const a = LAX_GROUND_NODES[edge.from]; const b = LAX_GROUND_NODES[edge.to];
                return a.taxiway === "RAMP" || b.taxiway === "RAMP" || ["N", "P"].includes(a.taxiway) || ["N", "P"].includes(b.taxiway);
              }).map((edge) => <line className="ground-taxiway-pavement ground-ramp-pavement" key={`${edge.from}-${edge.to}-pavement`} x1={LAX_GROUND_NODES[edge.from].x} y1={LAX_GROUND_NODES[edge.from].y} x2={LAX_GROUND_NODES[edge.to].x} y2={LAX_GROUND_NODES[edge.to].y} />)}
              {LAX_GROUND_EDGES.filter((edge) => {
                const a = LAX_GROUND_NODES[edge.from]; const b = LAX_GROUND_NODES[edge.to];
                return a.taxiway === "RAMP" || b.taxiway === "RAMP" || ["N", "P"].includes(a.taxiway) || ["N", "P"].includes(b.taxiway);
              }).map((edge) => <line className="ground-taxiway-line ground-ramp-link" key={`${edge.from}-${edge.to}`} x1={LAX_GROUND_NODES[edge.from].x} y1={LAX_GROUND_NODES[edge.from].y} x2={LAX_GROUND_NODES[edge.to].x} y2={LAX_GROUND_NODES[edge.to].y} />)}
              <line className="ground-intersection-pavement" x1="57.3" y1="42.1" x2="57.8" y2="39.2" /><line className="ground-intersection-pavement" x1="72.3" y1="59.2" x2="73" y2="62.9" />
              <polyline className="ground-intersection-pavement" points="25.5,31.9 23.5,35.6 23,42.1" /><polyline className="ground-intersection-pavement" points="36,67.3 34,65.1 27.5,59.2" />
              <line className="ground-runway-access" x1="57.3" y1="42.1" x2="57.8" y2="39.2" /><line className="ground-runway-access" x1="72.3" y1="59.2" x2="73" y2="62.9" />
              <polyline className="ground-runway-exit" points="25.5,31.9 23.5,35.6 23,42.1" /><polyline className="ground-runway-exit" points="36,67.3 34,65.1 27.5,59.2" />
              {(["D2", "D3", "D4", "D5", "C2", "C3", "C4", "C5", "C6", "N1", "N2", "P1", "P2", "N24L", "S25R"] as const).map((id) => <g className="ground-node-mark" key={id}><circle cx={LAX_GROUND_NODES[id].x} cy={LAX_GROUND_NODES[id].y} r="0.52" /><text x={LAX_GROUND_NODES[id].x + 0.8} y={LAX_GROUND_NODES[id].y - 0.65}>{LAX_GROUND_NODES[id].label}</text></g>)}
              <text className="ground-runway-number" x="52.2" y="30.3">24R ARR</text><text className="ground-runway-number" x="54.6" y="38">24L DEP</text><text className="ground-runway-number" x="68.5" y="61.5">25R DEP</text><text className="ground-runway-number" x="65.5" y="70">25L ARR</text>
              <text className="ground-area-label" x="47" y="34.6">E</text><text className="ground-area-label" x="48" y="41.3">D · NORTH GROUND 121.65</text><text className="ground-area-label" x="48" y="58.4">C · SOUTH GROUND 121.75</text><text className="ground-area-label" x="51" y="66.2">H</text>
              <text className="ground-area-label" x="52" y="46.2">T1</text><text className="ground-area-label" x="42" y="46.2">T2 / T3</text><text className="ground-area-label" x="28" y="46.3">TERMINAL B</text><text className="ground-area-label" x="23" y="55.3">WEST GATES</text><text className="ground-area-label" x="34" y="57.3">T4</text><text className="ground-area-label lax-closed-label" x="41" y="57.3">T5 CLOSED</text><text className="ground-area-label" x="47" y="57.3">T6</text><text className="ground-area-label" x="59" y="57.3">T7 / T8</text>
              </g>
            </svg>
            <div className="arrival-board" aria-live="polite"><span>NEXT TOWER ARRIVAL</span><strong>{world.nextArrival.callsign}</strong><small>{world.nextArrival.type} · RWY {world.nextArrival.runway} · {formatCountdown(arrivalSeconds)}</small></div>
            <div className="ground-map-key" aria-label="Surface map legend"><span><i className="arrival-key" /> arrival runway</span><span><i className="hold-key" /> hold short</span></div>
            {visibleFlights.map((flight) => {
              const chartPosition = groundChartScreenPosition(flight, KLAX_GROUND_CHART);
              return <button aria-label={`${flight.callsign}, ${flight.type}, ${STATUS_LABELS[flight.status]}`} className={`ground-aircraft ${flight.kind} ${selected === flight.callsign ? "selected" : ""} ground-aircraft-${LAX_GROUND_AIRCRAFT[flight.type].category}`} key={flight.callsign} onClick={() => { setSelected(flight.callsign); setCommand(`${flight.callsign} `); inputRef.current?.focus(); }} style={{ left: `${chartPosition.left}%`, top: `${chartPosition.top}%`, transform: `translate(-50%, -50%) rotate(${flight.heading}deg)` }} type="button"><svg aria-hidden="true" viewBox="0 0 28 28"><path d="M14 1.5 17 11l8.5 4v2.7L17 16.5l-1 7 3 2v1.5l-5-1-5 1v-1.5l3-2-1-7-8.5 1.2V15l8.5-4z" /></svg><span style={{ transform: `rotate(${-flight.heading}deg)` }}><strong>{flight.callsign}</strong><small>{flight.type} · {Math.round(flight.speed)}KT</small></span></button>;
            })}
            <div className="ground-chart-ident" aria-hidden="true">KLAX · OPER MODE</div>
            <div className="map-attribution">SIMULATED AIRPORT SURFACE DISPLAY · FAA KLAX DIAGRAM 26190 · NOT FOR NAVIGATION</div>
            {paused ? <div className="pause-indicator" role="status"><strong>Ground shift paused</strong><span>Traffic, arrivals, and the simulation clock are frozen</span></div> : null}
          </div>
        </div></div>

        <aside className="side-panel ground-side-panel">
          <section className="panel-section radio-section"><div className="section-heading"><div><p className="eyebrow">LAX GROUND · 121.65 / 121.75</p><h2>Radio log</h2></div><span className="live-indicator">LIVE</span></div><div className="event-log" aria-live="polite">{world.events.slice(-2).reverse().map((item, index) => <div className={`event-row ${item.tone}`} key={`${item.tick}-${index}`}><span>{formatCountdown(item.tick / TICKS_PER_SECOND)}</span><p>{item.message}</p></div>)}</div></section>
          <section className="command-deck" aria-label="LAX Ground clearance console"><form className="command-form" onSubmit={transmit}><div className="command-input-wrap"><span className="prompt-symbol">›</span><input ref={inputRef} aria-label="Ground control command" autoComplete="off" spellCheck={false} value={command} onChange={(event) => setCommand(event.target.value)} /><button type="submit">Send</button></div></form></section>
          <section className="score-card ground-score-card"><div className="score-total"><span>SCORE</span><strong>{world.score.toLocaleString()}</strong></div><div className="score-metrics"><span><strong>{world.parkedArrivals}</strong> parked</span><span><strong>{world.safeDepartures}</strong> departed</span><span><strong>{world.safetyStrikes}/3</strong> strikes</span></div></section>
          <section className="panel-section strips-section"><div className="section-heading"><div><p className="eyebrow">YOUR MOVEMENT AREA</p><h2>Ground traffic</h2></div><span>{visibleFlights.length} active</span></div><div className="strip-stack ground-strip-stack">{visibleFlights.map((flight) => <button className={`flight-strip ground-flight-strip ${flight.kind} ${selected === flight.callsign ? "selected" : ""}`} key={flight.callsign} onClick={() => { setSelected(flight.callsign); setCommand(`${flight.callsign} `); inputRef.current?.focus(); }}><span className="strip-cell strip-ident"><small>CALLSIGN</small><strong>{flight.callsign}</strong><em>{flight.type} · {LAX_GROUND_AIRCRAFT[flight.type].label}</em></span><span className="strip-cell"><small>STATUS</small><strong>{statusTimer(flight)}</strong></span><span className="strip-cell"><small>POSITION</small><strong>{location(flight)}</strong></span><span className="strip-cell"><small>RWY / SPD</small><strong>{flight.runway} · {Math.round(flight.speed)}KT</strong></span></button>)}</div></section>
          <footer className="side-footer"><div className="speed-control-heading"><span>Simulation speed</span><strong>{simulationSpeed === 1 ? "Real life" : `${simulationSpeed}×`}</strong></div><input className="simulation-speed-slider" type="range" min="0" max={SIMULATION_SPEEDS.length - 1} step="1" value={speedIndex} aria-label="Ground simulation speed" onChange={(event) => setSpeedIndex(Number.parseInt(event.currentTarget.value, 10))} /><div className="speed-scale" aria-hidden="true">{SIMULATION_SPEEDS.map((speed, index) => <span className={speedIndex === index ? "active" : ""} key={speed}>{speed === 1 ? "Real life" : `${speed}×`}</span>)}</div></footer>
        </aside>
      </section>

      {showHelp ? <div className="modal-backdrop" role="presentation"><section className="command-modal ground-command-modal" role="dialog" aria-modal="true" aria-labelledby="lax-ground-command-title"><div className="modal-header"><div><p className="eyebrow">LAX SURFACE REFERENCE</p><h2 id="lax-ground-command-title">Ground command guide</h2></div><button aria-label="Close ground command guide" onClick={() => setShowHelp(false)}>×</button></div><p className="modal-intro">Use CALLSIGN + COMMAND. Tower lands arrivals automatically on the outer runways and hands them to Ground after crossing the paired inner runway. Select an aircraft or strip to insert its callsign.</p><div className="ground-fact-row"><span><strong>4</strong>RUNWAYS</span><span><strong>24R / 25L</strong>ARRIVALS</span><span><strong>24L / 25R</strong>DEPARTURES</span><span><strong>16</strong>MODELED GATES</span><span><strong>T5</strong>CLOSED</span></div><div className="command-grid ground-command-grid">{GROUND_COMMANDS.map(([example, description]) => <div key={example}><code>{example}</code><span>{description}</span></div>)}</div><div className="safety-note ground-safety-note"><strong>Surface rules</strong><p>West operations use the outer runways for arrivals and inner runways for departures. Protect each close parallel pair: 24R with 24L, and 25L with 25R. Lineup and takeoff are blocked inside a {ARRIVAL_RUNWAY_BUFFER_SECONDS}-second paired-arrival window.</p><p>Normal airline taxi is type-limited to 18–21 knots and terminal ramps to 7–9 knots. Engine starts run 48–120 seconds by type. Landing and takeoff rolls use aircraft-specific reference speeds.</p><p>Use D for the north terminal perimeter and C for the south. N and P are the modeled north/south transition corridors. Terminal 5 is not assignable while its current reconstruction closure is in effect.</p><p>Parking an arrival scores +{PARKING_POINTS}; the aircraft remains for {ARRIVAL_GATE_SERVICE_SECONDS} seconds for chocks and shutdown, then disappears. A safe takeoff scores +{DEPARTURE_POINTS}. A conflict or blocked arrival complex costs {SAFETY_PENALTY}; three strikes end the shift.</p></div><button className="primary-button wide-button" onClick={() => setShowHelp(false)}>Return to ground view</button></section></div> : null}
      {showStats ? <div className="modal-backdrop" role="presentation"><section className="command-modal stats-modal" role="dialog" aria-modal="true" aria-labelledby="lax-ground-stats-title"><div className="modal-header"><div><p className="eyebrow">LIVE PERFORMANCE</p><h2 id="lax-ground-stats-title">Ground statistics</h2></div><button aria-label="Close ground statistics" onClick={() => setShowStats(false)}>×</button></div><div className="stats-grid"><div><span>Score</span><strong>{world.score}</strong></div><div><span>Parked</span><strong>{world.parkedArrivals}</strong></div><div><span>Departed</span><strong>{world.safeDepartures}</strong></div><div><span>Safety strikes</span><strong>{world.safetyStrikes}/3</strong></div></div><button className="primary-button wide-button" onClick={() => setShowStats(false)}>Return to surface</button></section></div> : null}
      {showFinish ? <div className="modal-backdrop finish-backdrop" role="presentation" onMouseDown={(event) => { if (event.currentTarget === event.target) setShowFinish(false); }}><section className="command-modal finish-modal" role="alertdialog" aria-modal="true" aria-labelledby="lax-ground-finish-title"><p className="eyebrow">END GROUND SHIFT</p><h2 id="lax-ground-finish-title">Finish LAX ground shift?</h2><p>Your score is {world.score.toLocaleString()} with {world.parkedArrivals} arrivals parked and {world.safeDepartures} safe departures.</p><div className="finish-actions"><button autoFocus className="ghost-button" onClick={() => setShowFinish(false)}>Keep playing</button><Link className="primary-button finish-confirm-button" href="/" replace>Finish shift</Link></div></section></div> : null}
      {world.failure ? <div className="modal-backdrop failure-backdrop" role="presentation"><section className="command-modal failure-modal" role="alertdialog" aria-modal="true" aria-labelledby="lax-ground-failure-title"><div className="failure-symbol" aria-hidden="true">!</div><p className="eyebrow">GROUND SHIFT FAILED</p><h2 id="lax-ground-failure-title">{world.failure.reason === "collision" ? "Surface collision" : "Safety limit exceeded"}</h2><p className="failure-explanation">{world.failure.detail} The movement area is closed and the simulation has stopped.</p><div className="failure-summary"><div><span>Score</span><strong>{world.score}</strong></div><div><span>Parked</span><strong>{world.parkedArrivals}</strong></div><div><span>Strikes</span><strong>{world.safetyStrikes}/3</strong></div></div><button className="failure-restart" onClick={reset}>Start new LAX shift</button></section></div> : null}
    </main>
  );
}
