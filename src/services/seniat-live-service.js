/**
 * GuiaRisk - Servicio de Enlace en Vivo con SENIAT (Human-in-the-Loop)
 * Permite la validación en tiempo real contra BuscaRif.jsp manteniendo
 * la sesión de 15 minutos con token JSESSIONID y auto-guardado en caché local.
 */

const fs = require('fs');
const path = require('path');
const { calculateRifCheckDigit, parseRif } = require('./national-enricher');

const SENIAT_BASE_URL = 'http://contribuyente.seniat.gob.ve/BuscaRif';
const seniatDataPath = path.join(__dirname, '../data/seniat-taxpayers.json');

// Almacén de sesiones en memoria (15 min de vida)
const liveSessions = new Map();

// Limpieza periódica de sesiones caducadas (> 15 minutos de inactividad)
setInterval(() => {
  const now = Date.now();
  for (const [id, sess] of liveSessions.entries()) {
    if (now - sess.lastActive > 15 * 60 * 1000) {
      liveSessions.delete(id);
    }
  }
}, 60 * 1000);

/**
 * Inicia una sesión con el portal del SENIAT y descarga el Captcha oficial
 */
async function getCaptchaSession(existingSessionId = null) {
  // Si ya tiene una sesión activa y autenticada de menos de 15 min, avisar
  if (existingSessionId && liveSessions.has(existingSessionId)) {
    const existing = liveSessions.get(existingSessionId);
    const ageMinutes = Math.floor((Date.now() - existing.lastActive) / 60000);
    if (existing.authenticated && ageMinutes < 15) {
      return {
        success: true,
        sessionId: existingSessionId,
        hasActiveSession: true,
        remainingMinutes: 15 - ageMinutes,
        message: 'Sesión activa en el SENIAT. No requiere resolver un nuevo captcha.'
      };
    }
  }

  try {
    const userAgent = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36';

    // 1. Handshake inicial para generar JSESSIONID y cookies de seguridad
    const initRes = await fetch(`${SENIAT_BASE_URL}/BuscaRif.jsp`, {
      headers: {
        'User-Agent': userAgent,
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8'
      },
      signal: AbortSignal.timeout(8000)
    });

    if (!initRes.ok) {
      throw new Error(`Servidor SENIAT respondió con código HTTP ${initRes.status}`);
    }

    // Extraer cookies de sesión
    let cookieParts = [];
    if (typeof initRes.headers.getSetCookie === 'function') {
      cookieParts = initRes.headers.getSetCookie().map(c => c.split(';')[0]);
    } else {
      const raw = initRes.headers.get('set-cookie');
      if (raw) {
        cookieParts = raw.split(',').map(c => c.split(';')[0].trim());
      }
    }

    const cookieHeader = cookieParts.join('; ');

    // 2. Descargar la imagen del Captcha con la cookie asignada
    const captchaRes = await fetch(`${SENIAT_BASE_URL}/Captcha.jpg`, {
      headers: {
        'User-Agent': userAgent,
        'Cookie': cookieHeader,
        'Referer': `${SENIAT_BASE_URL}/BuscaRif.jsp`,
        'Accept': 'image/avif,image/webp,image/apng,image/svg+xml,image/*,*/*;q=0.8'
      },
      signal: AbortSignal.timeout(8000)
    });

    if (!captchaRes.ok) {
      throw new Error('No se pudo descargar la imagen del Captcha del SENIAT');
    }

    const captchaBuffer = Buffer.from(await captchaRes.arrayBuffer());
    const captchaBase64 = `data:image/jpeg;base64,${captchaBuffer.toString('base64')}`;

    const newSessionId = require('crypto').randomUUID();
    liveSessions.set(newSessionId, {
      cookie: cookieHeader,
      createdAt: Date.now(),
      lastActive: Date.now(),
      authenticated: false
    });

    return {
      success: true,
      sessionId: newSessionId,
      hasActiveSession: false,
      captchaImage: captchaBase64,
      message: 'Captcha descargado exitosamente del portal oficial del SENIAT.'
    };
  } catch (err) {
    console.error('[SENIAT LIVE] Error obteniendo sesión/captcha:', err.message);
    return {
      success: false,
      error: 'SENIAT_UNAVAILABLE',
      message: `El servidor del SENIAT no respondió a tiempo o se encuentra saturado (${err.message}).`
    };
  }
}

