import { useId, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { api } from '../api'
import { useAuth } from '../auth'

export default function Login() {
  const emailId = useId()
  const passwordId = useId()
  const navigate = useNavigate()
  const { login } = useAuth()

  const [showPassword, setShowPassword] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  async function submit(e) {
    e.preventDefault()
    const form = new FormData(e.currentTarget)
    const email = String(form.get('email')).trim()
    const password = String(form.get('password'))

    if (!email || !password) {
      setError('Escribe tu correo y tu contraseña.')
      return
    }

    setLoading(true)
    setError('')

    try {
      const data = await api('/login', { method: 'POST', body: { email, password } })
      login(data)
      navigate('/')
    } catch (err) {
      // 401 y 429 traen el mensaje del backend; sin status es un fallo de red
      setError(err.status ? err.message : 'No se pudo conectar con el servidor. Intenta de nuevo.')
    } finally {
      setLoading(false)
    }
  }

  const inputClass =
    'w-full rounded-lg border border-gray-300 bg-white px-3 py-2.5 text-gray-900 ' +
    'placeholder:text-gray-500 focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand/30'

  return (
    <main className="flex min-h-screen items-center justify-center bg-gray-100 px-4">
      <form onSubmit={submit} noValidate className="w-full max-w-sm rounded-xl bg-white p-6 shadow-sm sm:p-8">
        <p className="text-xs font-semibold uppercase tracking-wider text-brand">Bienvenido a VentasLite</p>
        <h1 className="mt-2 text-3xl font-semibold text-gray-900">Inicia sesión</h1>
        <p className="mt-2 text-sm text-gray-600">Ingresa tus datos para acceder a tu cuenta.</p>

        {error && (
          <div role="alert" className="mt-5 rounded-lg border border-red-600 bg-red-50 px-3 py-2 text-sm text-red-800">
            {error}
          </div>
        )}

        <div className="mt-5">
          <label htmlFor={emailId} className="mb-1 block text-sm font-medium text-gray-900">
            Correo electrónico
          </label>
          <input
            id={emailId}
            name="email"
            type="email"
            autoComplete="email"
            placeholder="nombre@empresa.com"
            autoFocus
            className={inputClass}
          />
        </div>

        <div className="mt-4">
          <label htmlFor={passwordId} className="mb-1 block text-sm font-medium text-gray-900">
            Contraseña
          </label>
          <div className="relative">
            <input
              id={passwordId}
              name="password"
              type={showPassword ? 'text' : 'password'}
              autoComplete="current-password"
              placeholder="Tu contraseña"
              className={`${inputClass} pr-20`}
            />
            <button
              type="button"
              onClick={() => setShowPassword((v) => !v)}
              aria-label={showPassword ? 'Ocultar contraseña' : 'Mostrar contraseña'}
              className="absolute inset-y-0 right-0 px-3 text-sm font-medium text-brand hover:text-brand-dark"
            >
              {showPassword ? 'Ocultar' : 'Mostrar'}
            </button>
          </div>
        </div>

        <button
          type="submit"
          disabled={loading}
          className="mt-6 flex w-full items-center justify-center rounded-lg bg-brand py-2.5 font-semibold text-white hover:bg-brand-dark disabled:cursor-not-allowed disabled:opacity-60"
        >
          {loading && (
            <span
              className="mr-2 inline-block h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent"
              aria-hidden="true"
            />
          )}
          {loading ? 'Entrando...' : 'Entrar'}
        </button>
      </form>
    </main>
  )
}