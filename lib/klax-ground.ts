export type LaxGroundPoint = { x: number; y: number };

export type LaxTaxiway = "C" | "D" | "E" | "H" | "N" | "P" | "RAMP";

export type LaxGateGroup =
  | "T1"
  | "T23"
  | "TBIT"
  | "T4"
  | "T6"
  | "T78"
  | "WEST";

export type LaxGroundNode = LaxGroundPoint & {
  id: string;
  label: string;
  taxiway: LaxTaxiway;
  kind: "taxiway" | "gate";
  gateGroup?: LaxGateGroup;
};

export type LaxAircraftType =
  | "E175"
  | "CRJ7"
  | "B738"
  | "B739"
  | "B38M"
  | "A21N"
  | "B763"
  | "B789"
  | "B77W"
  | "A359"
  | "A388"
  | "B748";

export type LaxAircraftPerformance = {
  label: string;
  category: "regional" | "narrowbody" | "widebody" | "super";
  wake: "M" | "H" | "J";
  taxiKnots: number;
  rampKnots: number;
  landingSpeedKnots: number;
  takeoffSpeedKnots: number;
  engineStartSeconds: number;
  allowedGates: readonly LaxGateGroup[];
};

export type LaxRunwayId = "24R" | "24L" | "25R" | "25L";

export type LaxRunway = {
  id: LaxRunwayId;
  physical: string;
  role: "arrival" | "departure";
  lengthFeet: number;
  widthFeet: number;
  thresholdWest: LaxGroundPoint;
  thresholdEast: LaxGroundPoint;
  pairedRunway: LaxRunwayId;
  groundEntry: "D5" | "C6";
};

// The coordinates below use a fixed 100 x 100 close-in surface projection.
// Runways, taxiways, terminal footprints, markings, and aircraft all share
// that code-drawn coordinate system so the operational graph cannot drift.
export const KLAX_GROUND = {
  field: "KLAX",
  name: "Los Angeles International",
  elevationFeet: 128,
  flow: "WEST OPERATIONS",
  northGroundFrequency: "121.650",
  southGroundFrequency: "121.750",
  northTowerFrequency: "133.900",
  southTowerFrequency: "120.950",
  arrivalRunways: ["24R", "25L"] as const,
  departureRunways: ["24L", "25R"] as const,
  terminalSummary: {
    passengerTerminals: 9,
    modeledActiveGatePositions: 16,
    terminal5Closed: true,
  },
} as const;

export const LAX_RUNWAYS: Readonly<Record<LaxRunwayId, LaxRunway>> = {
  "24R": {
    id: "24R",
    physical: "06L/24R",
    role: "arrival",
    lengthFeet: 8926,
    widthFeet: 150,
    thresholdWest: { x: 10.8, y: 31.9 },
    thresholdEast: { x: 55.4, y: 31.9 },
    pairedRunway: "24L",
    groundEntry: "D5",
  },
  "24L": {
    id: "24L",
    physical: "06R/24L",
    role: "departure",
    lengthFeet: 10885,
    widthFeet: 150,
    thresholdWest: { x: 10.7, y: 39.2 },
    thresholdEast: { x: 57.8, y: 39.2 },
    pairedRunway: "24R",
    groundEntry: "D5",
  },
  "25R": {
    id: "25R",
    physical: "07L/25R",
    role: "departure",
    lengthFeet: 12923,
    widthFeet: 150,
    thresholdWest: { x: 20.8, y: 62.9 },
    thresholdEast: { x: 73.0, y: 62.9 },
    pairedRunway: "25L",
    groundEntry: "C6",
  },
  "25L": {
    id: "25L",
    physical: "07R/25L",
    role: "arrival",
    lengthFeet: 11095,
    widthFeet: 200,
    thresholdWest: { x: 21.2, y: 67.3 },
    thresholdEast: { x: 70.2, y: 67.3 },
    pairedRunway: "25R",
    groundEntry: "C6",
  },
};