/**
 * Consulta en vivo un RIF o Cédula utilizando el Captcha ingresado por el usuario
 * o reutilizando una sesión ya validada dentro de la ventana de 15 minutos.
 */
async function queryLiveTaxpayer(rawDoc, captchaCode, sessionId) {
  if (!sessionId || !liveSessions.has(sessionId)) {
    return {
      success: false,
      error: 'NO_SESSION',
      message: 'No hay una sesión activa con el SENIAT. Por favor solicite un nuevo Captcha.'
    };
  }

  const session = liveSessions.get(sessionId);
  const now = Date.now();
  if (now - session.lastActive > 15 * 60 * 1000) {
    liveSessions.delete(sessionId);
    return {
      success: false,
      error: 'SESSION_EXPIRED',
      message: 'La sesión de 15 minutos con el SENIAT ha expirado por inactividad. Solicite un nuevo Captcha.'
    };
  }

  if (!session.authenticated && (!captchaCode || !captchaCode.trim())) {
    return {
      success: false,
      error: 'CAPTCHA_REQUIRED',
      message: 'Debe ingresar el código que observa en la imagen del Captcha.'
    };
  }

  try {
    // Normalizar formato de búsqueda para el SENIAT
    const parsed = parseRif(rawDoc);
    // SENIAT espera formato sin guiones: e.g. V142021184 o J003360392
    // Si es persona natural de 8 dígitos, se le calcula y anexa el dígito verificador
    let p_rif = `${parsed.prefix}${parsed.body}${parsed.checkDigit}`;
    // Si tiene menos de 9 dígitos numéricos, SENIAT requiere rellenar con ceros a la izquierda
    const bodyWithCheck = `${parsed.body}${parsed.checkDigit}`.padStart(9, '0');
    const p_rif_padded = `${parsed.prefix}${bodyWithCheck}`;

    const params = new URLSearchParams();
    params.append('p_rif', p_rif_padded);
    params.append('codigo', (captchaCode || '').toUpperCase().trim());
    params.append('busca', ' Buscar ');

    const userAgent = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36';

    const postRes = await fetch(`${SENIAT_BASE_URL}/BuscaRif.jsp`, {
      method: 'POST',
      headers: {
        'User-Agent': userAgent,
        'Cookie': session.cookie,
        'Referer': `${SENIAT_BASE_URL}/BuscaRif.jsp`,
        'Content-Type': 'application/x-www-form-urlencoded',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8'
      },
      body: params.toString(),
      signal: AbortSignal.timeout(10000)
    });

    const responseHtml = await postRes.text();

    // 1. Verificar si el Captcha fue incorrecto
    if (
      responseHtml.includes('no coincide con la imagen') ||
      responseHtml.includes('coincide con la imagen') ||
      responseHtml.includes('c?digo no coincide')
    ) {
      return {
        success: false,
        error: 'CAPTCHA_INCORRECT',
        message: 'El código del Captcha no coincide con la imagen. Por favor solicite uno nuevo e intente otra vez.'
      };
    }

    // Si pasó el filtro de captcha, marcamos la sesión como autenticada y actualizamos timestamp
    session.authenticated = true;
    session.lastActive = Date.now();

    // 2. Verificar si no existe el contribuyente
    if (
      responseHtml.includes('No existe el contribuyente solicitado') ||
      responseHtml.includes('no existe')
    ) {
      return {
        success: true,
        found: false,
        sessionActive: true,
        remainingMinutes: 15,
        message: `El documento ${rawDoc} no se encuentra registrado en el padrón del SENIAT.`
      };
    }

    // 3. Extraer las tablas de resultados
    // Usamos expresiones regulares limpias para extraer texto de las tablas
    const tables = responseHtml.match(/<table[\s\S]*?<\/table>/gi) || [];

    if (tables.length < 2) {
      // Si no devolvió las tablas usuales pero no dio error, puede haber devuelto la misma página
      return {
        success: false,
        error: 'PARSE_ERROR',
        message: 'La respuesta del SENIAT no pudo ser interpretada o el código de verificación expiró.'
      };
    }

    // Tabla 2: Contiene RIF, Nombre y Estatus de Registro
    const t2Text = tables[1].replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();

    // Tabla 3: Contiene Actividad, Condición y Tasa de Retención
    const t3Text = (tables[2] || '').replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();

    // Parsear datos de Tabla 2
    let isExpired = t2Text.toUpperCase().includes('REGISTRO VENCIDO');
    let cleanHeader = t2Text.replace(/REGISTRO VENCIDO/gi, '').trim();

    // Extraer RIF y Nombre
    // Formato típico: "J-00012255-5 BANCO DE VENEZUELA S.A. BANCO UNIVERSAL"
    const words = cleanHeader.split(' ');
    const extractedRif = words[0] || `${parsed.prefix}-${parsed.body}-${parsed.checkDigit}`;
    const extractedName = words.slice(1).join(' ').trim();

    // Parsear datos de Tabla 3
    // Formato típico: "Actividad Económica: ... Condición: Contribuyente Ordinario del IVA ... Retención: 75%"
    let condition = 'Contribuyente Ordinario del IVA';
    if (t3Text.includes('Especial')) condition = 'Contribuyente Especial';
    else if (t3Text.includes('Formal')) condition = 'Contribuyente Formal';
    else if (t3Text.includes('Ordinario')) condition = 'Contribuyente Ordinario del IVA';

    let retencion = '75%';
    if (t3Text.includes('100%')) retencion = '100%';
    else if (t3Text.includes('0%')) retencion = '0%';

    let esAgente = t3Text.toUpperCase().includes('AGENTE DE RETENCIÓN: SI') || condition === 'Contribuyente Especial';

    const taxpayerResult = {
      cedula: `${parsed.prefix}-${parsed.body}`,
      rif: extractedRif.includes('-') ? extractedRif : `${parsed.prefix}-${parsed.body}-${parsed.checkDigit}`,
      nombre: extractedName || `Contribuyente ${parsed.prefix}-${parsed.body}`,
      condicion: condition,
      retencionIVA: retencion,
      agenteRetencion: esAgente ? 'SI' : 'NO',
      actividad: 'Actividad Económica Registrada',
      estadoRegistro: isExpired ? 'VENCIDO' : 'ACTIVO',
      origen: 'SENIAT Portal Oficial (En Vivo)',
      fechaConsulta: new Date().toISOString()
    };

    // 4. Auto-guardado en la base de datos local (seniat-taxpayers.json)
    try {
      let localData = [];
      if (fs.existsSync(seniatDataPath)) {
        localData = JSON.parse(fs.readFileSync(seniatDataPath, 'utf8'));
      }
      const existingIdx = localData.findIndex(item => 
        item.cedula === taxpayerResult.cedula || 
        item.rif.replace(/-/g, '') === taxpayerResult.rif.replace(/-/g, '')
      );

      if (existingIdx !== -1) {
        localData[existingIdx] = { ...localData[existingIdx], ...taxpayerResult };
      } else {
        localData.push(taxpayerResult);
      }
      fs.writeFileSync(seniatDataPath, JSON.stringify(localData, null, 2), 'utf8');
    } catch (saveErr) {
      console.warn('[SENIAT LIVE] Advertencia al persistir en caché local:', saveErr.message);
    }

    return {
      success: true,
      found: true,
      data: taxpayerResult,
      cached: true,
      sessionActive: true,
      remainingMinutes: 15,
      message: 'Contribuyente verificado exitosamente en vivo con el portal oficial del SENIAT.'
    };
  } catch (err) {
    console.error('[SENIAT LIVE] Error procesando consulta en vivo:', err.message);
    return {
      success: false,
      error: 'QUERY_FAILED',
      message: `Error comunicándose con el SENIAT: ${err.message}`
    };
  }
}

module.exports = {
  getCaptchaSession,
  queryLiveTaxpayer
};
