import PDFDocument from "pdfkit";

export interface ConvenioPDFData {
  // Taller data
  nombreTaller: string;
  razonSocial: string | null;
  cuit: string | null;
  direccion: string;
  ciudad: string;
  provincia: string;
  contactoNombre: string;
  email: string;
  telefono: string;
  // Convenio terms
  tarifaHoraBase: number;
  margenRepuestos: number | null;
  plazoFacturaDias: number;
  fechaInicio: string;
  fechaFin: string | null;
  zonaCobertura: string | null;
  otMaxMes: number | null;
  // Meta
  convenioId: string;
}

export async function generarPDFConvenio(data: ConvenioPDFData): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({ size: "A4", margin: 50 });
    const chunks: Buffer[] = [];

    doc.on("data", (chunk: Buffer) => chunks.push(chunk));
    doc.on("end", () => resolve(Buffer.concat(chunks)));
    doc.on("error", reject);

    const pageWidth = doc.page.width - 100; // 50px margin each side

    // ── Header ──
    doc.fontSize(10).fillColor("#666666").text("MOTOLIBRE S.A.", 50, 50);
    doc.fontSize(8).text("CUIT: 30-71234567-8", 50, 65);
    doc.text("Av. Corrientes 1234, CABA, Buenos Aires", 50, 77);
    doc.text("info@motolibre.com.ar | www.motolibre.com.ar", 50, 89);

    doc.moveTo(50, 110).lineTo(50 + pageWidth, 110).strokeColor("#cccccc").stroke();

    // ── Title ──
    doc.fontSize(16).fillColor("#1a1a2e").text("CONVENIO DE SERVICIO TÉCNICO", 50, 130, { align: "center", width: pageWidth });
    doc.fontSize(9).fillColor("#666666").text(`Ref: ${data.convenioId.slice(-8).toUpperCase()}`, 50, 155, { align: "center", width: pageWidth });

    doc.moveDown(2);

    // ── Parties ──
    const partiesY = 185;
    doc.fontSize(9).fillColor("#333333").font("Helvetica-Bold").text("PARTE A — MOTOLIBRE S.A.", 50, partiesY);
    doc.font("Helvetica").fontSize(8).fillColor("#555555");
    doc.text("Razón Social: MotoLibre S.A.", 50, partiesY + 15);
    doc.text("Domicilio: Av. Corrientes 1234, CABA", 50, partiesY + 27);

    doc.fontSize(9).fillColor("#333333").font("Helvetica-Bold").text("PARTE B — TALLER", 50, partiesY + 55);
    doc.font("Helvetica").fontSize(8).fillColor("#555555");
    doc.text(`Nombre: ${data.nombreTaller}`, 50, partiesY + 70);
    if (data.razonSocial) doc.text(`Razón Social: ${data.razonSocial}`, 50, partiesY + 82);
    if (data.cuit) doc.text(`CUIT: ${data.cuit}`, 50, partiesY + (data.razonSocial ? 94 : 82));
    doc.text(`Domicilio: ${data.direccion}, ${data.ciudad}, ${data.provincia}`, 50, partiesY + (data.razonSocial ? 106 : 94));
    doc.text(`Contacto: ${data.contactoNombre} — ${data.email} — ${data.telefono}`, 50, partiesY + (data.razonSocial ? 118 : 106));

    doc.moveTo(50, partiesY + 140).lineTo(50 + pageWidth, partiesY + 140).stroke();

    // ── Commercial Terms ──
    const termsY = partiesY + 160;
    doc.fontSize(11).fillColor("#1a1a2e").font("Helvetica-Bold").text("CONDICIONES COMERCIALES", 50, termsY);
    doc.font("Helvetica").fontSize(9).fillColor("#333333");

    const terms: [string, string][] = [
      ["Tarifa Hora Base", `$ ${data.tarifaHoraBase.toLocaleString("es-AR")}`],
      ["Margen Repuestos", data.margenRepuestos ? `${data.margenRepuestos}%` : "No aplica"],
      ["Plazo Facturación", `${data.plazoFacturaDias} días`],
      ["Fecha Inicio", new Date(data.fechaInicio).toLocaleDateString("es-AR")],
      ["Fecha Fin", data.fechaFin ? new Date(data.fechaFin).toLocaleDateString("es-AR") : "Indefinido (renovación automática)"],
      ["Zona Cobertura", data.zonaCobertura ?? "Sin restricción"],
      ["OT Máximas/Mes", data.otMaxMes ? String(data.otMaxMes) : "Sin límite"],
    ];

    let termRowY = termsY + 25;
    for (const [label, value] of terms) {
      const bg = terms.indexOf([label, value]) % 2 === 0 ? "#f8f9fa" : "#ffffff";
      doc.rect(50, termRowY - 3, pageWidth, 18).fill(bg);
      doc.fillColor("#555555").fontSize(8).text(label, 60, termRowY);
      doc.fillColor("#1a1a2e").font("Helvetica-Bold").fontSize(8).text(value, 280, termRowY);
      doc.font("Helvetica");
      termRowY += 20;
    }

    doc.moveTo(50, termRowY + 10).lineTo(50 + pageWidth, termRowY + 10).strokeColor("#cccccc").stroke();

    // ── General Clauses ──
    const clauseY = termRowY + 30;
    doc.fontSize(11).fillColor("#1a1a2e").font("Helvetica-Bold").text("CLÁUSULAS GENERALES", 50, clauseY);
    doc.font("Helvetica").fontSize(8).fillColor("#444444");

    const clauses = [
      "1. El presente convenio regula la relación comercial entre las partes para la prestación de servicios de mantenimiento y reparación de motocicletas.",
      "2. El Taller se compromete a realizar los trabajos con materiales y mano de obra de primera calidad, respetando los estándares de MotoLibre.",
      "3. MotoLibre asignará Órdenes de Trabajo (OT) al Taller a través de la plataforma digital. El Taller deberá aceptar o rechazar cada OT dentro de las 2 horas hábiles.",
      "4. La facturación se realizará quincenalmente por los trabajos completados, con el plazo de pago acordado.",
      "5. Cualquiera de las partes podrá rescindir el presente convenio con un preaviso de 30 días corridos.",
      "6. El presente convenio se rige por las leyes de la República Argentina, con jurisdicción en los tribunales de la Ciudad Autónoma de Buenos Aires.",
    ];

    let clauseRowY = clauseY + 20;
    for (const clause of clauses) {
      doc.text(clause, 50, clauseRowY, { width: pageWidth, lineGap: 2 });
      clauseRowY += doc.heightOfString(clause, { width: pageWidth }) + 8;
    }

    // ── Signatures ──
    const sigY = Math.max(clauseRowY + 40, 650);
    const halfWidth = pageWidth / 2 - 20;

    // Left signature
    doc.moveTo(50, sigY).lineTo(50 + halfWidth, sigY).strokeColor("#999999").stroke();
    doc.fontSize(9).fillColor("#333333").text("Por MotoLibre S.A.", 50, sigY + 8, { width: halfWidth, align: "center" });
    doc.fontSize(7).fillColor("#888888").text("Firma y aclaración", 50, sigY + 22, { width: halfWidth, align: "center" });

    // Right signature
    const rightX = 50 + halfWidth + 40;
    doc.moveTo(rightX, sigY).lineTo(rightX + halfWidth, sigY).stroke();
    doc.fontSize(9).fillColor("#333333").text(`Por ${data.nombreTaller}`, rightX, sigY + 8, { width: halfWidth, align: "center" });
    doc.fontSize(7).fillColor("#888888").text("Firma y aclaración", rightX, sigY + 22, { width: halfWidth, align: "center" });

    // ── Footer ──
    doc.fontSize(8).fillColor("#999999").text(
      `Buenos Aires, ${new Date().toLocaleDateString("es-AR", { day: "numeric", month: "long", year: "numeric" })}`,
      50,
      sigY + 55,
      { align: "center", width: pageWidth }
    );

    doc.end();
  });
}
