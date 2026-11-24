# AGENTS.md — Field Test TS (`field-test--ts`)

Guía de contexto, arquitectura, seguridad y convenciones para agentes de IA (Antigravity, Codex, Claude Code, etc.) trabajando en este repositorio.

---

## 1. Stack y Entorno
- **Frontend**: HTML5 + CSS nativo (tema oscuro) + TypeScript compilado a ES Modules (`app/` → `dist/`).
- **Backend**: Supabase (`@supabase/supabase-js`) — PostgreSQL con RLS, Supabase Auth, Storage (bucket privado `invoices`) y Edge Functions en Deno (`supabase/functions/`).
- **Servidor local de pruebas**: `server.js` (Node.js ESM, escucha en `http://127.0.0.1:3000`, acceso restringido a `pages/`, `dist/` y `assets/`).
- **URL de producción**: `https://fieldtest.mysmartbikes.com` (Supabase project ref: `vmdbszgsbcaeiznkhcvi`).

## 2. Comandos Clave
- `npm run build`: Compila `app/**/*.ts` a `dist/` (`tsc`). Ejecutar siempre tras modificar TypeScript.
- `npm test`: Compila y ejecuta la suite de tests unitarios (`tsconfig.test.json` → `dist-test/app/utils/run-tests.js`).
- `npm start`: Levanta el servidor local en `http://127.0.0.1:3000/bikes.html`.
- `npx --yes jscpd app/ --min-lines 6 --min-tokens 40`: Chequeo de código duplicado.

## 3. Estructura del Proyecto
- `pages/`: Vistas HTML (`index.html`, `login.html`, `bikes.html`, `ft.html`, `finance.html`, `form.html`, `import.html`, `questions.html`).
- `app/controllers/`: Controladores de vista y DOM (`bikes.*`, `ft/*`, `finance.controller.ts`, `form.controller.ts`, `import.controller.ts`, `questions.controller.ts`, `login.controller.ts`).
- `app/services/`: Capa de negocio y llamadas a Supabase (`auth.service.ts`, `bikes.service.ts`, `fieldTest.service.ts`, `finance.service.ts`, `rideLog.service.ts`).
- `app/dao/`: Cliente Supabase y acceso a datos (`supabaseclient.ts`, `rideLog.dao.ts`).
- `app/utils/`: Utilidades compartidas y tests unitarios:
  - `authGuard.ts`: Control de sesión y roles (`rider`, `viewer`, `admin`).
  - `sanitize.ts`: Helpers obligatorios de seguridad (`escapeHtml`, `safeJsonForScript`, `isValidUuid`, `isSafeHttpUrl`, `dataUriToBlobUrl`).
  - `sanitizeBikeCode.ts`: Normalización única de códigos de bicicleta (`normalizeBikeCode`).
  - `motorHistory.ts`: Matching de rodadas y errores por periodos de montaje de motor.
  - `financeCalculations.ts`: Reparto proporcional de facturas por km recorridos en el periodo.
  - `toast.ts`: Notificaciones globales (usa `textContent`, nunca `innerHTML` con texto dinámico).
- `supabase/functions/import-field-test/`: Edge Function para importación masiva de Excel (requiere JWT + rol en `app_admins` + CORS por `ALLOWED_ORIGINS`).
- `supabase/migrations/`: Migraciones SQL idempotentes (ej. `20261123_security_hardening.sql`).

## 4. Reglas Obligatorias de Seguridad
1. **Cero XSS**: Nunca interpolar datos de BBDD, parámetros de URL ni errores en `innerHTML` o `document.write` sin pasar por `escapeHtml()` (o usar `textContent`). Al serializar JSON dentro de `<script>`, usar siempre `safeJsonForScript()`.
2. **Filtros PostgREST**: Validar siempre con `isValidUuid()` antes de interpolar IDs en `.or(...)`.
3. **Autenticación y Roles**: Comprobar rol admin vía `supabase.rpc("is_admin")` (nunca usar `.ilike()` en `app_admins` porque `_` es comodín SQL).
4. **Storage privado**: El bucket `invoices` es privado; guardar solo el path del objeto y abrir documentos mediante `FinanceService.getInvoiceSignedUrl()` + `window.open(..., "_blank", "noopener,noreferrer")`.
5. **Edge Functions**: Toda función que use `SERVICE_ROLE_KEY` debe validar JWT (`verify_jwt = true`), comprobar `app_admins`, restringir CORS mediante `ALLOWED_ORIGINS` y limitar el tamaño del payload.
6. **Secretos y temporales**: Nunca commitear credenciales, tokens ni scripts de prueba en `scratch/` (carpeta ignorada en `.gitignore`).

## 5. Reglas de Diseño y Calidad
- **Evitar duplicidad**: Centralizar lógica de negocio compartida en `app/utils/` (especialmente normalización de códigos, corrección de distancias y cálculo de costes) con tests unitarios en `app/utils/*.test.ts`.
- **Evitar archivos monolíticos**: Al añadir funcionalidad nueva en `ft.kmSummary.ts` (2000+ líneas) o `ft.errorLog.ts` (1100+ líneas), extraer submódulos cohesivos (ej. popups/plantillas separados de la lógica de datos).
- **Verificación**: Ningún cambio de código está terminado hasta que `npm run build` y `npm test` pasen en verde.

## 6. Skills del Proyecto (`.agents/skills/`)
- **`motor-history-analyzer`** (`.agents/skills/motor-history-analyzer/SKILL.md`): Reglas exactas para calcular kilometraje acumulado de motores, cambios de componentes, errores y reviews.
- **`security-audit`** (`.agents/skills/security-audit/SKILL.md`): Cloudflare Security Audit Skill para revisiones defensivas y auditorías multifase de seguridad.
