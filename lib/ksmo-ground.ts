export type GroundPoint = {
  x: number;
  y: number;
};

export type TaxiwayName = "A" | "B" | "RAMP" | "BYPASS";

export type GroundNode = GroundPoint & {
  id: string;
  label: string;
  taxiway: TaxiwayName;
  kind: "taxiway" | "parking" | "bypass";
  parkingGroup?: ParkingGroup;
};

export type ParkingGroup =
  | "FBO"
  | "TRANSIENT"
  | "NORTHEAST"
  | "HANGAR"
  | "JSX";

export type GroundAircraftType =
  | "C172"
  | "PA28"
  | "DA42"
  | "PC12"
  | "C25A"
  | "AT46";

export type GroundAircraftPerformance = {
  label: string;
  category: "single" | "twin" | "turboprop" | "jet" | "airliner";
  taxiKnots: number;
  rampKnots: number;
  landingSpeedKnots: number;
  takeoffSpeedKnots: number;
  engineStartSeconds: number;
  arrivalExit: "B2" | "B3";
  allowedParking: readonly ParkingGroup[];
};

// The close-in Ground display is intentionally runway-horizontal: Runway 03 is
// on the left, Runway 21 is on the right, Taxiway A is above, and Taxiway B is
// below. Keeping the gameplay graph in this orientation makes every route,
// marking, label, and aircraft share the same undistorted surface projection.
const HORIZONTAL_THRESHOLD_03 = { x: 26.2, y: 56.7 } as const;

export function projectKsmoGroundPoint(point: GroundPoint): GroundPoint {
  return { x: point.x, y: point.y };
}

export const KSMO_GROUND = {
  field: "KSMO",
  name: "Santa Monica Municipal",
  elevationFeet: 170,
  groundFrequency: "121.900",
  towerFrequency: "120.100",
  activeRunway: "21",
  runway: {
    designation: "03/21",
    lengthFeet: 3500,
    widthFeet: 150,
    slopePercent: 1.2,
    threshold03: projectKsmoGroundPoint(HORIZONTAL_THRESHOLD_03),
    threshold21: projectKsmoGroundPoint({ x: 78.2, y: 56.7 }),
    pavement03: projectKsmoGroundPoint({ x: 20.0, y: 56.7 }),
    pavement21: projectKsmoGroundPoint({ x: 84.0, y: 56.7 }),
  },
  taxiways: ["A", "B"],
  runUpAreas: ["A2", "A5", "B2", "B5"],
  parkingSummary: {
    airlineGates: 0,
    jsxApronPositions: 2,
    modeledGeneralAviationStands: 14,
  },
} as const;

