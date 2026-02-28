export function DailySetupPage(props: { onComplete: () => void }) {
  return (
    <div className="min-h-screen p-10">
      <h1 className="text-2xl font-semibold">Daily setup</h1>
      <p className="mt-4 text-white/70">
        Start today&apos;s session to enable monitoring.
      </p>
      <button
        type="button"
        className="mt-8 rounded bg-white/15 px-4 py-2 text-sm hover:bg-white/20"
        onClick={props.onComplete}
      >
        Start day
      </button>
    </div>
  )
}

