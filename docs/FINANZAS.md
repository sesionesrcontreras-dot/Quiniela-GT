# 📒 Control financiero interno — Quiniela GT

El mayor riesgo de un negocio que mueve dinero ajeno no es "vender poco": es
**perder el control del dinero** (descuadres, fraude, no saber cuánto es tuyo y
cuánto debes). Por eso el corazón del sistema es un **libro contable de partida
doble**, el mismo principio que usan los bancos.

---

## 1. Regla de oro: dinero en centavos, nunca decimales

Todo monto se guarda como **entero en centavos** (`Q50.00` → `5000`). Esto
elimina los errores de redondeo de los `float`. Ver `lib/money.ts`.

---

## 2. Partida doble: por qué no se puede "perder" dinero

Cada movimiento de dinero genera una **transacción** con ≥ 2 **asientos** cuya
suma da **cero** (lo que entra a un lado, sale de otro). Si no cuadra, se
**rechaza** automáticamente. Ver `lib/ledger.ts` → `postTransaction()`.

### Tipos de cuenta (plan de cuentas)

| Cuenta | Naturaleza | Significado |
|---|---|---|
| `CASH_BANK` | Activo | Efectivo recibido en agencias |
| `BANK_ACCOUNT` | Activo | Transferencias recibidas |
| `PAGGO_GATEWAY` | Activo | Fondos en el procesador de tarjeta |
| `USER_WALLET` | Pasivo | Saldo que le **debemos** a cada jugador |
| `POOL_ESCROW` | Pasivo | Pozo de cada quiniela (dinero de premios) |
| `PLATFORM_REVENUE` | Ingreso | **Comisión (rake) = tu ganancia** |
| `PAYMENT_FEES` | Gasto | Comisiones de Paggo / banco |
| `PROMO_BONUS` | Gasto | Créditos promocionales regalados |

### Ejemplo: un jugador deposita Q100 por transferencia

```
DEBE  BANK_ACCOUNT      Q100   (entró dinero real)
HABER USER_WALLET(Ana)  Q100   (ahora le debemos Q100 a Ana)
                        ----
suma:                   Q0  ✓
```

### Ejemplo: Ana se inscribe a una quiniela de Q50 (rake 12 %)

```
DEBE  USER_WALLET(Ana)        Q50    (le debemos Q50 menos)
HABER POOL_ESCROW             Q44    (al pozo)
HABER PLATFORM_REVENUE        Q6     (tu comisión)
                              ----
suma:                         Q0  ✓
```

> El saldo de una cuenta **no es un campo editable**: se **calcula** sumando sus
> asientos (`getBalance()`). Nadie puede "editar" un saldo a mano. Para
> corregir algo hay que registrar otro asiento (con tipo `ADJUSTMENT` y doble
> aprobación). Esto es lo que hace el sistema auditable.

---

## 3. La ecuación que SIEMPRE debe cumplirse

```
ACTIVOS  =  PASIVOS  +  PATRIMONIO
(dinero     (saldos de    (ingresos
 real)       jugadores      − gastos)
             + pozos)
```

El endpoint `GET /api/admin/finance` calcula esto en vivo y devuelve
`cuadre.diferencia`. **Debe ser siempre 0.** Si algún día no lo es, hay un
problema: se congelan pagos y se investiga.

Probado en `scripts/demo.ts` — cuadra a Q0.00 en cada paso del flujo.

---

## 4. Controles operativos (procesos, no solo código)

| Control | Cómo |
|---|---|
| **Confirmación de pagos manuales** | Solo un `ADMIN` confirma transferencias/efectivo; queda registrado quién (`confirmedById`). |
| **Segregación de funciones** | Quien carga resultados ≠ quien maneja finanzas (roles `ADMIN` vs `FINANCE`). |
| **Conciliación diaria** | Comparar saldo real de banco/Paggo contra `activos` del reporte. Deben coincidir. |
| **Doble aprobación** | Ajustes manuales (`ADJUSTMENT`) y retiros grandes requieren 2 personas. |
| **Auditoría** | Cada acción sensible queda en `AuditLog` (quién, qué, cuándo, IP). |
| **Reserva de premios** | El pozo (`POOL_ESCROW`) está separado de tu ingreso (`PLATFORM_REVENUE`): nunca gastas el dinero de los premios. |
| **Cierre por quiniela** | Cada quiniela liquida su propio pozo; el reparto exige que premios == pozo. |

---

## 5. Reportes que tendrás

Con el ledger ya puedes generar (algunos ya implementados, otros son consultas directas):

- **Ganancia (rake) por período** → saldo de `PLATFORM_REVENUE`.
- **Pasivo total con jugadores** → suma de `USER_WALLET` (cuánto dinero ajeno custodias).
- **Dinero comprometido en pozos activos** → suma de `POOL_ESCROW`.
- **Margen por quiniela** → rake recaudado vs participantes.
- **Comisiones pagadas a Paggo** → saldo de `PAYMENT_FEES`.
- **Flujo de caja por método de pago** → `CASH_BANK` / `BANK_ACCOUNT` / `PAGGO_GATEWAY`.

---

## 6. Flujo completo del dinero (resumen)

```
1. Jugador recarga saldo        → Payment (PENDING)
2. Admin/Paggo confirma         → recordDeposit()   → entra a USER_WALLET
3. Jugador se inscribe          → chargeEntryFee()  → reparte a ESCROW + REVENUE
4. Admin carga resultados       → recalcPoolPoints()
5. Admin liquida la quiniela    → settlePool()      → ESCROW se reparte a ganadores
6. Jugador retira (futuro)      → WITHDRAWAL        → sale de USER_WALLET
```

Cada paso es una transacción de partida doble, atómica y auditable.
