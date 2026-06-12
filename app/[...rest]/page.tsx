import { redirect } from "next/navigation";

// Cualquier ruta inexistente → al inicio (sin 404).
export default function CatchAll() {
  redirect("/");
}
