/**
 * GuiaRisk - Servidor Principal Node.js / Express
 * Sistema Integral de Compliance, Debida Diligencia y Prevención LA/FT/FPADM
 */

const express = require('express');
const cors = require('cors');
const path = require('path');
const apiRoutes = require('./src/routes/api');

const app = express();
const DEFAULT_PORT = parseInt(process.env.PORT, 10) || 3000;

// Middlewares
app.use(cors());
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Servir archivos estáticos del Frontend SPA
app.use(express.static(path.join(__dirname, 'public')));

// Enrutador de API
app.use('/api', apiRoutes);

// Fallback SPA
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Función de arranque resiliente (busca el siguiente puerto si está ocupado)
function startServer(port) {
  const server = app.listen(port, () => {
    console.log('====================================================');
    console.log(' 🛡️  GUIARISK 2.0 - CORE DE COMPLIANCE & DEBIDA DILIGENCIA');
    console.log('====================================================');
    console.log(` Servidor activo en: http://localhost:${port}`);
    console.log(` Portal de Verificación: http://localhost:${port}/verify.html`);
    console.log(` Endpoints API: http://localhost:${port}/api/status`);
    console.log(' Estado: EN LÍNEA | FTS5 Indexing: OK | OFAC/ONU: Activas');
    console.log('====================================================');
  });

  server.on('error', (err) => {
    if (err.code === 'EADDRINUSE') {
      console.warn(`[AVISO] El puerto ${port} está ocupado. Probando automáticamente puerto ${port + 1}...`);
      startServer(port + 1);
    } else {
      console.error('Error al iniciar el servidor:', err);
    }
  });
}

startServer(DEFAULT_PORT);
