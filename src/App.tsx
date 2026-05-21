import { useGeneration } from './hooks/useGeneration'
import { GeneratorForm } from './components/GeneratorForm'
import { ResultsPanel } from './components/ResultsPanel'

function App() {
  const { state, generate, reset } = useGeneration()

  const disabled = state.status === 'loading'
  const error = state.status === 'error' ? state.message : undefined

  return (
    <div className="mx-auto min-h-screen max-w-4xl p-6">
      <h1 className="mb-8 text-center text-3xl font-bold">Content Generator</h1>
      <GeneratorForm
        onGenerate={generate}
        disabled={disabled}
        error={error}
        onReset={reset}
      />
      {state.status === 'success' && (
        <div className="mt-8">
          <ResultsPanel result={state.data} />
        </div>
      )}
    </div>
  )
}

export default App
