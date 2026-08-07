import type { Metadata } from "next";
import { requireSession } from "../../../lib/auth-server";
import { RadarSimulator } from "../../simulator";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Chicago O'Hare Tower — Pacific Radar",
  description:
    "Control extreme airline traffic across all eight runways at Chicago O'Hare International Airport.",
};

export default async function ChicagoOhareAirport() {
  await requireSession();
  return <RadarSimulator airportCode="KORD" />;
}
