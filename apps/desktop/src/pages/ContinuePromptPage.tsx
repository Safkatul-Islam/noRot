export function ContinuePromptPage(props: { onContinue: () => void }) {
  return (
    <div className="min-h-screen p-10">
      <h1 className="text-2xl font-semibold">Monitoring paused</h1>
      <p className="mt-4 text-white/70">
        Monitoring is disabled. Enable it to continue scoring and interventions.
      </p>
      <button
        type="button"
        className="mt-8 rounded bg-white/15 px-4 py-2 text-sm hover:bg-white/20"
        onClick={props.onContinue}
      >
        Enable monitoring
      </button>
    </div>
  )
}

