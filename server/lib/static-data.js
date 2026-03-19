const staticJsonCache = new Map()

async function readJsonFromFileSystem(name) {
  if (typeof process === 'undefined') {
    return null
  }

  const { readFile } = await import('node:fs/promises')
  const { resolve } = await import('node:path')
  const publicFilePath = resolve(process.cwd(), 'public', 'data', `${name}.json`)
  const fileContents = await readFile(publicFilePath, 'utf8')
  return JSON.parse(fileContents)
}

export async function loadStaticJson(name, _bindings) {
  if (staticJsonCache.has(name)) {
    return staticJsonCache.get(name)
  }

  const data = await readJsonFromFileSystem(name)

  if (!data) {
    throw new Error(`Static JSON not found: ${name}`)
  }

  staticJsonCache.set(name, data)
  return data
}
