# 🚀 Despliegue a Netlify — Quiniela GT

> Importante: **SQLite no funciona en Netlify** (el disco es efímero/solo lectura).
> Por eso el proyecto ya está configurado para **PostgreSQL**. Necesitas una base
> de datos Postgres en la nube (Neon o Supabase, ambas con plan gratis).

Hay 2 cosas que solo TÚ puedes hacer (requieren tus cuentas):
1. Crear la base de datos Postgres y copiar su URL.
2. Iniciar sesión en Netlify (es por navegador).

Todo lo demás (código, build, configuración) ya está listo.

---

## Paso 1 — Crear la base de datos (Neon, ~2 min)

1. Entra a https://neon.tech y crea una cuenta (gratis).
2. Crea un proyecto. Copia el **connection string** (Pooled connection).
   Debe terminar en `?sslmode=require`.
3. Pégalo en tu archivo `.env` local en `DATABASE_URL`.

## Paso 2 — Inicializar la base de datos (desde tu PC)

```bash
# genera un secreto fuerte para las sesiones y ponlo en .env (AUTH_SECRET)
node -e "console.log(require('crypto').randomBytes(48).toString('base64'))"

npm run db:push     # crea las tablas en Neon
npm run db:seed     # carga torneo + 27 partidos reales + quinielas demo
npm run dev         # verifica en http://localhost:3000 que conecta
```

## Paso 3 — Subir el código a GitHub (recomendado)

```bash
git init
git add .
git commit -m "Quiniela GT - listo para produccion"
# crea el repo en GitHub y luego:
git remote add origin https://github.com/TU_USUARIO/quiniela-gt.git
git branch -M main
git push -u origin main
```

## Paso 4 — Desplegar en Netlify

### Opción A — Conectar el repo de GitHub (más fácil, auto-deploy)
1. https://app.netlify.com → **Add new site → Import an existing project**.
2. Elige tu repo. Netlify detecta Next.js y `netlify.toml` automáticamente.
3. En **Site settings → Environment variables**, agrega:
   - `DATABASE_URL` = (tu URL de Neon)
   - `AUTH_SECRET` = (el secreto que generaste)
   - `NEXT_PUBLIC_APP_URL` = `https://TU-SITIO.netlify.app`
4. **Deploy**. Cada `git push` vuelve a desplegar solo.

### Opción B — Por línea de comandos (CLI)
```bash
netlify login                       # abre el navegador para autenticarte
netlify init                        # crea/enlaza el sitio
netlify env:set DATABASE_URL "postgresql://...?sslmode=require"
netlify env:set AUTH_SECRET "TU_SECRETO"
netlify env:set NEXT_PUBLIC_APP_URL "https://TU-SITIO.netlify.app"
netlify deploy --build --prod       # despliega a producción
```

## Paso 5 — Después del primer deploy
- Copia la URL real del sitio y actualiza `NEXT_PUBLIC_APP_URL` (y vuelve a desplegar).
- Entra como admin (`admin@quiniela.gt` / `Password123`) y **cámbiale la contraseña**.
- Prueba: registro → recarga → admin confirma → participar → predecir.

---

## ✅ Checklist de producción (importante)
- [ ] Cambiar la contraseña del admin demo (o borrar usuarios demo).
- [ ] `AUTH_SECRET` único y fuerte (no el de ejemplo).
- [ ] Rate limiting distribuido (Upstash Redis) — el actual es en memoria y se
      reinicia por instancia serverless. Ver [SEGURIDAD.md](SEGURIDAD.md).
- [ ] Webhook firmado de Paggo para acreditar tarjetas (ver `PAGGO_WEBHOOK_SECRET`).
- [ ] Backups automáticos en Neon (Point-in-Time Recovery).
- [ ] Cloudflare delante (WAF / anti-DDoS) — opcional pero recomendado.
- [ ] Antes de cobrar dinero real: licencia de juego/sorteos + KYC/AML + T&C +18.

## Notas técnicas
- El runtime serverless reinicia el limitador en memoria entre invocaciones; para
  límites estrictos usa un store externo (Redis).
- Prisma incluye los binarios `rhel-openssl-*` (ver `schema.prisma`) necesarios
  para AWS Lambda donde corren las funciones de Netlify.
- Si el deploy falla con "query engine not found", agrega el target que indique
  el log a `binaryTargets` en `prisma/schema.prisma` y vuelve a desplegar.
