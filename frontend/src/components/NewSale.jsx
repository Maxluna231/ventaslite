import { useEffect, useMemo, useState } from 'react'
import { api } from '../api'
import { money } from '../format'
import Modal from './Modal'

const field =
  'w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 ' +
  'focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand/30'

export default function NewSale({ onClose, onCreated }) {
  const [branches, setBranches] = useState([])
  const [products, setProducts] = useState([])
  const [loadingCatalog, setLoadingCatalog] = useState(true)
  const [form, setForm] = useState({ branch_id: '', customer_name: '', payment_method: 'efectivo' })
  const [items, setItems] = useState([{ product_id: '', quantity: 1 }])
  const [error, setError] = useState('')
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    Promise.all([api('/branches'), api('/products')])
      .then(([b, p]) => {
        setBranches(b)
        setProducts(p)
      })
      .catch((e) => setError(e.message))
      .finally(() => setLoadingCatalog(false))
  }, [])

  const byId = useMemo(() => Object.fromEntries(products.map((p) => [String(p.id), p])), [products])

  // Vista previa en centavos; el servidor recalcula todo al guardar
  const subtotal = items.reduce((sum, it) => {
    const p = byId[it.product_id]
    return p ? sum + Math.round(Number(p.price) * 100) * (Number(it.quantity) || 0) : sum
  }, 0)
  const tax = Math.round(subtotal * 0.16)
  const cents = (c) => money(c / 100)

  const setItem = (index, patch) =>
    setItems(items.map((it, i) => (i === index ? { ...it, ...patch } : it)))

  async function submit(e) {
    e.preventDefault()
    setError('')

    const clean = items.filter((i) => i.product_id)
    if (!form.branch_id || !form.customer_name.trim()) {
      setError('Elige la sucursal y escribe el nombre del cliente.')
      return
    }
    if (clean.length === 0) {
      setError('Agrega al menos un producto.')
      return
    }

    setSaving(true)
    try {
      const sale = await api('/sales', {
        method: 'POST',
        body: {
          branch_id: Number(form.branch_id),
          customer_name: form.customer_name.trim(),
          payment_method: form.payment_method,
          items: clean.map((i) => ({ product_id: Number(i.product_id), quantity: Number(i.quantity) })),
        },
      })
      onCreated(sale)
    } catch (err) {
      setError(err.message)
      setSaving(false)
    }
  }

  return (
    <Modal title="Nueva venta" onClose={onClose}>
      <form onSubmit={submit} noValidate>
        {error && (
          <div role="alert" className="mb-4 rounded-lg border border-red-600 bg-red-50 px-3 py-2 text-sm text-red-800">
            {error}
          </div>
        )}

        {loadingCatalog ? (
          <div className="h-24 animate-pulse rounded bg-gray-200" />
        ) : (
          <>
            <div className="grid gap-3 sm:grid-cols-3">
              <div>
                <label htmlFor="ns-branch" className="mb-1 block text-xs font-medium text-gray-700">Sucursal</label>
                <select
                  id="ns-branch"
                  value={form.branch_id}
                  onChange={(e) => setForm({ ...form, branch_id: e.target.value })}
                  className={field}
                >
                  <option value="">Elige…</option>
                  {branches.map((b) => (
                    <option key={b.id} value={b.id}>{b.name}</option>
                  ))}
                </select>
              </div>
              <div>
                <label htmlFor="ns-customer" className="mb-1 block text-xs font-medium text-gray-700">Cliente</label>
                <input
                  id="ns-customer"
                  value={form.customer_name}
                  onChange={(e) => setForm({ ...form, customer_name: e.target.value })}
                  maxLength={120}
                  className={field}
                />
              </div>
              <div>
                <label htmlFor="ns-pay" className="mb-1 block text-xs font-medium text-gray-700">Método de pago</label>
                <select
                  id="ns-pay"
                  value={form.payment_method}
                  onChange={(e) => setForm({ ...form, payment_method: e.target.value })}
                  className={field}
                >
                  <option value="efectivo">Efectivo</option>
                  <option value="tarjeta">Tarjeta</option>
                  <option value="transferencia">Transferencia</option>
                </select>
              </div>
            </div>

            <p className="mb-2 mt-5 text-sm font-medium text-gray-900">Productos</p>
            <div className="space-y-2">
              {items.map((it, index) => (
                <div key={index} className="flex gap-2">
                  <select
                    aria-label={`Producto ${index + 1}`}
                    value={it.product_id}
                    onChange={(e) => setItem(index, { product_id: e.target.value })}
                    className={field}
                  >
                    <option value="">Elige un producto…</option>
                    {products
                      .filter(
                        (p) =>
                          String(p.id) === it.product_id ||
                          !items.some((o) => o.product_id === String(p.id))
                      )
                      .map((p) => (
                        <option key={p.id} value={p.id}>
                          {p.name} — {money(p.price)} (stock {p.stock})
                        </option>
                      ))}
                  </select>
                  <input
                    aria-label={`Cantidad ${index + 1}`}
                    type="number"
                    min="1"
                    max="100"
                    value={it.quantity}
                    onChange={(e) => setItem(index, { quantity: e.target.value })}
                    className={`${field} w-24`}
                  />
                  <button
                    type="button"
                    onClick={() => setItems(items.filter((_, i) => i !== index))}
                    disabled={items.length === 1}
                    aria-label={`Quitar producto ${index + 1}`}
                    className="rounded-lg border border-gray-300 px-3 text-gray-700 hover:bg-gray-100 disabled:opacity-40"
                  >
                    ✕
                  </button>
                </div>
              ))}
            </div>

            <button
              type="button"
              onClick={() => setItems([...items, { product_id: '', quantity: 1 }])}
              disabled={items.length >= 6}
              className="mt-2 text-sm font-medium text-brand hover:text-brand-dark disabled:opacity-40"
            >
              + Agregar producto (máx. 6)
            </button>

            <div className="mt-5 space-y-1 text-right text-sm">
              <p className="text-gray-700">Subtotal: <strong>{cents(subtotal)}</strong></p>
              <p className="text-gray-700">IVA (16 %): <strong>{cents(tax)}</strong></p>
              <p className="text-lg text-gray-900">Total: <strong>{cents(subtotal + tax)}</strong></p>
            </div>

            <div className="mt-6 flex justify-end gap-2">
              <button
                type="button"
                onClick={onClose}
                className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-900 hover:bg-gray-100"
              >
                Cancelar
              </button>
              <button
                type="submit"
                disabled={saving}
                className="rounded-lg bg-brand px-4 py-2 text-sm font-semibold text-white hover:bg-brand-dark disabled:opacity-60"
              >
                {saving ? 'Guardando...' : 'Registrar venta'}
              </button>
            </div>
          </>
        )}
      </form>
    </Modal>
  )
}