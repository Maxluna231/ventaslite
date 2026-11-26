import { useCallback, useEffect, useState } from 'react'
import { api, download } from '../api'
import { amount, money } from '../format'
import AiPanel from '../components/AiPanel'

const EMPTY = { from: '', to: '', branch_id: '' }

const field =
  'w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 ' +
  'focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand/30'

const TABS = [
  { id: 'top', label: 'Top 10 productos', path: 'top-products' },
  { id: 'sellers', label: 'Vendedores', path: 'sellers' },
  { id: 'cross', label: 'Sucursal × categoría', path: 'branch-category' },
  { id: 'margin', label: 'Margen', path: 'margin' },
]

const td = 'whitespace-nowrap px-4 py-3 text-gray-700'
const tdNum = `${td} text-right`

function toParams(filters, extra = {}) {
  const p = new URLSearchParams()
  Object.entries({ ...filters, ...extra }).forEach(([k, v]) => v && p.set(k, v))
  return p
}

function Table({ head, children }) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[560px] text-left text-sm">
        <thead className="bg-gray-50 text-xs uppercase tracking-wide text-gray-600">
          <tr>
            {head.map((h) => (
              <th key={h.label} className={`px-4 py-3 ${h.right ? 'text-right' : ''}`}>{h.label}</th>
            ))}
          </tr>
        </thead>
        <tbody>{children}</tbody>
      </table>
    </div>
  )
}

function Empty() {
  return <p className="px-4 py-10 text-center text-gray-600">No hay ventas en este periodo</p>
}

function ReportBody({ tabId, data }) {
  if (tabId === 'cross') {
    if (!data.rows.length) return <Empty />
    const head = [
      { label: 'Sucursal' },
      ...data.categories.map((c) => ({ label: c, right: true })),
      { label: 'Total', right: true },
    ]
    return (
      <Table head={head}>
        {data.rows.map((r) => (
          <tr key={r.branch} className="border-t border-gray-100">
            <td className={`${td} font-semibold text-gray-900`}>{r.branch}</td>
            {r.values.map((v, i) => (
              <td key={i} className={tdNum}>{amount(v)}</td>
            ))}
            <td className={`${tdNum} font-semibold text-gray-900`}>{amount(r.total)}</td>
          </tr>
        ))}
      </Table>
    )
  }

  if (!data.length) return <Empty />

  if (tabId === 'top') {
    return (
      <Table head={[{ label: '#' }, { label: 'SKU' }, { label: 'Producto' }, { label: 'Unidades', right: true }, { label: 'Importe', right: true }]}>
        {data.map((r, i) => (
          <tr key={r.sku} className="border-t border-gray-100">
            <td className={td}>{i + 1}</td>
            <td className={td}>{r.sku}</td>
            <td className={`${td} font-medium text-gray-900`}>{r.name}</td>
            <td className={tdNum}>{r.units.toLocaleString('es-MX')}</td>
            <td className={tdNum}>{money(r.amount)}</td>
          </tr>
        ))}
      </Table>
    )
  }

  if (tabId === 'sellers') {
    return (
      <Table head={[{ label: 'Vendedor' }, { label: 'Ventas', right: true }, { label: 'Total vendido', right: true }, { label: 'Ticket promedio', right: true }]}>
        {data.map((r) => (
          <tr key={r.id} className="border-t border-gray-100">
            <td className={`${td} font-medium text-gray-900`}>{r.name}</td>
            <td className={tdNum}>{r.sales_count.toLocaleString('es-MX')}</td>
            <td className={tdNum}>{money(r.total)}</td>
            <td className={tdNum}>{money(r.average_ticket)}</td>
          </tr>
        ))}
      </Table>
    )
  }

  return (
    <Table head={[{ label: 'Categoría' }, { label: 'Ingresos', right: true }, { label: 'Utilidad bruta', right: true }, { label: 'Margen', right: true }]}>
      {data.map((r) => (
        <tr key={r.category} className="border-t border-gray-100">
          <td className={`${td} font-medium text-gray-900`}>{r.category}</td>
          <td className={tdNum}>{money(r.revenue)}</td>
          <td className={tdNum}>{money(r.gross_profit)}</td>
          <td className={tdNum}>{r.margin_percent === null ? '—' : `${r.margin_percent.toLocaleString('es-MX')} %`}</td>
        </tr>
      ))}
    </Table>
  )
}