export const LAX_GROUND_NODES: Readonly<Record<string, LaxGroundNode>> = {
  // North terminal perimeter - Taxiway D.
  D1: { id: "D1", label: "D WEST", x: 12.2, y: 42.1, taxiway: "D", kind: "taxiway" },
  D2: { id: "D2", label: "D7", x: 23.0, y: 42.1, taxiway: "D", kind: "taxiway" },
  D3: { id: "D3", label: "D9", x: 35.0, y: 42.1, taxiway: "D", kind: "taxiway" },
  D4: { id: "D4", label: "D10", x: 47.0, y: 42.1, taxiway: "D", kind: "taxiway" },
  D5: { id: "D5", label: "D EAST", x: 57.3, y: 42.1, taxiway: "D", kind: "taxiway" },

  // South terminal perimeter - Taxiway C.
  C1: { id: "C1", label: "C WEST", x: 15.5, y: 59.2, taxiway: "C", kind: "taxiway" },
  C2: { id: "C2", label: "C7", x: 27.5, y: 59.2, taxiway: "C", kind: "taxiway" },
  C3: { id: "C3", label: "C9", x: 39.5, y: 59.2, taxiway: "C", kind: "taxiway" },
  C4: { id: "C4", label: "C11", x: 51.5, y: 59.2, taxiway: "C", kind: "taxiway" },
  C5: { id: "C5", label: "C13", x: 63.2, y: 59.2, taxiway: "C", kind: "taxiway" },
  C6: { id: "C6", label: "C EAST", x: 72.3, y: 59.2, taxiway: "C", kind: "taxiway" },

  // Taxiways between each closely spaced runway pair.
  E1: { id: "E1", label: "E WEST", x: 12.5, y: 35.6, taxiway: "E", kind: "taxiway" },
  E2: { id: "E2", label: "E7", x: 23.5, y: 35.6, taxiway: "E", kind: "taxiway" },
  E3: { id: "E3", label: "E9", x: 35.5, y: 35.6, taxiway: "E", kind: "taxiway" },
  E4: { id: "E4", label: "E11", x: 47.0, y: 35.6, taxiway: "E", kind: "taxiway" },
  E5: { id: "E5", label: "E EAST", x: 55.8, y: 35.6, taxiway: "E", kind: "taxiway" },
  H1: { id: "H1", label: "H WEST", x: 22.0, y: 65.1, taxiway: "H", kind: "taxiway" },
  H2: { id: "H2", label: "H7", x: 34.0, y: 65.1, taxiway: "H", kind: "taxiway" },
  H3: { id: "H3", label: "H9", x: 46.0, y: 65.1, taxiway: "H", kind: "taxiway" },
  H4: { id: "H4", label: "H11", x: 58.0, y: 65.1, taxiway: "H", kind: "taxiway" },
  H5: { id: "H5", label: "H EAST", x: 69.8, y: 65.1, taxiway: "H", kind: "taxiway" },

  // Published north/south transition corridors through the terminal complex.
  N1: { id: "N1", label: "NORTH ROUTE", x: 17.0, y: 49.5, taxiway: "N", kind: "taxiway" },
  N2: { id: "N2", label: "CHECKPOINT 1", x: 17.0, y: 55.0, taxiway: "N", kind: "taxiway" },
  P1: { id: "P1", label: "SOUTH ROUTE", x: 56.8, y: 48.5, taxiway: "P", kind: "taxiway" },
  P2: { id: "P2", label: "CHECKPOINT 2", x: 56.8, y: 55.0, taxiway: "P", kind: "taxiway" },

  N24L: { id: "N24L", label: "RWY 24L HOLD", x: 57.4, y: 39.2, taxiway: "D", kind: "taxiway" },
  S25R: { id: "S25R", label: "RWY 25R HOLD", x: 72.5, y: 62.9, taxiway: "C", kind: "taxiway" },

  // Active gate positions. Gate labels use current published terminal ranges;
  // these sixteen positions are a playable subset, not a claim that LAX has
  // only sixteen gates.
  T1E: { id: "T1E", label: "TERMINAL 1 RAMP", x: 54.0, y: 45.0, taxiway: "RAMP", kind: "taxiway" },
  G12: { id: "G12", label: "GATE 12", x: 52.5, y: 47.0, taxiway: "RAMP", kind: "gate", gateGroup: "T1" },
  G15: { id: "G15", label: "GATE 15", x: 55.0, y: 47.2, taxiway: "RAMP", kind: "gate", gateGroup: "T1" },

  T23E: { id: "T23E", label: "TERMINAL 2/3 RAMP", x: 43.5, y: 45.0, taxiway: "RAMP", kind: "taxiway" },
  G24: { id: "G24", label: "GATE 24", x: 42.0, y: 47.2, taxiway: "RAMP", kind: "gate", gateGroup: "T23" },
  G34: { id: "G34", label: "GATE 34", x: 45.0, y: 47.0, taxiway: "RAMP", kind: "gate", gateGroup: "T23" },

  BE: { id: "BE", label: "TERMINAL B RAMP", x: 31.0, y: 50.0, taxiway: "RAMP", kind: "taxiway" },
  G132: { id: "G132", label: "GATE 132", x: 29.0, y: 47.5, taxiway: "RAMP", kind: "gate", gateGroup: "TBIT" },
  G148: { id: "G148", label: "GATE 148", x: 32.0, y: 47.4, taxiway: "RAMP", kind: "gate", gateGroup: "TBIT" },
  G202: { id: "G202", label: "GATE 202", x: 24.5, y: 51.5, taxiway: "RAMP", kind: "gate", gateGroup: "WEST" },
  G218: { id: "G218", label: "GATE 218", x: 27.0, y: 54.0, taxiway: "RAMP", kind: "gate", gateGroup: "WEST" },

  T4E: { id: "T4E", label: "TERMINAL 4 RAMP", x: 35.5, y: 56.0, taxiway: "RAMP", kind: "taxiway" },
  G42: { id: "G42", label: "GATE 42", x: 34.0, y: 54.2, taxiway: "RAMP", kind: "gate", gateGroup: "T4" },
  G46: { id: "G46", label: "GATE 46", x: 37.0, y: 54.0, taxiway: "RAMP", kind: "gate", gateGroup: "T4" },

  T6E: { id: "T6E", label: "TERMINAL 6 RAMP", x: 47.5, y: 56.0, taxiway: "RAMP", kind: "taxiway" },
  G62: { id: "G62", label: "GATE 62", x: 46.0, y: 54.2, taxiway: "RAMP", kind: "gate", gateGroup: "T6" },
  G66: { id: "G66", label: "GATE 66", x: 49.0, y: 54.0, taxiway: "RAMP", kind: "gate", gateGroup: "T6" },

  T78E: { id: "T78E", label: "TERMINAL 7/8 RAMP", x: 61.0, y: 56.0, taxiway: "RAMP", kind: "taxiway" },
  G72: { id: "G72", label: "GATE 72", x: 58.0, y: 53.6, taxiway: "RAMP", kind: "gate", gateGroup: "T78" },
  G76: { id: "G76", label: "GATE 76", x: 61.0, y: 53.8, taxiway: "RAMP", kind: "gate", gateGroup: "T78" },
  G82: { id: "G82", label: "GATE 82", x: 64.0, y: 54.2, taxiway: "RAMP", kind: "gate", gateGroup: "T78" },
  G86: { id: "G86", label: "GATE 86", x: 66.8, y: 55.0, taxiway: "RAMP", kind: "gate", gateGroup: "T78" },
};

