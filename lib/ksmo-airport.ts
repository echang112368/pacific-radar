// FAA NASR runway-end coordinates projected onto the 18 NM satellite crop
// centered on the KSMO airport reference point.
export const KSMO_RUNWAY = {
  designation: "03/21",
  elevation: 177,
  lengthFeet: 3500,
  ends: {
    "21": {
      heading: 210,
      threshold: { x: 51.13, y: 48.33 },
      rolloutEnd: { x: 48.87, y: 51.67 },
      hold: { x: 51.43, y: 48.13 },
    },
    "03": {
      heading: 30,
      threshold: { x: 48.87, y: 51.67 },
      rolloutEnd: { x: 51.13, y: 48.33 },
      hold: { x: 48.57, y: 51.87 },
    },
  },
} as const;
