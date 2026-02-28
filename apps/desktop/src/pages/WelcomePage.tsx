export function WelcomePage(props: { onContinue: () => void }) {
  return (
    <div className="min-h-screen p-10">
      <h1 className="text-3xl font-semibold">noRot</h1>
      <p className="mt-4 text-white/70">
        Lightweight focus monitoring and interventions. This build prioritizes behavior over pixel-perfect UI.
      </p>
      <button
        type="button"
        className="mt-8 rounded bg-white/15 px-4 py-2 text-sm hover:bg-white/20"
        onClick={props.onContinue}
      >
        Get started
      </button>
    </div>
  )
}

