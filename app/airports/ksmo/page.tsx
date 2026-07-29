import type { Metadata } from "next";
import { RadarSimulator } from "../../simulator";

export const metadata: Metadata = {
  title: "Santa Monica Tower — Pacific Radar",
  description:
    "Control arrivals and departures across a 35 NM satellite radar scope at Santa Monica Municipal Airport.",
};

export default function SantaMonicaAirport() {
  return <RadarSimulator />;
}
