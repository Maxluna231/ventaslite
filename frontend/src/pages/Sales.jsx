import { useCallback, useEffect, useState } from 'react'
import { api } from '../api'
import { useAuth } from '../auth'
import { dateTime, money } from '../format'

const EMPTY = { from: '', to: '', branch_id: '', user_id: '', status: '' }

const field =
  'w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 ' +
  'focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand/30'

function Badge({ status }) {
  const style = status === 'pagada' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
  return <span className={`rounded-full px-2 py-0.5 text-xs font-medium capitalize ${style}`}>{status}</span>
}

export default function Sales() {
  const { user } = useAuth()
  const isAdmin = user?.role === 'admin'

  const [form, setForm] = useState(EMPTY)
  const [filters, setFilters] = useState(EMPTY)
  const [page, setPage] = useState(1)
  const [result, setResult] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [branches, setBranches] = useState([])
  const [sellers, setSellers] = useState([])

  useEffect(() => {
    api('/branches').then(setBranches).catch(() => {})
    if (isAdmin) api('/sellers').then(setSellers).catch(() => {})
  }, [isAdmin])

  const load = useCallback(async () => {
    setLoading(true)
    setError('')
    const params = new URLSearchParams({ page })
    Object.entries(filters).forEach(([k, v]) => v && params.set(k, v))
    try {
      setResult(await api(`/sales?${params}`))
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }, [filters, page])

  useEffect(() => {
    load()
  }, [load])

  const change = (e) => setForm({ ...form, [e.target.name]: e.target.value })

  function apply(e) {
    e.preventDefault()
    setPage(1)
    setFilters(form)
  }

  function clear() {
    setForm(EMPTY)
    setFilters(EMPTY)
    setPage(1)
  }

  const rows = result?.data ?? []

  return (
    <div>
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-semibold text-gray-900">Ventas</h1>
        <button type="button" disabled className="rounded-lg bg-brand px-4 py-2 text-sm font-semibold text-white opacity-60">
          + Nueva venta
        </button>
      </div>

      <form onSubmit={apply} className="mb-4 grid gap-3 rounded-xl bg-white p-4 shadow-sm sm:grid-cols-2 lg:grid-cols-6">
        <div>
          <label htmlFor="from" className="mb-1 block text-xs font-medium text-gray-700">Desde</label>
          <input id="from" name="from" type="date" value={form.from} onChange={change} className={field} />
        </div>
        <div>
          <label htmlFor="to" className="mb-1 block text-xs font-medium text-gray-700">Hasta</label>
          <input id="to" name="to" type="date" value={form.to} onChange={change} className={field} />
        </div>
        <div>
          <label htmlFor="branch_id" className="mb-1 block text-xs font-medium text-gray-700">Sucursal</label>
          <select id="branch_id" name="branch_id" value={form.branch_id} onChange={change} className={field}>
            <option value="">Todas</option>
            {branches.map((b) => (
              <option key={b.id} value={b.id}>{b.name}</option>
            ))}
          </select>
        </div>
        {isAdmin && (
          <div>
            <label htmlFor="user_id" className="mb-1 block text-xs font-medium text-gray-700">Vendedor</label>
            <select id="user_id" name="user_id" value={form.user_id} onChange={change} className={field}>
              <option value="">Todos</option>
              {sellers.map((s) => (
                <option key={s.id} value={s.id}>{s.name}</option>
              ))}
            </select>
          </div>
        )}
        <div>
          <label htmlFor="status" className="mb-1 block text-xs font-medium text-gray-700">Estatus</label>
          <select id="status" name="status" value={form.status} onChange={change} className={field}>
            <option value="">Todos</option>
            <option value="pagada">Pagada</option>
            <option value="cancelada">Cancelada</option>
          </select>
        </div>
        <div className="flex items-end gap-2">
          <button type="submit" className="rounded-lg bg-brand px-4 py-2 text-sm font-semibold text-white hover:bg-brand-dark">
            Filtrar
          </button>
          <button type="button" onClick={clear} className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-900 hover:bg-gray-100">
            Limpiar
          </button>
        </div>
      </form>

      <div className="rounded-xl bg-white shadow-sm">
        {error && (
          <div role="alert" className="m-4 flex items-center justify-between rounded-lg border border-red-600 bg-red-50 px-3 py-2 text-sm text-red-800">
            <span>{error}</span>
            <button type="button" onClick={load} className="font-semibold underline">Reintentar</button>
          </div>
        )}

        <div className="overflow-x-auto">
          <table className="w-full min-w-[800px] text-left text-sm">
            <thead className="bg-gray-50 text-xs uppercase tracking-wide text-gray-600">
              <tr>
                <th className="px-4 py-3">Folio</th>
                <th className="px-4 py-3">Fecha y hora</th>
                <th className="px-4 py-3">Cliente</th>
                <th className="px-4 py-3">Sucursal</th>
                <th className="px-4 py-3">Vendedor</th>
                <th className="px-4 py-3">Método</th>
                <th className="px-4 py-3">Estatus</th>
                <th className="px-4 py-3 text-right">Total</th>
              </tr>
            </thead>
            <tbody>
              {loading &&
                Array.from({ length: 6 }).map((_, i) => (
                  <tr key={i} className="border-t border-gray-100">
                    <td colSpan={8} className="px-4 py-3">
                      <div className="h-4 animate-pulse rounded bg-gray-200" />
                    </td>
                  </tr>
                ))}

              {!loading && !error && rows.length === 0 && (
                <tr>
                  <td colSpan={8} className="px-4 py-10 text-center text-gray-600">
                    No hay ventas en este periodo
                  </td>
                </tr>
              )}

              {!loading &&
                rows.map((s) => (
                  <tr key={s.id} className="border-t border-gray-100">
                    <td className="px-4 py-3 font-semibold text-gray-900">{s.folio}</td>
                    <td className="px-4 py-3 text-gray-700">{dateTime(s.sold_at)}</td>
                    <td className="px-4 py-3 text-gray-700">{s.customer_name}</td>
                    <td className="px-4 py-3 text-gray-700">{s.branch?.name}</td>
                    <td className="px-4 py-3 text-gray-700">{s.user?.name}</td>
                    <td className="px-4 py-3 capitalize text-gray-700">{s.payment_method}</td>
                    <td className="px-4 py-3"><Badge status={s.status} /></td>
                    <td className="px-4 py-3 text-right font-medium text-gray-900">{money(s.total)}</td>
                  </tr>
                ))}
            </tbody>
          </table>
        </div>

        {result && (
          <div className="flex flex-wrap items-center justify-between gap-3 border-t border-gray-100 px-4 py-3 text-sm text-gray-700">
            <span>
              {result.total > 0
                ? `Mostrando ${result.from}–${result.to} de ${result.total.toLocaleString('es-MX')} ventas`
                : 'Sin resultados'}
            </span>
            <div className="flex items-center gap-3">
              <button
                type="button"
                disabled={page <= 1 || loading}
                onClick={() => setPage(page - 1)}
                className="rounded-lg border border-gray-300 px-3 py-1.5 font-medium disabled:opacity-50"
              >
                Anterior
              </button>
              <span>Página {result.current_page} de {result.last_page}</span>
              <button
                type="button"
                disabled={page >= result.last_page || loading}
                onClick={() => setPage(page + 1)}
                className="rounded-lg border border-gray-300 px-3 py-1.5 font-medium disabled:opacity-50"
              >
                Siguiente
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}