export default function Reports() {
  const [form, setForm] = useState(EMPTY)
  const [filters, setFilters] = useState(EMPTY)
  const [branches, setBranches] = useState([])
  const [tabId, setTabId] = useState('top')
  const [by, setBy] = useState('units')
  const [result, setResult] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [exporting, setExporting] = useState(false)

  useEffect(() => {
    api('/branches').then(setBranches).catch(() => {})
  }, [])

  const load = useCallback(async () => {
    const path = TABS.find((t) => t.id === tabId).path
    setLoading(true)
    setError('')
    try {
      const data = await api(`/reports/${path}?${toParams(filters, tabId === 'top' ? { by } : {})}`)
      setResult({ tabId, by, data })
    } catch (err) {
      setResult(null)
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }, [filters, tabId, by])

  useEffect(() => {
    load()
  }, [load])

  async function exportCsv() {
    const path = TABS.find((t) => t.id === tabId).path
    setExporting(true)
    setError('')
    try {
      await download(`/reports/${path}/export?${toParams(filters, tabId === 'top' ? { by } : {})}`, `reporte-${path}.csv`)
    } catch (err) {
      setError(err.message)
    } finally {
      setExporting(false)
    }
  }

  const change = (e) => setForm({ ...form, [e.target.name]: e.target.value })

  function apply(e) {
    e.preventDefault()
    setFilters(form)
  }

  function clear() {
    setForm(EMPTY)
    setFilters(EMPTY)
  }

  const ready = result && result.tabId === tabId && result.by === by

  return (
    <div>
      <h1 className="mb-4 text-2xl font-semibold text-gray-900">Reportes</h1>

      <form onSubmit={apply} className="mb-4 grid gap-3 rounded-xl bg-white p-4 shadow-sm sm:grid-cols-2 lg:grid-cols-4">
        <div>
          <label htmlFor="r-from" className="mb-1 block text-xs font-medium text-gray-700">Desde</label>
          <input id="r-from" name="from" type="date" value={form.from} onChange={change} className={field} />
        </div>
        <div>
          <label htmlFor="r-to" className="mb-1 block text-xs font-medium text-gray-700">Hasta</label>
          <input id="r-to" name="to" type="date" value={form.to} onChange={change} className={field} />
        </div>
        <div>
          <label htmlFor="r-branch" className="mb-1 block text-xs font-medium text-gray-700">Sucursal</label>
          <select id="r-branch" name="branch_id" value={form.branch_id} onChange={change} className={field}>
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

      <div className="rounded-xl bg-white shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-gray-100 px-4 pt-3">
          <div role="tablist" aria-label="Reportes" className="flex flex-wrap gap-1">
            {TABS.map((t) => (
              <button
                key={t.id}
                type="button"
                role="tab"
                aria-selected={tabId === t.id}
                onClick={() => setTabId(t.id)}
                className={`rounded-t-lg px-3 py-2 text-sm font-medium ${
                  tabId === t.id ? 'border-b-2 border-brand text-brand' : 'text-gray-700 hover:text-gray-900'
                }`}
              >
                {t.label}
              </button>
            ))}
          </div>
          <button
            type="button"
            onClick={exportCsv}
            disabled={exporting || loading}
            className="mb-2 rounded-lg border border-gray-300 px-3 py-1.5 text-sm font-medium text-gray-900 hover:bg-gray-100 disabled:opacity-60"
          >
            {exporting ? 'Exportando...' : 'Exportar CSV'}
          </button>
        </div>

        <div className="flex flex-wrap items-center justify-between gap-2 px-4 py-3 text-sm text-gray-600">
          <span>
            Importes en MXN. Los de productos, sucursales y margen son sin IVA.
            {!filters.from && !filters.to && ' Sin fechas se muestran los últimos 30 días.'}
          </span>
          {tabId === 'top' && (
            <div className="flex gap-1" role="group" aria-label="Ordenar por">
              {[['units', 'Por unidades'], ['amount', 'Por importe']].map(([id, label]) => (
                <button
                  key={id}
                  type="button"
                  aria-pressed={by === id}
                  onClick={() => setBy(id)}
                  className={`rounded-lg border px-3 py-1 text-sm font-medium ${
                    by === id ? 'border-brand bg-brand text-white' : 'border-gray-300 text-gray-900 hover:bg-gray-100'
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>
          )}
        </div>

        {error && (
          <div role="alert" className="mx-4 mb-4 flex items-center justify-between rounded-lg border border-red-600 bg-red-50 px-3 py-2 text-sm text-red-800">
            <span>{error}</span>
            <button type="button" onClick={load} className="font-semibold underline">Reintentar</button>
          </div>
        )}

        {loading && (
          <div className="space-y-2 p-4">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="h-4 animate-pulse rounded bg-gray-200" />
            ))}
          </div>
        )}

        {!loading && ready && <ReportBody tabId={tabId} data={result.data} />}
      </div>

      <AiPanel filters={filters} />
    </div>
  )
}