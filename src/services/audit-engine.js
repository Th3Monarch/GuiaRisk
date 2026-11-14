/**
 * GuiaRisk - Motor Principal de Auditoría y Scoring de Riesgo
 * Cruza listas internacionales (OFAC, ONU, UE, UK, INTERPOL, Banco Mundial, Canadá)
 * y registros nacionales (PEPs, CNE, SENIAT, CGR, RNC, SUDEBAN, SUDEASEG, TSJ, Prensa Adversa, Antifraude)
 * con Algoritmo de Descarte Inteligente de Falsos Positivos (Smart Disambiguation).
 */

const fs = require('fs');
const path = require('path');
const { calculateMatchScore } = require('./fuzzy-matcher');
const { lookupCNE, lookupSENIAT } = require('./national-enricher');

const LIST_DEFINITIONS = [
  {
    key: 'ofac',
    file: '../data/ofac-sdn.json',
    source: 'OFAC (Departamento del Tesoro EE.UU.)',
    listType: 'Sancionatoria Vinculante (EE.UU.)',
    category: 'Internacional'
  },
  {
    key: 'un',
    file: '../data/un-sanctions.json',
    source: 'Consejo de Seguridad ONU',
    listType: 'Sancionatoria Vinculante (Naciones Unidas)',
    category: 'Internacional'
  },
  {
    key: 'eu',
    file: '../data/eu-sanctions.json',
    source: 'Unión Europea (SEAE / EEAS)',
    listType: 'Sancionatoria Vinculante (Unión Europea)',
    category: 'Internacional'
  },
  {
    key: 'uk',
    file: '../data/uk-sanctions.json',
    source: 'HM Treasury / OFSI (Reino Unido)',
    listType: 'Sancionatoria Vinculante (Reino Unido)',
    category: 'Internacional'
  },
  {
    key: 'interpol',
    file: '../data/interpol-red-notices.json',
    source: 'INTERPOL (Notificaciones Rojas)',
    listType: 'Búsqueda y Captura Internacional',
    category: 'Internacional'
  },
  {
    key: 'worldbank',
    file: '../data/worldbank-debarred.json',
    source: 'Banco Mundial & BID (Empresas Inhabilitadas)',
    listType: 'Inhabilitación Multilateral por Corrupción',
    category: 'Internacional'
  },
  {
    key: 'canada',
    file: '../data/canada-sema.json',
    source: 'Gobierno de Canadá (SEMA)',
    listType: 'Sancionatoria Vinculante (Canadá)',
    category: 'Internacional'
  },
  {
    key: 'pepsNacional',
    file: '../data/peps-nacional.json',
    source: 'Directorio PEP Nacional (Gaceta Oficial)',
    listType: 'Persona Políticamente Expuesta (Venezuela)',
    category: 'Nacional'
  },
  {
    key: 'pepsExtranjero',
    file: '../data/peps-extranjeros.json',
    source: 'Directorio PEP Extranjero (GAFI Rec. 12)',
    listType: 'Persona Políticamente Expuesta (Extranjera / Multilateral)',
    category: 'Internacional'
  },
  {
    key: 'cgr',
    file: '../data/cgr-inhabilitados.json',
    source: 'Contraloría General de la República (CGR)',
    listType: 'Inhabilitación Administrativa y Política (Venezuela)',
    category: 'Nacional'
  },
  {
    key: 'rnc',
    file: '../data/rnc-contratistas.json',
    source: 'Registro Nacional de Contratistas (SNC / RNC)',
    listType: 'Estatus Contractual del Estado (Venezuela)',
    category: 'Nacional'
  },
  {
    key: 'sudeban',
    file: '../data/sudeban-alertas.json',
    source: 'SUDEBAN (Superintendencia de Bancos)',
    listType: 'Alerta Financiera / Inmovilización de Fondos',
    category: 'Nacional'
  },
  {
    key: 'sudeaseg',
    file: '../data/sudeaseg-intermediarios.json',
    source: 'SUDEASEG (Actividad Aseguradora)',
    listType: 'Control de Intermediarios y Corredores de Seguros',
    category: 'Nacional'
  },
  {
    key: 'tsj',
    file: '../data/tsj-sentencias.json',
    source: 'Tribunal Supremo de Justicia (TSJ)',
    listType: 'Medida Cautelar Penal / Aseguramiento de Bienes',
    category: 'Nacional'
  },
  {
    key: 'adverseMedia',
    file: '../data/adverse-media.json',
    source: 'Prensa Adversa Estructurada (OSINT)',
    listType: 'Riesgo Reputacional / Investigaciones Periodísticas',
    category: 'Especial'
  },
  {
    key: 'antifraude',
    file: '../data/antifraude-siniestros.json',
    source: 'Registro Antifraude de Siniestros (CAV)',
    listType: 'Alerta Antifraude del Sector Asegurador',
    category: 'Especial'
  }
];

