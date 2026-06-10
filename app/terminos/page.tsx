import Nav from "@/components/Nav";
import Link from "next/link";

export const metadata = {
  title: "Términos y Condiciones — Quiniela GT",
  description: "Términos y condiciones de uso de la plataforma Quiniela GT.",
};

const VIGENCIA = "9 de junio de 2026";

function S({ n, title, children }: { n: number; title: string; children: React.ReactNode }) {
  return (
    <section className="mt-8">
      <h2 className="text-xl font-bold">{n}. {title}</h2>
      <div className="mt-2 space-y-2 text-gray-300">{children}</div>
    </section>
  );
}

export default function TerminosPage() {
  return (
    <>
      <Nav />
      <main className="container-app max-w-3xl py-12">
        <h1 className="text-3xl font-extrabold">Términos y Condiciones</h1>
        <p className="mt-2 text-sm text-gray-400">Vigentes desde el {VIGENCIA} · Quiniela GT, Guatemala</p>

        <p className="mt-6 text-gray-300">
          Al crear una cuenta o usar Quiniela GT (el “Servicio”) aceptas estos
          Términos y Condiciones en su totalidad. Si no estás de acuerdo, no
          uses el Servicio.
        </p>

        <S n={1} title="El Servicio">
          <p>
            Quiniela GT es una plataforma en línea de quinielas deportivas de
            predicción: los participantes pagan una cuota de entrada, predicen
            marcadores de partidos y los mejores puntajes reciben premios
            provenientes del pozo común formado por las cuotas. No somos una
            casa de apuestas de cuotas (odds): los premios dependen únicamente
            del desempeño de tus predicciones frente a las de otros
            participantes.
          </p>
        </S>

        <S n={2} title="Mayoría de edad (+18) y elegibilidad">
          <p>
            El Servicio es exclusivo para personas mayores de 18 años con
            capacidad legal. Al registrarte declaras bajo juramento ser mayor
            de edad. Podemos solicitar verificación de identidad (KYC) en
            cualquier momento y suspender cuentas que no la completen o que
            resulten pertenecer a menores.
          </p>
        </S>

        <S n={3} title="Cuenta y seguridad">
          <p>
            Eres responsable de la confidencialidad de tu contraseña y de toda
            actividad en tu cuenta. Solo se permite una cuenta por persona.
            Está prohibido prestar, vender o compartir cuentas. Notifícanos de
            inmediato cualquier acceso no autorizado.
          </p>
        </S>

        <S n={4} title="Depósitos, billetera y pagos">
          <p>
            Las cuotas se pagan desde tu billetera interna, que se recarga por
            transferencia bancaria, tarjeta (a través del procesador de pagos
            Paggo) o efectivo en agencias bancarias. El saldo se acredita
            cuando el pago queda verificado. Tu saldo no genera intereses y no
            es una cuenta bancaria. Todo movimiento queda registrado en un
            libro contable auditable.
          </p>
          <p>
            Los pagos con tarjeta son procesados por Paggo; no almacenamos los
            datos de tu tarjeta en nuestros servidores.
          </p>
        </S>

        <S n={5} title="Cuotas, comisión y premios">
          <p>
            Cada quiniela indica su cuota de entrada, el número máximo de
            boletos por persona, la comisión de la plataforma (rake) y el
            reparto de premios <em>antes</em> de que pagues. La comisión se
            descuenta de cada cuota y el resto forma el pozo. En caso de empate
            en puntos, el premio de las posiciones empatadas se divide en
            partes iguales. Los premios se acreditan a tu billetera al
            liquidarse la quiniela.
          </p>
        </S>

        <S n={6} title="Predicciones y cierre">
          <p>
            Las predicciones pueden crearse o modificarse únicamente antes del
            inicio de cada partido. Al iniciar el partido, la predicción queda
            bloqueada. En los retos de un solo partido, las inscripciones
            cierran al inicio del partido correspondiente. Los resultados
            oficiales utilizados son los del marcador al final del tiempo
            reglamentario (90 minutos más descuento), salvo que la quiniela
            indique otra cosa.
          </p>
        </S>

        <S n={7} title="Partidos suspendidos o cancelados">
          <p>
            Si un partido se suspende o cancela, ese partido no otorga puntos.
            Si una quiniela completa se cancela antes de iniciar, las cuotas se
            devuelven a la billetera de los participantes.
          </p>
        </S>

        <S n={8} title="Retiros">
          <p>
            Puedes solicitar el retiro de tu saldo disponible (incluyendo
            premios) por transferencia bancaria a una cuenta a tu nombre.
            Podemos requerir verificación de identidad antes de procesar un
            retiro, como medida antifraude y de prevención de lavado de dinero.
            Los retiros se procesan en días hábiles.
          </p>
        </S>

        <S n={9} title="Conducta prohibida">
          <p>
            Está prohibido: usar múltiples cuentas, automatizar el uso del
            Servicio, explotar errores del sistema, usar fondos de origen
            ilícito, suplantar identidades y cualquier forma de fraude. Las
            cuentas involucradas pueden ser suspendidas y sus fondos retenidos
            mientras se investiga, y los hechos pueden denunciarse a las
            autoridades.
          </p>
        </S>

        <S n={10} title="Juego responsable">
          <p>
            Participa solo con dinero que puedas permitirte usar en
            entretenimiento. Las quinielas no son una inversión ni una fuente
            de ingresos. Si sientes que el juego te está causando problemas,
            suspende tu participación y busca apoyo; puedes solicitarnos el
            bloqueo voluntario de tu cuenta escribiéndonos.
          </p>
        </S>

        <S n={11} title="Privacidad y datos personales">
          <p>
            Recopilamos los datos necesarios para operar el Servicio: nombre,
            correo, teléfono opcional, registros de pagos y predicciones, y
            datos de verificación de identidad cuando aplique. No vendemos tus
            datos. Solo los compartimos con procesadores de pago (Paggo,
            bancos) para ejecutar tus transacciones, o cuando la ley lo exija.
            Tus contraseñas se almacenan cifradas y las comunicaciones viajan
            sobre HTTPS/TLS.
          </p>
        </S>

        <S n={12} title="Disponibilidad y limitación de responsabilidad">
          <p>
            El Servicio se presta “tal cual”. Procuramos disponibilidad
            continua pero no garantizamos ausencia de interrupciones. Nuestra
            responsabilidad total frente a un usuario se limita al saldo de su
            billetera. No respondemos por fallas de terceros (bancos,
            procesadores, proveedores de internet).
          </p>
        </S>

        <S n={13} title="Modificaciones">
          <p>
            Podemos actualizar estos términos publicando la nueva versión en
            esta página con su fecha de vigencia. Los cambios no afectan
            quinielas ya pagadas antes del cambio.
          </p>
        </S>

        <S n={14} title="Ley aplicable y contacto">
          <p>
            Estos términos se rigen por las leyes de la República de Guatemala
            y cualquier controversia se someterá a los tribunales competentes
            de la Ciudad de Guatemala. Contacto:{" "}
            <a className="font-semibold text-gold-300" href="mailto:sesiones.rcontreras@icloud.com">
              sesiones.rcontreras@icloud.com
            </a>.
          </p>
        </S>

        <div className="mt-12 rounded-xl border border-brand-600/30 bg-brand-500/10 p-4 text-sm text-brand-200">
          +18. Juega con responsabilidad. Al registrarte confirmas que leíste y
          aceptas estos Términos y Condiciones.
        </div>

        <p className="mt-8">
          <Link href="/" className="text-sm font-semibold text-gold-300">← Volver al inicio</Link>
        </p>
      </main>
    </>
  );
}
