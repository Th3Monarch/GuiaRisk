/**
 * GuiaRisk - Servicio de Certificados Oficiales de Auditoría & Hash Criptográfico
 */

const crypto = require('crypto');
const QRCode = require('qrcode');

// Historial en memoria (persistente durante la ejecución)
const auditHistory = [];

function generateCertificateHash(payload) {
  const dataToHash = JSON.stringify({
    auditId: payload.auditId,
    client: payload.client,
    riskScore: payload.riskScore,
    riskTier: payload.riskTier,
    verdict: payload.verdict,
    timestamp: payload.timestamp,
    officer: payload.complianceOfficer
  });

  return crypto.createHash('sha256').update(dataToHash).digest('hex');
}

async function createCertificate(auditResult, officerInfo = {}) {
  const auditId = 'GR-' + crypto.randomBytes(4).toString('hex').toUpperCase();
  const timestamp = new Date().toISOString();

  const complianceOfficer = {
    name: officerInfo.name || 'Manuel Guia',
    role: officerInfo.role || 'Oficial de Cumplimiento / Analista Senior',
    code: officerInfo.code || 'OFC-2026-MG'
  };

  const payload = {
    auditId,
    client: auditResult.client,
    nationalEnrichment: auditResult.nationalEnrichment,
    ebrAssessment: auditResult.ebrAssessment,
    beneficialOwners: auditResult.beneficialOwners || [],
    auditedBeneficialOwners: auditResult.auditedBeneficialOwners || [],
    riskScore: auditResult.riskScore,
    riskTier: auditResult.riskTier,
    badgeColor: auditResult.badgeColor,
    verdict: auditResult.verdict,
    matches: auditResult.matches,
    stats: auditResult.stats,
    complianceOfficer,
    timestamp
  };

  const integrityHash = generateCertificateHash(payload);
  payload.integrityHash = integrityHash;

  // Generar URL pública y QR Code
  const baseUrl = process.env.BASE_URL || 'http://localhost:3000';
  const verificationUrl = `${baseUrl}/verify.html?hash=${integrityHash}`;

  try {
    const qrCodeDataUrl = await QRCode.toDataURL(verificationUrl, {
      margin: 1,
      width: 180,
      color: {
        dark: '#0a0f1d',
        light: '#ffffff'
      }
    });
    payload.qrCodeDataUrl = qrCodeDataUrl;
    payload.verificationUrl = verificationUrl;
  } catch (err) {
    console.error('Error generando QR code:', err);
    payload.qrCodeDataUrl = null;
    payload.verificationUrl = verificationUrl;
  }

  // Guardar en bitácora de auditoría
  auditHistory.unshift(payload);

  return payload;
}

function getAuditHistory() {
  return auditHistory;
}

function getCertificateByHash(hash) {
  if (!hash) return null;
  return auditHistory.find((item) => item.integrityHash.toLowerCase() === hash.toLowerCase());
}

function getCertificateById(id) {
  if (!id) return null;
  return auditHistory.find((item) => item.auditId === id);
}

function dismissMatch(auditId, referenceId, justification, officerName) {
  const audit = auditHistory.find((item) => item.auditId === auditId);
  if (!audit) return { success: false, message: 'Auditoría no encontrada' };

  const match = audit.matches.find((m) => m.referenceId === referenceId);
  if (!match) return { success: false, message: 'Coincidencia no encontrada' };

  match.dismissed = true;
  match.dismissalNote = justification;
  match.dismissedBy = officerName || 'Oficial de Cumplimiento';
  match.dismissedAt = new Date().toISOString();

  // Recalcular si quedan coincidencias no descartadas
  const activeMatches = audit.matches.filter((m) => !m.dismissed);
  if (activeMatches.length === 0) {
    audit.riskScore = 15;
    audit.riskTier = 'BAJO (DESCARTE HOMONIMIA CONFORME)';
    audit.badgeColor = 'emerald';
    audit.verdict = 'APROBADO POR COMITÉ / HOMONIMIA FORMALMENTE MITIGADA';
  }

  // Regenerar Hash
  audit.integrityHash = generateCertificateHash(audit);

  return {
    success: true,
    updatedAudit: audit
  };
}

module.exports = {
  createCertificate,
  getAuditHistory,
  getCertificateByHash,
  getCertificateById,
  dismissMatch
};
