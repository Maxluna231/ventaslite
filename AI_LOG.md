# Bitácora de IA

Herramienta principal: Claude (chat), usado como apoyo durante todo el desarrollo. El asistente dentro de la aplicación usa Gemini (Google).

| # | Herramienta | Qué pedí (resumen) | Qué me dio | Qué estaba mal o cambié | Por qué |
|---|---|---|---|---|---|
| 1 | Claude | Instalar Laravel y MySQL en Mac | Homebrew instaló MySQL 26.10 sobre una carpeta de datos creada con la 9.3 y no arrancaba | Moví la carpeta de datos vieja, instalé `mysql@8.4` y creé la base desde cero | La prueba pide MySQL 8, y MySQL no permite saltar entre versiones tan distintas |
| 2 | Claude | Rutas de login con Sanctum | Las rutas quedaron en `routes/web.php` y `/api/login` daba 404 | Las moví a `routes/api.php` | `web.php` usa sesión y CSRF; `api.php` agrega el prefijo `/api` y no usa sesión |
| 3 | Claude | Seeders con 2,500 ventas | `DatabaseSeeder` por defecto chocaba con `test@example.com` y los seeders generados estaban vacíos | Reemplacé `DatabaseSeeder` y pegué el código en cada seeder | Sin eso, el seed fallaba o no creaba datos |
| 4 | Claude | Nombres en español con Faker | Usaba el locale `es_MX`, que Faker no incluye; caía en inglés sin avisar | Revisé los locales disponibles y usé `es_ES` | Evitar nombres en inglés en los reportes |
| 5 | Claude | Reporte sucursal × categoría | Una sucursal sin ventas en el periodo desaparecía de la tabla, y el asistente concluía que otra era la más baja | Partí de todas las sucursales y categorías y rellené con 0 | La IA dio una conclusión que parecía razonable; la verifiqué contra SQL y encontré el bug de datos |
| 6 | Claude | Asistente de IA con Gemini | Modelos que ya estaban retirados para cuentas nuevas (`2.0-flash`, `2.5-flash-lite`); `3.5-flash-lite` daba timeout | Leí el cuerpo del error de la API, listé los modelos de mi key y probé la llamada directa hasta encontrar uno vigente (`gemini-3.5-flash`) | Los nombres de modelos cambian y la IA no lo sabía |
| 7 | Claude | Llamada al LLM desde el backend | PHP cortaba la petición a los 30 s (`max_execution_time`) antes de que el `catch` actuara | Agregué `set_time_limit` y un `catch` para `ConnectionException` | El usuario debía ver un mensaje claro y no un error fatal |
| 8 | Claude | Asistente de IA en producción | Vercel corta los reenvíos de más de ~30 s, y Gemini a veces responde 503 (saturado) | La IA llama directo a Railway (`VITE_AI_URL`) y el error muestra un mensaje claro | Cumplir "si la API falla, la app sigue funcionando" |

