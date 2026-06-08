# ⚽ Quiniela GT — Plataforma de quinielas del Mundial

Plataforma para crear y jugar quinielas (pools de predicciones) del Mundial de
Fútbol en Guatemala. Cobros por **transferencia bancaria**, **tarjeta (Paggo)**
y **efectivo en agencias**. Construida con foco en **seguridad** y en un
**control financiero auditable** (contabilidad de partida doble).

---

## 🎯 Modelo de negocio (de dónde sale el margen)

Inspirado en plataformas exitosas del rubro:

| Referencia real | Qué tomamos |
|---|---|
| **Splash Sports / RunYourPool / OfficeFootballPool** (EE.UU.) | "Pool hosting" con **comisión (rake)** automática sobre el pozo |
| **Superbru** (predictor mundial global) | Quinielas públicas gratis para **captar** usuarios → upsell |
| **Biwenger / Comunio** | Ligas privadas, gamificación y **retención** |

**2 capas de ingresos:**

1. **Rake (comisión) 10–15 %** sobre cada quiniela de paga — el motor principal.
2. **Entradas múltiples + quinielas privadas entre amigos** — cada jugador puede comprar varios boletos y armar su grupo privado por código de invitación.

> Ejemplo real (probado en `scripts/demo.ts`): 2 jugadores × Q50, rake 12 % →
> pozo Q88 repartido a ganadores y **Q12 de ganancia** para la plataforma, con
> la contabilidad cuadrando a Q0.00.

---

## 🚀 Cómo correr el proyecto (local, sin instalar base de datos)

```bash
npm install            # instala dependencias (ya hecho)
npm run db:reset       # crea la base SQLite y carga datos demo
npm run dev            # arranca en http://localhost:3000
```

Usuarios demo (contraseña `Password123`):

| Rol | Correo |
|---|---|
| Admin | `admin@quiniela.gt` |
| Jugador | `ana@demo.gt` |
| Jugador | `luis@demo.gt` |

Probar el flujo completo de dinero + contabilidad:

```bash
npx tsx scripts/demo.ts
```

Inspeccionar la base de datos visualmente:

```bash
npm run db:studio
```

---

## 🧱 Arquitectura

```
Frontend / Backend : Next.js 14 (App Router) + TypeScript
Estilos            : TailwindCSS
Base de datos      : SQLite (local)  →  PostgreSQL (producción)
ORM                : Prisma
Auth               : sesiones propias (bcryptjs + JWT en cookie httpOnly)
Validación         : Zod (toda entrada del usuario)
Pagos              : Transferencia, Efectivo (verificación manual) + Paggo (tarjeta)
```

### Estructura

```
app/
  page.tsx                         Landing (sitio público)
  api/
    auth/{register,login,logout}   Autenticación
    pools/                         Crear / listar quinielas
    pools/[id]/join                Inscribir boleto (cobra de la billetera)
    predictions/                   Guardar predicciones
    payments/                      Crear recarga de saldo (depósito)
    admin/payments/confirm         Admin confirma pagos manuales
    admin/matches/[id]/result      Admin carga resultados
    admin/pools/[id]/settle        Admin liquida y reparte el pozo
    admin/finance                  Reporte financiero consolidado
lib/
  ledger.ts        ★ Contabilidad de partida doble (núcleo financiero)
  settlement.ts    Cálculo de puntajes y reparto de premios
  scoring.ts       Motor de puntos configurable
  money.ts         Manejo de dinero en centavos (sin floats)
  auth.ts          Hash de contraseñas + sesiones
  validation.ts    Esquemas Zod
  security.ts      Rate limiting, manejo de errores, auditoría
  enums.ts         Constantes tipadas (estados)
prisma/
  schema.prisma    Modelo de datos
  seed.ts          Datos demo
scripts/
  demo.ts          Prueba E2E del flujo de dinero
docs/
  SEGURIDAD.md     Cómo está protegido el sitio
  FINANZAS.md      Cómo se controlan las finanzas internas
```

---

## 📚 Documentación clave

- **[docs/SEGURIDAD.md](docs/SEGURIDAD.md)** — modelo de seguridad y checklist anti-hackeo.
- **[docs/FINANZAS.md](docs/FINANZAS.md)** — control financiero, conciliación y reportes.

---

## ⚖️ Antes de operar comercialmente

Cobrar y repartir dinero por quinielas puede considerarse **juego regulado**.
Antes de lanzar al público:

1. Constituir la empresa y **consultar a un abogado** sobre licencias de juego/sorteos en Guatemala.
2. Activar **KYC** (verificación de identidad) y reglas **AML** (antilavado), sobre todo por el efectivo en agencias.
3. Publicar **Términos y Condiciones**, política de privacidad y restricción **+18**.
4. Definir política de devoluciones y de resolución de disputas.

El sistema ya está diseñado con los ganchos para esto (`kycStatus`, `dateOfBirth`,
auditoría, estados de pago), de modo que cumplir sea cuestión de activarlos.
