# Instrucciones del Proyecto: Field Test TS

Este archivo resume el stack, la estructura, la seguridad y el estado actual del proyecto `field-test--ts` (complementado por [AGENTS.md](file:///c:/Users/Nacho%20Perez/Documents/GitHub/field-test--ts/AGENTS.md) para reglas detalladas de agentes).

---

## 🛠️ Stack Tecnológico
* **Frontend**: HTML5, CSS nativo (modo oscuro, diseño responsivo).
* **Lógica del Cliente**: TypeScript compilado a ES Modules (`app/` → `dist/`).
* **Base de Datos, Auth, Storage y Edge Functions**: Supabase (`@supabase/supabase-js`, proyecto `vmdbszgsbcaeiznkhcvi`).
* **Servidor Local**: `server.js` (Node.js ESM en `http://127.0.0.1:3000`, restringido a `pages/`, `dist/` y `assets/` con cabeceras de seguridad).
* **Producción**: `https://fieldtest.mysmartbikes.com`.
* **Librerías Clave**:
  * Chart.js `4.4.7` (gráficos en popups de métricas y errores).
  * SheetJS `0.20.3` vía CDN (`xlsx.full.min.js`) para importaciones de Excel.

---

## 📁 Estructura del Proyecto

* **`/pages/`**: Vistas HTML (`index.html`, `login.html`, `bikes.html`, `ft.html`, `finance.html`, `form.html`, `import.html`, `questions.html`).
* **`/app/`**: Código fuente TypeScript:
  * `controllers/`: Lógica de vistas y DOM (`bikes.*`, `ft/*`, `finance.controller.ts`, `form.controller.ts`, `import.controller.ts`, `questions.controller.ts`, `login.controller.ts`).
  * `services/`: Servicios e integración con Supabase (`auth.service.ts`, `bikes.service.ts`, `fieldTest.service.ts`, `finance.service.ts`, `rideLog.service.ts`).
  * `dao/`: Acceso a datos (`supabaseclient.ts`, `rideLog.dao.ts`).
  * `utils/`: Utilidades compartidas y tests (`authGuard.ts`, `sanitize.ts`, `sanitizeBikeCode.ts`, `motorHistory.ts`, `financeCalculations.ts`, `toast.ts`, `run-tests.ts`).
* **`/dist/`**: JavaScript compilado por `tsc`.
* **`/supabase/`**: Edge Functions (`import-field-test`), `config.toml` y migraciones SQL (`migrations/20261123_security_hardening.sql`).
* **`.agents/skills/`**: Skills instalados (`motor-history-analyzer`, `security-audit`).

---

## 🔑 Sistema de Seguridad y Roles

Controlado por **Supabase Auth + RLS** y [authGuard.ts](file:///c:/Users/Nacho%20Perez/Documents/GitHub/field-test--ts/app/utils/authGuard.ts):
1. **Rider** (sin correo corporativo): Solo accede a `form.html` para registrar rodadas y feedback propio.
2. **Viewer** (`@mahle` / `@mahle.com`): Solo lectura en todos los dashboards (`ft.html`, `bikes.html`, `import.html`, `finance.html`, `questions.html`).
3. **Admin** (`public.app_admins`, verificado vía RPC `is_admin()`): Lectura/escritura total e importación Excel (`import-field-test` con JWT + `app_admins`).

---

## ⚙️ Comandos del Proyecto

* **Compilar TypeScript**: `npm run build`
* **Ejecutar tests unitarios**: `npm test`
* **Iniciar servidor local**: `npm start` (`http://127.0.0.1:3000/bikes.html`)
* **Chequeo de duplicidades**: `npx --yes jscpd app/ --min-lines 6 --min-tokens 40`

---

## 📌 Estado Actual

- ✅ **Historial de Motores**: Cálculo acumulado por periodos de montaje (`motorHistory.ts`) y matching de errores/reviews.
- ✅ **Módulo Económico (`finance.html`)**: Reparto proporcional de facturas por km recorridos en el periodo (`financeCalculations.ts`), filtros en tiempo real, ordenación en cabeceras y facturas en bucket privado con Signed URLs.
- ✅ **Endurecimiento de Seguridad (P0/P1/P2)**: Protección de `import-field-test` (JWT + `app_admins` + CORS), mitigación de Stored XSS (`sanitize.ts`), `server.js` endurecido y migración SQL `supabase/migrations/20261123_security_hardening.sql`.
- 🔜 **Próximas mejoras técnicas sugeridas**: Unificar `correctDistance()` (actualmente duplicada con lógica divergente en 3 archivos) y dividir los controladores monolíticos (`ft.kmSummary.ts` y `ft.errorLog.ts`).
