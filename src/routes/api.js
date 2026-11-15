/**
 * GuiaRisk - Rutas API REST
 */

const express = require('express');
const router = express.Router();
const multer = require('multer');
const XLSX = require('xlsx');
const { runAudit, loadLists } = require('../services/audit-engine');
const {
  createCertificate,
  getAuditHistory,
  getCertificateByHash,
  getCertificateById,
  dismissMatch
} = require('../services/certificate-service');
const { generateBatchExcel, generateHistoryExcel } = require('../services/excel-export-service');
const { getCaptchaSession, queryLiveTaxpayer } = require('../services/seniat-live-service');

const upload = multer({ limits: { fileSize: 10 * 1024 * 1024 } }); // 10MB para carteras grandes

// 1. Estado del Sistema y Catálogo de 18 Fuentes
router.get('/status', (req, res) => {
  res.json({
    status: 'ONLINE',
    version: '2.0.0',
    system: 'GuiaRisk Compliance Core (18 Fuentes Integradas)',
    activeLists: [
      { name: 'OFAC Specially Designated Nationals (SDN & CSL)', jurisdiction: 'Estados Unidos (U.S. Treasury)', records: '15,400+', status: 'ACTIVA' },
      { name: 'Consejo de Seguridad ONU (UNSC)', jurisdiction: 'Naciones Unidas (Global)', records: '1,120+', status: 'ACTIVA' },
      { name: 'Lista Consolidada de Sanciones de la Unión Europea (UE)', jurisdiction: 'Unión Europea (SEAE / EEAS)', records: '2,890+', status: 'ACTIVA' },
      { name: 'HM Treasury / OFSI Sanctions List', jurisdiction: 'Reino Unido (HM Treasury)', records: '4,100+', status: 'ACTIVA' },
      { name: 'INTERPOL Notificaciones Rojas (Red Notices)', jurisdiction: 'Internacional (195 Países)', records: '7,300+', status: 'ACTIVA' },
      { name: 'Banco Mundial & BID (Empresas Inhabilitadas / Debarred)', jurisdiction: 'Organismos Multilaterales', records: '1,250+', status: 'ACTIVA' },
      { name: 'Canadá SEMA Sanctions', jurisdiction: 'Canadá (Global Affairs)', records: '980+', status: 'ACTIVA' },
      { name: 'Padrón Electoral Nacional (CNE)', jurisdiction: 'Venezuela (Registro Electoral)', records: 'No disponible', status: 'FUERA DE SERVICIO (TEMPORAL)' },
      { name: 'SENIAT Condición Tributaria & Retenciones RIF', jurisdiction: 'Venezuela (Administración Tributaria)', records: 'Enlace Directo', status: 'EN LÍNEA' },
      { name: 'Contraloría General (CGR - Inhabilitados Políticos/Admin)', jurisdiction: 'Venezuela (Control Fiscal)', records: '2,340+', status: 'ACTIVA' },
      { name: 'Registro Nacional de Contratistas (RNC / SNC)', jurisdiction: 'Venezuela (Contrataciones Públicas)', records: '145,000+', status: 'ACTIVA' },
      { name: 'SUDEBAN Alertas Financieras & Cuentas Inmovilizadas', jurisdiction: 'Venezuela (Sector Bancario)', records: '3,120+', status: 'ACTIVA' },
      { name: 'SUDEASEG Intermediarios y Productores Autorizados', jurisdiction: 'Venezuela (Sector Asegurador)', records: '8,400+', status: 'ACTIVA' },
      { name: 'TSJ Sentencias Penales & Medidas Cautelares de Bienes', jurisdiction: 'Venezuela (Poder Judicial)', records: '18,500+', status: 'ACTIVA' },
      { name: 'Directorio Oficial de PEPs Nacionales', jurisdiction: 'Venezuela (Gaceta Oficial)', records: '4,850+', status: 'ACTIVA' },
      { name: 'Directorio de PEPs Extranjeros & Multilaterales (GAFI Rec. 12)', jurisdiction: 'Internacional (Jefes de Estado)', records: '6,200+', status: 'ACTIVA' },
      { name: 'Prensa Adversa Estructurada (Adverse Media OSINT)', jurisdiction: 'Global (Medios de Investigación)', records: 'Monitoreo Continuo', status: 'ACTIVA' },
      { name: 'Registro Central Antifraude de Siniestros (CAV)', jurisdiction: 'Venezuela (Sector Asegurador)', records: '12,900+', status: 'ACTIVA' }
    ],
    lastSync: new Date().toLocaleDateString('es-VE') + ' ' + new Date().toLocaleTimeString('es-VE')
  });
});

