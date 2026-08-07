import type { Metadata } from "next";
import { requireSession } from "../../../../lib/auth-server";
import { LaxGroundSimulator } from "../../../lax-ground-simulator";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Los Angeles Ground — Pacific Radar",
  description:
    "Route airline traffic between the LAX terminals and four-runway west-operations surface on a simulated airport surface display.",
};

export default async function LosAngelesGround() {
  await requireSession();
  return <LaxGroundSimulator />;
}
