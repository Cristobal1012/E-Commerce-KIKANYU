import { brandConfig } from "@config/brand.config";

const uiText = {
  eyebrow: "Tienda en preparación",
  title: "Esencias aromáticas para comprar online",
  description:
    "Base técnica lista para conectar catálogo, carrito y checkout en las siguientes fases.",
  primaryAction: "Ver catálogo pronto",
  secondaryAction: "Retiro y despacho por configurar",
  setupTitle: "Pendiente antes del lanzamiento",
  setupItems: [
    "TODO: cargar identidad visual final",
    "TODO: cargar catálogo real desde Medusa Admin",
    "TODO: confirmar dirección y horario de retiro",
  ],
};

export default function Home() {
  return (
    <main className="min-h-screen bg-background text-foreground">
      <section className="mx-auto flex min-h-screen w-full max-w-6xl flex-col justify-between px-5 py-6 sm:px-8 lg:px-10">
        <header className="flex items-center justify-between gap-4 border-b border-border pb-4">
          <p className="font-serif text-xl text-primary">{brandConfig.storeName}</p>
          <p className="text-sm text-muted">{brandConfig.contact.instagram}</p>
        </header>

        <div className="grid gap-10 py-12 md:grid-cols-[1.1fr_0.9fr] md:items-center">
          <div className="max-w-2xl">
            <p className="mb-4 text-sm font-medium uppercase tracking-[0.12em] text-primary">
              {uiText.eyebrow}
            </p>
            <h1 className="font-serif text-4xl leading-tight sm:text-5xl">
              {uiText.title}
            </h1>
            <p className="mt-5 max-w-xl text-base leading-7 text-muted sm:text-lg">
              {uiText.description}
            </p>

            <div className="mt-8 flex flex-col gap-3 sm:flex-row">
              <button className="h-12 rounded-md bg-primary px-5 text-sm font-semibold text-primary-foreground">
                {uiText.primaryAction}
              </button>
              <button className="h-12 rounded-md border border-border px-5 text-sm font-semibold text-foreground">
                {uiText.secondaryAction}
              </button>
            </div>
          </div>

          <aside className="rounded-lg border border-border bg-surface p-5 shadow-sm">
            <h2 className="text-base font-semibold">{uiText.setupTitle}</h2>
            <ul className="mt-4 space-y-3 text-sm leading-6 text-muted">
              {uiText.setupItems.map((item) => (
                <li key={item}>{item}</li>
              ))}
            </ul>
          </aside>
        </div>

        <footer className="grid gap-2 border-t border-border pt-4 text-sm text-muted sm:grid-cols-3">
          <p>{brandConfig.contact.email}</p>
          <p>{brandConfig.pickup.address}</p>
          <p>{brandConfig.pickup.schedule}</p>
        </footer>
      </section>
    </main>
  );
}
