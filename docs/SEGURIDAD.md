# 🛡️ Seguridad — Quiniela GT

> "Que no pueda ser hackeado" no existe como garantía absoluta para ningún
> sistema. Lo que sí existe es **reducir la superficie de ataque al mínimo** y
> tener **defensa en capas**. Esto es lo que ya está implementado y lo que falta
> activar antes de producción.

---

## ✅ Ya implementado en el código

| Amenaza | Defensa | Dónde |
|---|---|---|
| Robo de contraseñas | Hash **bcrypt** (12 rondas). Nunca se guardan en texto plano. | `lib/auth.ts` |
| Robo de sesión (XSS) | Cookie **httpOnly** + Secure + SameSite=lax. El JS del navegador no puede leerla. | `lib/auth.ts` |
| Fuerza bruta de login | **Rate limiting** por IP (10 intentos/min) | `lib/security.ts`, `api/auth/login` |
| Enumeración de usuarios | Mensaje genérico "credenciales inválidas" | `api/auth/login` |
| Inyección / datos basura | **Validación Zod** de toda entrada antes de tocar la DB | `lib/validation.ts` |
| Inyección SQL | **Prisma** (consultas parametrizadas, sin SQL crudo) | todo el backend |
| Montos negativos / fraude de saldo | Validación de montos + invariante de partida doble | `lib/ledger.ts` |
| Gasto sin fondos | Verificación de saldo antes de cobrar | `chargeEntryFee` |
| Acceso no autorizado | `requireUser()` / `requireAdmin()` en cada ruta sensible | `lib/auth.ts` |
| Clickjacking | Cabecera `X-Frame-Options: DENY` + CSP `frame-ancestors 'none'` | `next.config.mjs` |
| Sniffing de tipo MIME | `X-Content-Type-Options: nosniff` | `next.config.mjs` |
| Forzar HTTP | `Strict-Transport-Security` (HSTS) | `next.config.mjs` |
| Fuga de info | `poweredByHeader: false`, errores genéricos en producción | `next.config.mjs`, `lib/security.ts` |
| Repudio / "yo no fui" | **AuditLog** inmutable de cada acción sensible | `lib/security.ts` (`audit`) |

---

## 🔐 Principios de diseño aplicados

1. **El dinero nunca se confía al cliente.** El frontend jamás decide saldos ni
   premios; todo se calcula en el servidor contra el ledger.
2. **Acreditar solo dinero verificado.** Un depósito por transferencia/efectivo
   NO suma saldo hasta que un admin lo confirma (`api/admin/payments/confirm`).
   Con Paggo, hasta recibir el **webhook firmado**.
3. **Separación de roles.** `PLAYER`, `ADMIN`, `FINANCE`. Las rutas de
   resultados, confirmación de pagos y liquidación exigen `ADMIN`.
4. **Todo deja rastro.** Quién confirmó cada pago (`confirmedById`), quién cargó
   cada resultado, cada inicio de sesión → tabla `AuditLog`.

---

## 🚧 Pendiente de activar antes de producción (checklist)

- [ ] **HTTPS obligatorio** (Vercel lo da gratis) y `secure` cookies (ya activado en prod).
- [ ] **Rate limiting distribuido** con Upstash Redis (el actual es en memoria, 1 instancia).
- [ ] **Verificación de webhook de Paggo** con HMAC usando `PAGGO_WEBHOOK_SECRET`.
- [ ] **2FA** para cuentas ADMIN (TOTP).
- [ ] **CSRF tokens** en formularios sensibles (además de SameSite).
- [ ] **Verificación de correo** al registrarse.
- [ ] **KYC** real (documento + selfie) vía proveedor para retiros grandes.
- [ ] **Límites de depósito/apuesta** (juego responsable + AML).
- [ ] **Backups automáticos** cifrados de la base de datos.
- [ ] **Secret management** (variables en el proveedor, nunca en el repo).
- [ ] **Monitoreo y alertas** (Sentry para errores, alertas de descuadre contable).
- [ ] **Pentest** externo antes del lanzamiento público.
- [ ] **WAF / protección DDoS** (Cloudflare delante del sitio).
- [ ] **Doble aprobación** para ajustes manuales del ledger (`ADJUSTMENT`).

---

## 🧪 Cómo reportar/probar

- Errores de seguridad: definir un correo `security@tudominio` y proceso de disclosure.
- Antes de cada release: `npm run build` + revisar dependencias con `npm audit`.
- Regla de oro: **el ledger siempre debe cuadrar a cero** (ver `api/admin/finance`
  → `cuadre.cuadra === true`). Si alguna vez no cuadra, congelar pagos e investigar.
