export type GroundChartPoint = {
  x: number;
  y: number;
};

// Each airport gets an undistorted 10:7 window around its useful movement
// area. The simulation remains in its native 0-100 coordinates; only the
// visible vertical extent changes. This avoids stretched text and keeps the
// airport large enough to work without filling the screen edge-to-edge.
export const KSMO_GROUND_CHART = { viewBox: "0 24 100 70", top: 24 } as const;
export const KLAX_GROUND_CHART = { viewBox: "0 15 100 70", top: 15 } as const;

export function groundChartScreenPosition(
  point: GroundChartPoint,
  chart: { top: number },
) {
  return {
    left: point.x,
    top: ((point.y - chart.top) / 70) * 100,
  };
}