const LAX_EDGE_PAIRS = [
  ["D1", "D2"], ["D2", "D3"], ["D3", "D4"], ["D4", "D5"], ["D5", "N24L"],
  ["C1", "C2"], ["C2", "C3"], ["C3", "C4"], ["C4", "C5"], ["C5", "C6"], ["C6", "S25R"],
  ["E1", "E2"], ["E2", "E3"], ["E3", "E4"], ["E4", "E5"],
  ["H1", "H2"], ["H2", "H3"], ["H3", "H4"], ["H4", "H5"],
  ["D1", "N1"], ["N1", "N2"], ["N2", "C1"],
  ["D5", "P1"], ["P1", "P2"], ["P2", "C5"],
  ["D5", "T1E"], ["T1E", "G12"], ["T1E", "G15"],
  ["D4", "T23E"], ["T23E", "G24"], ["T23E", "G34"],
  ["D3", "BE"], ["C2", "BE"], ["BE", "G132"], ["BE", "G148"], ["BE", "G202"], ["BE", "G218"],
  ["C3", "T4E"], ["T4E", "G42"], ["T4E", "G46"],
  ["C4", "T6E"], ["T6E", "G62"], ["T6E", "G66"],
  ["C5", "T78E"], ["T78E", "G72"], ["T78E", "G76"], ["T78E", "G82"], ["T78E", "G86"],
] as const;

