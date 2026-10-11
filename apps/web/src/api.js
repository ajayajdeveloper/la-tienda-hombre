const API_URL = 'http://localhost:4000'

export async function getCategories() {
  const res = await fetch(`${API_URL}/api/categories`)
  if (!res.ok) throw new Error('failed to load categories')
  return res.json()
}

export async function getProducts() {
  const res = await fetch(`${API_URL}/api/products`)
  if (!res.ok) throw new Error('failed to load products')
  return res.json()
}

export async function getProduct(slug) {
  const res = await fetch(`${API_URL}/api/products/${slug}`)
  if (!res.ok) throw new Error('failed to load product')
  return res.json()
}

export async function createOrder(payload) {
  const res = await fetch(`${API_URL}/api/orders`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  })
  const data = await res.json()
  if (!res.ok) {
    throw new Error(data.error || 'failed to place order')
  }
  return data
}

