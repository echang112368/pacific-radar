import type { Metadata } from "next";
import { requireSession } from "../../../lib/auth-server";
import { RadarSimulator } from "../../simulator";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Los Angeles Tower — Pacific Radar",
  description:
    "Control heavy airline traffic across all four runways at Los Angeles International Airport.",
};

export default async function LosAngelesAirport() {
  await requireSession();
  return <RadarSimulator airportCode="KLAX" />;
}