export const LAX_GROUND_EDGES = LAX_EDGE_PAIRS.map(([from, to]) => ({ from, to }));

export const LAX_GATE_GROUP_LABELS: Record<LaxGateGroup, string> = {
  T1: "Terminal 1",
  T23: "Terminal 2/3",
  TBIT: "Terminal B",
  T4: "Terminal 4",
  T6: "Terminal 6",
  T78: "Terminal 7/8",
  WEST: "West Gates",
};

const domesticGates = ["T1", "T23", "T4", "T6", "T78"] as const;
const internationalGates = ["TBIT", "WEST"] as const;

export const LAX_GROUND_AIRCRAFT: Record<LaxAircraftType, LaxAircraftPerformance> = {
  E175: { label: "Embraer E175", category: "regional", wake: "M", taxiKnots: 18, rampKnots: 8, landingSpeedKnots: 126, takeoffSpeedKnots: 128, engineStartSeconds: 48, allowedGates: domesticGates },
  CRJ7: { label: "Bombardier CRJ-700", category: "regional", wake: "M", taxiKnots: 18, rampKnots: 8, landingSpeedKnots: 128, takeoffSpeedKnots: 130, engineStartSeconds: 50, allowedGates: domesticGates },
  B738: { label: "Boeing 737-800", category: "narrowbody", wake: "M", taxiKnots: 20, rampKnots: 9, landingSpeedKnots: 137, takeoffSpeedKnots: 145, engineStartSeconds: 70, allowedGates: domesticGates },
  B739: { label: "Boeing 737-900ER", category: "narrowbody", wake: "M", taxiKnots: 20, rampKnots: 9, landingSpeedKnots: 140, takeoffSpeedKnots: 148, engineStartSeconds: 72, allowedGates: domesticGates },
  B38M: { label: "Boeing 737 MAX 8", category: "narrowbody", wake: "M", taxiKnots: 20, rampKnots: 9, landingSpeedKnots: 138, takeoffSpeedKnots: 146, engineStartSeconds: 72, allowedGates: domesticGates },
  A21N: { label: "Airbus A321neo", category: "narrowbody", wake: "M", taxiKnots: 20, rampKnots: 9, landingSpeedKnots: 139, takeoffSpeedKnots: 147, engineStartSeconds: 75, allowedGates: domesticGates },
  B763: { label: "Boeing 767-300ER", category: "widebody", wake: "H", taxiKnots: 20, rampKnots: 8, landingSpeedKnots: 142, takeoffSpeedKnots: 154, engineStartSeconds: 88, allowedGates: ["TBIT", "WEST", "T4"] },
  B789: { label: "Boeing 787-9", category: "widebody", wake: "H", taxiKnots: 21, rampKnots: 8, landingSpeedKnots: 145, takeoffSpeedKnots: 158, engineStartSeconds: 95, allowedGates: internationalGates },
  B77W: { label: "Boeing 777-300ER", category: "widebody", wake: "H", taxiKnots: 21, rampKnots: 8, landingSpeedKnots: 149, takeoffSpeedKnots: 164, engineStartSeconds: 100, allowedGates: internationalGates },
  A359: { label: "Airbus A350-900", category: "widebody", wake: "H", taxiKnots: 21, rampKnots: 8, landingSpeedKnots: 145, takeoffSpeedKnots: 158, engineStartSeconds: 96, allowedGates: internationalGates },
  A388: { label: "Airbus A380-800", category: "super", wake: "J", taxiKnots: 18, rampKnots: 7, landingSpeedKnots: 149, takeoffSpeedKnots: 166, engineStartSeconds: 120, allowedGates: ["TBIT"] },
  B748: { label: "Boeing 747-8", category: "super", wake: "H", taxiKnots: 19, rampKnots: 7, landingSpeedKnots: 151, takeoffSpeedKnots: 167, engineStartSeconds: 115, allowedGates: internationalGates },
};

