import { useCallback, useEffect, useState } from 'react'
import {
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import { api } from '../api'
import { useAuth } from '../auth'
import { money } from '../format'

const EMPTY = { from: '', to: '', branch_id: '' }
const MONTHS = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic']

const field =
  'w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 ' +
  'focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand/30'

const monthLabel = (ym) => {
  const [y, m] = ym.split('-')
  return `${MONTHS[Number(m) - 1]} ${y.slice(2)}`
}

const shortDate = (iso) => iso.split('-').reverse().join('/')

function greeting() {
  const hour = new Date().getHours()
  if (hour < 12) return 'Buenos días'
  if (hour < 19) return 'Buenas tardes'
  return 'Buenas noches'
}

function Change({ value }) {
  if (value === null || value === undefined) {
    return <p className="mt-2 text-xs text-gray-600">Sin datos del periodo anterior</p>
  }
  const up = value >= 0
  return (
    <p className={`mt-2 text-xs font-medium ${up ? 'text-green-700' : 'text-red-700'}`}>
      {up ? '▲' : '▼'} {Math.abs(value).toLocaleString('es-MX')} %{' '}
      <span className="font-normal text-gray-600">vs. periodo anterior</span>
    </p>
  )
}

function Card({ title, value, change, loading }) {
  return (
    <div className="rounded-xl bg-white p-5 shadow-sm">
      <p className="text-sm text-gray-600">{title}</p>
      {loading ? (
        <div className="mt-2 h-8 w-32 animate-pulse rounded bg-gray-200" />
      ) : (
        <>
          <p className="mt-1 text-2xl font-semibold text-gray-900">{value}</p>
          <Change value={change} />
        </>
      )}
    </div>
  )
}

export default function Dashboard() {
  const { user } = useAuth()
  const firstName = user?.name?.split(' ')[0] ?? ''

  const [form, setForm] = useState(EMPTY)
  const [filters, setFilters] = useState(EMPTY)
  const [branches, setBranches] = useState([])
  const [summary, setSummary] = useState(null)
  const [monthly, setMonthly] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    api('/branches').then(setBranches).catch(() => {})
  }, [])

  const load = useCallback(async () => {
    setLoading(true)
    setError('')
    const params = new URLSearchParams()
    Object.entries(filters).forEach(([k, v]) => v && params.set(k, v))
    const branchOnly = filters.branch_id ? `?branch_id=${filters.branch_id}` : ''
    try {
      const [s, m] = await Promise.all([
        api(`/reports/dashboard?${params}`),
        api(`/reports/monthly${branchOnly}`),
      ])
      setSummary(s)
      setMonthly(m)
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }, [filters])

  useEffect(() => {
    load()
  }, [load])

  const change = (e) => setForm({ ...form, [e.target.name]: e.target.value })

  function apply(e) {
    e.preventDefault()
    setFilters(form)
  }

  function clear() {
    setForm(EMPTY)
    setFilters(EMPTY)
  }

  const current = summary?.current
  const chartEmpty = monthly.every((m) => m.total === 0)

  return (
    <div className="w-full min-w-0 max-w-full">
      <div className="mb-4">
        <h1 className="text-2xl font-semibold text-gray-900">Dashboard</h1>
        <p className="mt-1 text-sm text-gray-600">
          {greeting()}, {firstName}. Aqui tienes el resumen de tus ventas.
        </p>
      </div>

      <form onSubmit={apply} className="mb-4 grid gap-3 rounded-xl bg-white p-4 shadow-sm sm:grid-cols-2 lg:grid-cols-4">
        <div>
          <label htmlFor="d-from" className="mb-1 block text-xs font-medium text-gray-700">Desde</label>
          <input id="d-from" name="from" type="date" value={form.from} onChange={change} className={field} />
        </div>
        <div>
          <label htmlFor="d-to" className="mb-1 block text-xs font-medium text-gray-700">Hasta</label>
          <input id="d-to" name="to" type="date" value={form.to} onChange={change} className={field} />
        </div>
        <div>
          <label htmlFor="d-branch" className="mb-1 block text-xs font-medium text-gray-700">Sucursal</label>
          <select id="d-branch" name="branch_id" value={form.branch_id} onChange={change} className={field}>
            <option value="">Todas</option>
            {branches.map((b) => (
              <option key={b.id} value={b.id}>{b.name}</option>
            ))}
          </select>
        </div>
        <div className="flex items-end gap-2">
          <button type="submit" className="rounded-lg bg-brand px-4 py-2 text-sm font-semibold text-white hover:bg-brand-dark">
            Aplicar
          </button>
          <button type="button" onClick={clear} className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-900 hover:bg-gray-100">
            Limpiar
          </button>
        </div>
      </form>

      {error && (
        <div role="alert" className="mb-4 flex items-center justify-between rounded-lg border border-red-600 bg-red-50 px-3 py-2 text-sm text-red-800">
          <span>{error}</span>
          <button type="button" onClick={load} className="font-semibold underline">Reintentar</button>
        </div>
      )}

      {summary && (
        <p className="mb-3 text-sm text-gray-600">
          Periodo: {shortDate(summary.period.from)} al {shortDate(summary.period.to)} ({summary.period.days} días),
          comparado contra {shortDate(summary.previous_period.from)} al {shortDate(summary.previous_period.to)}.
          {!filters.from && !filters.to && ' Si no eliges fechas se muestran los últimos 30 días.'}
        </p>
      )}

      <div className="grid gap-4 md:grid-cols-3">
        <Card
          title="Ventas totales"
          loading={loading}
          value={current && money(current.total)}
          change={summary?.change_percent.total}
        />
        <Card
          title="Número de ventas"
          loading={loading}
          value={current && current.sales_count.toLocaleString('es-MX')}
          change={summary?.change_percent.sales_count}
        />
        <Card
          title="Ticket promedio"
          loading={loading}
          value={current && money(current.average_ticket)}
          change={summary?.change_percent.average_ticket}
        />
      </div>

      <div className="mt-4 rounded-xl bg-white p-5 shadow-sm">
        <h2 className="text-lg font-semibold text-gray-900">Ventas de los últimos 12 meses</h2>
        <p className="text-sm text-gray-600">Ingresos mensuales en pesos mexicanos (MXN, IVA incluido)</p>

        <div className="mt-4 h-80 w-full min-w-0">
          {loading ? (
            <div className="h-full animate-pulse rounded bg-gray-200" />
          ) : chartEmpty ? (
            <p className="flex h-full items-center justify-center text-gray-600">No hay ventas en este periodo</p>
          ) : (
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={monthly} margin={{ top: 8, right: 16, bottom: 8, left: 8 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                <XAxis
                  dataKey="month"
                  tickFormatter={monthLabel}
                  tick={{ fontSize: 12 }}
                  height={50}
                  label={{ value: 'Mes', position: 'insideBottom', offset: -4 }}
                />
                <YAxis
                  tickFormatter={(v) => `$${(v / 1000).toLocaleString('es-MX')} mil`}
                  tick={{ fontSize: 12 }}
                  width={90}
                  label={{ value: 'Ventas (MXN)', angle: -90, position: 'insideLeft' }}
                />
                <Tooltip formatter={(v) => [money(v), 'Ventas']} labelFormatter={monthLabel} />
                <Line type="monotone" dataKey="total" stroke="#2549e0" strokeWidth={2} dot />
              </LineChart>
            </ResponsiveContainer>
          )}
        </div>
      </div>
    </div>
  )
}