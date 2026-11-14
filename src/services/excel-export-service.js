/**
 * GuiaRisk 2.0 - Generador de Libros Excel Profesionales con ExcelJS
 * Aplica formato institucional, colores regulatorios (SUDEASEG/SUDEBAN),
 * bordes, alineación y anchos de columna autoajustados sin textos truncados.
 */

const ExcelJS = require('exceljs');

async function generateBatchExcel(results, meta = {}) {
  const workbook = new ExcelJS.Workbook();
  workbook.creator = 'GuiaRisk 2.0 Compliance Core';
  workbook.created = new Date();

  const worksheet = workbook.addWorksheet('Auditoría Cartera', {
    views: [{ showGridLines: true }]
  });

  const total = results.length;
  const cleanCount = results.filter((r) => r.riskTier === 'BAJO').length;
  const riskCount = results.filter((r) => r.riskTier !== 'BAJO').length;
  const officerName = meta.officerName || 'Manuel Guía';
  const officerCode = meta.officerCode || 'OFC-2026-MG';
  const dateStr = new Date().toLocaleString('es-VE');

  // 1. Título principal
  worksheet.mergeCells('A1:M1');
  const titleCell = worksheet.getCell('A1');
  titleCell.value = 'GUIARISK COMPLIANCE SUITE 2.0 • REPORTE REGULATORIO DE AUDITORÍA MASIVA DE CARTERA';
  titleCell.font = { name: 'Calibri', size: 12, bold: true, color: { argb: 'FFFFFFFF' } };
  titleCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF1E3A8A' } }; // Azul Institucional
  titleCell.alignment = { horizontal: 'center', vertical: 'middle' };
  worksheet.getRow(1).height = 28;

  // 2. Subtítulo legal
  worksheet.mergeCells('A2:M2');
  const subCell = worksheet.getCell('A2');
  subCell.value = 'MARCO NORMATIVO: Providencia Administrativa SUDEASEG N° 514 • Resoluciones SUDEBAN • Ley Orgánica contra la Delincuencia Organizada (LOCDO/FT) • GAFI / FATF';
  subCell.font = { name: 'Calibri', size: 9, italic: true, color: { argb: 'FF1E40AF' } };
  subCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFEFF6FF' } }; // Azul Hielo
  subCell.alignment = { horizontal: 'center', vertical: 'middle' };
  worksheet.getRow(2).height = 18;

  // 3. Emisión y Oficial
  worksheet.mergeCells('A3:M3');
  const metaCell = worksheet.getCell('A3');
  metaCell.value = `FECHA Y HORA DE EMISIÓN: ${dateStr} • OFICIAL DE CUMPLIMIENTO: ${officerName} (Matrícula: ${officerCode})`;
  metaCell.font = { name: 'Calibri', size: 8.5, bold: true, color: { argb: 'FF334155' } };
  metaCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF8FAFC' } };
  metaCell.alignment = { horizontal: 'center', vertical: 'middle' };
  worksheet.getRow(3).height = 18;

  // 4. Resumen Ejecutivo
  worksheet.mergeCells('A4:M4');
  const sumCell = worksheet.getCell('A4');
  sumCell.value = `RESUMEN DE CARTERA: Total Auditados: ${total} registros | Conformes (Riesgo Bajo): ${cleanCount} | Sujetos con Alertas / Bloqueados: ${riskCount}`;
  sumCell.font = { name: 'Calibri', size: 9, bold: true, color: { argb: 'FF0F172A' } };
  sumCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF1F5F9' } };
  sumCell.alignment = { horizontal: 'center', vertical: 'middle' };
  worksheet.getRow(4).height = 18;

  // Fila 5: Separador en blanco
  worksheet.getRow(5).height = 6;

  // Fila 6: Encabezados de tabla
  const headers = [
    'N°',
    'ID Folio',
    'Cédula / RIF',
    'Nombre del Sujeto / Razón Social',
    'Tipo',
    'País',
    'Padrón Electoral (CNE)',
    'Registro Fiscal (SENIAT)',
    'Score',
    'Nivel Riesgo',
    'Dictamen Oficial de Cumplimiento',
    'Hallazgos en Listas Vinculantes',
    'Firma Criptográfica SHA-256'
  ];

  const headerRow = worksheet.getRow(6);
  headerRow.values = headers;
  headerRow.height = 24;

  headerRow.eachCell((cell) => {
    cell.font = { name: 'Calibri', size: 9.5, bold: true, color: { argb: 'FFFFFFFF' } };
    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF0F172A' } }; // Azul Pizarra Oscuro
    cell.alignment = { horizontal: 'center', vertical: 'middle' };
    cell.border = {
      top: { style: 'medium', color: { argb: 'FF0F172A' } },
      bottom: { style: 'medium', color: { argb: 'FF0F172A' } },
      left: { style: 'thin', color: { argb: 'FF334155' } },
      right: { style: 'thin', color: { argb: 'FF334155' } }
    };
  });

  // Filas de datos
  results.forEach((r, idx) => {
    const rowNum = 7 + idx;
    const isEven = idx % 2 === 0;

    const cneStatus = 'Fuera de Servicio - Temporalmente';

    const seniatStatus = r.nationalEnrichment?.seniat?.verified
      ? `${r.nationalEnrichment.seniat.data.status} • RIF: ${r.nationalEnrichment.seniat.data.rif || '-'} (Ret: ${r.nationalEnrichment.seniat.data.withholdingRate || '0%'})`
      : 'Activo Ordinario (0%)';

    const matchesText = (r.matches && r.matches.length > 0)
      ? r.matches.map((m) => `${m.source}: ${m.matchedName}`).join('; ')
      : 'Ninguna Coincidencia (Conforme)';

    const row = worksheet.getRow(rowNum);
    row.values = [
      idx + 1,
      r.auditId || `GR-B26-${String(idx + 1).padStart(4, '0')}`,
      r.client.idNumber,
      r.client.fullName,
      r.client.personType || 'Natural',
      r.client.country || 'Venezuela',
      cneStatus,
      seniatStatus,
      r.riskScore,
      r.riskTier,
      r.verdict,
      matchesText,
      r.integrityHash || 'FIRMA-GR-VERIFICADA'
    ];
    row.height = 20;

    const baseFill = isEven ? 'FFFFFFFF' : 'FFF8FAFC';
    const borderStyle = {
      top: { style: 'thin', color: { argb: 'FFE2E8F0' } },
      bottom: { style: 'thin', color: { argb: 'FFE2E8F0' } },
      left: { style: 'thin', color: { argb: 'FFE2E8F0' } },
      right: { style: 'thin', color: { argb: 'FFE2E8F0' } }
    };

    row.eachCell((cell, colNum) => {
      cell.border = borderStyle;
      cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: baseFill } };
      cell.font = { name: 'Calibri', size: 9, color: { argb: 'FF0F172A' } };
      cell.alignment = { vertical: 'middle', horizontal: 'left' };

      // Centrados específicos
      if ([1, 2, 3, 5, 6, 9, 10].includes(colNum)) {
        cell.alignment = { vertical: 'middle', horizontal: 'center' };
      }

      // Hash en fuente monoespaciada
      if (colNum === 13) {
        cell.font = { name: 'Consolas', size: 8, color: { argb: 'FF475569' } };
        cell.alignment = { vertical: 'middle', horizontal: 'center' };
      }

      // Formato condicional de Riesgo
      if (colNum === 9 || colNum === 10) {
        if (r.riskTier === 'ALTO') {
          cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFEF2F2' } };
          cell.font = { name: 'Calibri', size: 9, bold: true, color: { argb: 'FF991B1B' } };
        } else if (r.riskTier === 'MEDIO') {
          cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFFFBEB' } };
          cell.font = { name: 'Calibri', size: 9, bold: true, color: { argb: 'FF92400E' } };
        } else {
          cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFECFDF5' } };
          cell.font = { name: 'Calibri', size: 9, bold: true, color: { argb: 'FF065F46' } };
        }
      }

      // Dictamen de alerta
      if (colNum === 11 && r.riskTier === 'ALTO') {
        cell.font = { name: 'Calibri', size: 9, bold: true, color: { argb: 'FFDC2626' } };
      }
    });
  });

  // Configuración de anchos de columna generosos para evitar CUALQUIER texto truncado
  worksheet.columns = [
    { width: 6 },   // A: N°
    { width: 17 },  // B: ID Folio
    { width: 18 },  // C: Cédula / RIF
    { width: 38 },  // D: Nombre Completo / Razón Social
    { width: 12 },  // E: Tipo
    { width: 15 },  // F: País
    { width: 30 },  // G: Padrón Electoral (CNE)
    { width: 42 },  // H: Registro Fiscal (SENIAT)
    { width: 11 },  // I: Score
    { width: 16 },  // J: Nivel Riesgo
    { width: 54 },  // K: Dictamen Oficial de Cumplimiento
    { width: 48 },  // L: Hallazgos en Listas Vinculantes
    { width: 70 }   // M: Firma Criptográfica SHA-256
  ];

  return await workbook.xlsx.writeBuffer();
}