const HORIZONTAL_GROUND_NODES = {
  A1: { id: "A1", label: "A1", x: 24.6, y: 52.4, taxiway: "A", kind: "taxiway" },
  A2: { id: "A2", label: "A2", x: 31.0, y: 52.1, taxiway: "A", kind: "taxiway" },
  A3: { id: "A3", label: "A3", x: 43.4, y: 52.3, taxiway: "A", kind: "taxiway" },
  A4: { id: "A4", label: "A4", x: 62.2, y: 51.8, taxiway: "A", kind: "taxiway" },
  A5: { id: "A5", label: "A5", x: 77.2, y: 50.8, taxiway: "A", kind: "taxiway" },
  B1: { id: "B1", label: "B1", x: 24.7, y: 61.4, taxiway: "B", kind: "taxiway" },
  B2: { id: "B2", label: "B2", x: 31.3, y: 61.3, taxiway: "B", kind: "taxiway" },
  B3: { id: "B3", label: "B3", x: 43.7, y: 61.0, taxiway: "B", kind: "taxiway" },
  B4: { id: "B4", label: "B4", x: 62.6, y: 60.5, taxiway: "B", kind: "taxiway" },
  B5: { id: "B5", label: "B5", x: 78.0, y: 61.5, taxiway: "B", kind: "taxiway" },

  // Taxiways A and B continue around the unusable blast-pad pavement. These
  // waypoints keep routes on the visible bypass pavement rather than cutting
  // across either relocated-threshold area.
  W03N: { id: "W03N", label: "03 NORTH BYPASS", x: 20.2, y: 51.2, taxiway: "BYPASS", kind: "bypass" },
  W03W: { id: "W03W", label: "03 WEST BYPASS", x: 17.7, y: 56.6, taxiway: "BYPASS", kind: "bypass" },
  W03S: { id: "W03S", label: "03 SOUTH BYPASS", x: 20.3, y: 62.5, taxiway: "BYPASS", kind: "bypass" },
  E21N: { id: "E21N", label: "21 NORTH BYPASS", x: 81.4, y: 50.0, taxiway: "BYPASS", kind: "bypass" },
  E21E: { id: "E21E", label: "21 EAST BYPASS", x: 86.3, y: 55.8, taxiway: "BYPASS", kind: "bypass" },
  E21S: { id: "E21S", label: "21 SOUTH BYPASS", x: 82.0, y: 62.7, taxiway: "BYPASS", kind: "bypass" },

  // Ramp-entry nodes follow apron pavement so aircraft do not draw straight
  // routes through buildings when leaving or entering parking.
  FBOE: { id: "FBOE", label: "FBO ENTRY", x: 43.4, y: 49.8, taxiway: "RAMP", kind: "taxiway" },
  FBOR: { id: "FBOR", label: "FBO RAMP", x: 43.4, y: 48.2, taxiway: "RAMP", kind: "taxiway" },
  FBOA1: { id: "FBOA1", label: "FBO AISLE 1", x: 36.8, y: 48.2, taxiway: "RAMP", kind: "taxiway" },
  FBOA2: { id: "FBOA2", label: "FBO AISLE 2", x: 39.6, y: 48.2, taxiway: "RAMP", kind: "taxiway" },
  FBOA3: { id: "FBOA3", label: "FBO AISLE 3", x: 42.2, y: 48.2, taxiway: "RAMP", kind: "taxiway" },
  FBO1: { id: "FBO1", label: "FBO 1", x: 36.8, y: 47.1, taxiway: "RAMP", kind: "parking", parkingGroup: "FBO" },
  FBO2: { id: "FBO2", label: "FBO 2", x: 39.6, y: 46.3, taxiway: "RAMP", kind: "parking", parkingGroup: "FBO" },
  FBO3: { id: "FBO3", label: "FBO 3", x: 42.2, y: 47.2, taxiway: "RAMP", kind: "parking", parkingGroup: "FBO" },

  NEE: { id: "NEE", label: "NORTHEAST ENTRY", x: 76.2, y: 48.8, taxiway: "RAMP", kind: "taxiway" },
  NER: { id: "NER", label: "NORTHEAST RAMP", x: 73.2, y: 46.9, taxiway: "RAMP", kind: "taxiway" },
  NEA1: { id: "NEA1", label: "NORTHEAST AISLE 1", x: 69.8, y: 46.9, taxiway: "RAMP", kind: "taxiway" },
  NEA3: { id: "NEA3", label: "NORTHEAST AISLE 3", x: 76.8, y: 46.9, taxiway: "RAMP", kind: "taxiway" },
  JSXLA: { id: "JSXLA", label: "JSX LEAD 1", x: 71.4, y: 46.9, taxiway: "RAMP", kind: "taxiway" },
  JSXLB: { id: "JSXLB", label: "JSX LEAD 2", x: 74.0, y: 46.9, taxiway: "RAMP", kind: "taxiway" },
  NE1: { id: "NE1", label: "NE 1", x: 69.8, y: 45.2, taxiway: "RAMP", kind: "parking", parkingGroup: "NORTHEAST" },
  NE2: { id: "NE2", label: "NE 2", x: 73.2, y: 44.4, taxiway: "RAMP", kind: "parking", parkingGroup: "NORTHEAST" },
  NE3: { id: "NE3", label: "NE 3", x: 76.8, y: 44.7, taxiway: "RAMP", kind: "parking", parkingGroup: "NORTHEAST" },
  JSX1: { id: "JSX1", label: "JSX 1", x: 71.4, y: 48.2, taxiway: "RAMP", kind: "parking", parkingGroup: "JSX" },
  JSX2: { id: "JSX2", label: "JSX 2", x: 74.0, y: 48.1, taxiway: "RAMP", kind: "parking", parkingGroup: "JSX" },

  TRE: { id: "TRE", label: "TRANSIENT ENTRY", x: 80.0, y: 62.6, taxiway: "RAMP", kind: "taxiway" },
  TRR: { id: "TRR", label: "TRANSIENT RAMP", x: 80.0, y: 63.3, taxiway: "RAMP", kind: "taxiway" },
  TRA1: { id: "TRA1", label: "TRANSIENT AISLE 1", x: 79.8, y: 63.3, taxiway: "RAMP", kind: "taxiway" },
  TRA2: { id: "TRA2", label: "TRANSIENT AISLE 2", x: 82.3, y: 63.3, taxiway: "RAMP", kind: "taxiway" },
  TRA3: { id: "TRA3", label: "TRANSIENT AISLE 3", x: 84.8, y: 63.3, taxiway: "RAMP", kind: "taxiway" },
  TRA4: { id: "TRA4", label: "TRANSIENT AISLE 4", x: 87.3, y: 63.3, taxiway: "RAMP", kind: "taxiway" },
  TR1: { id: "TR1", label: "TRANSIENT 1", x: 79.8, y: 65.6, taxiway: "RAMP", kind: "parking", parkingGroup: "TRANSIENT" },
  TR2: { id: "TR2", label: "TRANSIENT 2", x: 82.3, y: 65.6, taxiway: "RAMP", kind: "parking", parkingGroup: "TRANSIENT" },
  TR3: { id: "TR3", label: "TRANSIENT 3", x: 84.8, y: 65.6, taxiway: "RAMP", kind: "parking", parkingGroup: "TRANSIENT" },
  TR4: { id: "TR4", label: "TRANSIENT 4", x: 87.3, y: 65.6, taxiway: "RAMP", kind: "parking", parkingGroup: "TRANSIENT" },

  HE: { id: "HE", label: "HANGAR ENTRY", x: 43.7, y: 62.7, taxiway: "RAMP", kind: "taxiway" },
  HR: { id: "HR", label: "SOUTH RAMP", x: 43.0, y: 63.3, taxiway: "RAMP", kind: "taxiway" },
  HA1: { id: "HA1", label: "HANGAR AISLE 1", x: 39.5, y: 63.3, taxiway: "RAMP", kind: "taxiway" },
  HA2: { id: "HA2", label: "HANGAR AISLE 2", x: 43.0, y: 63.3, taxiway: "RAMP", kind: "taxiway" },
  HA3: { id: "HA3", label: "HANGAR AISLE 3", x: 46.5, y: 63.3, taxiway: "RAMP", kind: "taxiway" },
  HA4: { id: "HA4", label: "HANGAR AISLE 4", x: 50.0, y: 63.3, taxiway: "RAMP", kind: "taxiway" },
  SH1: { id: "SH1", label: "SOUTH 1", x: 39.5, y: 65.2, taxiway: "RAMP", kind: "parking", parkingGroup: "HANGAR" },
  SH2: { id: "SH2", label: "SOUTH 2", x: 43.0, y: 65.2, taxiway: "RAMP", kind: "parking", parkingGroup: "HANGAR" },
  SH3: { id: "SH3", label: "SOUTH 3", x: 46.5, y: 65.2, taxiway: "RAMP", kind: "parking", parkingGroup: "HANGAR" },
  SH4: { id: "SH4", label: "SOUTH 4", x: 50.0, y: 65.2, taxiway: "RAMP", kind: "parking", parkingGroup: "HANGAR" },
} satisfies Readonly<Record<string, GroundNode>>;

