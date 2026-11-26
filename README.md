# VentasLite

Mini sistema de ventas para una distribuidora: login con roles, catálogo, mas de 2,000 ventas sembradas, reportes con SQL agregado y un asistente de IA.

## Demo en línea

| Parte | URL |
|---|---|
| Aplicación (frontend en Vercel) | https://ventaslite.vercel.app |
| API (backend en Railway) | https://ventaslite-production.up.railway.app/api |
| Video (3 a 5 min) | https://www.loom.com/share/0d2af3b5f8ba4c3ca3b383d969486e58 |
| Wireframe | `docs/Figma`  https://www.figma.com/make/sWvTSSvk36g0yk24UuNZr8/Wireframe-de-Ventas?t=kjbXS2dvReyCsPxO-1|

### Credenciales de prueba

| Rol | Correo | Contraseña |
|---|---|---|
| Administrador | `admin@ventaslite.test` | `password` |
| Vendedor | `vendedor1@ventaslite.test` a `vendedor8@ventaslite.test` | `password` |

## Stack

- **Frontend:** React 19 + Vite, Tailwind CSS, React Router, Recharts.
- **Backend:** PHP 8.4, Laravel 13, API REST en JSON, Sanctum (token Bearer).
- **Base de datos:** MySQL 8.
- **IA:** Gemini (Google), llamado siempre desde el backend.
- **Despliegue:** Vercel (frontend) y Railway (backend + MySQL).

## Estructura del repositorio

```
ventaslite/
├── app/, routes/, database/, config/   → backend Laravel (se despliega en Railway)
├── frontend/                           → React + Vite (se despliega en Vercel)
└── docs/                               → wireframe y capturas
```

El `package.json` de la raíz es el de la plantilla de Laravel y no se usa. El frontend es el de `frontend/`.

## Requisitos

PHP 8.4+, Composer, Node.js 20+, MySQL 8 (o MariaDB) y una API key de Gemini (opcional: sin ella la app funciona y el asistente muestra un aviso).

## Instalación local 

```bash
git clone https://github.com/maxluna231/ventaslite.git && cd ventaslite
composer install
cp .env.example .env && php artisan key:generate
mysql -u root -e "CREATE DATABASE ventaslite CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;"
php artisan migrate:fresh --seed
php artisan serve
cd frontend && cp .env.example .env && npm install
npm run dev
```

Antes de `migrate:fresh --seed`, revisa en `.env` los datos de MySQL (`DB_USERNAME`, `DB_PASSWORD`) y, si quieres el asistente, pon `AI_API_KEY`. La app queda en http://localhost:5173 y la API en http://localhost:8000.


## Variables de entorno

Ningún secreto está en el repositorio. Ver `.env.example` y `frontend/.env.example`.

| Variable | Dónde | Para qué |
|---|---|---|
| `DB_*` | Backend | Conexión a MySQL |
| `AI_PROVIDER`, `AI_API_KEY`, `AI_MODEL` | Backend | Proveedor, key y modelo del asistente (`gemini`) |
| `CORS_ALLOWED_ORIGINS` | Backend | 
| `VITE_API_URL` | Frontend | Base de la API (`/api` en producción) |
| `VITE_AI_URL` | Frontend | Base directa de la API para el asistente |

## Funcionalidades

- **Login y roles:** token Sanctum, logout que invalida el token, bloqueo tras 5 intentos fallidos por minuto. El vendedor solo ve y reporta sus propias ventas, validado en el backend.
- **Ventas:** listado paginado en servidor (20 por página) con filtros de fechas, sucursal, vendedor y estatus; detalle; registrar venta (descuenta stock en una transaccion); cancelar (solo admin, regresa el stock).
- **Reportes** (SQL agregado en el backend, las ventas canceladas no cuentan): dashboard con cambio contra el periodo anterior, ventas por mes (12 meses), top 10 de productos por unidades o importe, ranking de vendedores, sucursal × categoría, margen por categoria y exportación a CSV.
- **Asistente de IA:** pregunta libre y "Resumen ejecutivo" sobre el periodo filtrado.

## Modelo de datos

Seis tablas con migraciones, llaves foráneas reales e índices: `users`, `branches`, `categories`, `products`, `sales` (índices en `sold_at`, `branch_id + sold_at`, `user_id + sold_at`) y `sale_items` (cascade desde `sales`).

