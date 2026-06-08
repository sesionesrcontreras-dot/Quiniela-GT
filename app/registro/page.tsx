import Nav from "@/components/Nav";
import RegisterForm from "@/components/RegisterForm";
import { getViewer } from "@/lib/viewer";
import { redirect } from "next/navigation";

export default async function RegistroPage() {
  if (await getViewer()) redirect("/inicio"); // ya logueado
  return (
    <>
      <Nav />
      <main className="container-app max-w-md py-16">
        <h1 className="mb-6 text-center text-3xl font-extrabold">Crear cuenta</h1>
        <RegisterForm />
        <p className="mt-4 text-center text-xs text-gray-400">+18. Juega con responsabilidad.</p>
      </main>
    </>
  );
}