export function laxDistance(first: LaxGroundPoint, second: LaxGroundPoint) {
  return Math.hypot(second.x - first.x, second.y - first.y);
}

export function laxGroundHeading(first: LaxGroundPoint, second: LaxGroundPoint) {
  return (Math.atan2(second.x - first.x, first.y - second.y) * 180) / Math.PI;
}

export function laxNodesForGateGroup(group: LaxGateGroup) {
  return Object.values(LAX_GROUND_NODES).filter(
    (node) => node.kind === "gate" && node.gateGroup === group,
  );
}

function adjacentNodes(nodeId: string) {
  return LAX_GROUND_EDGES.flatMap((edge) => {
    if (edge.from === nodeId) return [edge.to];
    if (edge.to === nodeId) return [edge.from];
    return [];
  });
}

export function shortestLaxGroundRoute(from: string, to: string, via?: LaxTaxiway) {
  if (!LAX_GROUND_NODES[from] || !LAX_GROUND_NODES[to]) return null;
  const stateKey = (nodeId: string, usedVia: boolean) => `${nodeId}|${usedVia ? "1" : "0"}`;
  const startState = stateKey(from, !via || LAX_GROUND_NODES[from].taxiway === via);
  const distances = new Map<string, number>([[startState, 0]]);
  const previous = new Map<string, string>();
  const unvisited = new Set(
    Object.keys(LAX_GROUND_NODES).flatMap((id) => [stateKey(id, false), stateKey(id, true)]),
  );
  let destination: string | null = null;

  while (unvisited.size > 0) {
    let current: string | null = null;
    let best = Number.POSITIVE_INFINITY;
    for (const candidate of unvisited) {
      const distance = distances.get(candidate) ?? Number.POSITIVE_INFINITY;
      if (distance < best) {
        best = distance;
        current = candidate;
      }
    }
    if (!current || best === Number.POSITIVE_INFINITY) break;
    const [nodeId, viaFlag] = current.split("|");
    const usedVia = viaFlag === "1";
    if (nodeId === to && usedVia) {
      destination = current;
      break;
    }
    unvisited.delete(current);
    for (const neighbor of adjacentNodes(nodeId)) {
      const nextUsedVia = usedVia || !via || LAX_GROUND_NODES[neighbor].taxiway === via;
      const nextState = stateKey(neighbor, nextUsedVia);
      if (!unvisited.has(nextState)) continue;
      const distance = best + laxDistance(LAX_GROUND_NODES[nodeId], LAX_GROUND_NODES[neighbor]);
      if (distance < (distances.get(nextState) ?? Number.POSITIVE_INFINITY)) {
        distances.set(nextState, distance);
        previous.set(nextState, current);
      }
    }
  }
  if (!destination) return null;
  const route: string[] = [];
  let cursor: string | undefined = destination;
  while (cursor) {
    route.unshift(cursor.split("|")[0]);
    cursor = previous.get(cursor);
  }
  return route;
}
