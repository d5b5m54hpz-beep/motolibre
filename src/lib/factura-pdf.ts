import PDFDocument from "pdfkit";
import type { Factura } from "@prisma/client";
import { datosEmisor } from "@/lib/facturacion-utils";

/**
 * Genera un PDF de factura con formato argentino.
 * Retorna un Buffer listo para enviar como respuesta HTTP o adjunto de email.
 */
export async function generarPDFFactura(factura: Factura): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({ margin: 50, size: "A4" });
    const chunks: Buffer[] = [];

    doc.on("data", (chunk: Buffer) => chunks.push(chunk));
    doc.on("end", () => resolve(Buffer.concat(chunks)));
    doc.on("error", reject);

    const emisor = datosEmisor();
    const pageWidth = 595.28;
    const margin = 50;
    const contentWidth = pageWidth - margin * 2;

    // ── HEADER ──────────────────────────────────────────────────
    // Línea izquierda: datos del emisor
    doc
      .fontSize(18)
      .font("Helvetica-Bold")
      .text(factura.emisorRazonSocial, margin, 50);

    doc
      .fontSize(9)
      .font("Helvetica")
      .text(`CUIT: ${factura.emisorCuit}`, margin, 72)
      .text(`${factura.emisorCondicionIva}`, margin, 83)
      .text(factura.emisorDomicilio, margin, 94)
      .text(`IIBB: ${emisor.iibb}`, margin, 105)
      .text(`Inicio Actividades: ${emisor.inicioActividades}`, margin, 116);

    // Línea derecha: tipo de factura grande
    const tipoX = pageWidth - margin - 100;
    doc
      .rect(tipoX - 10, 45, 110, 90)
      .stroke();

    doc
      .fontSize(48)
      .font("Helvetica-Bold")
      .fillColor("#000000")
      .text(factura.tipo, tipoX + 15, 55);

    doc
      .fontSize(9)
      .font("Helvetica")
      .text(`Comp. Nro: ${factura.numeroCompleto}`, tipoX - 10, 110, { width: 110, align: "center" })
      .text(`Fecha: ${new Date(factura.fechaEmision).toLocaleDateString("es-AR")}`, tipoX - 10, 122, { width: 110, align: "center" });

    // Línea separadora
    doc.moveTo(margin, 145).lineTo(pageWidth - margin, 145).stroke();

    // Punto de venta / Cond. pago
    doc
      .fontSize(9)
      .font("Helvetica")
      .text(`Punto de Venta: ${factura.puntoVenta}`, margin, 152)
      .text("Condición de Pago: Contado", margin + 200, 152);

    // ── RECEPTOR ────────────────────────────────────────────────
    doc.moveTo(margin, 168).lineTo(pageWidth - margin, 168).stroke();

    doc
      .fontSize(9)
      .font("Helvetica-Bold")
      .text("DATOS DEL RECEPTOR", margin, 175);

    doc.font("Helvetica");
    let receptorY = 188;
    doc.text(`Razón Social / Nombre: ${factura.receptorNombre}`, margin, receptorY);
    receptorY += 12;
    if (factura.receptorCuit) {
      doc.text(`CUIT / DNI: ${factura.receptorCuit}`, margin, receptorY);
      receptorY += 12;
    }
    doc.text(`Condición IVA: ${factura.receptorCondicionIva}`, margin, receptorY);
    receptorY += 12;
    if (factura.receptorDomicilio) {
      doc.text(`Domicilio: ${factura.receptorDomicilio}`, margin, receptorY);
      receptorY += 12;
    }

    // ── DETALLE ──────────────────────────────────────────────────
    const detalleY = receptorY + 10;
    doc.moveTo(margin, detalleY).lineTo(pageWidth - margin, detalleY).stroke();

    // Cabecera tabla
    const col1 = margin;
    const col2 = margin + 300;
    const col3 = margin + 380;
    const col4 = margin + 455;

    doc
      .fontSize(9)
      .font("Helvetica-Bold")
      .text("Descripción", col1, detalleY + 8)
      .text("Cantidad", col2, detalleY + 8)
      .text("P. Unitario", col3, detalleY + 8)
      .text("Subtotal", col4, detalleY + 8);

    doc.moveTo(margin, detalleY + 22).lineTo(pageWidth - margin, detalleY + 22).stroke();

    // Fila de concepto
    const itemY = detalleY + 30;
    const montoTotal = Number(factura.montoTotal);
    const montoNeto = Number(factura.montoNeto);

    doc
      .fontSize(9)
      .font("Helvetica")
      .text(factura.concepto, col1, itemY, { width: 280 })
      .text("1", col2, itemY)
      .text(formatMoneySingle(montoNeto), col3, itemY)
      .text(formatMoneySingle(montoNeto), col4, itemY);

    // ── TOTALES ──────────────────────────────────────────────────
    const montoIva = Number(factura.montoIva);
    let totalesY = itemY + 35;

    doc.moveTo(margin, totalesY - 5).lineTo(pageWidth - margin, totalesY - 5).stroke();

    if (factura.tipo === "A") {
      // Factura A: neto + IVA + total
      doc
        .fontSize(9)
        .font("Helvetica")
        .text("Subtotal Neto:", col3, totalesY)
        .text(formatMoneySingle(montoNeto), col4, totalesY);
      totalesY += 14;

      doc
        .text("IVA 21%:", col3, totalesY)
        .text(formatMoneySingle(montoIva), col4, totalesY);
      totalesY += 14;

      doc.moveTo(col3, totalesY - 2).lineTo(pageWidth - margin, totalesY - 2).stroke();

      doc
        .font("Helvetica-Bold")
        .fontSize(10)
        .text("TOTAL:", col3, totalesY + 2)
        .text(formatMoneySingle(montoTotal), col4, totalesY + 2);
    } else {
      // Factura B: solo total (IVA incluido)
      doc
        .font("Helvetica-Bold")
        .fontSize(10)
        .text("TOTAL (IVA incluido):", col3 - 60, totalesY)
        .text(formatMoneySingle(montoTotal), col4, totalesY);
    }

    // ── CAE ──────────────────────────────────────────────────────
    const caeY = totalesY + 55;
    doc.moveTo(margin, caeY - 10).lineTo(pageWidth - margin, caeY - 10).stroke();

    if (factura.cae) {
      doc
        .fontSize(9)
        .font("Helvetica")
        .text(`CAE: ${factura.cae}`, margin, caeY)
        .text(
          `Vencimiento CAE: ${factura.caeVencimiento ? new Date(factura.caeVencimiento).toLocaleDateString("es-AR") : "—"}`,
          margin + 200,
          caeY
        );
    }

    // ── FOOTER ───────────────────────────────────────────────────
    doc
      .fontSize(8)
      .font("Helvetica")
      .fillColor("#666666")
      .text(
        "Comprobante emitido conforme a las normas de la RG 1415/2003 y sus modificaciones — AFIP",
        margin,
        caeY + 18,
        { width: contentWidth, align: "center" }
      );

    doc.end();
  });
}

function formatMoneySingle(amount: number): string {
  return `$${amount.toLocaleString("es-AR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}
