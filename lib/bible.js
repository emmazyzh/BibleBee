import combinedBible from '../data/combined.json' with { type: 'json' }

function parseVerseId(verseId) {
  const [bookKey, chapter, verseSpec] = verseId.split('_')

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
  return chineseText
    .split(/[，。；、：「」？！\s]+/u)
    .map(part => part.trim())
    .filter(part => part.length >= 2)
    .slice(0, 4)
}

export function getVerseDetails(verseId, versions = { english: 'esv', chinese: 'cuv' }) {
  const { bookKey, chapter, verseSpec } = parseVerseId(verseId)
  const book = combinedBible[bookKey]

  if (!book) {
    throw new Error(`Unknown book: ${bookKey}`)
  }

  const chapterData = book.chapters?.[chapter]
  if (!chapterData) {
    throw new Error(`Unknown chapter: ${verseId}`)
  }

  const verseNumbers = expandVerseSpec(verseSpec)
  const englishVersion = versions.english || 'esv'
  const chineseVersion = versions.chinese || 'cuv'

  const english = verseNumbers
    .map(number => chapterData[number]?.[englishVersion] || chapterData[number]?.esv || chapterData[number]?.niv || '')
    .filter(Boolean)
    .join(' ')

  const chinese = verseNumbers
    .map(number => chapterData[number]?.[chineseVersion] || chapterData[number]?.cuv || '')
    .filter(Boolean)
    .join('')

  const chineseBlank = verseNumbers
    .map(number => chapterData[number]?.cuv_blank || chapterData[number]?.[chineseVersion] || chapterData[number]?.cuv || '')
    .filter(Boolean)
    .join('')

  return {
    id: verseId,
    reference: `${book.bookEn} ${chapter}:${verseSpec}`,
    referenceCN: `${book.bookZh} ${chapter}:${verseSpec}`,
    english,
    chinese,
    chineseBlank,
    keywords: buildKeywords(chinese),
  }
}
