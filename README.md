# 🛡️ GuiaRisk 2.0 | Core de Compliance, Debida Diligencia & Prevención LA/FT/FPADM

> **Desarrollado por:** Manuel Guía  
> **Arquitectura:** WebApp Full-Stack (Node.js + Express + SPA Cyber Shield Theme)  
> **Propósito:** Reemplazo integral y evolucionado de herramientas de listas restrictivas tipo Inspektor para el mercado nacional e internacional.

---

## 🚀 Inicio Rápido

### Opción 1: Con 1 Clic (Windows)
Haga doble clic en el archivo **`start.bat`**. Se abrirá automáticamente el navegador en:
```
http://localhost:3000
```

### Opción 2: Desde la Terminal
```bash
cd guiarisk-web
npm start
# O en modo desarrollo con auto-recarga:
npm run dev
```

---

## 🌟 Características y Mejoras sobre Inspektor Tradicional

1. **Enriquecimiento Nacional 1-Clic (Anti-Pestañas):**
   - Validación simultánea en el Padrón Electoral (**CNE**) y Registro de Información Fiscal (**SENIAT**).
   - Corrige errores tipográficos y autocompleta nombres y ubicación oficial.

2. **Motor Anti-Homonimia Inteligente (Smart Disambiguation):**
   - Algoritmo que contrasta año de nacimiento/edad y jurisdicción/nacionalidad.
   - Detecta y mitiga automáticamente falsos positivos evidentes.

3. **Certificados Criptográficos con Código QR y SHA-256:**
   - Cada consulta genera un **Certificado Oficial Imprimible** con firma digital SHA-256 inmutable.
   - Código QR dinámico que abre el **Portal Público de Verificación** (`/verify.html?hash=...`) para que inspectores y auditores validen la autenticidad con su celular en tiempo real.

4. **Pista de Auditoría y Descarte Formal:**
   - Registro cronológico inmutable de consultas.
   - Flujo de descarte de homonimias con justificación obligatoria del Oficial de Cumplimiento.

5. **Auditoría Masiva (Batch):**
   - Procesamiento de carteras de clientes en lotes con desglose estadístico.

---

## 📡 Endpoints de la API REST

| Método | Endpoint | Descripción |
| :--- | :--- | :--- |
| `GET` | `/api/status` | Estado operativo de fuentes y fecha de sincronización |
| `POST` | `/api/audit/single` | Auditoría individual (Cédula/RIF, Nombres, País, DOB) |
| `POST` | `/api/audit/batch` | Auditoría masiva de lote de registros |
| `POST` | `/api/audit/dismiss-homonym` | Registro formal de descarte de falso positivo |
| `GET` | `/api/audit/history` | Bitácora inmutable de consultas |
| `GET` | `/api/verify/:hash` | Verificación pública para el escáner de códigos QR |
| `POST` | `/api/sync/refresh` | Sincronización y reindexación de listas |
