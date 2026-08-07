import { KSMO_RUNWAY } from "./ksmo-airport";

export const STANDARD_TERMINAL_SCOPE_RANGE_NM = 18;

export type AirportCode = "KSMO" | "KLAX" | "KORD";
export type FlightKind = "arrival" | "departure";
export type WakeCategory = "L" | "M" | "H" | "J";

export type MapPoint = { x: number; y: number };

export type RunwayEndDefinition = {
  id: string;
  physicalRunway: string;
  heading: number;
  threshold: MapPoint;
  rolloutEnd: MapPoint;
  hold: MapPoint;
};

export type RunwayDefinition = {
  designation: string;
  lengthFeet: number;
  widthFeet: number;
  ends: readonly [string, string];
};

export type NavFix = MapPoint & {
  name: string;
  kind: "fix" | "vor";
};

export type ExitFix = MapPoint & {
  name: string;
  edge: "north" | "east" | "south" | "west";
};

export type EntryRoute = MapPoint & {
  heading: number;
  runway: string;
};

export type AirportTrafficProfile = {
  airport: AirportCode;
  runwayCount: number;
  initialSpacingSeconds: number;
  minimumSpacingSeconds: number;
  rampEveryMovements: number;
  spacingReductionSeconds: number;
};

export type AirportDefinition = {
  code: AirportCode;
  name: string;
  towerName: string;
  elevation: number;
  wind: string;
  visibility: string;
  radioFrequency: string;
  scopeName: string;
  scopeRangeNm: typeof STANDARD_TERMINAL_SCOPE_RANGE_NM;
  satelliteImage: string;
  runwaySummary: string;
  runways: readonly RunwayDefinition[];
  runwayEnds: Readonly<Record<string, RunwayEndDefinition>>;
  westFlowArrivalRunways: readonly string[];
  westFlowDepartureRunways: readonly string[];
  fixes: readonly NavFix[];
  exitFixes: readonly ExitFix[];
  entryRoutes: readonly EntryRoute[];
  arrivalTypes: readonly string[];
  departureTypes: readonly string[];
  callsignPrefixes: readonly string[];
  entrySpeeds: Readonly<Record<string, number>>;
  traffic: AirportTrafficProfile;
  initialEvents: readonly string[];
};

const KSMO_RUNWAY_ENDS: Record<string, RunwayEndDefinition> = {
  "03": {
    id: "03",
    physicalRunway: "03/21",
    ...KSMO_RUNWAY.ends["03"],
  },
  "21": {
    id: "21",
    physicalRunway: "03/21",
    ...KSMO_RUNWAY.ends["21"],
  },
};

