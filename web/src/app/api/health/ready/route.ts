import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getProductionConfigErrors } from "@/lib/production-config";

export async function GET(request: Request) {
  const expectedToken = process.env.HEALTHCHECK_TOKEN;
  const suppliedToken = request.headers.get("authorization")?.replace(/^Bearer\s+/i, "");
  if (!expectedToken || suppliedToken !== expectedToken) {
    return NextResponse.json({ status: "unauthorized" }, { status: 401 });
  }

  const configErrors = getProductionConfigErrors();
  if (configErrors.length > 0) {
    console.error("Production configuration check failed:", configErrors);
    return NextResponse.json(
      { status: "not_ready", configuration: "invalid" },
      { status: 503 },
    );
  }

  try {
    await prisma.$queryRaw`SELECT 1`;
    return NextResponse.json({ status: "ready", database: "ok" });
  } catch (error) {
    console.error("Readiness database check failed:", error);
    return NextResponse.json(
      { status: "not_ready", database: "unavailable" },
      { status: 503 },
    );
  }
}