## Datos sembrados

1 admin y 8 vendedores, 4 sucursales, 8 categorías, 150 productos (10 % inactivos), 2,500 ventas de los últimos 18 meses (≈5 % canceladas) y unos 7,500 renglones. Diciembre vende cerca del doble que los demás meses y la sucursal Sureste queda claramente por debajo. Los totales cuadran: `total = suma de renglones × 1.16`.

## Decisiones técnicas

- **Dinero:** `DECIMAL(12,2)`, nunca `FLOAT`; los cálculos se hacen en centavos enteros y se convierten al final.
- **`unit_price` en `sale_items`:** el precio del producto puede cambiar despues.
- **Cálculo en el servidor:** el cliente solo manda producto y cantidad; precios, IVA y total salen de la base. La vista previa del formulario es solo para visualizar.
- **Concurrencia:** el registro de ventas bloquea las filas de producto (`lockForUpdate`, en orden de id) dentro de una transacción.
- **Seeders rápidos e idempotentes:** inserciones por lote en una transacción; catálogos con `firstOrCreate`.
- **Nombres:** Faker no incluye `es_MX`, asi que se usó `es_ES`.
- **Reportes:** todos parten de una sola consulta base que excluye canceladas y aplica el alcance por rol. La tabla sucursal × categoría incluye sucursales y categorías sin ventas (con 0).
- **Periodo por defecto:** si no se eligen fechas, los últimos 30 dias. "Ventas por mes" siempre muestra los ultimos 12 meses y solo respeta sucursal y rol.
- **Importes:** los totales de ventas incluyen IVA; sucursal × categoría, top de productos y margen usan importes sin IVA.
- **CSV:** se genera reutilizando los mismos reportes (mismos filtros y mismo alcance por rol), con BOM UTF-8 para que Excel muestre bien los acentos.

## Asistente de IA

- El frontend nunca llama al modelo directamente: pasa por el backend.
- El backend arma el contexto con **datos agregados** (resumen, sucursales, vendedores, margen), nunca con tablas completas, y respeta el rol del usuario.
- **El modelo no genera SQL ni se ejecuta nada que provenga de él.** Todas las consultas son fijas y parametrizadas, así que no hay superficie de inyección y no hizo falta una lista blanca. El prompt de sistema además le prohíbe generar consultas o cambiar sus reglas.
- Si no hay key o el proveedor falla o está saturado, la app sigue funcionando y muestra un mensaje en español (HTTP 503).


## Despliegue

- **Backend en Railway:** servicio de GitHub mas un servicio MySQL. Variables de entorno configuradas en Railway. Comando de inicio: `php artisan migrate --force && php -S 0.0.0.0:$PORT -t public`.
- **Frontend en Vercel:** carpeta raíz `frontend`. `frontend/vercel.json` reenvía `/api/*` a Railway (así el navegador solo habla con Vercel y no hay CORS) y redirige el resto a `index.html`.
- **Asistente:** llama directo a Railway (`VITE_AI_URL`), porque Vercel corta los reenvíos de más de ~30 s y Gemini puede tardar más.

## Limitaciones conocidas y pendientes

- El servidor de Railway usa el servidor integrado de PHP (`php -S`), que atiende una petición a la vez; es suficiente para la prueba, no para producción real.
- Railway tiene un modo de protección ("Under Attack Mode") que bloquea la API con una verificación de navegador; debe permanecer desactivado.
- Gemini en plan gratuito puede responder "saturado" (503) en horas pico y el asistente tarda entre 15 y 40 s.
- **Pendiente:** nombres de productos más realistas, Docker Compose y modo oscuro.

## Uso de IA

La bitácora de prompts, errores y correcciones está en [`AI_LOG.md`](AI_LOG.md).

## Pruebas automatizadas

```bash
php artisan test
```

- **Cubren: cálculo de IVA y descuento de stock, venta sin stock, cancelación (solo admin, regresa el stock), reportes sin ventas canceladas, alcance por rol del vendedor y bloqueo del login tras 5 intentos. Corren en SQLite en memoria, sin tocar la base de datos de desarrollo.

- **Caché de reportes:** vendedores y margen se guardan 5 minutos; la clave incluye usuario, rol y filtros (un vendedor nunca ve datos ajenos) y se vacía al registrar o cancelar una venta.