export const GROUND_NODES: Readonly<Record<string, GroundNode>> =
  Object.fromEntries(
    Object.entries(HORIZONTAL_GROUND_NODES).map(([id, node]) => [
      id,
      { ...node, ...projectKsmoGroundPoint(node) },
    ]),
  );

const EDGE_PAIRS = [
  ["A1", "A2"], ["A2", "A3"], ["A3", "A4"], ["A4", "A5"],
  ["B1", "B2"], ["B2", "B3"], ["B3", "B4"], ["B4", "B5"],
  ["A1", "W03N"], ["W03N", "W03W"], ["W03W", "W03S"], ["W03S", "B1"],
  ["A5", "E21N"], ["E21N", "E21E"], ["E21E", "E21S"], ["E21S", "B5"],
  ["A3", "FBOE"], ["FBOE", "FBOR"], ["FBOR", "FBOA3"], ["FBOA3", "FBOA2"], ["FBOA2", "FBOA1"],
  ["FBOA1", "FBO1"], ["FBOA2", "FBO2"], ["FBOA3", "FBO3"],
  ["A5", "NEE"], ["NEE", "JSXLB"], ["NEA1", "JSXLA"], ["JSXLA", "NER"], ["NER", "JSXLB"], ["JSXLB", "NEA3"],
  ["NEA1", "NE1"], ["NER", "NE2"], ["NEA3", "NE3"], ["JSXLA", "JSX1"], ["JSXLB", "JSX2"],
  ["B5", "TRE"], ["TRE", "TRR"], ["TRR", "TRA1"], ["TRA1", "TRA2"], ["TRA2", "TRA3"], ["TRA3", "TRA4"],
  ["TRA1", "TR1"], ["TRA2", "TR2"], ["TRA3", "TR3"], ["TRA4", "TR4"],
  ["B3", "HE"], ["HE", "HA2"], ["HA1", "HA2"], ["HA2", "HA3"], ["HA3", "HA4"],
  ["HA1", "SH1"], ["HA2", "SH2"], ["HA3", "SH3"], ["HA4", "SH4"],
] as const;

