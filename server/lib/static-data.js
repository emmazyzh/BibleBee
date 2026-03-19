const staticJsonCache = new Map()

async function readJsonFromAssets(name, bindings) {
  if (!bindings?.ASSETS || typeof bindings.ASSETS.fetch !== 'function') {
    return null
  }

  const response = await bindings.ASSETS.fetch(`https://assets.local/data/${name}.json`)

  if (!response.ok) {
    throw new Error(`Failed to load ${name}.json from assets`)
  }

  return response.json()
}

async function readJsonFromFileSystem(name) {
  if (typeof process === 'undefined') {
    return null
  }

  const { readFile } = await import('node:fs/promises')
  const { resolve } = await import('node:path')
  const filePath = resolve(process.cwd(), 'data', `${name}.json`)
  const fileContents = await readFile(filePath, 'utf8')
  return JSON.parse(fileContents)
}

export async function loadStaticJson(name, bindings) {
  if (staticJsonCache.has(name)) {
    return staticJsonCache.get(name)
  }

  const data = (await readJsonFromAssets(name, bindings)) || (await readJsonFromFileSystem(name))

  if (!data) {
    throw new Error(`Static JSON not found: ${name}`)
  }

  staticJsonCache.set(name, data)
  return data
}
