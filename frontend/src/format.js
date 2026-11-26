const currency = new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN' })

export const money = (n) => `${currency.format(Number(n))} MXN`

export const dateTime = (iso) =>
  new Date(iso).toLocaleString('es-MX', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,

    
  })

  export const amount = (n) => currency.format(Number(n)) // exportar cvs