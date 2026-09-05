/**
 * A lista ordenada dos 1.189 capítulos da Bíblia, de Gênesis 1 a Apocalipse 22.
 *
 * É exatamente a ordem de leitura do plano: um capítulo por dia, nesta
 * sequência, recomeçando do início ao terminar.
 */

import { BOOKS, TOTAL_CHAPTERS } from './books.js'

/**
 * @typedef {Object} ChapterEntry
 * @property {string} reference        Ex.: "Salmos 28"
 * @property {number} chapter          Número do capítulo dentro do livro
 * @property {import('./books.js').Book} book
 */

/** @type {ReadonlyArray<ChapterEntry>} */
export const CHAPTERS = Object.freeze(
  BOOKS.flatMap((book) =>
    Array.from({ length: book.chapters }, (_, index) => {
      const chapter = index + 1
      return Object.freeze({
        reference: `${book.name} ${chapter}`,
        chapter,
        book,
      })
    }),
  ),
)

/** Quantidade de dias de um ciclo completo: 1.189. */
export const CYCLE_LENGTH = TOTAL_CHAPTERS

/**
 * Índice base zero de um capítulo dentro do ciclo.
 * Ex.: `indexOfChapter('salmos', 28)` devolve 505 (dia 506 do ciclo).
 *
 * @param {string} slug     Slug do livro, ex.: "salmos"
 * @param {number} chapter  Número do capítulo dentro do livro, base 1
 * @returns {number}
 */
export function indexOfChapter(slug, chapter) {
  let index = 0
  for (const book of BOOKS) {
    if (book.slug === slug) {
      if (!Number.isInteger(chapter) || chapter < 1 || chapter > book.chapters) {
        throw new RangeError(`${book.name} não tem capítulo ${chapter}`)
      }
      return index + chapter - 1
    }
    index += book.chapters
  }
  throw new RangeError(`Livro desconhecido: ${slug}`)
}
