const DB_NAME = 'biblebee-cache'
const DB_VERSION = 1
const STATIC_STORE = 'static_json'
const USER_CACHE_STORE = 'user_cache'
const PENDING_OP_STORE = 'pending_ops'

let dbPromise = null

function openDatabase() {
  if (typeof indexedDB === 'undefined') {
    return Promise.resolve(null)
  }

  if (!dbPromise) {
    dbPromise = new Promise((resolve, reject) => {
      const request = indexedDB.open(DB_NAME, DB_VERSION)

      request.onupgradeneeded = () => {
        const db = request.result

        if (!db.objectStoreNames.contains(STATIC_STORE)) {
          db.createObjectStore(STATIC_STORE, { keyPath: 'key' })
        }

        if (!db.objectStoreNames.contains(USER_CACHE_STORE)) {
          db.createObjectStore(USER_CACHE_STORE, { keyPath: 'key' })
        }

        if (!db.objectStoreNames.contains(PENDING_OP_STORE)) {
          const store = db.createObjectStore(PENDING_OP_STORE, { keyPath: 'id', autoIncrement: true })
          store.createIndex('userId', 'userId', { unique: false })
        }
      }

      request.onsuccess = () => resolve(request.result)
      request.onerror = () => reject(request.error || new Error('Failed to open IndexedDB'))
    })
  }

  return dbPromise
}

async function withStore(storeName, mode, callback) {
  const db = await openDatabase()

  if (!db) {
    return null
  }

  return new Promise((resolve, reject) => {
    const transaction = db.transaction(storeName, mode)
    const store = transaction.objectStore(storeName)

    let result

    transaction.oncomplete = () => resolve(result)
    transaction.onerror = () => reject(transaction.error || new Error(`IndexedDB transaction failed: ${storeName}`))
    transaction.onabort = () => reject(transaction.error || new Error(`IndexedDB transaction aborted: ${storeName}`))

    Promise.resolve(callback(store))
      .then((value) => {
        result = value
      })
      .catch((error) => {
        transaction.abort()
        reject(error)
      })
  })
}

function requestToPromise(request) {
  return new Promise((resolve, reject) => {
    request.onsuccess = () => resolve(request.result)
    request.onerror = () => reject(request.error || new Error('IndexedDB request failed'))
  })
}

export async function getStaticJson(key) {
  const record = await withStore(STATIC_STORE, 'readonly', (store) => requestToPromise(store.get(key)))
  return record?.value || null
}

export async function setStaticJson(key, value) {
  return withStore(STATIC_STORE, 'readwrite', (store) => requestToPromise(store.put({
    key,
    value,
    updatedAt: Date.now(),
  })))
}

export async function getUserCache(userId) {
  if (!userId) return null
  const record = await withStore(USER_CACHE_STORE, 'readonly', (store) => requestToPromise(store.get(userId)))
  return record?.value || null
}

export async function setUserCache(userId, value) {
  if (!userId) return null
  return withStore(USER_CACHE_STORE, 'readwrite', (store) => requestToPromise(store.put({
    key: userId,
    value,
    updatedAt: Date.now(),
  })))
}

export async function clearUserCache(userId) {
  if (!userId) return null
  return withStore(USER_CACHE_STORE, 'readwrite', (store) => requestToPromise(store.delete(userId)))
}

export async function addPendingOperation(userId, operation) {
  if (!userId || !operation) return null
  return withStore(PENDING_OP_STORE, 'readwrite', (store) => requestToPromise(store.add({
    userId,
    operation,
    createdAt: Date.now(),
  })))
}

export async function getPendingOperations(userId) {
  if (!userId) return []

  return withStore(PENDING_OP_STORE, 'readonly', async (store) => {
    const index = store.index('userId')
    const records = await requestToPromise(index.getAll(userId))
    return (records || []).sort((left, right) => left.id - right.id)
  }) || []
}

export async function clearPendingOperations(ids) {
  if (!Array.isArray(ids) || ids.length === 0) return null

  return withStore(PENDING_OP_STORE, 'readwrite', async (store) => {
    for (const id of ids) {
      await requestToPromise(store.delete(id))
    }
    return true
  })
}
