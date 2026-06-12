import Link from "next/link";

export default function NotFound() {
  return (
    <div className="flex min-h-[60vh] flex-col items-center justify-center px-6 text-center">
      <h1 className="font-display text-6xl leading-none text-neon">404</h1>
      <p className="mt-3 text-sm text-muted-foreground">No encontramos esta página.</p>
      <Link
        href="/"
        className="font-display mt-6 rounded-xl bg-neon px-5 py-3 text-black"
      >
        Volver al inicio
      </Link>
    </div>
  );
}