const loadedData = {};

function loadLists() {
  LIST_DEFINITIONS.forEach((def) => {
    try {
      const fullPath = path.join(__dirname, def.file);
      if (fs.existsSync(fullPath)) {
        loadedData[def.key] = JSON.parse(fs.readFileSync(fullPath, 'utf8'));
      } else {
        loadedData[def.key] = [];
      }
    } catch (err) {
      console.error(`Error cargando lista ${def.key} (${def.file}):`, err);
      loadedData[def.key] = [];
    }
  });
}
loadLists();

function getYearFromDate(dateStr) {
  if (!dateStr) return null;
  const match = dateStr.match(/\d{4}/);
  return match ? parseInt(match[0], 10) : null;
}

// Catálogo Oficial de Factores de Riesgo EBR (Providencia SUDEASEG N° 514 / SUDEBAN)
const EBR_CATALOG = {
  products: {
    automovil_salud: { label: 'Automóvil / Salud / Vida Individual', score: 0, level: 'Bajo' },
    patrimonial_incendio: { label: 'Patrimonial / Incendio / Transporte / Responsabilidad Civil', score: 10, level: 'Moderado' },
    fianzas_financieras: { label: 'Fianzas / Cumplimiento / Líneas Financieras / Colectivos Masivos', score: 20, level: 'Alto' }
  },
  channels: {
    corredor_autorizado: { label: 'Corredor de Seguros Autorizado (SUDEASEG)', score: 0, level: 'Estándar' },
    venta_directa: { label: 'Venta Directa en Sucursal / Taquilla', score: 0, level: 'Bajo' },
    banca_affinity: { label: 'Banca-Seguros / Canales Masivos / Affinity', score: 5, level: 'Medio' },
    no_presencial: { label: 'No Presencial / Digital Sin Verificación Biométrica / Terceros', score: 15, level: 'Alto' }
  },
  zones: {
    caracas_central: { label: 'Gran Caracas y Región Central', score: 0, level: 'Bajo' },
    interior: { label: 'Interior del País (Región Centro-Occidente / Oriente)', score: 5, level: 'Medio' },
    fronteriza: { label: 'Zona Fronteriza (Zulia, Táchira, Apure, Bolívar, Amazonas)', score: 20, level: 'Alto' },
    offshore: { label: 'Jurisdicciones Internacionales / No Cooperantes / Paraísos Fiscales', score: 30, level: 'Muy Alto' }
  }
};

function calculateEBRAssessment(ebrInput) {
  if (!ebrInput) {
    return {
      applied: false,
      product: EBR_CATALOG.products.automovil_salud,
      channel: EBR_CATALOG.channels.corredor_autorizado,
      zone: EBR_CATALOG.zones.caracas_central,
      totalAdjustment: 0,
      level: 'Bajo',
      summary: 'Evaluación estándar de producto y canal presencial.'
    };
  }

  const product = EBR_CATALOG.products[ebrInput.product] || EBR_CATALOG.products.automovil_salud;
  const channel = EBR_CATALOG.channels[ebrInput.channel] || EBR_CATALOG.channels.corredor_autorizado;
  const zone = EBR_CATALOG.zones[ebrInput.zone] || EBR_CATALOG.zones.caracas_central;

  const totalAdjustment = product.score + channel.score + zone.score;
  let level = 'Bajo';
  if (totalAdjustment >= 30) level = 'Alto';
  else if (totalAdjustment >= 15) level = 'Medio';

  return {
    applied: true,
    product,
    channel,
    zone,
    totalAdjustment,
    level,
    summary: `Ramo: ${product.label} (${product.level}) • Canal: ${channel.label} (${channel.level}) • Zona: ${zone.label} (${zone.level})`
  };
}