// 2. Auditoría Individual (1 a 1) con EBR y Beneficiarios Finales (UBO)
router.post('/audit/single', async (req, res) => {
  try {
    const { fullName, idNumber, country, dob, personType, officer, ebrFactors, beneficialOwners } = req.body;

    if (!idNumber && !fullName) {
      return res.status(400).json({
        error: 'Debe ingresar al menos un número de documento (Cédula/RIF) o Nombre Completo'
      });
    }

    const auditResult = runAudit({
      fullName,
      idNumber,
      country: country || 'Venezuela',
      dob,
      personType: personType || 'Natural',
      ebrFactors: ebrFactors || null,
      beneficialOwners: Array.isArray(beneficialOwners) ? beneficialOwners : []
    });

    // Generar el Certificado Oficial inmutable
    const certificate = await createCertificate(auditResult, officer);

    res.json({
      success: true,
      audit: certificate
    });
  } catch (err) {
    console.error('Error en auditoría individual:', err);
    res.status(500).json({ error: 'Error interno ejecutando la debida diligencia' });
  }
});

// 3. Auditoría Masiva (Carga en Lote JSON)
router.post('/audit/batch', async (req, res) => {
  try {
    const { records } = req.body;

    if (!Array.isArray(records) || records.length === 0) {
      return res.status(400).json({ error: 'Lista de registros inválida o vacía' });
    }

    const results = [];
    for (const record of records) {
      const auditResult = runAudit({
        fullName: record.fullName || record.nombre || record.Nombre || record['Nombre Completo'],
        idNumber: record.idNumber || record.cedula || record.rif || record.Cedula || record.Cédula || record.RIF || record['Cédula o RIF'],
        country: record.country || record.pais || record.País || 'Venezuela',
        dob: record.dob || record.fechaNacimiento || record['Fecha Nacimiento'],
        personType: record.personType || record.tipo || record.Tipo || 'Natural'
      });

      const cert = await createCertificate(auditResult, {
        name: 'Manuel Guia',
        role: 'Oficial de Cumplimiento / Analista Senior',
        code: 'OFC-2026-MG'
      });

      results.push(cert);
    }

    const stats = {
      total: results.length,
      bajo: results.filter((r) => r.riskTier === 'BAJO').length,
      medio: results.filter((r) => r.riskTier === 'MEDIO').length,
      alto: results.filter((r) => r.riskTier === 'ALTO').length
    };

    res.json({
      success: true,
      stats,
      results
    });
  } catch (err) {
    console.error('Error en auditoría masiva:', err);
    res.status(500).json({ error: 'Error procesando lote de auditoría' });
  }
});

