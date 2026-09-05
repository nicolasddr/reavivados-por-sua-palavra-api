/**
 * Gerador do dataset estático.
 *
 *     node src/generate.js
 *
 * Reescreve `docs/v1/` por completo, a partir do zero. É determinístico: rodar
 * duas vezes seguidas produz exatamente os mesmos bytes, então um `git status`
 * limpo depois de gerar significa que nada mudou de fato.
 *
 * `docs/index.html` e `docs/.nojekyll` não são tocados — o gerador só manda em
 * `docs/v1/`.
 */

import { mkdir, rm, writeFile } from 'node:fs/promises'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

import { BOOKS, TOTAL_CHAPTERS } from './books.js'
import { CYCLE_LENGTH } from './chapters.js'
import { RANGE_END, RANGE_START, chapterForDate, eachDate } from './calendar.js'

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..')
const OUT = join(ROOT, 'docs', 'v1')

/**
 * Serializa sempre da mesma forma: 2 espaços de indentação e quebra de linha
 * final. A ordem das chaves é a de inserção do objeto, que é fixa no código.
 *
 * @param {unknown} value
 * @returns {string}
 */
function serialize(value) {
  return `${JSON.stringify(value, null, 2)}\n`
}

/**
 * Igual a `serialize`, mas com cada dia do array em uma linha só. Um arquivo de
 * ano tem centenas de dias com a mesma forma: em uma linha cada, fica metade do
 * tamanho e continua legível e greppável.
 *
 * @param {{ days: unknown[] }} value
 * @returns {string}
 */
function serializeYear(value) {
  const { days, ...envelope } = value
  const head = JSON.stringify(envelope, null, 2).slice(0, -2)
  const lines = days.map((day) => `    ${JSON.stringify(day)}`).join(',\n')
  return `${head},\n  "days": [\n${lines}\n  ]\n}\n`
}

/**
 * @param {string} path
 * @param {unknown} value
 */
async function writeJson(path, value) {
  await writeFile(path, serialize(value), 'utf8')
}

async function main() {
  await rm(OUT, { recursive: true, force: true })
  await mkdir(join(OUT, 'day'), { recursive: true })
  await mkdir(join(OUT, 'year'), { recursive: true })

  const dates = eachDate(RANGE_START, RANGE_END)
  const days = dates.map(chapterForDate)

  await writeJson(join(OUT, 'books.json'), {
    totalBooks: BOOKS.length,
    totalChapters: TOTAL_CHAPTERS,
    books: BOOKS.map((book) => ({
      name: book.name,
      slug: book.slug,
      abbreviation: book.abbreviation,
      testament: book.testament,
      position: book.position,
      chapters: book.chapters,
    })),
  })

  for (const day of days) {
    await writeJson(join(OUT, 'day', `${day.date}.json`), day)
  }

  /** @type {Map<string, typeof days>} */
  const byYear = new Map()
  for (const day of days) {
    const year = day.date.slice(0, 4)
    const bucket = byYear.get(year)
    if (bucket === undefined) byYear.set(year, [day])
    else bucket.push(day)
  }

  for (const [year, yearDays] of byYear) {
    const path = join(OUT, 'year', `${year}.json`)
    const content = serializeYear({
      year: Number(year),
      from: yearDays[0].date,
      to: yearDays[yearDays.length - 1].date,
      // Anos das pontas são parciais: só contêm os dias dentro da faixa gerada.
      partial: yearDays.length !== daysInYear(Number(year)),
      days: yearDays,
    })
    await writeFile(path, content, 'utf8')
  }

  await writeJson(join(OUT, 'index.json'), {
    version: 1,
    totalDays: CYCLE_LENGTH,
    from: RANGE_START,
    to: RANGE_END,
    days: dates.length,
    years: [...byYear.keys()].map(Number),
    endpoints: {
      books: '/v1/books.json',
      day: '/v1/day/{YYYY-MM-DD}.json',
      year: '/v1/year/{YYYY}.json',
    },
  })

  console.log(
    `docs/v1: ${dates.length} dias (${RANGE_START} a ${RANGE_END}), ` +
      `${byYear.size} anos, 1 livros.json, 1 index.json`,
  )
}

/**
 * @param {number} year
 * @returns {number}
 */
function daysInYear(year) {
  const leap = (year % 4 === 0 && year % 100 !== 0) || year % 400 === 0
  return leap ? 366 : 365
}

await main()
