/**
 * GuiaRisk - Algoritmo de Similitud Fonética y Textual (Fuzzy Matcher)
 * Optimizado para Compliance con filtrado de stopwords y comparación simétrica de tokens (F1-score)
 */

function normalizeText(text) {
  if (!text) return '';
  return text
    .toString()
    .toUpperCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '') // Quitar tildes
    .replace(/[^A-Z0-9\s]/g, ' ')   // Quitar signos de puntuación
    .replace(/\s+/g, ' ')           // Espacios simples
    .trim();
}

function levenshteinDistance(a, b) {
  const matrix = [];
  const n = a.length;
  const m = b.length;

  if (n === 0) return m;
  if (m === 0) return n;

  for (let i = 0; i <= n; i++) matrix[i] = [i];
  for (let j = 0; j <= m; j++) matrix[0][j] = j;

  for (let i = 1; i <= n; i++) {
    for (let j = 1; j <= m; j++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      matrix[i][j] = Math.min(
        matrix[i - 1][j] + 1,
        matrix[i][j - 1] + 1,
        matrix[i - 1][j - 1] + cost
      );
    }
  }

  return matrix[n][m];
}

function jaroWinkler(s1, s2) {
  const str1 = normalizeText(s1);
  const str2 = normalizeText(s2);

  if (str1 === str2) return 1.0;
  if (!str1.length || !str2.length) return 0.0;

  const matchWindow = Math.floor(Math.max(str1.length, str2.length) / 2) - 1;
  const str1Matches = new Array(str1.length).fill(false);
  const str2Matches = new Array(str2.length).fill(false);

  let matches = 0;
  let transpositions = 0;

  for (let i = 0; i < str1.length; i++) {
    const start = Math.max(0, i - matchWindow);
    const end = Math.min(i + matchWindow + 1, str2.length);

    for (let j = start; j < end; j++) {
      if (str2Matches[j]) continue;
      if (str1[i] !== str2[j]) continue;
      str1Matches[i] = true;
      str2Matches[j] = true;
      matches++;
      break;
    }
  }

  if (matches === 0) return 0.0;

  let k = 0;
  for (let i = 0; i < str1.length; i++) {
    if (!str1Matches[i]) continue;
    while (!str2Matches[k]) k++;
    if (str1[i] !== str2[k]) transpositions++;
    k++;
  }

  const jaro =
    (matches / str1.length +
      matches / str2.length +
      (matches - transpositions / 2) / matches) /
    3;

  let prefix = 0;
  for (let i = 0; i < Math.min(4, Math.min(str1.length, str2.length)); i++) {
    if (str1[i] === str2[i]) prefix++;
    else break;
  }

  return jaro + prefix * 0.1 * (1 - jaro);
}

function calculateMatchScore(target, candidate) {
  const normA = normalizeText(target);
  const normB = normalizeText(candidate);
  if (!normA || !normB) return 0;
  if (normA === normB) return 100;

  const jw = jaroWinkler(normA, normB) * 100;

  const stopWords = new Set([
    'DE', 'DEL', 'LA', 'LAS', 'LOS', 'EL', 'Y', 'O', 'C', 'A', 'CA', 'SA', 'SRL',
    'INVERSIONES', 'GRUPO', 'HOLDINGS', 'CORPORACION', 'COMPANIA'
  ]);

  const tokensA = normA.split(' ').filter((t) => t.length > 2 && !stopWords.has(t));
  const tokensB = normB.split(' ').filter((t) => t.length > 2 && !stopWords.has(t));

  if (!tokensA.length || !tokensB.length) return Math.round(jw);

  // Cuántos tokens significativos de A están en B con similitud > 0.85
  let matchedA = 0;
  for (const tA of tokensA) {
    let best = 0;
    for (const tB of tokensB) {
      const s = jaroWinkler(tA, tB);
      if (s > best) best = s;
    }
    if (best >= 0.85) matchedA += best;
  }

  let matchedB = 0;
  for (const tB of tokensB) {
    let best = 0;
    for (const tA of tokensA) {
      const s = jaroWinkler(tB, tA);
      if (s > best) best = s;
    }
    if (best >= 0.85) matchedB += best;
  }

  const tokenF1 = (((matchedA / tokensA.length) + (matchedB / tokensB.length)) / 2) * 100;

  // Si no hay intersección real de tokens, el score no debe superar 45%
  if (tokenF1 < 40) {
    return Math.min(Math.round(jw * 0.7), 45);
  }

  const finalScore = Math.round(jw * 0.4 + tokenF1 * 0.6);
  return Math.min(100, Math.max(0, finalScore));
}

module.exports = {
  normalizeText,
  levenshteinDistance,
  jaroWinkler,
  calculateMatchScore
};
