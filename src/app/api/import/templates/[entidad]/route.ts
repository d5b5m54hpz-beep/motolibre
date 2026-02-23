import { NextRequest, NextResponse } from "next/server";
import { csvResponse } from "@/lib/export-utils";

const TEMPLATES: Record<string, string> = {
  motos: "\uFEFFPatente;Marca;Modelo;Ano;Km;Cilindrada;Color;Tipo\nABC 123;Honda;CB 190R;2024;0;190;Negro;NAKED\nDEF 456;Yamaha;FZ 25;2023;5000;250;Azul;SCOOTER",
  clientes:
    "\uFEFFNombre;Apellido;DNI;Email;Telefono;Direccion\nJuan;Perez;12345678;juan@email.com;1155551234;Av. Corrientes 1234, CABA\nMaria;Gonzalez;87654321;maria@email.com;1155555678;Av. Rivadavia 5678, CABA",
  repuestos:
    "\uFEFFCodigo;Nombre;Categoria;Marca Compatible;Stock;Stock Minimo;Precio Compra;Precio Venta;Ubicacion\nREP-001;Pastilla de freno;FRENOS;Honda;50;10;1.500,00;2.500,00;Deposito A\nREP-002;Filtro de aceite;MOTOR;Yamaha;30;5;800,00;1.200,00;Deposito B",
};

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ entidad: string }> }
) {
  const { entidad } = await params;
  const template = TEMPLATES[entidad];

  if (!template) {
    return NextResponse.json(
      { error: "Entidad no soportada" },
      { status: 400 }
    );
  }

  return csvResponse(template, `template_${entidad}.csv`);
}