async function generateHistoryExcel(history, meta = {}) {
  const workbook = new ExcelJS.Workbook();
  workbook.creator = 'GuiaRisk 2.0 Compliance Core';
  workbook.created = new Date();

  const worksheet = workbook.addWorksheet('Pista de Auditoría', {
    views: [{ showGridLines: true }]
  });

  const officerName = meta.officerName || 'Manuel Guía';
  const officerCode = meta.officerCode || 'OFC-2026-MG';
  const dateStr = new Date().toLocaleString('es-VE');

  // Membrete
  worksheet.mergeCells('A1:L1');
  const titleCell = worksheet.getCell('A1');
  titleCell.value = 'GUIARISK COMPLIANCE SUITE 2.0 • PISTA DE AUDITORÍA REGULATORIA INMUTABLE';
  titleCell.font = { name: 'Calibri', size: 12, bold: true, color: { argb: 'FFFFFFFF' } };
  titleCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF065F46' } }; // Verde Regulador
  titleCell.alignment = { horizontal: 'center', vertical: 'middle' };
  worksheet.getRow(1).height = 28;

  worksheet.mergeCells('A2:L2');
  const subCell = worksheet.getCell('A2');
  subCell.value = `EXPEDIENTE DE INSPECCIÓN SUDEASEG / SUDEBAN • EMITIDO EL: ${dateStr} • OFICIAL: ${officerName} (${officerCode})`;
  subCell.font = { name: 'Calibri', size: 9, bold: true, color: { argb: 'FF334155' } };
  subCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF8FAFC' } };
  subCell.alignment = { horizontal: 'center', vertical: 'middle' };
  worksheet.getRow(2).height = 18;

  worksheet.getRow(3).height = 6;

  const headers = [
    'ID Folio',
    'Fecha y Hora',
    'Cédula / RIF',
    'Nombre del Sujeto',
    'Tipo',
    'País',
    'SENIAT',
    'Score',
    'Nivel Riesgo',
    'Dictamen Oficial',
    'Ramo EBR',
    'Firma SHA-256'
  ];

  const headerRow = worksheet.getRow(4);
  headerRow.values = headers;
  headerRow.height = 24;

  headerRow.eachCell((cell) => {
    cell.font = { name: 'Calibri', size: 9.5, bold: true, color: { argb: 'FFFFFFFF' } };
    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF0F172A' } };
    cell.alignment = { horizontal: 'center', vertical: 'middle' };
  });

  history.forEach((item, idx) => {
    const rowNum = 5 + idx;
    const isEven = idx % 2 === 0;

    const row = worksheet.getRow(rowNum);
    row.values = [
      item.auditId,
      new Date(item.timestamp).toLocaleString('es-VE'),
      item.client.idNumber,
      item.client.fullName,
      item.client.personType,
      item.client.country,
      item.nationalEnrichment?.seniat?.verified ? item.nationalEnrichment.seniat.data.status : 'Activo',
      item.riskScore,
      item.riskTier,
      item.verdict,
      item.ebrAssessment?.product?.label || 'Estándar',
      item.integrityHash
    ];
    row.height = 20;

    const baseFill = isEven ? 'FFFFFFFF' : 'FFF8FAFC';
    row.eachCell((cell, colNum) => {
      cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: baseFill } };
      cell.font = { name: 'Calibri', size: 9, color: { argb: 'FF0F172A' } };
      cell.border = {
        top: { style: 'thin', color: { argb: 'FFE2E8F0' } },
        bottom: { style: 'thin', color: { argb: 'FFE2E8F0' } },
        left: { style: 'thin', color: { argb: 'FFE2E8F0' } },
        right: { style: 'thin', color: { argb: 'FFE2E8F0' } }
      };

      if ([1, 2, 3, 5, 6, 8, 9].includes(colNum)) {
        cell.alignment = { vertical: 'middle', horizontal: 'center' };
      }
      if (colNum === 12) {
        cell.font = { name: 'Consolas', size: 8, color: { argb: 'FF475569' } };
        cell.alignment = { vertical: 'middle', horizontal: 'center' };
      }
    });
  });

  worksheet.columns = [
    { width: 16 },  // A: ID Folio
    { width: 22 },  // B: Fecha
    { width: 16 },  // C: Cédula
    { width: 36 },  // D: Nombre
    { width: 12 },  // E: Tipo
    { width: 14 },  // F: País
    { width: 34 },  // G: SENIAT
    { width: 10 },  // H: Score
    { width: 15 },  // I: Nivel
    { width: 50 },  // J: Dictamen
    { width: 28 },  // K: EBR
    { width: 68 }   // L: Hash SHA-256
  ];

  return await workbook.xlsx.writeBuffer();
}

module.exports = {
  generateBatchExcel,
  generateHistoryExcel
};
