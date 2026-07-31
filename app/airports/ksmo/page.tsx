import type { Metadata } from "next";
import { requireChatGPTUser } from "../../chatgpt-auth";
import { RadarSimulator } from "../../simulator";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Santa Monica Tower — Pacific Radar",
  description:
    "Control arrivals and departures across a 35 NM satellite radar scope at Santa Monica Municipal Airport.",
};

export default async function SantaMonicaAirport() {
  await requireChatGPTUser("/airports/ksmo");
  return <RadarSimulator />;
}
