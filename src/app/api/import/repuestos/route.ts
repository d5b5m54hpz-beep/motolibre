import { NextRequest, NextResponse } from "next/server";
import { requirePermission } from "@/lib/permissions";
import { OPERATIONS } from "@/lib/events/operations";
import { prisma } from "@/lib/prisma";
import { parseCSV, validarFilas, parseNumeroAR } from "@/lib/import-utils";

const VALID_CATEGORIAS = [
  "MOTOR",
  "FRENOS",
  "SUSPENSION",
  "ELECTRICA",
  "TRANSMISION",
  "CARROCERIA",
  "NEUMATICOS",
  "LUBRICANTES",
  "FILTROS",
  "TORNILLERIA",
  "ACCESORIOS",
  "OTRO",
] as const;

export async function POST(req: NextRequest) {
  const { error } = await requirePermission(
    OPERATIONS.system.config.update,
    "canExecute",
    ["ADMIN"]
  );
  if (error) return error;

  try {
    const csv = await req.text();
    const { rows } = parseCSV(csv);

    const { validas, errores } = validarFilas(rows, (row, fila) => {
      if (!row["Codigo"]?.trim() && !row["Código"]?.trim())
        return `Fila ${fila}: Codigo requerido`;
      if (!row["Nombre"]?.trim()) return `Fila ${fila}: Nombre requerido`;
      return null;
    });

    let creados = 0;
    let actualizados = 0;

    for (const row of validas) {
      const codigo = (row["Codigo"] || row["Código"] || "").trim();
      const nombre = row["Nombre"]!.trim();
      const categoriaRaw = (row["Categoria"] || row["Categoría"] || "")
        .trim()
        .toUpperCase();
      const categoria = (VALID_CATEGORIAS as readonly string[]).includes(
        categoriaRaw
      )
        ? (categoriaRaw as (typeof VALID_CATEGORIAS)[number])
        : "OTRO";

      const marca = row["Marca Compatible"]?.trim() || null;
      const stock = parseInt(row["Stock"] || "") || 0;
      const stockMinimo = parseInt(row["Stock Minimo"] || row["Stock Mínimo"] || "") || 5;
      const precioCompra = parseNumeroAR(row["Precio Compra"] || "");
      const precioVenta = parseNumeroAR(row["Precio Venta"] || "");

      const existing = await prisma.repuesto.findUnique({
        where: { codigo },
      });

      if (existing) {
        await prisma.repuesto.update({
          where: { codigo },
          data: {
            nombre,
            categoria,
            marca,
            stock,
            stockMinimo,
            precioCompra,
            precioVenta: precioVenta || null,
          },
        });
        actualizados++;
      } else {
        await prisma.repuesto.create({
          data: {
            codigo,
            nombre,
            categoria,
            marca,
            stock,
            stockMinimo,
            precioCompra,
            precioVenta: precioVenta || null,
          },
        });
        creados++;
      }
    }

    return NextResponse.json({
      creados,
      actualizados,
      errores,
      total: rows.length,
    });
  } catch (err: unknown) {
    return NextResponse.json(
      { error: "Error procesando CSV" },
      { status: 500 }
    );
  }
}
