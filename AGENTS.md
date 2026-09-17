# AGENTS.md — Contexto para Asistentes IA (Frontend)

## Project Overview

**Sistema_Inventario** v3.0 — Frontend SPA para sistema de inventario POS. React + TypeScript + Ant Design.

> Nota: omitir e ignorar `wrangler.jsonc` (no tocar, no modificar, no considerar en builds). Rama de trabajo: `yct`.

### Stack
- React 18, TypeScript, Vite 5
- Ant Design 5
- Zustand (state management)
- Axios (HTTP con JWT interceptor)
- Day.js (fechas)

---

## Project Structure

```
sistema_PV_frontend/
├── src/
│   ├── pages/             # 9 page modules
│   ├── services/          # 13 API service modules
│   ├── types/             # TypeScript interfaces
│   ├── stores/            # Zustand stores
│   └── App.tsx            # Router + auth guard
├── public/
├── productos.xlsx         # Plantilla Excel para importar
├── package.json
└── vite.config.ts         # Proxy /api -> localhost:8000
```

---

## Architecture Conventions

### Data flow
```
pages/ (views) -> services/ (Axios API calls) -> types/ (interfaces)
```

### Naming
- **Pages**: PascalCase + `Page` suffix (`ComprasPage.tsx`)
- **Services**: camelCase (`compraService.ts`)
- **Types**: camelCase (`compra.ts`)

---

## Key Patterns

### Auth
- JWT stored in `localStorage` as `token`
- `services/api.ts` interceptor attaches `Authorization: Bearer <token>` to all requests
- 401 response auto-redirects to `/login`
- `useAuthStore` (Zustand) manages auth state + module permissions
- Route protection via `hasAccess(path)` in `App.tsx`

### Compose Pattern (Compra/Venta)
- Master form + inline detail rows (productos)
- Each detail row: Producto (modal selector), Cantidad, Costo/Precio
- Total calculated in real-time via `useMemo`
- `num_comprobante` auto-generated (8-digit zero-padded) or manual via Switch (`autoNum` state)
- **Venta-specific**: each detail row includes `utilidad` field and `stock_actual`; header includes `impuesto%` and `descuento%`
- **Venta total**: de la suma de líneas ya incluye IVA/IT (13%/3%) cuando `con_factura` (el backend los embebe en el precio por línea); en pantalla `total = subtotal − descuento%` y los IVA/IT mostrados (`subtotal × 13%` / `× 3%`) son informativos
- **Venta N° Comprobante**: defaults to Automático (A) mode via Switch
- **Stock warning**: when `cantidad > stock_actual`, a red "Stock: N" warning appears below the quantity input

### Sub-modal CRUD Pattern
Used in ComprasPage (Proveedores, Comprobantes, Estados) and VentasPage (Clientes, Comprobantes, Estados):
1. Select with `popupRender` containing "Gestionar" button
2. Modal shows table of all records + inline create/edit form
3. Uses `useMemo` for `{ value, label }` options
4. Popconfirm for delete with try/catch showing backend error: `error.response?.data?.detail`

### Filters
- `Tag.CheckableTag` for enum/estado filters
- `Input.Search` for text search (proveedor, cliente)
- `DatePicker.RangePicker` for date range
- Filtered list via `useMemo` with `startOf('day')` / `endOf('day')`

### Anular / Delete
- **Anular button** (`CloseCircleOutlined`, yellow): visible when `estado_nombre !== 'ANULADO'`
- **Delete button** (`DeleteOutlined`, red danger): visible only when `estado_nombre === 'ANULADO'`
- Both wrapped in `Popconfirm`

### Product Selector Modal
- Table with columns: Producto (combined: `[Código] Categoría - Descripción` + Marca en gris), Precio, Stock
- Search filters by código, descripción, marca, categoría
- Only shows active products (`p.activo !== false`)
- `onRow` click handler to select and populate detalle row

### Producto Pricing
- Form fields: **Costo Bs.** (`precio` en BD), **Utilidad Bs.**, **Peso (kg)**
- **Precio Base** se calcula automáticamente: si peso == 0 → `costo + utilidad`; si peso > 0 → `peso * costo + utilidad`
- Se muestra como campo disabled en el formulario y como columna calculada en la tabla

### Expanded Table Rows
- `expandable={{ expandedRowRender, rowExpandable }}` on main table
- Shows sub-table with detailed columns (Código, Producto, Cantidad, Precio/Costo, Subtotal)