export const KSMO_AIRPORT: AirportDefinition = {
  code: "KSMO",
  name: "Santa Monica Municipal",
  towerName: "Santa Monica Tower",
  elevation: KSMO_RUNWAY.elevation,
  wind: "240° / 08 KT",
  visibility: "10+ SM",
  radioFrequency: "120.100",
  scopeName: "SMO TOWER",
  scopeRangeNm: STANDARD_TERMINAL_SCOPE_RANGE_NM,
  satelliteImage: "/ksmo-terminal-satellite.jpg",
  runwaySummary: "RWY 03/21 · 3,500 × 150 FT · 5 NM RINGS",
  runways: [
    {
      designation: KSMO_RUNWAY.designation,
      lengthFeet: KSMO_RUNWAY.lengthFeet,
      widthFeet: 150,
      ends: ["03", "21"],
    },
  ],
  runwayEnds: KSMO_RUNWAY_ENDS,
  westFlowArrivalRunways: ["21", "03"],
  westFlowDepartureRunways: ["21", "03"],
  fixes: [
    { name: "DARTS", x: 94, y: 8, kind: "fix" },
    { name: "MORVE", x: 83, y: 34, kind: "fix" },
    { name: "WAKER", x: 9, y: 27, kind: "fix" },
    { name: "SMO", x: 50, y: 50, kind: "vor" },
    { name: "VNY", x: 38, y: 3, kind: "vor" },
    { name: "LAX", x: 55.36, y: 90.33, kind: "vor" },
    { name: "HHR", x: 82.31, y: 95.13, kind: "vor" },
    { name: "NATJU", x: 97, y: 71, kind: "fix" },
  ],
  exitFixes: [
    { name: "VNY", x: 20, y: 2, edge: "north" },
    { name: "HOLTZ", x: 98, y: 22, edge: "east" },
    { name: "SADDE", x: 98, y: 73, edge: "east" },
    { name: "LAXX", x: 66, y: 98, edge: "south" },
    { name: "MALIBU", x: 2, y: 70, edge: "west" },
  ],
  entryRoutes: [
    { x: 99.4, y: 12, heading: 246, runway: "21" },
    { x: 99.4, y: 76, heading: 304, runway: "03" },
    { x: 0.6, y: 34, heading: 96, runway: "03" },
    { x: 24, y: 0.6, heading: 154, runway: "21" },
    { x: 72, y: 99.4, heading: 330, runway: "03" },
  ],
  arrivalTypes: ["C172", "PC12", "C25A", "E145", "E175"],
  departureTypes: ["PA28", "C172", "PC12", "C25A"],
  callsignPrefixes: ["SKW", "JSX", "N", "SURF", "UAL", "RPA"],
  entrySpeeds: {
    PA28: 115,
    C172: 115,
    PC12: 175,
    C25A: 210,
    E145: 190,
    E175: 210,
  },
  traffic: {
    airport: "KSMO",
    runwayCount: 1,
    initialSpacingSeconds: 60,
    minimumSpacingSeconds: 36,
    rampEveryMovements: 6,
    spacingReductionSeconds: 3,
  },
  initialEvents: [
    "KSMO TOWER · Runway 03/21 available · Wind 240 at 8",
    "Scope clear · Traffic will build gradually as the shift begins.",
  ],
};

// Runway coordinates are projected from the current FAA-published threshold
// coordinates onto the tighter 18 NM LAX tower scope used by the satellite
// image. The closer scope preserves the real geometry while keeping the two
// parallel runway complexes visually distinct during play.
const KLAX_RUNWAY_ENDS: Record<string, RunwayEndDefinition> = {
  "06L": {
    id: "06L",
    physicalRunway: "06L/24R",
    heading: 71,
    threshold: { x: 43.57, y: 46.53 },
    rolloutEnd: { x: 51.68, y: 45.07 },
    hold: { x: 43.24, y: 46.86 },
  },
  "24R": {
    id: "24R",
    physicalRunway: "06L/24R",
    heading: 251,
    threshold: { x: 51.68, y: 45.07 },
    rolloutEnd: { x: 43.57, y: 46.53 },
    hold: { x: 52.01, y: 44.74 },
  },
  "06R": {
    id: "06R",
    physicalRunway: "06R/24L",
    heading: 71,
    threshold: { x: 42.59, y: 47.65 },
    rolloutEnd: { x: 52.49, y: 45.87 },
    hold: { x: 42.26, y: 47.98 },
  },
  "24L": {
    id: "24L",
    physicalRunway: "06R/24L",
    heading: 251,
    threshold: { x: 52.49, y: 45.87 },
    rolloutEnd: { x: 42.59, y: 47.65 },
    hold: { x: 52.82, y: 45.54 },
  },
  "07L": {
    id: "07L",
    physicalRunway: "07L/25R",
    heading: 71,
    threshold: { x: 46.09, y: 53.15 },
    rolloutEnd: { x: 57.84, y: 51.04 },
    hold: { x: 45.76, y: 53.48 },
  },
  "25R": {
    id: "25R",
    physicalRunway: "07L/25R",
    heading: 251,
    threshold: { x: 57.84, y: 51.04 },
    rolloutEnd: { x: 46.09, y: 53.15 },
    hold: { x: 58.17, y: 50.71 },
  },
  "07R": {
    id: "07R",
    physicalRunway: "07R/25L",
    heading: 71,
    threshold: { x: 46.94, y: 54.07 },
    rolloutEnd: { x: 57.02, y: 52.26 },
    hold: { x: 46.61, y: 54.4 },
  },
  "25L": {
    id: "25L",
    physicalRunway: "07R/25L",
    heading: 251,
    threshold: { x: 57.02, y: 52.26 },
    rolloutEnd: { x: 46.94, y: 54.07 },
    hold: { x: 57.35, y: 51.93 },
  },
};

