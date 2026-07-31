import { createAuth } from "../../../../lib/auth";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  return createAuth().handler(request);
}

export async function POST(request: Request) {
  return createAuth().handler(request);
}
