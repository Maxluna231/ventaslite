import { useCallback, useEffect, useState } from 'react'
import { api } from '../api'
import { useAuth } from '../auth'
import { dateTime, money } from '../format'
import SaleDetail from '../components/SaleDetail'
import NewSale from '../components/NewSale'

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
  const [detailId, setDetailId] = useState(null)
  const [showNew, setShowNew] = useState(false)
  const [notice, setNotice] = useState('')

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

  function created(sale) {
    setShowNew(false)
    setNotice(`Venta ${sale.folio} registrada correctamente.`)
    if (page !== 1) setPage(1)
    else load()
  }

  function changed(message) {
    setDetailId(null)
    setNotice(message)
    load()
  }

  const rows = result?.data ?? []

  return (
    <div className="w-full min-w-0 max-w-full">
            <div className="w-full min-w-0 overflow-hidden rounded-xl bg-white shadow-sm">
        {error && (
          <div role="alert" className="m-4 flex items-center justify-between rounded-lg border border-red-600 bg-red-50 px-3 py-2 text-sm text-red-800">
            <span>{error}</span>
            <button type="button" onClick={load} className="font-semibold underline">Reintentar</button>
          </div>
        )}

        <div className="overflow-x-auto">
          <table className="w-full min-w-[900px] text-left text-sm">
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
                <th className="px-4 py-3"><span className="sr-only">Acciones</span></th>
              </tr>
            </thead>
            <tbody>
              {loading &&
                Array.from({ length: 6 }).map((_, i) => (
                  <tr key={i} className="border-t border-gray-100">
                    <td colSpan={9} className="px-4 py-3">
                      <div className="h-4 animate-pulse rounded bg-gray-200" />
                    </td>
                  </tr>
                ))}

              {!loading && !error && rows.length === 0 && (
                <tr>
                  <td colSpan={9} className="px-4 py-10 text-center text-gray-600">
                    No hay ventas en este periodo
                  </td>
                </tr>
              )}

              {!loading &&
                rows.map((s) => (
                  <tr key={s.id} className="border-t border-gray-100">
                    <td className="whitespace-nowrap px-4 py-3 font-semibold text-gray-900">{s.folio}</td>
                    <td className="whitespace-nowrap px-4 py-3 text-gray-700">{dateTime(s.sold_at)}</td>
                    <td className="px-4 py-3 text-gray-700">{s.customer_name}</td>
                    <td className="px-4 py-3 text-gray-700">{s.branch?.name}</td>
                    <td className="px-4 py-3 text-gray-700">{s.user?.name}</td>
                    <td className="px-4 py-3 capitalize text-gray-700">{s.payment_method}</td>
                    <td className="px-4 py-3"><Badge status={s.status} /></td>
                    <td className="whitespace-nowrap px-4 py-3 text-right font-medium text-gray-900">{money(s.total)}</td>
                    <td className="px-4 py-3 text-right">
                      <button
                        type="button"
                        onClick={() => setDetailId(s.id)}
                        className="font-medium text-brand hover:text-brand-dark"
                      >
                        Ver
                      </button>
                    </td>
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

      {detailId && (
        <SaleDetail id={detailId} onClose={() => setDetailId(null)} onChanged={changed} />
      )}
      {showNew && <NewSale onClose={() => setShowNew(false)} onCreated={created} />}
    </div>
  )
}