export const KLAX_AIRPORT: AirportDefinition = {
  code: "KLAX",
  name: "Los Angeles International",
  towerName: "Los Angeles Tower",
  elevation: 128,
  wind: "250° / 09 KT",
  visibility: "10+ SM",
  radioFrequency: "120.950 / 133.900",
  scopeName: "LAX TOWER",
  scopeRangeNm: STANDARD_TERMINAL_SCOPE_RANGE_NM,
  satelliteImage: "/klax-terminal-satellite.jpg",
  runwaySummary: "WEST FLOW · ARR 24R / 25L · DEP 24L / 25R",
  runways: [
    { designation: "06L/24R", lengthFeet: 8926, widthFeet: 150, ends: ["06L", "24R"] },
    { designation: "06R/24L", lengthFeet: 10885, widthFeet: 150, ends: ["06R", "24L"] },
    { designation: "07L/25R", lengthFeet: 12923, widthFeet: 150, ends: ["07L", "25R"] },
    { designation: "07R/25L", lengthFeet: 11095, widthFeet: 200, ends: ["07R", "25L"] },
  ],
  runwayEnds: KLAX_RUNWAY_ENDS,
  westFlowArrivalRunways: ["24R", "25L"],
  westFlowDepartureRunways: ["24L", "25R"],
  fixes: [
    { name: "SMO", x: 38, y: 14, kind: "vor" },
    { name: "LAX", x: 43.3, y: 57.5, kind: "vor" },
    { name: "SEAVU", x: 95, y: 35, kind: "fix" },
    { name: "MERCE", x: 86, y: 42, kind: "fix" },
    { name: "KOBEE", x: 75, y: 46, kind: "fix" },
    { name: "SHELL", x: 96, y: 67, kind: "fix" },
    { name: "FOGLA", x: 89, y: 59, kind: "fix" },
    { name: "HHR", x: 70.3, y: 59.1, kind: "vor" },
  ],
  exitFixes: [
    { name: "CHATY", x: 18, y: 2, edge: "north" },
    { name: "DOTSS", x: 98, y: 22, edge: "east" },
    { name: "HOLTZ", x: 98, y: 71, edge: "east" },
    { name: "GABRE", x: 66, y: 98, edge: "south" },
    { name: "ORCKA", x: 2, y: 62, edge: "west" },
  ],
  entryRoutes: [
    { x: 99.4, y: 29, heading: 251, runway: "24R" },
    { x: 99.4, y: 62, heading: 251, runway: "25L" },
    { x: 84, y: 0.6, heading: 205, runway: "24R" },
    { x: 88, y: 99.4, heading: 315, runway: "25L" },
    { x: 0.6, y: 20, heading: 104, runway: "24R" },
    { x: 0.6, y: 80, heading: 73, runway: "25L" },
  ],
  // Weighted to resemble the 2025 Q4 LAX runway-use mix rather than an
  // evenly sampled catalog. Existing E175/B738 models are retained.
  arrivalTypes: [
    "E175", "E175", "E175", "B738", "B738", "A21N", "A21N", "B38M",
    "B739", "B789", "B77W", "A359", "B763", "CRJ7", "A388", "B748",
  ],
  departureTypes: [
    "E175", "E175", "B738", "B738", "A21N", "A21N", "B38M", "B39M",
    "B739", "B789", "B77W", "A359", "B763", "CRJ7", "A388", "B748",
  ],
  callsignPrefixes: [
    "UAL", "DAL", "AAL", "SWA", "ASA", "SKW", "JBU", "FFT", "ANA", "KAL",
    "BAW", "QFA", "EVA", "CPA", "FDX", "UPS",
  ],
  entrySpeeds: {
    E175: 210,
    CRJ7: 205,
    B738: 225,
    B739: 225,
    B38M: 230,
    B39M: 230,
    A21N: 225,
    B763: 235,
    B77W: 240,
    B789: 240,
    A359: 240,
    A388: 235,
    B748: 240,
  },
  traffic: {
    airport: "KLAX",
    runwayCount: 4,
    initialSpacingSeconds: 30,
    minimumSpacingSeconds: 22,
    rampEveryMovements: 5,
    spacingReductionSeconds: 2,
  },
  initialEvents: [
    "KLAX TOWER · West Operations · Wind 250 at 9",
    "Arrivals 24R / 25L · Departures 24L / 25R · Heavy traffic expected.",
  ],
};

