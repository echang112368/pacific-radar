import type { Metadata } from "next";
import { requireSession } from "../../../lib/auth-server";
import { RadarSimulator } from "../../simulator";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Santa Monica Tower — Pacific Radar",
  description:
    "Control arrivals and departures across a 35 NM satellite radar scope at Santa Monica Municipal Airport.",
};

export default async function SantaMonicaAirport() {
  await requireSession();
  return <RadarSimulator />;
}
