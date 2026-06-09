# Instrucciones del Proyecto: Field Test TS

Este archivo contiene la especificación tecnológica, la estructura del proyecto, las directrices de desarrollo y el estado actual de las tareas para que cualquier sesión de asistencia de IA pueda sincronizarse de inmediato.

---

## 🛠️ Stack Tecnológico
* **Frontend**: HTML5, CSS nativo (premium, modo oscuro, diseño responsivo).
* **Lógica del Cliente**: TypeScript compilado a JavaScript (módulos ES nativos con `importmaps`).
* **Base de Datos y Autenticación**: Supabase (`@supabase/supabase-js`).
* **Servidor Local**: Servidor HTTP nativo de Node.js (`server.js` corriendo en el puerto 3000).
* **Librerías Clave**:
  * Chart.js (Visualización de datos en gráficos mixtos y de error).
  * SheetJS (`xlsx.full.min.js`) para importaciones de Excel.

---

## 📁 Estructura del Proyecto

* **`/pages/`**: Contiene las vistas HTML de la aplicación.
  * [index.html](file:///c:/Users/Nacho%20Perez/Documents/GitHub/field-test--ts/pages/index.html) - Página principal de redirección o inicio.
  * [login.html](file:///c:/Users/Nacho%20Perez/Documents/GitHub/field-test--ts/pages/login.html) - Pantalla de autenticación con tema oscuro premium.
  * [bikes.html](file:///c:/Users/Nacho%20Perez/Documents/GitHub/field-test--ts/pages/bikes.html) - Dashboard e histórico de bicicletas.
  * [ft.html](file:///c:/Users/Nacho%20Perez/Documents/GitHub/field-test--ts/pages/ft.html) - Gestión e información detallada de los Field Tests.
  * [finance.html](file:///c:/Users/Nacho%20Perez/Documents/GitHub/field-test--ts/pages/finance.html) - Módulo económico de facturas y costos por kilómetro.
  * [form.html](file:///c:/Users/Nacho%20Perez/Documents/GitHub/field-test--ts/pages/form.html) - Formulario en inglés para el registro de rodadas por Riders.
  * [import.html](file:///c:/Users/Nacho%20Perez/Documents/GitHub/field-test--ts/pages/import.html) - Sección de carga masiva por Excel.
* **`/app/`**: Código fuente de lógica en TypeScript.
  * `/controllers/` - Controladores que manejan el DOM y los eventos de las vistas (ej. `finance.controller.ts`, `bikes.controller.ts`).
  * `/services/` - Capa de servicios e integración con Supabase (`auth.service.ts`, `finance.service.ts`).
  * `/utils/` - Utilidades del sistema, incluyendo el guardián global de autenticación `authGuard.ts`.
* **`/dist/`**: Código JavaScript autogenerado/compilado a partir de TypeScript.
* **`/scratch/`**: Scripts temporales, bases de datos o configuraciones SQL para ejecutar en Supabase (ej. `finance_setup.sql`).
* **`server.js`**: Servidor Node.js local minimalista para pruebas y enrutamiento.

---

## 🔑 Sistema de Seguridad y Roles

El acceso está protegido mediante **Supabase Auth** y controlado en el frontend por [authGuard.ts](file:///c:/Users/Nacho%20Perez/Documents/GitHub/field-test--ts/app/utils/authGuard.ts) bajo tres niveles de acceso:
1. **Rider** (Sin correo corporativo): Solo puede acceder a [form.html](file:///c:/Users/Nacho%20Perez/Documents/GitHub/field-test--ts/pages/form.html) para reportar rodadas. Tiene el acceso bloqueado a cualquier otra sección.
2. **Viewer** (Correo corporativo `@mahle` o `@mahle.com`): Acceso de **solo lectura** a todos los dashboards (`ft.html`, `bikes.html`, `import.html`, `finance.html`). Los controles de edición/creación/eliminación se ocultan automáticamente en la UI.
3. **Admin** (Registrados en la tabla `public.app_admins`): Acceso total de lectura y escritura.

---

## ⚙️ Comandos del Proyecto

* **Compilar TypeScript**:
  ```bash
  npm run build
  ```
  *(Nota: Ejecuta `tsc` para transpilar el directorio `app/` a `dist/`)*
* **Iniciar Servidor Local**:
  ```bash
  npm start
  ```
  *(Nota: Levanta el servidor en `http://localhost:3000`)*

---

## 📌 Estado Actual y Tareas Pendientes

Hemos finalizado la implementación del **Módulo de Reporte Económico** que permite:
* Registro de facturas asociadas a bicicletas específicas y rangos de fechas.
* Almacenamiento directo del archivo adjunto (PDF/Imagen) codificado en Base64 en la base de datos.
* Visor de facturas embebido en la aplicación.
* Cálculo automático del costo por kilómetro dividiendo el total de la factura entre el kilometraje reportado por las bicicletas seleccionadas en dicho período.
* Panel de KPI y análisis por bicicleta.

### Tareas Pendientes para continuar en el siguiente chat:
- [ ] **Ejecutar el Script SQL en Supabase**:
  * Es necesario correr el archivo SQL [finance_setup.sql](file:///c:/Users/Nacho%20Perez/Documents/GitHub/field-test--ts/scratch/finance_setup.sql) en el editor de Supabase para crear las tablas `invoices` e `invoice_bikes` con sus respectivas políticas RLS.
- [ ] **Validación de Roles en Finance**:
  * Probar que el acceso al módulo económico esté correctamente restringido para Riders, visualizable para Viewers, y editable para Admins.
- [ ] **Validar Cálculos de Costo por Kilómetro**:
  * Realizar pruebas cargando una factura ficticia sobre un período de fechas con rodadas registradas en telemetría para comprobar que la división de kilómetros y costos se realiza adecuadamente.