// Thresholds are projected from the FAA NASR coordinates effective
// 2026-08-06 onto an 18 NM Esri World Imagery scope centered on KORD. The
// reciprocal headings use the runway designations (magnetic) while the
// projected endpoints preserve the surveyed physical geometry.
const KORD_RUNWAY_ENDS: Record<string, RunwayEndDefinition> = {
  "04L": {
    id: "04L",
    physicalRunway: "04L/22R",
    heading: 40,
    threshold: { x: 48.57, y: 47.69 },
    rolloutEnd: { x: 52.92, y: 39.93 },
    hold: { x: 48.38, y: 48.02 },
  },
  "22R": {
    id: "22R",
    physicalRunway: "04L/22R",
    heading: 220,
    threshold: { x: 52.92, y: 39.93 },
    rolloutEnd: { x: 48.57, y: 47.69 },
    hold: { x: 53.11, y: 39.6 },
  },
  "04R": {
    id: "04R",
    physicalRunway: "04R/22L",
    heading: 40,
    threshold: { x: 52.16, y: 61.55 },
    rolloutEnd: { x: 57.04, y: 53.43 },
    hold: { x: 51.96, y: 61.88 },
  },
  "22L": {
    id: "22L",
    physicalRunway: "04R/22L",
    heading: 220,
    threshold: { x: 57.04, y: 53.43 },
    rolloutEnd: { x: 52.16, y: 61.55 },
    hold: { x: 57.24, y: 53.1 },
  },
  "09C": {
    id: "09C",
    physicalRunway: "09C/27C",
    heading: 90,
    threshold: { x: 44.2, y: 44.44 },
    rolloutEnd: { x: 54.45, y: 44.44 },
    hold: { x: 43.82, y: 44.44 },
  },
  "27C": {
    id: "27C",
    physicalRunway: "09C/27C",
    heading: 270,
    threshold: { x: 54.45, y: 44.44 },
    rolloutEnd: { x: 44.2, y: 44.44 },
    hold: { x: 54.83, y: 44.44 },
  },
  "09L": {
    id: "09L",
    physicalRunway: "09L/27R",
    heading: 90,
    threshold: { x: 45.41, y: 37.34 },
    rolloutEnd: { x: 52.25, y: 37.34 },
    hold: { x: 45.03, y: 37.34 },
  },
  "27R": {
    id: "27R",
    physicalRunway: "09L/27R",
    heading: 270,
    threshold: { x: 52.25, y: 37.34 },
    rolloutEnd: { x: 45.41, y: 37.34 },
    hold: { x: 52.63, y: 37.34 },
  },
  "09R": {
    id: "09R",
    physicalRunway: "09R/27L",
    heading: 90,
    threshold: { x: 44.2, y: 46.6 },
    rolloutEnd: { x: 54.46, y: 46.6 },
    hold: { x: 43.82, y: 46.6 },
  },
  "27L": {
    id: "27L",
    physicalRunway: "09R/27L",
    heading: 270,
    threshold: { x: 54.46, y: 46.6 },
    rolloutEnd: { x: 44.2, y: 46.6 },
    hold: { x: 54.84, y: 46.6 },
  },
  "10C": {
    id: "10C",
    physicalRunway: "10C/28C",
    heading: 100,
    threshold: { x: 44.21, y: 55.5 },
    rolloutEnd: { x: 54.05, y: 55.46 },
    hold: { x: 43.83, y: 55.5 },
  },
  "28C": {
    id: "28C",
    physicalRunway: "10C/28C",
    heading: 280,
    threshold: { x: 54.05, y: 55.46 },
    rolloutEnd: { x: 44.21, y: 55.5 },
    hold: { x: 54.43, y: 55.46 },
  },
  "10L": {
    id: "10L",
    physicalRunway: "10L/28R",
    heading: 100,
    threshold: { x: 44.21, y: 53.89 },
    rolloutEnd: { x: 56.05, y: 53.85 },
    hold: { x: 43.83, y: 53.89 },
  },
  "28R": {
    id: "28R",
    physicalRunway: "10L/28R",
    heading: 280,
    threshold: { x: 56.05, y: 53.85 },
    rolloutEnd: { x: 44.21, y: 53.89 },
    hold: { x: 56.43, y: 53.85 },
  },
  "10R": {
    id: "10R",
    physicalRunway: "10R/28L",
    heading: 100,
    threshold: { x: 45.12, y: 59.65 },
    rolloutEnd: { x: 51.95, y: 59.63 },
    hold: { x: 44.74, y: 59.65 },
  },
  "28L": {
    id: "28L",
    physicalRunway: "10R/28L",
    heading: 280,
    threshold: { x: 51.95, y: 59.63 },
    rolloutEnd: { x: 45.12, y: 59.65 },
    hold: { x: 52.33, y: 59.63 },
  },
};