### WebSocket / Real-Time
- `services/websocket.ts` – `WebSocketClient` class with auto-reconnect every 3s
- `hooks/useRealtimeRefresh.ts` – React hook `useRealtimeRefresh(room, onRefresh)`
- Vite proxy config at `vite.config.ts` has `ws: true` for `/api` to proxy WebSocket upgrade
- URL auto-detected from `window.location` (works with Vite proxy in dev)
- Rooms: `productos`, `ventas`, `compras`, `dashboard`, `reportes`
- Pages subscribed:
  - InicioPage → `dashboard`
  - ProductosPage → `productos` + `dashboard`
  - ComprasPage → `compras` + `dashboard`
  - VentasPage → `ventas` + `dashboard`
  - ReportesPage → `reportes` + `dashboard`

### PDF Download
- Service function fetches blob, creates object URL, triggers download via hidden `<a>` link
- Same pattern for individual PDF and range report PDF

---

## Critical Implementation Details

- **Port**: Frontend on 3000, Vite proxies `/api` → `localhost:8000`
- **API URL**: `/api` (relative, proxied by Vite via `vite.config.ts`)
- **Currency**: Bs. (Bolivianos), NOT S/.
- **Decimal handling**: Backend sends Decimal as string; wrap with `Number(val || 0)` to avoid `.toFixed is not a function`
- **Date handling**: Day.js throughout; `startOf('day')` / `endOf('day')` for range filter comparisons
- **Date enviada al backend**: siempre `YYYY-MM-DD` (sin hora), p. ej. `values.fecha.format('YYYY-MM-DD')`. La hora la asigna el backend en `America/La_Paz` (`ahora_local()`). Al mostrar se usa Day.js con la zona horaria del navegador del usuario
- **Vite stale cache**: Delete `node_modules/.vite` if puzzling errors appear
- **Imágenes de empresa (logo/encabezado/pie)**: el menú (`AppLayout.tsx`) y el login (`LoginPage.tsx`) muestran `empresa.logo`. El backend guarda las imágenes siempre con el mismo nombre (`/uploads/empresa/logo.png`), por lo que al re-subir el navegador puede seguir mostrando la imagen anterior (misma URL → caché). Workaround actual: abrir en otra pestaña/incógnito o limpiar caché. Fix recomendado (pendiente de implementar): cache-busting con `?v=timestamp` en los `<img>` o nombres de archivo únicos por subida en el backend.
- **User ID**: Hardcoded as `1` in create endpoints (matching backend)
- **Auto/Manual N° Comprobante**: Switch in create form with `checkedChildren="A"` / `unCheckedChildren="M"`; `Space.Compact` wrapper (not deprecated `addonAfter`)
- **Edit mode**: Cliente/Proveedor, Comprobante, and N° Comprobante are readonly; `autoNum` forced to false
- **Product import**: Use `productos.xlsx` (in root) as template for `/api/productos/import-xlsx`. Columnas esperadas: `ÏD`, `Código`, `Categoría`, `Descripción`, `Marca`, `Costo Bs.`, `Utilidad Bs.`, `Peso Kg`, `Stock Inicial`, `Stock Mínimo`, `Estado`. `Costo Bs.` se asigna al campo `precio` en BD.
- **Usuario**: Productos, Compras y Ventas muestran columna "Usuario" con el `username` de quien registró
- **Deprecated Ant props**: Use `variant="borderless"` instead of `bordered={false}`; use `Space.Compact` instead of `addonAfter` on Input
- **WebSocket**: Vite dev server proxies WS via `ws: true` in proxy config; connect to `/api/ws/{room}` from frontend

---

## State of Development

### Completed Pages
- Login, Dashboard (with sidebar menu)
- Productos (CRUD + Excel import/export + search by code)
- Proveedores (CRUD + soft-delete)
- Clientes (CRUD)
- Compras (CRUD + inline detalles + sub-modal CRUD + filters + anular + PDF)
- Ventas (CRUD + inline detalles + sub-modal CRUD + filters + anular + PDF + impuesto/descuento)
- Reportes
- Configuración (usuarios, roles, módulos, categorías, comprobantes, estados)

### Common Tasks
- Adding new page: Create types → service → page component → register route in `App.tsx`
- Adding filters: Tag.CheckableTag + Input.Search + DatePicker.RangePicker with useMemo filtering
- Error fix: Check Vite cache, Decimal serialization, import paths, TypeScript strict mode
