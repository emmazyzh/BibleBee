function parseVerseId(verseId) {
  const [bookKey, chapter, verseSpec] = String(verseId || '').split('_')

  if (!bookKey || !chapter || !verseSpec) {
    throw new Error(`Invalid verse id: ${verseId}`)
  }

  return { bookKey, chapter, verseSpec }
}

function expandVerseSpec(verseSpec) {
  if (verseSpec.includes('-')) {
    const [start, end] = verseSpec.split('-').map(Number)
    const verses = []

    for (let index = start; index <= end; index += 1) {
      verses.push(String(index))
    }

    return verses
  }

  return [verseSpec]
}

function buildKeywords(chineseText) {
  return String(chineseText || '')
    .split(/[，。；、：「」？！\s]+/u)
    .map((part) => part.trim())
    .filter((part) => part.length >= 2)
    .slice(0, 4)
}

function buildPlanVerseIndex(frequentData) {
  if (Array.isArray(frequentData)) {
    return frequentData.reduce((index, verse) => {
      if (verse?.verse_id && !index[verse.verse_id]) {
        index[verse.verse_id] = verse
      }
      return index
    }, {})
  }

  return Object.values(frequentData || {}).reduce((index, plan) => {
    for (const verse of plan?.verses || []) {
      if (verse?.verse_id && !index[verse.verse_id]) {
        index[verse.verse_id] = verse
      }
    }

    return index
  }, {})
}

export function getVerseDetailsFromStaticData(verseId, combinedBible, frequentData, versions = { english: 'niv', chinese: 'cuv' }) {
  const { bookKey, chapter, verseSpec } = parseVerseId(verseId)
  const planVerseIndex = buildPlanVerseIndex(frequentData)
  const book = combinedBible?.[bookKey]
  const planVerse = planVerseIndex[verseId]

  if (planVerse) {
    const englishVersion = versions.english || 'niv'
    const chineseVersion = versions.chinese || 'cuv'

    return {
      id: verseId,
      verseId,
      reference: book ? `${book.bookEn} ${chapter}:${verseSpec}` : verseId,
      referenceCN: book ? `${book.bookZh} ${chapter}:${verseSpec}` : verseId,
      english: planVerse[englishVersion] || planVerse.esv || planVerse.niv || '',
      chinese: planVerse[chineseVersion] || planVerse.cuv || '',
      chineseBlank: planVerse.cuv_blank || planVerse[chineseVersion] || planVerse.cuv || '',
      keywords: buildKeywords(planVerse[chineseVersion] || planVerse.cuv || ''),
    }
  }

  const chapterData = book?.chapters?.[chapter]
  if (!book || !chapterData) {
    return {
      id: verseId,
      verseId,
      reference: verseId,
      referenceCN: verseId,
      english: '',
      chinese: '',
      chineseBlank: '',
      keywords: [],
    }
  }

  const verseNumbers = expandVerseSpec(verseSpec)
  const englishVersion = versions.english || 'niv'
  const chineseVersion = versions.chinese || 'cuv'

  const english = verseNumbers
    .map((number) => chapterData[number]?.[englishVersion] || chapterData[number]?.esv || chapterData[number]?.niv || '')
    .filter(Boolean)
    .join(' ')

  const chinese = verseNumbers
    .map((number) => chapterData[number]?.[chineseVersion] || chapterData[number]?.cuv || '')
    .filter(Boolean)
    .join('')

  const chineseBlank = verseNumbers
    .map((number) => chapterData[number]?.cuv_blank || chapterData[number]?.[chineseVersion] || chapterData[number]?.cuv || '')
    .filter(Boolean)
    .join('')

  return {
    id: verseId,
    verseId,
    reference: `${book.bookEn} ${chapter}:${verseSpec}`,
    referenceCN: `${book.bookZh} ${chapter}:${verseSpec}`,
    english,
    chinese,
    chineseBlank,
    keywords: buildKeywords(chinese),
  }
}