function evaluateSmartDisambiguation(client, candidate) {
  const notes = [];
  let isProbableFalsePositive = false;
  let severityAdjustment = 0;

  // 1. Comparación de año de nacimiento / edad
  const clientYear = getYearFromDate(client.dob);
  const candidateYear = getYearFromDate(candidate.dob);

  if (clientYear && candidateYear) {
    const diffYears = Math.abs(clientYear - candidateYear);
    if (diffYears >= 10) {
      isProbableFalsePositive = true;
      notes.push(`Discrepancia etaria evidente: diferencia de ${diffYears} años (${clientYear} vs ${candidateYear}).`);
      severityAdjustment -= 40;
    } else if (diffYears >= 4) {
      notes.push(`Diferencia moderada de fecha de nacimiento (${diffYears} años).`);
      severityAdjustment -= 20;
    } else {
      notes.push(`Coincidencia estrecha en año de nacimiento (${clientYear}).`);
      severityAdjustment += 15;
    }
  }

  // 2. Comparación de nacionalidad / país
  const clientCountry = (client.country || 'Venezuela').trim().toUpperCase();
  const candidateCountry = (candidate.nationality || '').trim().toUpperCase();

  if (candidateCountry && clientCountry) {
    if (candidateCountry !== clientCountry && !candidateCountry.includes(clientCountry) && !clientCountry.includes(candidateCountry)) {
      isProbableFalsePositive = true;
      notes.push(`Discrepancia geográfica: el sancionado tiene nacionalidad (${candidate.nationality}) distinta a la del cliente (${client.country || 'Venezuela'}).`);
      severityAdjustment -= 30;
    } else {
      notes.push(`Jurisdicción y nacionalidad concordante (${candidate.nationality}).`);
      severityAdjustment += 15;
    }
  }

  // 3. Comparación de Documento de Identidad directo
  if (client.idNumber && candidate.idNumber) {
    const clientCleanId = client.idNumber.replace(/[^A-Z0-9]/gi, '').toUpperCase();
    const candCleanId = candidate.idNumber.replace(/[^A-Z0-9]/gi, '').toUpperCase();
    if (clientCleanId === candCleanId || candCleanId.includes(clientCleanId)) {
      isProbableFalsePositive = false;
      notes.push(`ALERTA MÁXIMA: Coincidencia directa de Documento de Identidad oficial (${candidate.idNumber}).`);
      severityAdjustment += 60;
    }
  }

  return {
    isProbableFalsePositive,
    notes,
    severityAdjustment
  };
}