export const GROUND_EDGES = EDGE_PAIRS.map(([from, to]) => ({ from, to }));

export const PARKING_GROUP_LABELS: Record<ParkingGroup, string> = {
  FBO: "Atlantic FBO",
  TRANSIENT: "Transient parking",
  NORTHEAST: "Northeast parking",
  HANGAR: "South hangars",
  JSX: "JSX apron",
};

export const GROUND_AIRCRAFT: Record<GroundAircraftType, GroundAircraftPerformance> = {
  C172: {
    label: "Cessna 172 Skyhawk",
    category: "single",
    taxiKnots: 12,
    rampKnots: 5,
    landingSpeedKnots: 65,
    takeoffSpeedKnots: 55,
    engineStartSeconds: 22,
    arrivalExit: "B3",
    allowedParking: ["FBO", "TRANSIENT", "NORTHEAST", "HANGAR"],
  },
  PA28: {
    label: "Piper PA-28 Archer",
    category: "single",
    taxiKnots: 12,
    rampKnots: 5,
    landingSpeedKnots: 66,
    takeoffSpeedKnots: 60,
    engineStartSeconds: 24,
    arrivalExit: "B3",
    allowedParking: ["FBO", "TRANSIENT", "NORTHEAST", "HANGAR"],
  },
  DA42: {
    label: "Diamond DA42 Twin Star",
    category: "twin",
    taxiKnots: 13,
    rampKnots: 5,
    landingSpeedKnots: 75,
    takeoffSpeedKnots: 72,
    engineStartSeconds: 32,
    arrivalExit: "B3",
    allowedParking: ["FBO", "TRANSIENT", "NORTHEAST", "HANGAR"],
  },
  PC12: {
    label: "Pilatus PC-12",
    category: "turboprop",
    taxiKnots: 14,
    rampKnots: 6,
    landingSpeedKnots: 85,
    takeoffSpeedKnots: 82,
    engineStartSeconds: 38,
    arrivalExit: "B2",
    allowedParking: ["FBO"],
  },
  C25A: {
    label: "Cessna Citation CJ2",
    category: "jet",
    taxiKnots: 14,
    rampKnots: 6,
    landingSpeedKnots: 105,
    takeoffSpeedKnots: 105,
    engineStartSeconds: 55,
    arrivalExit: "B2",
    allowedParking: ["FBO"],
  },
  AT46: {
    label: "ATR 42-600",
    category: "airliner",
    taxiKnots: 15,
    rampKnots: 6,
    landingSpeedKnots: 112,
    takeoffSpeedKnots: 108,
    engineStartSeconds: 60,
    arrivalExit: "B2",
    allowedParking: ["JSX"],
  },
};