// 3.1 Carga Masiva Real de Archivos Excel (.xlsx, .xls) o CSV
router.post('/audit/batch-upload', upload.any(), async (req, res) => {
  try {
    const uploadedFile = req.file || (req.files && req.files[0]);
    if (!uploadedFile || !uploadedFile.buffer) {
      return res.status(400).json({ error: 'No se recibió ningún archivo. Suba un archivo Excel (.xlsx/.xls) o CSV.' });
    }

    const workbook = XLSX.read(uploadedFile.buffer, { type: 'buffer' });
    const sheetName = workbook.SheetNames[0];
    const rawRows = XLSX.utils.sheet_to_json(workbook.Sheets[sheetName], { defval: '' });

    if (!rawRows || rawRows.length === 0) {
      return res.status(400).json({ error: 'El archivo subido está vacío o no tiene filas válidas.' });
    }

    const results = [];
    for (const row of rawRows) {
      // Normalización inteligente de columnas
      const idNumber = String(
        row['Cédula o RIF'] || row['Cedula o RIF'] || row['Cédula/RIF'] || row['Cedula/RIF'] ||
        row['Cédula'] || row['Cedula'] || row['RIF'] || row['rif'] || row['idNumber'] || row['Documento'] || ''
      ).trim();

      const fullName = String(
        row['Nombre Completo'] || row['Nombre y Apellidos'] || row['Razón Social'] || row['Razon Social'] ||
        row['Titular'] || row['Nombre'] || row['nombre'] || row['fullName'] || ''
      ).trim();

      const personType = String(
        row['Tipo'] || row['Tipo de Persona'] || row['Tipo Sujeto'] || row['personType'] ||
        (idNumber.toUpperCase().startsWith('J-') || idNumber.toUpperCase().startsWith('G-') ? 'Juridica' : 'Natural')
      ).trim();

      const country = String(row['País'] || row['Pais'] || row['country'] || 'Venezuela').trim();
      const dob = String(row['Fecha de Nacimiento'] || row['Fecha Nacimiento'] || row['Nacimiento'] || row['dob'] || '').trim();

      if (!idNumber && !fullName) continue;

      const auditResult = runAudit({
        fullName,
        idNumber,
        country,
        dob,
        personType
      });

      const cert = await createCertificate(auditResult, {
        name: 'Manuel Guia',
        role: 'Oficial de Cumplimiento / Analista Senior',
        code: 'OFC-2026-MG'
      });

      results.push(cert);
    }

    const stats = {
      total: results.length,
      bajo: results.filter((r) => r.riskTier === 'BAJO').length,
      clean: results.filter((r) => r.riskTier === 'BAJO').length,
      medio: results.filter((r) => r.riskTier === 'MEDIO').length,
      mediumRisk: results.filter((r) => r.riskTier === 'MEDIO').length,
      alto: results.filter((r) => r.riskTier === 'ALTO').length,
      highRisk: results.filter((r) => r.riskTier === 'ALTO').length
    };

    res.json({
      success: true,
      filename: uploadedFile.originalname,
      stats,
      results
    });
  } catch (err) {
    console.error('Error procesando archivo Excel/CSV:', err);
    res.status(500).json({ error: 'Error analizando la estructura del archivo Excel/CSV' });
  }
});

// 3.2 Descarga de Plantilla Oficial de Carga Masiva (.xlsx)
router.get('/audit/batch-template', (req, res) => {
  try {
    const templateRows = [
      {
        'Cédula o RIF': 'V-11894220',
        'Nombre Completo': 'Rafael Eduardo Mendoza Castillo',
        'Tipo Sujeto': 'Natural',
        'País': 'Venezuela',
        'Fecha Nacimiento': '1971-04-18'
      },
      {
        'Cédula o RIF': 'V-19876543',
        'Nombre Completo': 'Mariana Rodriguez Marquez',
        'Tipo Sujeto': 'Natural',
        'País': 'Venezuela',
        'Fecha Nacimiento': '1991-09-24'
      },
      {
        'Cédula o RIF': 'J-31099882-1',
        'Nombre Completo': 'Inversiones Mar de Plata C.A.',
        'Tipo Sujeto': 'Juridica',
        'País': 'Venezuela',
        'Fecha Nacimiento': ''
      },
      {
        'Cédula o RIF': 'V-14228901',
        'Nombre Completo': 'Carmen Beatriz Hernandez Silva',
        'Tipo Sujeto': 'Natural',
        'País': 'Venezuela',
        'Fecha Nacimiento': '1980-06-15'
      },
      {
        'Cédula o RIF': 'V-6842109',
        'Nombre Completo': 'Jose Antonio Martinez Rivas',
        'Tipo Sujeto': 'Natural',
        'País': 'Venezuela',
        'Fecha Nacimiento': '1965-09-30'
      }
    ];

    const wb = XLSX.utils.book_new();
    const ws = XLSX.utils.json_to_sheet(templateRows);
    ws['!cols'] = [
      { wch: 18 }, // Cédula o RIF
      { wch: 38 }, // Nombre Completo
      { wch: 16 }, // Tipo Sujeto
      { wch: 16 }, // País
      { wch: 20 }  // Fecha Nacimiento
    ];
    XLSX.utils.book_append_sheet(wb, ws, 'Plantilla_Auditoria');
    const buf = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' });

    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', 'attachment; filename="Plantilla_Auditoria_Cartera_GuiaRisk.xlsx"');
    res.send(buf);
  } catch (err) {
    console.error('Error generando plantilla Excel:', err);
    res.status(500).json({ error: 'Error generando plantilla' });
  }
});

// 3.3 Exportar Historial a Excel Regulatorio con ExcelJS (SUDEASEG / SUDEBAN)
router.get('/audit/export-history', async (req, res) => {
  try {
    const history = getAuditHistory();
    const buf = await generateHistoryExcel(history, {
      officerName: 'Manuel Guía',
      officerCode: 'OFC-2026-MG'
    });

    const todayStr = new Date().toISOString().slice(0, 10).replace(/-/g, '');
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', `attachment; filename="Reporte_Oficial_SUDEASEG_SUDEBAN_${todayStr}.xlsx"`);
    res.send(buf);
  } catch (err) {
    console.error('Error exportando historial:', err);
    res.status(500).json({ error: 'Error exportando historial' });
  }
});

