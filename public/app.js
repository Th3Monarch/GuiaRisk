/**
 * GUIARISK 2.0 - Lógica de Interfaz y Cliente SPA
 * Cumplimiento Normativo SUDEASEG Providencia N° 514 / SUDEBAN / GAFI
 */

document.addEventListener('DOMContentLoaded', () => {
  let currentAudit = null;
  let currentMatchToDismiss = null;
  let currentBatchResults = [];
  let currentBatchFilter = 'all';

  // ================= TAB NAVIGATION =================
  const tabs = document.querySelectorAll('.nav-tab');
  const panes = document.querySelectorAll('.tab-pane');

  tabs.forEach((tab) => {
    tab.addEventListener('click', () => {
      const target = tab.getAttribute('data-tab');
      tabs.forEach((t) => t.classList.remove('active'));
      panes.forEach((p) => p.classList.remove('active'));

      tab.classList.add('active');
      const targetPane = document.getElementById(target);
      if (targetPane) targetPane.classList.add('active');

      if (target === 'tab-history') {
        loadHistory();
      }
    });
  });

  // ================= PERSON TYPE & UBO MANAGEMENT =================
  const typeBtns = document.querySelectorAll('.type-btn');
  const uboContainer = document.getElementById('uboContainer');
  const uboList = document.getElementById('uboList');
  const btnAddUbo = document.getElementById('btnAddUbo');
  let selectedType = 'Natural';

  function setPersonType(type) {
    selectedType = type;
    typeBtns.forEach((b) => {
      b.classList.toggle('active', b.getAttribute('data-type') === type);
    });

    if (type === 'Juridica') {
      if (uboContainer) uboContainer.style.display = 'block';
      if (uboList && uboList.children.length === 0) {
        addUboRow('', '', '', '');
      }
    } else {
      if (uboContainer) uboContainer.style.display = 'none';
    }
  }

  typeBtns.forEach((btn) => {
    btn.addEventListener('click', () => {
      setPersonType(btn.getAttribute('data-type'));
    });
  });

  function addUboRow(doc = '', name = '', share = '', position = '') {
    if (!uboList) return;
    const row = document.createElement('div');
    row.className = 'ubo-row';
    row.innerHTML = `
      <input type="text" class="form-input ubo-doc" placeholder="Cédula / RIF" value="${doc}" required>
      <input type="text" class="form-input ubo-name" placeholder="Nombre Completo" value="${name}" required>
      <input type="number" class="form-input ubo-share" placeholder="% Acciones" value="${share}" min="1" max="100" required>
      <input type="text" class="form-input ubo-pos" placeholder="Cargo / Función" value="${position}">
      <button type="button" class="btn-icon-danger btn-remove-ubo" title="Eliminar Accionista">&times;</button>
    `;

    row.querySelector('.btn-remove-ubo').addEventListener('click', () => {
      row.remove();
    });

    uboList.appendChild(row);
  }

  if (btnAddUbo) {
    btnAddUbo.addEventListener('click', () => {
      addUboRow('', '', '', '');
    });
  }

  function getBeneficialOwnersData() {
    if (selectedType !== 'Juridica' || !uboList) return [];
    const rows = uboList.querySelectorAll('.ubo-row');
    const ubos = [];
    rows.forEach((r) => {
      const idNumber = r.querySelector('.ubo-doc')?.value.trim();
      const fullName = r.querySelector('.ubo-name')?.value.trim();
      const sharePercentage = parseFloat(r.querySelector('.ubo-share')?.value) || 0;
      const position = r.querySelector('.ubo-pos')?.value.trim() || '';
      if (idNumber && fullName) {
        ubos.push({ idNumber, fullName, sharePercentage, position });
      }
    });
    return ubos;
  }

  // ================= EBR RISK MATRIX ACCORDION =================
  const btnToggleEbr = document.getElementById('btnToggleEbr');
  const ebrPanel = document.getElementById('ebrPanel');
  const ebrArrowIcon = document.getElementById('ebrArrowIcon');
  const ebrProduct = document.getElementById('ebrProduct');
  const ebrChannel = document.getElementById('ebrChannel');
  const ebrZone = document.getElementById('ebrZone');
  const ebrBadgeStatus = document.getElementById('ebrBadgeStatus');

  if (btnToggleEbr && ebrPanel) {
    btnToggleEbr.addEventListener('click', () => {
      const isVisible = ebrPanel.style.display !== 'none';
      ebrPanel.style.display = isVisible ? 'none' : 'block';
      if (ebrArrowIcon) ebrArrowIcon.textContent = isVisible ? '▾' : '▴';
    });
  }

  function updateEbrBadge() {
    if (!ebrBadgeStatus) return;
    const pVal = ebrProduct?.value || 'automovil_salud';
    const cVal = ebrChannel?.value || 'corredor_autorizado';
    const zVal = ebrZone?.value || 'caracas_central';

    const pScores = { automovil_salud: 0, patrimonial_incendio: 10, fianzas_financieras: 20 };
    const cScores = { corredor_autorizado: 0, venta_directa: 0, banca_affinity: 5, no_presencial: 15 };
    const zScores = { caracas_central: 0, interior: 5, fronteriza: 20, offshore: 30 };

    const total = (pScores[pVal] || 0) + (cScores[cVal] || 0) + (zScores[zVal] || 0);
    if (total > 0) {
      ebrBadgeStatus.textContent = `Ajuste EBR: +${total} pts`;
      ebrBadgeStatus.style.background = total >= 30 ? 'rgba(239, 68, 68, 0.2)' : 'rgba(245, 158, 11, 0.2)';
      ebrBadgeStatus.style.color = total >= 30 ? '#ef4444' : '#f59e0b';
      ebrBadgeStatus.style.borderColor = total >= 30 ? '#ef4444' : '#f59e0b';
    } else {
      ebrBadgeStatus.textContent = 'Opcional • Estándar (0 pts)';
      ebrBadgeStatus.style.background = 'rgba(56, 189, 248, 0.15)';
      ebrBadgeStatus.style.color = 'var(--primary-glow)';
      ebrBadgeStatus.style.borderColor = 'rgba(56, 189, 248, 0.3)';
    }
  }

  [ebrProduct, ebrChannel, ebrZone].forEach((el) => {
    if (el) el.addEventListener('change', updateEbrBadge);
  });

  // ================= PRESETS DE PRUEBA =================
  const presets = {
    clean: {
      id: 'V-19876543',
      name: 'Mariana Rodriguez Marquez',
      type: 'Natural',
      country: 'Venezuela',
      dob: '1991-09-24'
    },
    homonym: {
      id: 'V-20112334',
      name: 'Carlos Alberto Lopez Perez',
      type: 'Natural',
      country: 'Venezuela',
      dob: '1993-08-11'
    },
    entity: {
      id: 'J-31099882-1',
      name: 'Inversiones Mar de Plata C.A.',
      type: 'Juridica',
      country: 'Venezuela',
      dob: '2016-04-18',
      ubos: [
        { id: 'V-14228901', name: 'Carmen Beatriz Hernandez Silva', share: 40, pos: 'Directora General (Accionista PEP)' },
        { id: 'V-19876543', name: 'Mariana Alejandra Rodriguez Marquez', share: 60, pos: 'Accionista Mayoritaria' }
      ]
    },
    pep: {
      id: 'V-14228901',
      name: 'Carmen Beatriz Hernandez Silva',
      type: 'Natural',
      country: 'Venezuela',
      dob: '1980-06-15'
    },
    cgr: {
      id: 'V-15893201',
      name: 'Luis Manuel Parra Rivero',
      type: 'Natural',
      country: 'Venezuela',
      dob: '1978-07-07'
    },
    interpol: {
      id: 'V-12093847',
      name: 'Samark Jose Lopez Bello',
      type: 'Natural',
      country: 'Venezuela',
      dob: '1974-09-10'
    },
    sudeaseg: {
      id: 'V-10293847',
      name: 'Pedro Jose Martinez Castillo',
      type: 'Natural',
      country: 'Venezuela',
      dob: '1970-03-21'
    },
    manuel: {
      id: 'V-15890432',
      name: 'Manuel Alejandro Guia Chacon',
      type: 'Natural',
      country: 'Venezuela',
      dob: '1985-03-20'
    }
  };

  document.querySelectorAll('.pill-preset[data-preset]').forEach((pill) => {
    pill.addEventListener('click', () => {
      const key = pill.getAttribute('data-preset');
      const data = presets[key];
      if (!data) return;

      document.getElementById('inputId').value = data.id;
      document.getElementById('inputName').value = data.name;
      document.getElementById('inputCountry').value = data.country;
      document.getElementById('inputDob').value = data.dob || '';

      setPersonType(data.type);

      if (data.type === 'Juridica' && data.ubos && uboList) {
        uboList.innerHTML = '';
        data.ubos.forEach((u) => {
          addUboRow(u.id, u.name, u.share, u.pos);
        });
      } else if (uboList) {
        uboList.innerHTML = '';
      }

      // Ejecutar automáticamente la auditoría del preset
      document.getElementById('auditForm').dispatchEvent(new Event('submit'));
    });
  });

  // ================= SUBMIT FORM DE AUDITORÍA =================
  const auditForm = document.getElementById('auditForm');
  const btnRunAudit = document.getElementById('btnRunAudit');
  const resultsWrapper = document.getElementById('resultsWrapper');

  auditForm.addEventListener('submit', async (e) => {
    e.preventDefault();

    const idNumber = document.getElementById('inputId').value.trim();
    const fullName = document.getElementById('inputName').value.trim();
    const country = document.getElementById('inputCountry').value.trim();
    const dob = document.getElementById('inputDob').value;

    const ebrFactors = {
      product: ebrProduct?.value || 'automovil_salud',
      channel: ebrChannel?.value || 'corredor_autorizado',
      zone: ebrZone?.value || 'caracas_central'
    };
    const beneficialOwners = getBeneficialOwnersData();

    btnRunAudit.disabled = true;
    btnRunAudit.innerHTML = 'Auditando fuentes en tiempo real...';

    try {
      const response = await fetch('/api/audit/single', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          idNumber,
          fullName,
          country,
          dob,
          personType: selectedType,
          ebrFactors,
          beneficialOwners,
          officer: {
            name: 'Manuel Guia',
            role: 'Oficial de Cumplimiento / Analista Senior',
            code: 'OFC-2026-MG'
          }
        })
      });

      const resData = await response.json();
      if (!resData.success) {
        alert(resData.error || 'Error ejecutando la auditoría');
        return;
      }

      currentAudit = resData.audit;
      renderAuditResults(currentAudit);
      resultsWrapper.style.display = 'flex';
      resultsWrapper.scrollIntoView({ behavior: 'smooth' });
    } catch (err) {
      console.error(err);
      alert('Error de conexión con el servidor de GuiaRisk');
    } finally {
      btnRunAudit.disabled = false;
      btnRunAudit.innerHTML = `
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
        AUDITAR & DEBIDA DILIGENCIA
      `;
    }
  });

  // ================= RENDER DE RESULTADOS =================
  function renderAuditResults(audit) {
    // 1. Verdict & Radar Gauge
    const verdictText = document.getElementById('verdictText');
    const verdictSub = document.getElementById('verdictSub');
    const gaugeScore = document.getElementById('gaugeScore');
    const gaugeBar = document.getElementById('gaugeBar');

    verdictText.textContent = audit.verdict;
    verdictSub.textContent = `Dictamen emitido el ${new Date(audit.timestamp).toLocaleString('es-VE')} • ID: ${audit.auditId}`;

    verdictText.className = 'verdict-text color-' + audit.badgeColor;

    const score = audit.riskScore;
    gaugeScore.innerHTML = `${score}<span class="gauge-tag">Score</span>`;
    gaugeScore.className = 'gauge-number color-' + audit.badgeColor;

    const totalCircumference = 251.2;
    const offset = totalCircumference - (totalCircumference * score) / 100;
    gaugeBar.style.strokeDashoffset = offset;

    if (audit.badgeColor === 'emerald') {
      gaugeBar.style.stroke = 'var(--risk-low)';
    } else if (audit.badgeColor === 'amber') {
      gaugeBar.style.stroke = 'var(--risk-medium)';
    } else {
      gaugeBar.style.stroke = 'var(--risk-high)';
    }

    // 2. Enriquecimiento Nacional (CNE + SENIAT)
    const cne = audit.nationalEnrichment?.cne;
    const seniat = audit.nationalEnrichment?.seniat;

    // CNE Oficial Fuera de Servicio
    const cneTagEl = document.getElementById('cneTag');
    if (cneTagEl) {
      cneTagEl.textContent = 'Fuera de Servicio - Temporalmente';
      cneTagEl.className = 'tag-offline';
      cneTagEl.style.background = 'rgba(245, 158, 11, 0.15)';
      cneTagEl.style.color = '#f59e0b';
      cneTagEl.style.border = '1px solid rgba(245, 158, 11, 0.4)';
    }
    document.getElementById('cneName').textContent = 'No disponible (Servicio CNE fuera de línea)';
    document.getElementById('cneDoc').textContent = audit.client.idNumber || '-';
    document.getElementById('cneLocation').textContent = 'Consulta no disponible';
    document.getElementById('cneCenter').textContent = 'Fuera de Servicio - Temporalmente';

    if (seniat && seniat.verified) {
      const isBlocked = seniat.data.status.includes('Bloqueado') || seniat.data.status.includes('Cautelar');
      document.getElementById('seniatTag').textContent = seniat.data.status;
      document.getElementById('seniatTag').className = isBlocked
        ? 'tag-verified color-crimson'
        : 'tag-verified';
      const rifNumEl = document.getElementById('seniatRifNumber');
      if (rifNumEl) rifNumEl.textContent = seniat.data.rif || '-';
      document.getElementById('seniatRif').textContent = seniat.data.name || audit.client.fullName || 'Contribuyente Inscrito';
      document.getElementById('seniatCategory').textContent = seniat.data.taxCategory;
      document.getElementById('seniatRetention').textContent = seniat.data.withholdingRate;
      document.getElementById('seniatActivity').textContent = seniat.data.economicActivity || seniat.data.taxCategory;
    } else {
      document.getElementById('seniatTag').textContent = 'ACTIVO TRIBUTARIO';
      document.getElementById('seniatTag').className = 'tag-verified';
      const rifNumEl = document.getElementById('seniatRifNumber');
      if (rifNumEl) rifNumEl.textContent = audit.client.idNumber;
      document.getElementById('seniatRif').textContent = audit.client.fullName || 'Contribuyente Inscrito';
      document.getElementById('seniatCategory').textContent = 'Contribuyente Ordinario';
      document.getElementById('seniatRetention').textContent = '0%';
      document.getElementById('seniatActivity').textContent = 'Actividad en Evaluación';
    }

    // 3. Hallazgos en Listas Vinculantes
    const findingsList = document.getElementById('findingsList');
    findingsList.innerHTML = '';

    if (audit.matches.length === 0) {
      findingsList.innerHTML = `
        <div style="background: rgba(16, 185, 129, 0.08); border: 1px solid var(--risk-low-border); border-radius: var(--radius-md); padding: 1.25rem; text-align: center;">
          <div style="font-weight: 700; color: var(--risk-low); font-size: 1rem; margin-bottom: 0.35rem;">
            ✓ Cero Coincidencias en Listas Vinculantes e Internacionales
          </div>
          <div style="font-size: 0.8rem; color: var(--text-secondary);">
            Se revisaron exhaustivamente OFAC (SDN & CSL), Consejo de Seguridad ONU, Unión Europea y Directorio de PEPs. El sujeto está conforme y apto para contratación/emisión bajo normas SUDEASEG / SUDEBAN.
          </div>
        </div>
      `;
    } else {
      audit.matches.forEach((match) => {
        const card = document.createElement('div');
        const isPep = match.source.includes('PEP') || (match.listType && match.listType.includes('Expuesta'));
        const isDismissed = match.dismissed;
        const isProbableHomonym = match.smartDisambiguation && match.smartDisambiguation.isProbableFalsePositive;

        let badgeType = 'badge-ofac';
        if (match.source.includes('ONU')) badgeType = 'badge-un';
        else if (isPep) badgeType = 'badge-pep';

        card.className = `finding-card ${isDismissed ? 'dismissed' : ''} ${isPep ? 'pep-border' : ''} page-break-avoid`;

        let smartBoxHtml = '';
        if (match.smartDisambiguation && match.smartDisambiguation.notes.length > 0) {
          smartBoxHtml = `
            <div class="smart-box">
              <div class="smart-title">
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><line x1="12" y1="16" x2="12" y2="12"/><line x1="12" y1="8" x2="12.01" y2="8"/></svg>
                Análisis Anti-Homonimia Inteligente (Smart Disambiguation):
              </div>
              <ul class="smart-notes">
                ${match.smartDisambiguation.notes.map((n) => `<li>${n}</li>`).join('')}
              </ul>
              ${
                !isDismissed && isProbableHomonym
                  ? `<button type="button" class="btn-dismiss-homonym" data-ref="${match.referenceId}">Descartar como Falso Positivo (Homonimia)</button>`
                  : ''
              }
              ${
                isDismissed
                  ? `<div class="dismiss-tag">✓ Homonimia Descartada: ${match.dismissalNote || 'Verificado por Oficial'}</div>`
                  : ''
              }
            </div>
          `;
        }

        const caseDetailsHtml = match.caseDetails ? `
          <div style="margin-top: 0.6rem; padding: 0.55rem 0.75rem; background: rgba(56, 189, 248, 0.06); border: 1px solid rgba(56, 189, 248, 0.2); border-radius: 4px; font-size: 0.8rem; line-height: 1.45; color: #cbd5e1;">
            <strong style="color: #38bdf8;">🔍 Antecedentes Detallados del Caso:</strong> ${match.caseDetails}
          </div>
        ` : '';

        const legalBasisHtml = match.legalBasis ? `
          <div style="margin-top: 0.4rem; font-size: 0.76rem; color: #94a3b8;">
            <strong>⚖️ Fundamento Jurídico:</strong> ${match.legalBasis}
          </div>
        ` : '';

        const complianceImpactHtml = match.complianceImpact ? `
          <div style="margin-top: 0.5rem; padding: 0.5rem 0.75rem; background: rgba(239, 68, 68, 0.08); border: 1px dashed rgba(239, 68, 68, 0.35); border-radius: 4px; font-size: 0.78rem; color: #fca5a5; line-height: 1.4;">
            <strong style="color: #ef4444;">⚠️ Instrucción de Cumplimiento (SUDEASEG / SUDEBAN):</strong> ${match.complianceImpact}
          </div>
        ` : '';

        card.innerHTML = `
          <div class="finding-header">
            <div>
              <span class="finding-source">${match.source}</span>
              <span style="font-size: 0.75rem; color: var(--text-muted); margin-left: 0.5rem;">[${match.program || match.category || match.listType}]</span>
            </div>
            <span class="finding-badge ${badgeType}">${match.score}% Similitud</span>
          </div>

          <div style="font-size: 0.95rem; margin-bottom: 0.4rem;">
            <strong>Sujeto en Lista:</strong> <span style="color: var(--primary-glow); font-weight: 700;">${match.matchedName}</span> ${match.idNumber ? `(${match.idNumber})` : ''}
          </div>

          <div style="display: flex; gap: 1.5rem; font-size: 0.8rem; color: var(--text-secondary); margin-bottom: 0.5rem; flex-wrap: wrap;">
            <span><strong>Nacionalidad:</strong> ${match.nationality || 'No especificada'}</span>
            ${match.dob ? `<span><strong>Fecha Nacimiento:</strong> ${match.dob}</span>` : ''}
            ${match.position ? `<span><strong>Cargo / Institución:</strong> ${match.position} • <em>${match.institution || ''}</em></span>` : ''}
          </div>

          <div style="font-size: 0.82rem; color: var(--text-secondary); line-height: 1.4; margin-bottom: 0.4rem;">
            <strong>📝 Motivo de la Inclusión:</strong> ${match.remarks}
          </div>

          ${caseDetailsHtml}
          ${legalBasisHtml}
          ${complianceImpactHtml}
          ${smartBoxHtml}
        `;

        const dismissBtn = card.querySelector('.btn-dismiss-homonym');
        if (dismissBtn) {
          dismissBtn.addEventListener('click', () => {
            openDismissModal(match.referenceId, match.matchedName);
          });
        }

        findingsList.appendChild(card);
      });
    }
  }

  // ================= MODAL CERTIFICADO =================
  const certModal = document.getElementById('certModal');
  const btnOpenCert = document.getElementById('btnOpenCert');
  const btnCloseCert = document.getElementById('btnCloseCert');

  btnOpenCert.addEventListener('click', () => {
    if (!currentAudit) return;

    document.getElementById('modalCertId').textContent = currentAudit.auditId;
    document.getElementById('modalCertHeaderDate').textContent = `Fecha: ${new Date(currentAudit.timestamp).toLocaleDateString('es-VE')}`;
    document.getElementById('modalCertName').textContent = currentAudit.client.fullName;
    const rifDisplay = (seniat && seniat.data && seniat.data.rif) ? `${currentAudit.client.idNumber} • RIF: ${seniat.data.rif}` : currentAudit.client.idNumber;
    document.getElementById('modalCertDoc').textContent = rifDisplay;
    document.getElementById('modalCertCountry').textContent = currentAudit.client.country;
    document.getElementById('modalCertType').textContent = currentAudit.client.personType;

    // Validación CNE y SENIAT (Sección I en matriz de 4 columnas)
    const isJuridica = currentAudit.client.personType === 'Juridica' || currentAudit.client.personType === 'Persona Jurídica';
    const cne = currentAudit.nationalEnrichment?.cne;
    const seniat = currentAudit.nationalEnrichment?.seniat;

    const cneStatusEl = document.getElementById('modalCertCneStatus');
    const cneCenterEl = document.getElementById('modalCertCneCenter');

    if (isJuridica) {
      if (cneStatusEl) cneStatusEl.innerHTML = '<span class="badge-status-neutral">N/A</span> <span style="color:#64748b; font-size:0.74rem;">Persona Jurídica</span>';
      if (cneCenterEl) cneCenterEl.innerHTML = '<span style="color:#64748b; font-size:0.74rem;">No aplica padrón electoral</span>';
    } else {
      if (cneStatusEl) cneStatusEl.innerHTML = '<span class="badge-status-neutral" style="background:#fef3c7; color:#92400e; border:1px solid #fde68a;">⚠️ Fuera de Servicio - Temporalmente</span>';
      if (cneCenterEl) cneCenterEl.innerHTML = '<span style="color:#64748b; font-size:0.74rem;">Servicio CNE temporalmente no disponible</span>';
    }

    const isSeniatBlocked = seniat && seniat.verified && (seniat.data.status.includes('Bloqueado') || seniat.data.status.includes('Cautelar'));
    const seniatCondEl = document.getElementById('modalCertSeniatCond');
    const seniatTaxEl = document.getElementById('modalCertSeniatTax');
    const seniatAlertRow = document.getElementById('modalCertSeniatAlertRow');
    const seniatAlertEl = document.getElementById('modalCertSeniatAlert');

    if (seniat && seniat.verified) {
      if (isSeniatBlocked) {
        if (seniatCondEl) seniatCondEl.innerHTML = '<span class="badge-status-danger">🚫 BLOQUEADO / CAUTELAR</span>';
        const wRate = seniat.data.withholdingRate || '75%';
        if (seniatTaxEl) seniatTaxEl.innerHTML = `<span style="font-weight:800; color:#dc2626;">${wRate}</span> <span style="font-size:0.72rem; color:#dc2626; font-weight:700;">(Retención Cautelar)</span>`;
        if (seniatAlertRow && seniatAlertEl) {
          seniatAlertRow.style.display = 'table-row';
          seniatAlertEl.innerHTML = `<strong>ALERTA FISCAL VINCULANTE (SENIAT):</strong> ${seniat.data.status} • Categoría: <em>${seniat.data.taxCategory}</em> • Actividad Económica: <em>${seniat.data.economicActivity || 'Contratación / Comercio'}</em>`;
        }
      } else {
        if (seniatCondEl) seniatCondEl.innerHTML = `<span class="badge-status-ok">✓ CONTRIBUYENTE ACTIVO</span> <span style="font-size:0.74rem; color:#334155; font-weight:600;">(${seniat.data.taxCategory || 'Ordinario'})</span>`;
        if (seniatTaxEl) seniatTaxEl.innerHTML = `<span style="font-weight:700;">${seniat.data.withholdingRate || '0%'}</span> <span style="font-size:0.72rem; color:#059669; font-weight:600;">(RIF Conforme)</span>`;
        if (seniatAlertRow) seniatAlertRow.style.display = 'none';
      }
    } else {
      if (seniatCondEl) seniatCondEl.innerHTML = '<span class="badge-status-ok">✓ REGISTRO ACTIVO</span>';
      if (seniatTaxEl) seniatTaxEl.innerHTML = '<span style="font-weight:700;">0%</span> <span style="font-size:0.72rem; color:#64748b;">(Estándar)</span>';
      if (seniatAlertRow) seniatAlertRow.style.display = 'none';
    }

    // Sub-Sección UBO en Certificado Oficial
    const modalCertUboContainer = document.getElementById('modalCertUboContainer');
    const modalCertUboBody = document.getElementById('modalCertUboBody');
    const ubos = currentAudit.auditedBeneficialOwners || currentAudit.beneficialOwners || [];

    if (isJuridica && ubos.length > 0 && modalCertUboContainer && modalCertUboBody) {
      modalCertUboContainer.style.display = 'block';
      modalCertUboBody.innerHTML = ubos.map((u) => {
        const hasAlert = u.status === 'ALERTA VINCULANTE' || (u.alertSource && u.alertSource.length > 0) || (u.riskScore && u.riskScore > 0) || (u.matches && u.matches.length > 0);
        let alertLabel = 'ALERTA EN LISTAS';
        if (u.alertSource) {
          if (u.alertSource.includes('PEP')) alertLabel = 'ALERTA PEP';
          else if (u.alertSource.includes('OFAC')) alertLabel = 'ALERTA OFAC';
          else if (u.alertSource.includes('ONU')) alertLabel = 'ALERTA ONU';
          else alertLabel = u.alertSource;
        }
        const resBadge = hasAlert
          ? `<span class="badge-status-danger">⚠️ ${alertLabel}</span>`
          : `<span class="badge-status-ok">✓ CONFORME</span>`;
        return `
          <tr>
            <td style="font-family: var(--font-mono); font-weight: 700;">${u.idNumber}</td>
            <td><strong>${u.fullName}</strong> ${u.position ? `<span style="font-size: 0.72rem; color: #64748b;">(${u.position})</span>` : ''}</td>
            <td style="font-weight: 700; text-align: center;">${u.sharePercentage}%</td>
            <td style="text-align: center;">${resBadge}</td>
          </tr>
        `;
      }).join('');
    } else if (modalCertUboContainer) {
      modalCertUboContainer.style.display = 'none';
    }

    // Dictamen & EBR Matrix Strip
    document.getElementById('modalCertVerdictText').textContent = currentAudit.verdict;
    document.getElementById('modalCertScore').textContent = `Score de Riesgo LA/FT: ${currentAudit.riskScore} / 100 • RIESGO ${currentAudit.riskTier}`;

    const modalCertEbrStrip = document.getElementById('modalCertEbrStrip');
    if (modalCertEbrStrip) {
      if (currentAudit.ebrAssessment && currentAudit.ebrAssessment.applied) {
        modalCertEbrStrip.style.display = 'inline-block';
        modalCertEbrStrip.innerHTML = `<strong>Matriz de Riesgo EBR (Prov. 514):</strong> ${currentAudit.ebrAssessment.summary} • <strong>Ajuste Score:</strong> +${currentAudit.ebrAssessment.totalAdjustment} pts (${currentAudit.ebrAssessment.level})`;
      } else {
        modalCertEbrStrip.style.display = 'inline-block';
        modalCertEbrStrip.textContent = 'Matriz EBR: Ramo Estándar • Canal Autorizado • Gran Caracas (0 pts)';
      }
    }

    const verdictBox = document.getElementById('modalCertVerdictBox');
    if (currentAudit.badgeColor === 'emerald') {
      verdictBox.style.background = '#ecfdf5';
      verdictBox.style.color = '#065f46';
      verdictBox.style.border = '1.5px solid #059669';
    } else if (currentAudit.badgeColor === 'amber') {
      verdictBox.style.background = '#fffbeb';
      verdictBox.style.color = '#92400e';
      verdictBox.style.border = '1.5px solid #d97706';
    } else {
      verdictBox.style.background = '#fef2f2';
      verdictBox.style.color = '#991b1b';
      verdictBox.style.border = '1.5px solid #dc2626';
    }

    // Cotejo de Listas Exhaustivo (18 Fuentes Integradas)
    const matchesList = currentAudit.matches || [];
    const hasOfac = matchesList.some((m) => m.source.includes('OFAC') && !m.dismissed);
    const hasUn = matchesList.some((m) => m.source.includes('ONU') && !m.dismissed);
    const hasEuUk = matchesList.some((m) => (m.source.includes('Unión Europea') || m.source.includes('Reino Unido') || m.source.includes('Canadá')) && !m.dismissed);
    const hasInterpolWb = matchesList.some((m) => (m.source.includes('INTERPOL') || m.source.includes('Banco Mundial') || m.source.includes('BID')) && !m.dismissed);
    const hasCgrRnc = matchesList.some((m) => (m.source.includes('Contraloría') || m.source.includes('Contratistas')) && !m.dismissed);
    const hasSudebanSudeaseg = matchesList.some((m) => (m.source.includes('SUDEBAN') || m.source.includes('SUDEASEG')) && !m.dismissed);
    const hasTsj = matchesList.some((m) => m.source.includes('Tribunal Supremo') && !m.dismissed);
    const hasPep = matchesList.some((m) => m.source.includes('PEP') && !m.dismissed);
    const hasAdvFraud = matchesList.some((m) => (m.source.includes('Prensa Adversa') || m.source.includes('Antifraude')) && !m.dismissed);

    const setBadge = (elId, hasAlert, alertText = 'ALERTA / REPORTADO', alertType = 'danger') => {
      const el = document.getElementById(elId);
      if (!el) return;
      if (hasAlert) {
        el.innerHTML = alertType === 'warning'
          ? `<span class="badge-status-warning">${alertText}</span>`
          : `<span class="badge-status-danger">${alertText}</span>`;
      } else {
        el.innerHTML = '<span class="badge-status-ok">✓ CONFORME</span>';
      }
    };

    setBadge('modalCertOfacStatus', hasOfac);
    setBadge('modalCertUnStatus', hasUn);
    setBadge('modalCertEuUkStatus', hasEuUk);
    setBadge('modalCertInterpolWbStatus', hasInterpolWb, 'ALERTA / INTERPOL');
    setBadge('modalCertCgrRncStatus', hasCgrRnc, 'INHABILITADO');
    setBadge('modalCertSudebanSudeasegStatus', hasSudebanSudeaseg, 'ALERTA REGULATORIA');
    setBadge('modalCertTsjStatus', hasTsj, 'MEDIDA CAUTELAR');
    setBadge('modalCertPepStatus', hasPep, 'PEP REGISTRADO', 'warning');
    setBadge('modalCertAdvFraudStatus', hasAdvFraud, 'ALERTA DETECTADA');

    const cneTableStatusEl = document.getElementById('modalCertCneTableStatus');
    if (cneTableStatusEl) {
      cneTableStatusEl.innerHTML = isJuridica
        ? '<span class="badge-status-neutral">N/A</span>'
        : '<span class="badge-status-neutral" style="background:#fef3c7; color:#92400e; border:1px solid #fde68a;">⚠️ Fuera de Servicio - Temporalmente</span>';
    }

    const seniatTableStatusEl = document.getElementById('modalCertSeniatTableStatus');
    if (seniatTableStatusEl) {
      seniatTableStatusEl.innerHTML = isSeniatBlocked
        ? '<span class="badge-status-danger">🚫 BLOQUEADO</span>'
        : '<span class="badge-status-ok">✓ CONFORME</span>';
    }

    document.getElementById('modalCertHash').textContent = currentAudit.integrityHash;
    document.getElementById('modalCertOfficer').textContent = `${currentAudit.complianceOfficer.name}`;
    document.getElementById('modalCertDate').textContent = `${new Date(currentAudit.timestamp).toLocaleString('es-VE')}`;

    // Poblar antecedentes y marco legal en el certificado si existen hallazgos
    const findingsSection = document.getElementById('modalCertFindingsSection');
    const findingsListEl = document.getElementById('modalCertFindingsList');

    if (currentAudit.matches && currentAudit.matches.length > 0) {
      findingsSection.style.display = 'block';
      findingsListEl.innerHTML = currentAudit.matches.map((m) => `
        <div style="margin-bottom: 10px; padding-bottom: 8px; border-bottom: 1px solid #e2e8f0;">
          <div style="font-weight: 700; color: #1e3a8a;">• ${m.source} <span style="font-size: 0.75rem; color: #64748b;">[${m.program || m.category || m.listType}]</span></div>
          <div><strong>Sujeto:</strong> ${m.matchedName} ${m.idNumber ? `(${m.idNumber})` : ''}</div>
          <div style="margin-top: 3px; color: #334155;"><strong>Motivo:</strong> ${m.remarks}</div>
          ${m.caseDetails ? `<div style="margin-top: 4px; color: #475569; font-size: 0.78rem;"><strong>Antecedentes:</strong> ${m.caseDetails}</div>` : ''}
          ${m.legalBasis ? `<div style="margin-top: 3px; font-size: 0.75rem; color: #64748b;"><strong>Base Legal:</strong> ${m.legalBasis}</div>` : ''}
          ${m.complianceImpact ? `<div style="margin-top: 4px; font-size: 0.75rem; color: #991b1b; background: #fef2f2; padding: 4px 8px; border-radius: 4px;"><strong>Instrucción Normativa:</strong> ${m.complianceImpact}</div>` : ''}
          ${m.dismissed ? `<div style="margin-top: 4px; color: #059669; font-weight: 700;">✓ Descarte de homonimia aplicado: ${m.dismissalNote}</div>` : ''}
        </div>
      `).join('');
    } else {
      findingsSection.style.display = 'none';
      findingsListEl.innerHTML = '';
    }

    if (currentAudit.qrCodeDataUrl) {
      document.getElementById('modalQrImg').src = currentAudit.qrCodeDataUrl;
    }

    certModal.classList.add('active');
    document.body.classList.add('modal-open');
  });

  const closeCertificateModal = () => {
    certModal.classList.remove('active');
    document.body.classList.remove('modal-open');
  };

  btnCloseCert.addEventListener('click', closeCertificateModal);

  certModal.addEventListener('click', (e) => {
    if (e.target === certModal) {
      closeCertificateModal();
    }
  });

  // ================= DESCARGA DIRECTA DE PDF EN 1 CLIC =================
  const btnDownloadPdf = document.getElementById('btnDownloadPdf');
  if (btnDownloadPdf) {
    btnDownloadPdf.addEventListener('click', () => {
      if (!currentAudit) return;
      const element = document.querySelector('#certModal .modal-content');
      const closeBtn = document.getElementById('btnCloseCert');
      const noPrintEls = document.querySelectorAll('#certModal .no-print');

      btnDownloadPdf.disabled = true;
      btnDownloadPdf.innerHTML = '⏳ Generando PDF Oficial...';
      noPrintEls.forEach((el) => { el.style.display = 'none'; });
      if (closeBtn) closeBtn.style.display = 'none';

      const safeName = (currentAudit.client.fullName || 'Sujeto').replace(/[^a-zA-Z0-9]/g, '_');
      const filename = `Certificado_Cumplimiento_${currentAudit.auditId}_${safeName}.pdf`;

      const opt = {
        margin: [8, 10, 8, 10],
        filename: filename,
        image: { type: 'jpeg', quality: 0.98 },
        html2canvas: { scale: 2, useCORS: true, logging: false },
        jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' },
        pagebreak: { mode: ['avoid-all', 'css', 'legacy'] }
      };

      if (window.html2pdf) {
        window.html2pdf().set(opt).from(element).save().then(() => {
          noPrintEls.forEach((el) => { el.style.display = ''; });
          if (closeBtn) closeBtn.style.display = '';
          btnDownloadPdf.disabled = false;
          btnDownloadPdf.innerHTML = '📥 Descargar Documento PDF Oficial (.pdf)';
        }).catch((err) => {
          console.error('Error generando PDF con html2pdf:', err);
          noPrintEls.forEach((el) => { el.style.display = ''; });
          if (closeBtn) closeBtn.style.display = '';
          btnDownloadPdf.disabled = false;
          btnDownloadPdf.innerHTML = '📥 Descargar Documento PDF Oficial (.pdf)';
          window.print();
        });
      } else {
        noPrintEls.forEach((el) => { el.style.display = ''; });
        if (closeBtn) closeBtn.style.display = '';
        btnDownloadPdf.disabled = false;
        btnDownloadPdf.innerHTML = '📥 Descargar Documento PDF Oficial (.pdf)';
        window.print();
      }
    });
  }

  // ================= MODAL DESCARTE DE HOMONIMIA =================
  const dismissModal = document.getElementById('dismissModal');
  const btnCloseDismiss = document.getElementById('btnCloseDismiss');
  const btnConfirmDismiss = document.getElementById('btnConfirmDismiss');

  const closeDismissModal = () => {
    dismissModal.classList.remove('active');
    document.body.classList.remove('modal-open');
  };

  const openDismissModal = (refId, matchName) => {
    currentMatchToDismiss = refId;
    document.getElementById('dismissSubjectName').textContent = matchName;
    document.getElementById('dismissRefId').textContent = refId;
    document.getElementById('dismissJustification').value = '';
    dismissModal.classList.add('active');
    document.body.classList.add('modal-open');
  };

  btnCloseDismiss.addEventListener('click', closeDismissModal);

  dismissModal.addEventListener('click', (e) => {
    if (e.target === dismissModal) {
      closeDismissModal();
    }
  });

  // Atajo de teclado: Escape para cerrar modales
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
      if (certModal.classList.contains('active')) closeCertificateModal();
      if (dismissModal.classList.contains('active')) closeDismissModal();
      if (modalSeniatLive && modalSeniatLive.classList.contains('active')) closeSeniatModal();
    }
  });

  btnConfirmDismiss.addEventListener('click', async () => {
    const justification = document.getElementById('dismissJustification').value.trim();
    if (!justification) {
      alert('La justificación del Oficial de Cumplimiento es obligatoria por norma.');
      return;
    }

    try {
      const response = await fetch('/api/audit/dismiss-homonym', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          auditId: currentAudit.auditId,
          referenceId: currentMatchToDismiss,
          justification,
          officerName: 'Manuel Guia'
        })
      });

      const data = await response.json();
      if (data.success) {
        currentAudit = data.updatedAudit;
        renderAuditResults(currentAudit);
        closeDismissModal();
        alert('Homonimia descartada con éxito. El dictamen ha sido sellado como conforme.');
      } else {
        alert(data.message || 'Error descartando homonimia');
      }
    } catch (err) {
      console.error(err);
      alert('Error de conexión');
    }
  });

  // ================= HISTORIAL DE AUDITORÍA =================
  async function loadHistory() {
    const tbody = document.getElementById('historyTableBody');
    try {
      const res = await fetch('/api/audit/history');
      const data = await res.json();
      if (!data.success || !data.history.length) {
        tbody.innerHTML = `
          <tr><td colspan="7" style="text-align: center; color: var(--text-muted); padding: 2rem;">No hay consultas previas registradas.</td></tr>
        `;
        return;
      }

      tbody.innerHTML = data.history
        .map((item) => {
          return `
          <tr>
            <td><strong>${item.auditId}</strong></td>
            <td>${new Date(item.timestamp).toLocaleString('es-VE')}</td>
            <td>${item.client.idNumber}</td>
            <td>${item.client.fullName}</td>
            <td><span class="color-${item.badgeColor}" style="font-weight: 700;">${item.verdict}</span></td>
            <td><span style="font-family: var(--font-mono); font-size: 0.7rem;">${item.integrityHash.substring(0, 16)}...</span></td>
            <td>
              <button class="pill-preset" onclick="viewHistoryItem('${item.auditId}')">Ver Certificado</button>
            </td>
          </tr>
        `;
        })
        .join('');
    } catch (err) {
      console.error(err);
    }
  }

  window.viewHistoryItem = async function (auditId) {
    try {
      const res = await fetch(`/api/audit/certificate/${auditId}`);
      const data = await res.json();
      if (data.success) {
        currentAudit = data.certificate;
        renderAuditResults(currentAudit);
        btnOpenCert.click();
      }
    } catch (err) {
      console.error(err);
    }
  };

  // ================= CARGA MASIVA REAL (DRAG & DROP, EXCEL & FILTROS) =================
  const batchDropzone = document.getElementById('batchDropzone');
  const batchFileInput = document.getElementById('batchFileInput');
  const btnSelectBatchFile = document.getElementById('btnSelectBatchFile');
  const selectedFileInfo = document.getElementById('selectedFileInfo');
  const selectedFileName = document.getElementById('selectedFileName');
  const selectedFileSize = document.getElementById('selectedFileSize');
  const btnProcessUploadedFile = document.getElementById('btnProcessUploadedFile');
  const batchProgressContainer = document.getElementById('batchProgressContainer');
  const batchProgressBar = document.getElementById('batchProgressBar');
  const batchProgressPercent = document.getElementById('batchProgressPercent');
  const batchProgressText = document.getElementById('batchProgressText');
  const batchResults = document.getElementById('batchResults');
  const batchTableBody = document.getElementById('batchTableBody');
  const btnSimulateBatch = document.getElementById('btnSimulateBatch');
  const btnExportBatchExcel = document.getElementById('btnExportBatchExcel');

  let selectedBatchFile = null;

  function setSelectedFile(file) {
    if (!file) return;
    selectedBatchFile = file;
    selectedFileName.textContent = file.name;
    selectedFileSize.textContent = `${(file.size / 1024).toFixed(1)} KB`;
    selectedFileInfo.style.display = 'flex';
  }

  if (btnSelectBatchFile && batchFileInput) {
    btnSelectBatchFile.addEventListener('click', () => {
      batchFileInput.click();
    });

    batchFileInput.addEventListener('change', (e) => {
      if (e.target.files && e.target.files[0]) {
        setSelectedFile(e.target.files[0]);
      }
    });
  }

  if (batchDropzone) {
    ['dragenter', 'dragover'].forEach((eventName) => {
      batchDropzone.addEventListener(eventName, (e) => {
        e.preventDefault();
        e.stopPropagation();
        batchDropzone.classList.add('dragover');
      });
    });

    ['dragleave', 'drop'].forEach((eventName) => {
      batchDropzone.addEventListener(eventName, (e) => {
        e.preventDefault();
        e.stopPropagation();
        batchDropzone.classList.remove('dragover');
      });
    });

    batchDropzone.addEventListener('drop', (e) => {
      if (e.dataTransfer && e.dataTransfer.files && e.dataTransfer.files[0]) {
        setSelectedFile(e.dataTransfer.files[0]);
      }
    });
  }

  function updateBatchStats(stats) {
    const totalEl = document.getElementById('batchStatTotal');
    const cleanEl = document.getElementById('batchStatClean');
    const medEl = document.getElementById('batchStatMedium');
    const highEl = document.getElementById('batchStatHigh');

    if (totalEl) totalEl.textContent = `Total: ${stats.total}`;
    if (cleanEl) cleanEl.textContent = `Conformes: ${stats.clean}`;
    if (medEl) medEl.textContent = `Alertas / Homonimias: ${stats.mediumRisk}`;
    if (highEl) highEl.textContent = `Bloqueados / PEPs: ${stats.highRisk}`;
  }

  function renderBatchTable() {
    if (!batchTableBody) return;

    let filtered = currentBatchResults;
    if (currentBatchFilter === 'alerts') {
      filtered = currentBatchResults.filter((r) => r.riskScore >= 40 || (r.matches && r.matches.length > 0));
    } else if (currentBatchFilter === 'clean') {
      filtered = currentBatchResults.filter((r) => r.riskScore < 40 && (!r.matches || r.matches.length === 0));
    }

    if (filtered.length === 0) {
      batchTableBody.innerHTML = `
        <tr><td colspan="7" style="text-align: center; color: var(--text-muted); padding: 1.5rem;">No hay registros para este filtro.</td></tr>
      `;
      return;
    }

    batchTableBody.innerHTML = filtered.map((r) => {
      const cneStatus = 'CNE: Fuera de Servicio - Temporalmente';
      const seniatStatus = r.nationalEnrichment?.seniat?.verified
        ? (r.nationalEnrichment.seniat.data.status.includes('Bloqueado') ? '🚫 SENIAT Bloqueado' : '✓ SENIAT Activo')
        : 'Registro Conforme';

      const findingsText = r.matches && r.matches.length > 0
        ? `<span style="color: #ef4444; font-weight: 700;">${r.matches.length} coincidencia(s)</span>`
        : '<span style="color: #10b981;">0 Limpio</span>';

      return `
        <tr>
          <td><strong>${r.client.idNumber}</strong></td>
          <td>${r.client.fullName}</td>
          <td><span style="font-size: 0.75rem; color: #64748b;">${r.client.personType || 'Natural'}</span></td>
          <td><span style="font-size: 0.75rem;">${cneStatus} • ${seniatStatus}</span></td>
          <td>${findingsText}</td>
          <td><strong>${r.riskScore} / 100</strong></td>
          <td><span class="color-${r.badgeColor}" style="font-weight: 800;">${r.verdict}</span></td>
        </tr>
      `;
    }).join('');
  }

  // Filtros rápidos de lote
  const filterBatchAll = document.getElementById('filterBatchAll');
  const filterBatchAlerts = document.getElementById('filterBatchAlerts');
  const filterBatchClean = document.getElementById('filterBatchClean');

  function setBatchFilter(filterName, activeBtn) {
    currentBatchFilter = filterName;
    [filterBatchAll, filterBatchAlerts, filterBatchClean].forEach((b) => {
      if (b) b.classList.remove('active');
    });
    if (activeBtn) activeBtn.classList.add('active');
    renderBatchTable();
  }

  if (filterBatchAll) filterBatchAll.addEventListener('click', () => setBatchFilter('all', filterBatchAll));
  if (filterBatchAlerts) filterBatchAlerts.addEventListener('click', () => setBatchFilter('alerts', filterBatchAlerts));
  if (filterBatchClean) filterBatchClean.addEventListener('click', () => setBatchFilter('clean', filterBatchClean));

  // Procesar archivo subido
  if (btnProcessUploadedFile) {
    btnProcessUploadedFile.addEventListener('click', async () => {
      if (!selectedBatchFile) return;

      btnProcessUploadedFile.disabled = true;
      btnProcessUploadedFile.textContent = 'Enviando cartera...';
      batchProgressContainer.style.display = 'block';
      batchProgressBar.style.width = '30%';
      batchProgressPercent.textContent = '30%';
      batchProgressText.textContent = 'Leyendo y normalizando filas del Excel...';

      const formData = new FormData();
      formData.append('batchFile', selectedBatchFile);
      formData.append('file', selectedBatchFile);

      try {
        batchProgressBar.style.width = '60%';
        batchProgressPercent.textContent = '60%';
        batchProgressText.textContent = 'Cruzando contra OFAC, ONU, CNE, SENIAT y PEPs...';

        const res = await fetch('/api/audit/batch-upload', {
          method: 'POST',
          body: formData
        });

        const data = await res.json();
        if (!data.success) {
          alert(data.error || 'Error procesando archivo masivo');
          return;
        }

        batchProgressBar.style.width = '100%';
        batchProgressPercent.textContent = '100%';
        batchProgressText.textContent = '¡Auditoría masiva completada!';

        currentBatchResults = data.results || [];
        updateBatchStats(data.stats || { total: currentBatchResults.length, clean: 0, mediumRisk: 0, highRisk: 0 });
        renderBatchTable();
        batchResults.style.display = 'block';
        batchResults.scrollIntoView({ behavior: 'smooth' });
      } catch (err) {
        console.error(err);
        alert('Error de conexión procesando la cartera');
      } finally {
        btnProcessUploadedFile.disabled = false;
        btnProcessUploadedFile.textContent = '🚀 Iniciar Auditoría de Cartera';
      }
    });
  }

  // Exportar resultados de lote a Excel Profesional con ExcelJS
  if (btnExportBatchExcel) {
    btnExportBatchExcel.addEventListener('click', async () => {
      if (!currentBatchResults || currentBatchResults.length === 0) {
        alert('No hay resultados de auditoría para exportar.');
        return;
      }

      btnExportBatchExcel.disabled = true;
      btnExportBatchExcel.innerHTML = '⏳ Generando Excel Profesional...';

      try {
        const response = await fetch('/api/audit/export-batch-excel', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ results: currentBatchResults })
        });

        if (response.ok) {
          const blob = await response.blob();
          const url = window.URL.createObjectURL(blob);
          const a = document.createElement('a');
          a.href = url;
          const todayStr = new Date().toISOString().slice(0, 10).replace(/-/g, '');
          a.download = `Auditoria_Cartera_GuiaRisk_${todayStr}.xlsx`;
          document.body.appendChild(a);
          a.click();
          a.remove();
          window.URL.revokeObjectURL(url);
          return;
        } else {
          alert('Error del servidor generando el reporte Excel.');
        }
      } catch (err) {
        console.error('Error generando Excel con ExcelJS:', err);
        alert('Error conectando con el servidor para exportar Excel.');
      } finally {
        btnExportBatchExcel.disabled = false;
        btnExportBatchExcel.innerHTML = `
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
          📥 Descargar Informe Completo en Excel (.xlsx)
        `;
      }
    });
  }

  // Carga Masiva Demo (5 Casos de Prueba)
  if (btnSimulateBatch) {
    btnSimulateBatch.addEventListener('click', async () => {
      btnSimulateBatch.disabled = true;
      btnSimulateBatch.textContent = 'Procesando cartera masiva (5 registros)...';

      const sampleBatch = [
        { idNumber: 'V-12345678', fullName: 'Carlos Eduardo Gonzalez Perez', country: 'Venezuela', dob: '1975-04-12' },
        { idNumber: 'V-19876543', fullName: 'Mariana Alejandra Rodriguez Marquez', country: 'Venezuela', dob: '1991-09-24' },
        { idNumber: 'V-20112334', fullName: 'Carlos Alberto Lopez Perez', country: 'Venezuela', dob: '1993-08-11' },
        { idNumber: 'J-31099882-1', fullName: 'Inversiones Mar de Plata C.A.', country: 'Venezuela', personType: 'Juridica' },
        { idNumber: 'V-14228901', fullName: 'Carmen Beatriz Hernandez Silva', country: 'Venezuela', dob: '1980-06-15' }
      ];

      try {
        const res = await fetch('/api/audit/batch', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ records: sampleBatch })
        });

        const data = await res.json();
        if (data.success) {
          currentBatchResults = data.results || [];
          const cleanCount = currentBatchResults.filter((r) => r.riskTier === 'BAJO').length;
          const medCount = currentBatchResults.filter((r) => r.riskTier === 'MEDIO').length;
          const highCount = currentBatchResults.filter((r) => r.riskTier === 'ALTO').length;

          updateBatchStats({
            total: currentBatchResults.length,
            clean: cleanCount,
            mediumRisk: medCount,
            highRisk: highCount
          });

          renderBatchTable();
          batchResults.style.display = 'block';
          batchResults.scrollIntoView({ behavior: 'smooth' });
        }
      } catch (err) {
        console.error(err);
        alert('Error en auditoría masiva');
      } finally {
        btnSimulateBatch.disabled = false;
        btnSimulateBatch.textContent = '⚡ Cargar Lote de Prueba (5 Casos)';
      }
    });
  }

  // ================= SINCRONIZACIÓN MANUAL DE LISTAS =================
  const btnSyncLists = document.getElementById('btnSyncLists');
  if (btnSyncLists) {
    btnSyncLists.addEventListener('click', async () => {
      btnSyncLists.disabled = true;
      btnSyncLists.textContent = 'Sincronizando fuentes oficiales...';

      try {
        const res = await fetch('/api/sync/refresh', { method: 'POST' });
        const data = await res.json();
        if (data.success) {
          alert(data.message);
        }
      } catch (err) {
        console.error(err);
      } finally {
        btnSyncLists.disabled = false;
        btnSyncLists.textContent = 'Sincronizar y Reindexar Listas';
      }
    });
  }

  // ================= SENIAT EN VIVO (HUMAN-IN-THE-LOOP & SESIÓN 15 MIN) =================
  let seniatLiveSessionId = null;
  const modalSeniatLive = document.getElementById('modalSeniatLive');
  const btnOpenSeniatLive = document.getElementById('btnOpenSeniatLive');
  const btnCloseSeniatModal = document.getElementById('btnCloseSeniatModal');
  const btnCancelSeniatModal = document.getElementById('btnCancelSeniatModal');
  const btnReloadSeniatCaptcha = document.getElementById('btnReloadSeniatCaptcha');
  const btnSubmitSeniatLive = document.getElementById('btnSubmitSeniatLive');
  const seniatModalDoc = document.getElementById('seniatModalDoc');
  const seniatSessionBadge = document.getElementById('seniatSessionBadge');
  const seniatModalCaptchaImg = document.getElementById('seniatModalCaptchaImg');
  const seniatModalCaptchaCode = document.getElementById('seniatModalCaptchaCode');
  const seniatModalMsg = document.getElementById('seniatModalMsg');
  const seniatCaptchaSection = document.getElementById('seniatCaptchaSection');

  function openSeniatModal() {
    const docInput = (document.getElementById('idNumber')?.value || currentAudit?.client?.idNumber || '').trim();
    if (!docInput) {
      alert('Por favor ingrese primero un número de Cédula o RIF en el formulario de consulta.');
      document.getElementById('idNumber')?.focus();
      return;
    }

    if (seniatModalDoc) seniatModalDoc.textContent = docInput;
    if (seniatModalMsg) seniatModalMsg.style.display = 'none';
    if (modalSeniatLive) modalSeniatLive.classList.add('active');
    loadSeniatCaptcha();
  }

  function closeSeniatModal() {
    if (modalSeniatLive) modalSeniatLive.classList.remove('active');
  }

  async function loadSeniatCaptcha(forceRefresh = false) {
    if (!seniatSessionBadge || !seniatModalCaptchaImg) return;
    seniatSessionBadge.innerHTML = '⏳ Conectando con SENIAT...';
    seniatSessionBadge.style.color = '#f59e0b';
    seniatModalCaptchaImg.style.opacity = '0.4';
    if (seniatModalMsg) seniatModalMsg.style.display = 'none';

    try {
      const url = forceRefresh 
        ? `/api/seniat/live/captcha` 
        : `/api/seniat/live/captcha?sessionId=${encodeURIComponent(seniatLiveSessionId || '')}`;
      
      const res = await fetch(url);
      const data = await res.json();

      if (data.success) {
        seniatLiveSessionId = data.sessionId;

        if (data.hasActiveSession) {
          seniatSessionBadge.innerHTML = `✅ Sesión activa (${data.remainingMinutes} min restantes)`;
          seniatSessionBadge.style.color = '#10b981';
          if (seniatCaptchaSection) seniatCaptchaSection.style.display = 'none';
          showSeniatModalMsg('Su sesión se encuentra activa en el SENIAT. Puede consultar directamente sin resolver otro captcha.', 'success');
        } else {
          if (seniatCaptchaSection) seniatCaptchaSection.style.display = 'block';
          seniatSessionBadge.innerHTML = '⚠️ Captcha requerido para autenticar';
          seniatSessionBadge.style.color = '#f59e0b';
          seniatModalCaptchaImg.src = data.captchaImage;
          seniatModalCaptchaImg.style.opacity = '1';
          if (seniatModalCaptchaCode) {
            seniatModalCaptchaCode.value = '';
            setTimeout(() => seniatModalCaptchaCode.focus(), 150);
          }
        }
      } else {
        seniatSessionBadge.innerHTML = '❌ Servidor SENIAT no responde';
        seniatSessionBadge.style.color = '#ef4444';
        showSeniatModalMsg(data.message || 'No se pudo conectar con el portal del SENIAT', 'error');
      }
    } catch (err) {
      seniatSessionBadge.innerHTML = '❌ Error de red';
      seniatSessionBadge.style.color = '#ef4444';
      showSeniatModalMsg('Error de conexión: ' + err.message, 'error');
    }
  }

  function showSeniatModalMsg(msg, type = 'info') {
    if (!seniatModalMsg) return;
    seniatModalMsg.style.display = 'block';
    seniatModalMsg.textContent = msg;
    if (type === 'error') {
      seniatModalMsg.style.background = 'rgba(239, 68, 68, 0.15)';
      seniatModalMsg.style.border = '1px solid rgba(239, 68, 68, 0.4)';
      seniatModalMsg.style.color = '#f87171';
    } else if (type === 'success') {
      seniatModalMsg.style.background = 'rgba(16, 185, 129, 0.15)';
      seniatModalMsg.style.border = '1px solid rgba(16, 185, 129, 0.4)';
      seniatModalMsg.style.color = '#34d399';
    } else {
      seniatModalMsg.style.background = 'rgba(56, 189, 248, 0.15)';
      seniatModalMsg.style.border = '1px solid rgba(56, 189, 248, 0.4)';
      seniatModalMsg.style.color = '#38bdf8';
    }
  }

  async function submitSeniatLiveQuery() {
    const docInput = (document.getElementById('idNumber')?.value || currentAudit?.client?.idNumber || '').trim();
    const captchaCode = (seniatModalCaptchaCode?.value || '').trim();

    if (!docInput) {
      showSeniatModalMsg('No se detectó un documento para consultar.', 'error');
      return;
    }

    if (btnSubmitSeniatLive) {
      btnSubmitSeniatLive.disabled = true;
      btnSubmitSeniatLive.innerHTML = '<span>Consultando...</span>';
    }

    try {
      const res = await fetch('/api/seniat/live/query', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          idNumber: docInput,
          captchaCode: captchaCode,
          sessionId: seniatLiveSessionId
        })
      });

      const data = await res.json();

      if (data.success && data.found) {
        showSeniatModalMsg(`✓ ¡Verificación exitosa! Contribuyente: ${data.data.nombre}`, 'success');

        // Actualizar la tarjeta tributaria en Tab 1
        const tagEl = document.getElementById('seniatTag');
        if (tagEl) {
          tagEl.textContent = 'EN VIVO - OFICIAL';
          tagEl.className = 'tag-verified';
          tagEl.style.background = 'rgba(16, 185, 129, 0.2)';
          tagEl.style.borderColor = '#10b981';
          tagEl.style.color = '#10b981';
        }

        const rifNumEl = document.getElementById('seniatRifNumber');
        if (rifNumEl) rifNumEl.textContent = data.data.rif;

        const nameEl = document.getElementById('seniatRif');
        if (nameEl) nameEl.textContent = data.data.nombre;

        const catEl = document.getElementById('seniatCategory');
        if (catEl) catEl.textContent = data.data.condicion;

        const retEl = document.getElementById('seniatRetention');
        if (retEl) retEl.textContent = data.data.retencionIVA;

        const actEl = document.getElementById('seniatActivity');
        if (actEl) actEl.textContent = data.data.actividad;

        // Si hay una auditoría activa, enriquecer su objeto
        if (typeof currentAudit !== 'undefined' && currentAudit) {
          if (!currentAudit.nationalEnrichment) currentAudit.nationalEnrichment = {};
          currentAudit.nationalEnrichment.seniat = {
            verified: true,
            isSpecificRecord: true,
            data: {
              rif: data.data.rif,
              name: data.data.nombre,
              taxCategory: data.data.condicion,
              withholdingRate: data.data.retencionIVA,
              status: data.data.estadoRegistro
            }
          };
        }

        setTimeout(() => {
          closeSeniatModal();
        }, 1800);
      } else if (data.success && !data.found) {
        showSeniatModalMsg(data.message || 'El documento no figura registrado en el SENIAT.', 'info');
      } else if (data.error === 'CAPTCHA_INCORRECT') {
        showSeniatModalMsg('Código incorrecto. Descargando nuevo captcha...', 'error');
        await loadSeniatCaptcha(true);
      } else if (data.error === 'SESSION_EXPIRED') {
        showSeniatModalMsg('La sesión expiró. Descargando nuevo captcha...', 'error');
        await loadSeniatCaptcha(true);
      } else {
        showSeniatModalMsg(data.message || 'Error en la consulta.', 'error');
      }
    } catch (err) {
      showSeniatModalMsg('Error de red: ' + err.message, 'error');
    } finally {
      if (btnSubmitSeniatLive) {
        btnSubmitSeniatLive.disabled = false;
        btnSubmitSeniatLive.innerHTML = '<span>✓ Consultar en SENIAT</span>';
      }
    }
  }

  if (btnOpenSeniatLive) btnOpenSeniatLive.addEventListener('click', openSeniatModal);
  if (btnCloseSeniatModal) btnCloseSeniatModal.addEventListener('click', closeSeniatModal);
  if (btnCancelSeniatModal) btnCancelSeniatModal.addEventListener('click', closeSeniatModal);
  if (btnReloadSeniatCaptcha) btnReloadSeniatCaptcha.addEventListener('click', () => loadSeniatCaptcha(true));
  if (btnSubmitSeniatLive) btnSubmitSeniatLive.addEventListener('click', submitSeniatLiveQuery);

  if (modalSeniatLive) {
    modalSeniatLive.addEventListener('click', (e) => {
      if (e.target === modalSeniatLive) closeSeniatModal();
    });
  }

  if (seniatModalCaptchaCode) {
    seniatModalCaptchaCode.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') {
        e.preventDefault();
        submitSeniatLiveQuery();
      }
    });
  }
});
