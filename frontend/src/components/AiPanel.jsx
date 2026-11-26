import { useState } from 'react'
import { api } from '../api'

const field =
  'w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 ' +
  'focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand/30'

function Rich({ text }) {
  const clean = text.replace(/^\* /gm, '• ')
  return (
    <p className="whitespace-pre-wrap text-sm leading-relaxed text-gray-900">
      {clean.split('**').map((part, i) => (i % 2 ? <strong key={i}>{part}</strong> : part))}
    </p>
  )
}

export default function AiPanel({ filters }) {
  const [question, setQuestion] = useState('')
  const [answer, setAnswer] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  // Solo se mandan los filtros que tienen valor
  const base = Object.fromEntries(Object.entries(filters).filter(([, v]) => v))

  async function run(path, body) {
    setLoading(true)
    setError('')
    setAnswer('')
    try {
      const data = await api(path, { method: 'POST', body })
      setAnswer(data.answer)
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  function ask(e) {
    e.preventDefault()
    if (question.trim().length < 5) {
      setError('Escribe una pregunta de al menos 5 caracteres.')
      return
    }
    run('/ai/ask', { ...base, question: question.trim() })
  }

  return (
    <section className="mt-4 rounded-xl bg-white p-5 shadow-sm" aria-labelledby="ai-title">
      <h2 id="ai-title" className="text-lg font-semibold text-gray-900">Asistente de IA</h2>
      <p className="text-sm text-gray-600">
        Responde con las cifras del periodo y la sucursal que elegiste arriba.
      </p>

      <form onSubmit={ask} className="mt-4 flex flex-col gap-2 sm:flex-row">
        <div className="flex-1">
          <label htmlFor="ai-question" className="sr-only">Pregunta para el asistente</label>
          <input
            id="ai-question"
            value={question}
            onChange={(e) => setQuestion(e.target.value)}
            maxLength={500}
            placeholder="¿Qué sucursal vendió menos y por qué podría ser?"
            className={field}
          />
        </div>
        <button
          type="submit"
          disabled={loading}
          className="rounded-lg bg-brand px-4 py-2 text-sm font-semibold text-white hover:bg-brand-dark disabled:opacity-60"
        >
          Preguntar
        </button>
        <button
          type="button"
          disabled={loading}
          onClick={() => run('/ai/summary', base)}
          className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-900 hover:bg-gray-100 disabled:opacity-60"
        >
          Resumen ejecutivo
        </button>
      </form>

      <div className="mt-4" aria-live="polite">
        {loading && (
          <div className="flex items-center gap-2 text-sm text-gray-700">
            <span className="inline-block h-4 w-4 animate-spin rounded-full border-2 border-brand border-t-transparent" aria-hidden="true" />
            El asistente está analizando los datos. Puede tardar hasta un minuto…
          </div>
        )}
        {error && (
          <div role="alert" className="rounded-lg border border-red-600 bg-red-50 px-3 py-2 text-sm text-red-800">
            {error}
          </div>
        )}
        {answer && (
          <div className="rounded-lg bg-gray-50 p-4">
            <Rich text={answer} />
          </div>
        )}
      </div>
    </section>
  )
}