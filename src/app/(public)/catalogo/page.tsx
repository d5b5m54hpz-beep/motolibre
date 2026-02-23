import type { Metadata } from "next";
import { CatalogoClient } from "./_components/catalogo-client";

export const metadata: Metadata = {
  title: "Catálogo de Motos | MotoLibre",
  description:
    "Explorá nuestras motos disponibles para alquiler. Honda, Yamaha, Bajaj y más. Planes semanales, mensuales y lease-to-own.",
};

export default function CatalogoPage() {
  return <CatalogoClient />;
}
