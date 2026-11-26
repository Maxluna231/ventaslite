import { useEffect, useState } from 'react'
import { api } from '../api'
import { useAuth } from '../auth'
import { dateTime, money } from '../format'
import Modal from './Modal'

export default function SaleDetail({ id, onClose, onChanged }) {
  const { user } = useAuth()
  const [sale, setSale] = useState(null)
  const [error, setError] = useState('')
  const [confirming, setConfirming] = useState(false)
  const [busy, setBusy] = useState(false)

  useEffect(() => {
    api(`/sales/${id}`)
      .then(setSale)
      .catch((e) => setError(e.message))
  }, [id])

  async function cancel() {
    setBusy(true)
    setError('')
    try {
      await api(`/sales/${id}/cancel`, { method: 'POST' })
      onChanged(`Venta ${sale.folio} cancelada y stock regresado.`)
    } catch (e) {
      setError(e.message)
      setBusy(false)
    }
  }

  const canCancel = user?.role === 'admin' && sale?.status === 'pagada'

  return (
    <Modal title={sale ? `Venta ${sale.folio}` : 'Detalle de venta'} onClose={onClose}>
      {error && (
        <div role="alert" className="mb-4 rounded-lg border border-red-600 bg-red-50 px-3 py-2 text-sm text-red-800">
          {error}
        </div>
      )}

      {!sale && !error && <div className="h-24 animate-pulse rounded bg-gray-200" />}

      {sale && (
        <>
          <dl className="grid gap-x-6 gap-y-2 text-sm sm:grid-cols-2">
            <div><dt className="text-gray-600">Fecha</dt><dd className="font-medium text-gray-900">{dateTime(sale.sold_at)}</dd></div>
            <div><dt className="text-gray-600">Estatus</dt><dd className="font-medium capitalize text-gray-900">{sale.status}</dd></div>
            <div><dt className="text-gray-600">Cliente</dt><dd className="font-medium text-gray-900">{sale.customer_name}</dd></div>
            <div><dt className="text-gray-600">Método de pago</dt><dd className="font-medium capitalize text-gray-900">{sale.payment_method}</dd></div>
            <div><dt className="text-gray-600">Sucursal</dt><dd className="font-medium text-gray-900">{sale.branch?.name}</dd></div>
            <div><dt className="text-gray-600">Vendedor</dt><dd className="font-medium text-gray-900">{sale.user?.name}</dd></div>
          </dl>

          <div className="mt-4 overflow-x-auto">
            <table className="w-full min-w-[480px] text-left text-sm">
              <thead className="bg-gray-50 text-xs uppercase text-gray-600">
                <tr>
                  <th className="px-3 py-2">Producto</th>
                  <th className="px-3 py-2 text-right">Cant.</th>
                  <th className="px-3 py-2 text-right">Precio</th>
                  <th className="px-3 py-2 text-right">Importe</th>
                </tr>
              </thead>
              <tbody>
                {sale.items.map((i) => (
                  <tr key={i.id} className="border-t border-gray-100">
                    <td className="px-3 py-2 text-gray-900">
                      {i.product?.name} <span className="text-gray-600">({i.product?.sku})</span>
                    </td>
                    <td className="px-3 py-2 text-right">{i.quantity}</td>
                    <td className="whitespace-nowrap px-3 py-2 text-right">{money(i.unit_price)}</td>
                    <td className="whitespace-nowrap px-3 py-2 text-right">{money(i.line_total)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="mt-4 space-y-1 text-right text-sm">
            <p className="text-gray-700">Subtotal: <strong>{money(sale.subtotal)}</strong></p>
            <p className="text-gray-700">IVA (16 %): <strong>{money(sale.tax)}</strong></p>
            <p className="text-lg text-gray-900">Total: <strong>{money(sale.total)}</strong></p>
          </div>

          <div className="mt-6 flex flex-wrap justify-end gap-2">
            {confirming ? (
              <>
                <p className="mr-auto self-center text-sm text-gray-800">
                  ¿Cancelar la venta {sale.folio}? El stock se regresará.
                </p>
                <button
                  type="button"
                  onClick={() => setConfirming(false)}
                  disabled={busy}
                  className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-900 hover:bg-gray-100"
                >
                  Volver
                </button>
                <button
                  type="button"
                  onClick={cancel}
                  disabled={busy}
                  className="rounded-lg bg-red-600 px-4 py-2 text-sm font-semibold text-white hover:bg-red-700 disabled:opacity-60"
                >
                  {busy ? 'Cancelando...' : 'Cancelar venta'}
                </button>
              </>
            ) : (
              <>
                <button
                  type="button"
                  onClick={onClose}
                  className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-900 hover:bg-gray-100"
                >
                  Cerrar
                </button>
                {canCancel && (
                  <button
                    type="button"
                    onClick={() => setConfirming(true)}
                    className="rounded-lg bg-red-600 px-4 py-2 text-sm font-semibold text-white hover:bg-red-700"
                  >
                    Cancelar venta
                  </button>
                )}
              </>
            )}
          </div>
        </>
      )}
    </Modal>
  )
}