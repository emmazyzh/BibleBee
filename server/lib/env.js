export function readEnv(name, bindings) {
  const bindingValue = bindings?.[name]
  if (typeof bindingValue === 'string' && bindingValue.trim()) {
    return bindingValue.trim()
  }

  const processValue = typeof process !== 'undefined' ? process.env?.[name] : undefined
  if (typeof processValue === 'string' && processValue.trim()) {
    return processValue.trim()
  }

  return ''
}

export function requireEnv(name, bindings) {
  const value = readEnv(name, bindings)

  if (!value) {
    throw new Error(`${name} is not set`)
  }

  return value
}

export function readEnvList(name, bindings) {
  const value = readEnv(name, bindings)

  if (!value) {
    return []
  }

  return value
    .split(',')
    .map((item) => item.trim())
    .filter(Boolean)
}