export const KORD_AIRPORT: AirportDefinition = {
  code: "KORD",
  name: "Chicago O'Hare International",
  towerName: "O'Hare Tower",
  elevation: 680,
  wind: "280° / 10 KT",
  visibility: "10+ SM",
  radioFrequency: "126.900 / 132.700 / 120.750 / 133.000",
  scopeName: "ORD TOWER",
  scopeRangeNm: STANDARD_TERMINAL_SCOPE_RANGE_NM,
  satelliteImage: "/kord-terminal-satellite.jpg",
  runwaySummary: "WEST FLOW · ARR 27R / 27C / 27L / 28C · DEP 28R / 22L",
  runways: [
    { designation: "04L/22R", lengthFeet: 7500, widthFeet: 150, ends: ["04L", "22R"] },
    { designation: "04R/22L", lengthFeet: 8075, widthFeet: 150, ends: ["04R", "22L"] },
    { designation: "09C/27C", lengthFeet: 11245, widthFeet: 200, ends: ["09C", "27C"] },
    { designation: "09L/27R", lengthFeet: 7500, widthFeet: 150, ends: ["09L", "27R"] },
    { designation: "09R/27L", lengthFeet: 11260, widthFeet: 150, ends: ["09R", "27L"] },
    { designation: "10C/28C", lengthFeet: 10800, widthFeet: 200, ends: ["10C", "28C"] },
    { designation: "10L/28R", lengthFeet: 13000, widthFeet: 150, ends: ["10L", "28R"] },
    { designation: "10R/28L", lengthFeet: 7500, widthFeet: 150, ends: ["10R", "28L"] },
  ],
  runwayEnds: KORD_RUNWAY_ENDS,
  // June 2025 CDA operations data shows 28R as the leading departure runway
  // and 28C as the leading arrival runway. The alternating arrays add the
  // other west-flow parallels and the commonly used 22L departure stream.
  westFlowArrivalRunways: ["27R", "27C", "27L", "28C"],
  westFlowDepartureRunways: ["28R", "22L"],
  fixes: [
    { name: "GCO", x: 51.44, y: 41.61, kind: "vor" },
    { name: "OGSIE", x: 27.1, y: 37.4, kind: "fix" },
    { name: "JOGBO", x: 54.3, y: 37.4, kind: "fix" },
    { name: "SIBLY", x: 78, y: 37.4, kind: "fix" },
    { name: "DRSCL", x: 80.4, y: 44.5, kind: "fix" },
    { name: "ZOSRO", x: 62.3, y: 46.6, kind: "fix" },
    { name: "FIDAK", x: 63.8, y: 53.8, kind: "fix" },
    { name: "SEIKA", x: 81.8, y: 55.4, kind: "fix" },
    { name: "ACCRA", x: 22.4, y: 71.3, kind: "fix" },
    { name: "DELHI", x: 80.2, y: 71.3, kind: "fix" },
  ],
  exitFixes: [
    { name: "KURKK", x: 20, y: 2, edge: "north" },
    { name: "DUFEE", x: 98, y: 23, edge: "east" },
    { name: "MOBLE", x: 98, y: 72, edge: "east" },
    { name: "CMSKY", x: 58, y: 98, edge: "south" },
    { name: "MYKIE", x: 2, y: 23, edge: "west" },
  ],
  entryRoutes: [
    { x: 99.4, y: 25, heading: 235, runway: "27R" },
    { x: 99.4, y: 39, heading: 260, runway: "27R" },
    { x: 99.4, y: 46, heading: 270, runway: "27C" },
    { x: 99.4, y: 55, heading: 270, runway: "28C" },
    { x: 99.4, y: 68, heading: 292, runway: "27L" },
    { x: 74, y: 0.6, heading: 208, runway: "27R" },
    { x: 81, y: 99.4, heading: 318, runway: "28C" },
    { x: 0.6, y: 25, heading: 105, runway: "27C" },
  ],
  // Weighted from CDA's June 2025 fleet mix. Regional jets, 737s, and the
  // A320 family dominate; long-haul and cargo widebodies remain uncommon.
  arrivalTypes: [
    "E175", "E175", "E175", "E175", "E175", "E175", "E175", "E175",
    "CRJ7", "CRJ7", "CRJ7", "CRJ7", "CRJ2", "CRJ2",
    "B738", "B738", "B738", "B738", "B38M", "B739",
    "A320", "A320", "A320", "A21N", "A21N", "BCS3",
    "B752", "B712", "B789", "B77W", "B763", "A333", "A359", "B748",
  ],
  departureTypes: [
    "E175", "E175", "E175", "E175", "E175", "E175", "E175", "E175",
    "CRJ7", "CRJ7", "CRJ7", "CRJ7", "CRJ2", "CRJ2",
    "B738", "B738", "B738", "B738", "B38M", "B739",
    "A320", "A320", "A320", "A21N", "A21N", "BCS3",
    "B752", "B712", "B789", "B77W", "B763", "A333", "A359", "B748",
  ],
  callsignPrefixes: [
    "UAL", "AAL", "SKW", "RPA", "JIA", "ENY", "ASH", "DAL", "SWA",
    "FFT", "ASA", "JBU", "ACA", "DLH", "BAW", "LOT", "ANA", "KAL",
    "FDX", "UPS",
  ],
  entrySpeeds: {
    E175: 210,
    CRJ7: 205,
    CRJ2: 200,
    B738: 225,
    B38M: 230,
    B739: 225,
    A320: 220,
    A21N: 225,
    BCS3: 210,
    B712: 210,
    B752: 230,
    B763: 235,
    B77W: 240,
    B789: 240,
    A333: 235,
    A359: 240,
    B748: 240,
  },
  traffic: {
    airport: "KORD",
    runwayCount: 6,
    initialSpacingSeconds: 26,
    minimumSpacingSeconds: 20,
    rampEveryMovements: 4,
    spacingReductionSeconds: 2,
  },
  initialEvents: [
    "KORD TOWER · West Flow · Wind 280 at 10",
    "Arrivals 27R / 27C / 27L / 28C · Departures 28R / 22L · Extreme traffic expected.",
  ],
};

export const AIRPORTS: Record<AirportCode, AirportDefinition> = {
  KSMO: KSMO_AIRPORT,
  KLAX: KLAX_AIRPORT,
  KORD: KORD_AIRPORT,
};

export function airportFor(code: AirportCode) {
  return AIRPORTS[code];
}

export function runwayForEnd(airport: AirportDefinition, runwayEnd: string) {
  const end = airport.runwayEnds[runwayEnd];
  return airport.runways.find(
    (runway) => runway.designation === end?.physicalRunway,
  );
}
