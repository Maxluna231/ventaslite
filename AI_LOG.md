# Bitacora de IA

Herramienta principal: Claude (chat), usado como apoyo durante todo el desarrollo. El asistente dentro de la aplicacion usa Gemini (Google).

| # | Herramienta | Qué pedi (resumen) | Que me dio | Que estaba mal o cambie | Por que |
|---|---|---|---|---|---|
| 1 | Claude | Instalar Laravel y MySQL en Mac | Homebrew instaló MySQL 26.10 sobre una carpeta de datos creada con la 9.3 y no arrancaba | Movi la carpeta de datos vieja, instale `mysql@8.4` y cree la base desde cero | La prueba pide MySQL 8, y MySQL no permite saltar entre versiones tan distintas |
| 2 | Claude | Rutas de login con Sanctum | Las rutas quedaron en `routes/web.php` y `/api/login` daba 404 | Las movi a `routes/api.php` | `web.php` usa sesión y CSRF; `api.php` agrega el prefijo `/api` y no usa sesion |
| 3 | Claude | Seeders con 2,500 ventas | `DatabaseSeeder` por defecto chocaba con `test@example.com` y los seeders generados estaban vacíos | Reemplace `DatabaseSeeder` y pegué el codigo en cada seeder | Sin eso, el seed fallaba o no creaba datos |
| 4 | Claude | Nombres en español con Faker | Usaba el locale `es_MX`, que Faker no incluye; caia en ingles sin avisar | Revise los locales disponibles y use `es_ES` | Evitar nombres en ingles en los reportes |
| 5 | Claude | Reporte sucursal × categoria | Una sucursal sin ventas en el periodo desaparecia de la tabla, y el asistente concluía que otra era la mas baja | Parti de todas las sucursales y categorias y rellene con 0 | La IA dio una conclusion que parecia razonable; la verifique contra SQL y encontre el bug de datos |
| 6 | Claude | Asistente de IA con Gemini | Modelos que ya estaban retirados para cuentas nuevas (`2.0-flash`, `2.5-flash-lite`); `3.5-flash-lite` daba timeout | Lei el cuerpo del error de la API, liste los modelos de mi key y probe la llamada directa hasta encontrar uno vigente (`gemini-3.5-flash`) | Los nombres de modelos cambian y la IA no lo sabía |
| 7 | Claude | Llamada al LLM desde el backend | PHP cortaba la peticion a los 30 s (`max_execution_time`) antes de que el `catch` actuara | Agregue `set_time_limit` y un `catch` para `ConnectionException` | El usuario debia ver un mensaje claro y no un error fatal |
| 8 | Claude | Asistente de IA en producción | Vercel corta los reenvios de más de ~30 s, y Gemini a veces responde 503 (saturado) | La IA llama directo a Railway (`VITE_AI_URL`) y el error muestra un mensaje claro | Cumplir "si la API falla, la app sigue funcionando" |

