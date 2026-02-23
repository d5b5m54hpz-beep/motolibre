import { NextResponse } from "next/server";
import { requirePermission } from "@/lib/permissions";
import { OPERATIONS } from "@/lib/events";
import { apiSetup } from "@/lib/api-helpers";

const VALID_JOBS = [
  "contratos-por-vencer",
  "cuotas-vencidas",
  "generar-cuotas",
  "mantenimiento-programado",
  "documentos-por-vencer",
  "limpieza",
] as const;

type CronJobName = (typeof VALID_JOBS)[number];

function isValidJob(job: string): job is CronJobName {
  return VALID_JOBS.includes(job as CronJobName);
}

export async function POST(req: Request) {
  apiSetup();

  const { error } = await requirePermission(
    OPERATIONS.system.config.update,
    "canExecute",
    ["ADMIN"]
  );
  if (error) return error;

  try {
    const body = await req.json();
    const { job } = body as { job: string };

    if (!job || !isValidJob(job)) {
      return NextResponse.json(
        {
          error: `Job inv\u00e1lido. Opciones: ${VALID_JOBS.join(", ")}`,
        },
        { status: 400 }
      );
    }

    const baseUrl =
      process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
    const cronUrl = `${baseUrl}/api/cron/${job}`;

    const cronResponse = await fetch(cronUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${process.env.CRON_SECRET}`,
      },
    });

    const result = await cronResponse.json();

    if (!cronResponse.ok) {
      return NextResponse.json(
        { error: result.error ?? "Error ejecutando cron job" },
        { status: cronResponse.status }
      );
    }

    return NextResponse.json({
      data: {
        job,
        ejecutadoManualmente: true,
        resultado: result.data,
      },
    });
  } catch (err: unknown) {
    const message =
      err instanceof Error ? err.message : "Error ejecutando cron job";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
