const API_URL = import.meta.env.VITE_API_URL

export function getToken() {
  return localStorage.getItem('token')
}

export async function api(path, { method = 'GET', body } = {}) {
  const token = getToken()

  const res = await fetch(`${API_URL}${path}`, {
    method,
    headers: {
      Accept: 'application/json',
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: body ? JSON.stringify(body) : undefined,
  })

  const data = await res.json().catch(() => ({}))

  if (!res.ok) {
    // Token vencido o inválido: se limpia la sesión y se vuelve al login
    if (res.status === 401 && token) {
      localStorage.removeItem('token')
      localStorage.removeItem('user')
      window.location.href = '/login'
    }

    const error = new Error(data.message || 'Ocurrió un error inesperado.')
    error.status = res.status
    error.errors = data.errors
    throw error
  }

  return data
}

export async function download(path, filename) {
  const token = getToken()

  const res = await fetch(`${API_URL}${path}`, {
    headers: { Accept: 'application/json', Authorization: `Bearer ${token}` },
  })

  if (!res.ok) {
    const data = await res.json().catch(() => ({}))
    throw new Error(data.message || 'No se pudo exportar el reporte.')
  }

  const url = URL.createObjectURL(await res.blob())
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  a.click()
  URL.revokeObjectURL(url)
}