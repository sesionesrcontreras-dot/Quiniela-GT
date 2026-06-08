import Nav from "@/components/Nav";
import LoginForm from "@/components/LoginForm";
import { getViewer } from "@/lib/viewer";
import { redirect } from "next/navigation";

export default async function LoginPage() {
  const viewer = await getViewer();
  if (viewer) redirect(viewer.session.role === "ADMIN" ? "/admin" : "/inicio");
  return (
    <>
      <Nav />
      <main className="container-app max-w-md py-16">
        <h1 className="mb-6 text-center text-3xl font-extrabold">Ingresar</h1>
        <LoginForm />
      </main>
    </>
  );
}