export function distanceBetween(first: GroundPoint, second: GroundPoint) {
  return Math.hypot(second.x - first.x, second.y - first.y);
}

export function groundHeading(first: GroundPoint, second: GroundPoint) {
  // The gameplay viewport is 10:7, so percentage-space X must be corrected
  // before converting a diagonal screen vector to a CSS aircraft rotation.
  return (
    (Math.atan2((second.x - first.x) * (10 / 7), first.y - second.y) * 180) /
    Math.PI
  );
}

export function nodesForParkingGroup(group: ParkingGroup) {
  return Object.values(GROUND_NODES).filter(
    (node) => node.kind === "parking" && node.parkingGroup === group,
  );
}

function adjacentNodes(nodeId: string) {
  return GROUND_EDGES.flatMap((edge) => {
    if (edge.from === nodeId) return [edge.to];
    if (edge.to === nodeId) return [edge.from];
    return [];
  });
}

export function shortestGroundRoute(
  from: string,
  to: string,
  via?: "A" | "B",
) {
  if (!GROUND_NODES[from] || !GROUND_NODES[to]) return null;
  const stateKey = (nodeId: string, hasUsedVia: boolean) =>
    `${nodeId}|${hasUsedVia ? "1" : "0"}`;
  const startUsedVia = !via || GROUND_NODES[from].taxiway === via;
  const startState = stateKey(from, startUsedVia);
  const distances = new Map<string, number>([[startState, 0]]);
  const previous = new Map<string, string>();
  const unvisited = new Set(
    Object.keys(GROUND_NODES).flatMap((nodeId) => [
      stateKey(nodeId, false),
      stateKey(nodeId, true),
    ]),
  );
  let destinationState: string | null = null;

  while (unvisited.size > 0) {
    let current: string | null = null;
    let currentDistance = Number.POSITIVE_INFINITY;
    for (const candidate of unvisited) {
      const candidateDistance = distances.get(candidate) ?? Number.POSITIVE_INFINITY;
      if (candidateDistance < currentDistance) {
        current = candidate;
        currentDistance = candidateDistance;
      }
    }
    if (!current || currentDistance === Number.POSITIVE_INFINITY) break;
    const [currentNodeId, usedViaFlag] = current.split("|");
    const hasUsedVia = usedViaFlag === "1";
    if (currentNodeId === to && hasUsedVia) {
      destinationState = current;
      break;
    }
    unvisited.delete(current);

    for (const neighbor of adjacentNodes(currentNodeId)) {
      const neighborNode = GROUND_NODES[neighbor];
      const neighborHasUsedVia =
        hasUsedVia || !via || neighborNode.taxiway === via;
      const neighborState = stateKey(neighbor, neighborHasUsedVia);
      if (!unvisited.has(neighborState)) continue;
      const currentNode = GROUND_NODES[currentNodeId];
      const nextDistance = currentDistance + distanceBetween(currentNode, neighborNode);
      if (
        nextDistance <
        (distances.get(neighborState) ?? Number.POSITIVE_INFINITY)
      ) {
        distances.set(neighborState, nextDistance);
        previous.set(neighborState, current);
      }
    }
  }

  if (!destinationState) return null;
  const routeStates = [destinationState];
  while (routeStates[0] !== startState) {
    const prior = previous.get(routeStates[0]);
    if (!prior) return null;
    routeStates.unshift(prior);
  }
  return routeStates.map((state) => state.split("|")[0]);
}
