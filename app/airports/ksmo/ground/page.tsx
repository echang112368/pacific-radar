import type { Metadata } from "next";
import { requireSession } from "../../../../lib/auth-server";
import { GroundSimulator } from "../../../ground-simulator";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Santa Monica Ground — Pacific Radar",
  description:
    "Control taxi, parking, runway staging, and departures on an FAA-diagram-derived simulated airport surface display of Santa Monica Municipal Airport.",
};

export default async function SantaMonicaGround() {
  await requireSession();
  return <GroundSimulator />;
}
