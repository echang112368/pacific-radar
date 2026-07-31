export const KSMO_RUNWAY = {
  designation: "03/21",
  elevation: 177,
  lengthFeet: 3500,
  ends: {
    "21": {
      heading: 210,
      threshold: { x: 52.2, y: 47.9 },
      rolloutEnd: { x: 49.4, y: 50.7 },
      hold: { x: 52.5, y: 47.7 },
    },
    "03": {
      heading: 30,
      threshold: { x: 49.4, y: 50.7 },
      rolloutEnd: { x: 52.2, y: 47.9 },
      hold: { x: 49.1, y: 50.9 },
    },
  },
} as const;