function runAudit(clientData) {
  loadLists();
  const targetName = (clientData.fullName || '').trim();
  const docNumber = (clientData.idNumber || '').trim();
  const personType = clientData.personType || 'Natural'; // Natural | Juridica

  // 1. Enriquecimiento Nacional (CNE + SENIAT)
  const cneResult = lookupCNE(docNumber, targetName);
  const seniatResult = lookupSENIAT(docNumber, targetName);

  // Si no se proporcionó nombre completo pero está en el SENIAT con registro específico, lo aprovechamos
  const effectiveName = targetName || (seniatResult.verified && seniatResult.isSpecificRecord ? seniatResult.data.name : targetName);

  const matches = [];

  // 2. Auditoría Unificada sobre las 16 Listas Especializadas
  LIST_DEFINITIONS.forEach((def) => {
    const list = loadedData[def.key] || [];
    list.forEach((entry) => {
      let bestScore = calculateMatchScore(effectiveName, entry.name);

      if (entry.aliases && entry.aliases.length) {
        entry.aliases.forEach((alias) => {
          const aliasScore = calculateMatchScore(effectiveName, alias);
          if (aliasScore > bestScore) bestScore = aliasScore;
        });
      }

      // Coincidencia por documento directo (Cédula / RIF / Pasaporte)
      if (docNumber && entry.idNumber) {
        const c1 = docNumber.replace(/[^A-Z0-9]/gi, '').toUpperCase();
        const c2 = entry.idNumber.replace(/[^A-Z0-9]/gi, '').toUpperCase();
        if (c1 === c2 || (c1.length >= 6 && c2.includes(c1)) || (c2.length >= 6 && c1.includes(c2))) {
          bestScore = 100;
        }
      }

      if (bestScore >= 70) {
        const disambiguation = evaluateSmartDisambiguation(
          { ...clientData, fullName: effectiveName },
          entry
        );

        matches.push({
          source: def.source,
          listType: def.listType,
          category: def.category,
          referenceId: entry.id,
          matchedName: entry.name,
          aliases: entry.aliases || [],
          program: entry.program || entry.category || def.listType,
          nationality: entry.nationality || 'Venezuela',
          dob: entry.dob,
          idNumber: entry.idNumber,
          position: entry.position,
          institution: entry.institution,
          score: bestScore,
          smartDisambiguation: disambiguation,
          remarks: entry.remarks,
          caseDetails: entry.caseDetails || '',
          legalBasis: entry.legalBasis || '',
          complianceImpact: entry.complianceImpact || '',
          dismissed: false
        });
      }
    });
  });

  // 3. Verificación de Alerta Fiscal SENIAT (Medidas Cautelares o Bloqueo)
  if (seniatResult.verified && (seniatResult.data.status.includes('Bloqueado') || seniatResult.data.status.includes('Cautelar'))) {
    matches.unshift({
      source: 'SENIAT (Administración Tributaria)',
      listType: 'Medida Cautelar / Bloqueo Fiscal',
      category: 'Nacional',
      referenceId: 'SENIAT-' + (seniatResult.data.rif || 'RIF'),
      matchedName: seniatResult.data.name,
      idNumber: seniatResult.data.rif,
      nationality: 'Venezuela',
      score: 100,
      smartDisambiguation: {
        isProbableFalsePositive: false,
        notes: [],
        severityAdjustment: 0
      },
      remarks: `Contribuyente con estatus fiscal restrictivo oficial: "${seniatResult.data.status}". Retención asignada: ${seniatResult.data.withholdingRate}.`,
      caseDetails: `La Administración Aduanera y Tributaria (SENIAT) mantiene una medida de aseguramiento fiscal o bloqueo operativo sobre el RIF ${seniatResult.data.rif}. El contribuyente presenta inhabilitación activa para trámites comerciales, timbrado y cobros corporativos.`,
      legalBasis: 'Código Orgánico Tributario (G.O. 6.507) Art. 137 • Providencias Administrativas SENIAT sobre Sujetos Pasivos Especiales',
      complianceImpact: 'BLOQUEO FISCAL OBLIGATORIO: Se suspende la emisión de pólizas, cobros y pagos de siniestros hasta que el titular presente certificación de levantamiento de la medida cautelar expedida por el SENIAT.',
      dismissed: false
    });
  }

  // 4. Auditoría Integral de Beneficiarios Finales (UBO >= 25%) contra TODAS las listas
  const auditedBeneficialOwners = [];
  if (personType === 'Juridica' && Array.isArray(clientData.beneficialOwners) && clientData.beneficialOwners.length > 0) {
    clientData.beneficialOwners.forEach((owner) => {
      const ownerName = (owner.fullName || '').trim();
      const ownerDoc = (owner.idNumber || '').trim();
      const share = parseFloat(owner.sharePercentage) || 0;
      const position = owner.position || 'Accionista';

      if (!ownerName && !ownerDoc) return;

      const ownerMatches = [];

      LIST_DEFINITIONS.forEach((def) => {
        const list = loadedData[def.key] || [];
        list.forEach((entry) => {
          let sc = calculateMatchScore(ownerName, entry.name);
          if (ownerDoc && entry.idNumber) {
            const c1 = ownerDoc.replace(/[^A-Z0-9]/gi, '').toUpperCase();
            const c2 = entry.idNumber.replace(/[^A-Z0-9]/gi, '').toUpperCase();
            if (c1 === c2 || (c1.length >= 6 && c2.includes(c1))) sc = 100;
          }
          if (sc >= 75) {
            ownerMatches.push({ source: def.source, entry, sc });
          }
        });
      });

      const hasAlert = ownerMatches.length > 0;
      auditedBeneficialOwners.push({
        idNumber: ownerDoc,
        fullName: ownerName,
        sharePercentage: share,
        position,
        status: hasAlert ? 'ALERTA VINCULANTE' : 'CONFORME (SIN HALLAZGOS)',
        alertSource: hasAlert ? ownerMatches[0].source : null,
        riskScore: hasAlert ? ownerMatches[0].sc : 0
      });

      if (hasAlert) {
        const topMatch = ownerMatches[0];
        matches.push({
          source: `Beneficiario Final / UBO: ${ownerName} (${share}%)`,
          listType: `Alerta Indirecta en Accionista (${topMatch.source})`,
          category: 'UBO / Control Accionario',
          referenceId: `UBO-${ownerDoc || 'ACCIONISTA'}-${topMatch.entry.id || 'REF'}`,
          matchedName: `${ownerName} (Beneficiario Final ${share}% de ${effectiveName})`,
          idNumber: ownerDoc,
          nationality: topMatch.entry.nationality || 'Venezuela',
          score: topMatch.sc,
          smartDisambiguation: {
            isProbableFalsePositive: false,
            notes: [`Accionista relevante con ${share}% de participación en el capital social.`],
            severityAdjustment: 25
          },
          remarks: `El accionista y beneficiario final ${ownerName} figura en ${topMatch.source}. ${topMatch.entry.remarks || topMatch.entry.position || ''}`,
          caseDetails: topMatch.entry.caseDetails || `Sanción, designación o alerta sobre el beneficiario final ${ownerName}.`,
          legalBasis: 'Ley Orgánica contra la Delincuencia Organizada (LOCDO/FT) Art. 4 • Providencia SUDEASEG N° 514 (Identificación del Beneficiario Final)',
          complianceImpact: `DEBIDA DILIGENCIA INTENSIFICADA UBO: Al poseer el beneficiario final una participación relevante (≥25%), la alerta sobre el titular contamina la operativa de la empresa. Requiere aprobación expresa de la Junta Directiva y reporte a la SUDEASEG / SUDEBAN.`,
          dismissed: false
        });
      }
    });
  }

  // 5. Cálculo del Score General de Riesgo (0 a 100)
  let riskScore = 0;

  if (matches.length === 0) {
    riskScore = 5; // Base normal: bajo riesgo
  } else {
    let maxRisk = 0;
    matches.forEach((m) => {
      let itemRisk = m.score;
      if (m.smartDisambiguation) {
        itemRisk += m.smartDisambiguation.severityAdjustment;
      }
      if (itemRisk > maxRisk) maxRisk = itemRisk;
    });
    riskScore = Math.min(100, Math.max(10, maxRisk));
  }

  // Si SENIAT reporta bloqueo, asegurar score de alto riesgo
  if (seniatResult.verified && (seniatResult.data.status.includes('Bloqueado') || seniatResult.data.status.includes('Cautelar'))) {
    riskScore = Math.max(riskScore, 95);
  }

  // 6. Aplicar Factores de Riesgo EBR (Enfoque Basado en Riesgo / SUDEASEG)
  const ebrAssessment = calculateEBRAssessment(clientData.ebrFactors);
  if (ebrAssessment.applied && ebrAssessment.totalAdjustment > 0) {
    riskScore = Math.min(100, riskScore + ebrAssessment.totalAdjustment);
  }

  // Determinar Nivel / Categoría
  let riskTier = 'BAJO';
  let badgeColor = 'emerald';
  let verdict = 'CONFORME / SIN HALLAZGOS VINCULANTES';

  if (riskScore >= 70) {
    riskTier = 'ALTO';
    badgeColor = 'crimson';
    verdict = 'BLOQUEO PREVENTIVO / SUJETO A COMITÉ DE CUMPLIMIENTO';
  } else if (riskScore >= 35) {
    riskTier = 'MEDIO';
    badgeColor = 'amber';
    verdict = 'ALERTA DE RIESGO MODERADO / DEBIDA DILIGENCIA REFORZADA (DDI)';
  }

  return {
    client: {
      ...clientData,
      fullName: effectiveName,
      formattedCedula: cneResult.verified ? cneResult.data.cedula : docNumber,
      personType
    },
    nationalEnrichment: {
      cne: cneResult,
      seniat: seniatResult
    },
    ebrAssessment,
    beneficialOwners: clientData.beneficialOwners || [],
    auditedBeneficialOwners,
    matches,
    riskScore,
    riskTier,
    badgeColor,
    verdict,
    stats: {
      totalSourcesConsulted: 18,
      totalMatchesFound: matches.length,
      auditedAt: new Date().toISOString()
    }
  };
}

module.exports = {
  runAudit,
  loadLists,
  LIST_DEFINITIONS
};