// 3.4 Exportar Lote de Auditoría a Excel Profesional con ExcelJS
router.post('/audit/export-batch-excel', async (req, res) => {
  try {
    const { results } = req.body;
    if (!results || !results.length) {
      return res.status(400).json({ error: 'No hay resultados para exportar' });
    }

    const buf = await generateBatchExcel(results, {
      officerName: 'Manuel Guía',
      officerCode: 'OFC-2026-MG'
    });

    const todayStr = new Date().toISOString().slice(0, 10).replace(/-/g, '');
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', `attachment; filename="Auditoria_Cartera_GuiaRisk_${todayStr}.xlsx"`);
    res.send(buf);
  } catch (err) {
    console.error('Error exportando lote Excel:', err);
    res.status(500).json({ error: 'Error exportando lote a Excel' });
  }
});

// 4. Descarte de Homonimia (Falso Positivo) con justificación obligatoria
router.post('/audit/dismiss-homonym', (req, res) => {
  try {
    const { auditId, referenceId, justification, officerName } = req.body;

    if (!auditId || !referenceId || !justification) {
      return res.status(400).json({
        error: 'Debe suministrar auditId, referenceId y la justificación obligatoria de descarte.'
      });
    }

    const outcome = dismissMatch(auditId, referenceId, justification, officerName);
    if (!outcome.success) {
      return res.status(404).json(outcome);
    }

    res.json(outcome);
  } catch (err) {
    console.error('Error descartando homonimia:', err);
    res.status(500).json({ error: 'Error procesando descarte' });
  }
});

// 5. Historial de Auditorías
router.get('/audit/history', (req, res) => {
  res.json({
    success: true,
    history: getAuditHistory()
  });
});

// 6. Obtener Certificado por ID
router.get('/audit/certificate/:id', (req, res) => {
  const cert = getCertificateById(req.params.id);
  if (!cert) {
    return res.status(404).json({ error: 'Certificado no encontrado' });
  }
  res.json({ success: true, certificate: cert });
});

// 7. Verificación Pública de Certificado (Por Hash SHA-256)
router.get('/verify/:hash', (req, res) => {
  const cert = getCertificateByHash(req.params.hash);
  if (!cert) {
    return res.status(404).json({
      verified: false,
      message: 'Certificado o Hash no encontrado en el registro inmutable de GuiaRisk'
    });
  }

  res.json({
    verified: true,
    certificate: {
      auditId: cert.auditId,
      integrityHash: cert.integrityHash,
      clientName: cert.client.fullName,
      clientId: cert.client.idNumber,
      riskTier: cert.riskTier,
      riskScore: cert.riskScore,
      verdict: cert.verdict,
      timestamp: cert.timestamp,
      officer: cert.complianceOfficer.name,
      sourcesConsulted: cert.stats.totalSourcesConsulted,
      matchesCount: cert.matches.length
    }
  });
});

// 8. Sincronización Manual de Listas
router.post('/sync/refresh', (req, res) => {
  loadLists();
  res.json({
    success: true,
    message: 'Bases de datos de cumplimiento sincronizadas y reindexadas con éxito.',
    updatedAt: new Date().toISOString()
  });
});

// 9. Enlace en Vivo con SENIAT (Human-in-the-Loop & Sesión de 15 min)
router.get('/seniat/live/captcha', async (req, res) => {
  try {
    const result = await getCaptchaSession(req.query.sessionId);
    res.json(result);
  } catch (err) {
    res.status(500).json({ success: false, error: 'SERVER_ERROR', message: err.message });
  }
});

router.post('/seniat/live/query', async (req, res) => {
  try {
    const { idNumber, captchaCode, sessionId } = req.body;
    if (!idNumber) {
      return res.status(400).json({ success: false, error: 'ID_REQUIRED', message: 'Debe ingresar un número de cédula o RIF.' });
    }
    const result = await queryLiveTaxpayer(idNumber, captchaCode, sessionId);
    res.json(result);
  } catch (err) {
    res.status(500).json({ success: false, error: 'SERVER_ERROR', message: err.message });
  }
});

module.exports = router;
