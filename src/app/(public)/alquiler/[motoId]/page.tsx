import type { Metadata } from "next";
import { prisma } from "@/lib/prisma";
import { Suspense } from "react";
import { WizardShell } from "./_components/wizard-shell";
import { Skeleton } from "@/components/ui/skeleton";

interface Props {
  params: Promise<{ motoId: string }>;
  searchParams: Promise<{ plan?: string; step?: string }>;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { motoId } = await params;
  const moto = await prisma.moto.findUnique({
    where: { id: motoId },
    select: { marca: true, modelo: true },
  });
  return {
    title: moto
      ? `Alquilar ${moto.marca} ${moto.modelo} | MotoLibre`
      : "Alquilar Moto | MotoLibre",
  };
}

export default async function AlquilerPage({ params, searchParams }: Props) {
  const { motoId } = await params;
  const { plan, step } = await searchParams;

  return (
    <Suspense
      fallback={
        <div className="max-w-5xl mx-auto px-4 py-8 space-y-8">
          <Skeleton className="h-8 w-full max-w-md mx-auto" />
          <Skeleton className="h-96 w-full rounded-2xl" />
        </div>
      }
    >
      <WizardShell
        motoId={motoId}
        initialPlan={plan ?? ""}
        initialStep={step ? parseInt(step) : 0}
      />
    </Suspense>
  );
}
