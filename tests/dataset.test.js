/**
 * Confere o dataset já gravado em `docs/v1/` contra a função calendário.
 *
 * É o que impede que um dataset desatualizado seja commitado: se alguém mexer
 * na tabela de livros ou na época e esquecer de rodar `npm run generate`, este
 * arquivo quebra no Pull Request.
 */

import assert from 'node:assert/strict'
import { readFileSync, readdirSync } from 'node:fs'
import { test } from 'node:test'

import { BOOKS, TOTAL_CHAPTERS } from '../src/books.js'
import { CYCLE_LENGTH } from '../src/chapters.js'
import { RANGE_END, RANGE_START, chapterForDate, eachDate } from '../src/calendar.js'

const DOCS = new URL('../docs/v1/', import.meta.url)

/** @param {string} path */
function lerJson(path) {
  return JSON.parse(readFileSync(new URL(path, DOCS), 'utf8'))
}

/** @param {string} path */
function listar(path) {
  return readdirSync(new URL(path, DOCS)).sort()
}

const datas = eachDate(RANGE_START, RANGE_END)

test('há um arquivo por dia da faixa, e nenhum a mais', () => {
  assert.deepEqual(
    listar('day'),
    datas.map((data) => `${data}.json`),
  )
  assert.equal(datas.length, 2 * CYCLE_LENGTH)
})

test('não existe arquivo para data inexistente', () => {
  const arquivos = new Set(listar('day'))
  for (const inexistente of ['2026-02-29.json', '2027-02-29.json', '2030-02-29.json']) {
    assert.ok(!arquivos.has(inexistente), `${inexistente} não deveria existir`)
  }
  assert.ok(arquivos.has('2028-02-29.json'), '2028 é bissexto e o arquivo deveria existir')
})

test('cada arquivo de dia bate com a função calendário', () => {
  for (const data of datas) {
    assert.deepEqual(lerJson(`day/${data}.json`), chapterForDate(data))
  }
})

test('books.json traz os 66 livros com os mesmos dados da tabela', () => {
  const arquivo = lerJson('books.json')
  assert.equal(arquivo.totalBooks, 66)
  assert.equal(arquivo.totalChapters, TOTAL_CHAPTERS)
  assert.deepEqual(
    arquivo.books,
    BOOKS.map((book) => ({
      name: book.name,
      slug: book.slug,
      abbreviation: book.abbreviation,
      testament: book.testament,
      position: book.position,
      chapters: book.chapters,
    })),
  )
})

test('há um arquivo por ano tocado pela faixa', () => {
  assert.deepEqual(listar('year'), [
    '2025.json',
    '2026.json',
    '2027.json',
    '2028.json',
    '2029.json',
    '2030.json',
    '2031.json',
  ])
})

test('os arquivos de ano contêm os mesmos dias, na mesma ordem', () => {
  const porAno = new Map()
  for (const data of datas) {
    const ano = data.slice(0, 4)
    if (!porAno.has(ano)) porAno.set(ano, [])
    porAno.get(ano).push(data)
  }

  for (const [ano, diasDoAno] of porAno) {
    const arquivo = lerJson(`year/${ano}.json`)
    assert.equal(arquivo.year, Number(ano))
    assert.equal(arquivo.from, diasDoAno[0])
    assert.equal(arquivo.to, diasDoAno.at(-1))
    assert.deepEqual(arquivo.days, diasDoAno.map(chapterForDate))
  }
})

test('só 2025 e 2031, as pontas, são anos parciais', () => {
  const parciais = ['2025', '2026', '2027', '2028', '2029', '2030', '2031'].filter(
    (ano) => lerJson(`year/${ano}.json`).partial,
  )
  assert.deepEqual(parciais, ['2025', '2031'])
})

test('2028 tem 366 dias no arquivo de ano, por ser bissexto', () => {
  assert.equal(lerJson('year/2028.json').days.length, 366)
  assert.equal(lerJson('year/2027.json').days.length, 365)
})

test('index.json descreve a faixa publicada', () => {
  const arquivo = lerJson('index.json')
  assert.equal(arquivo.version, 1)
  assert.equal(arquivo.totalDays, CYCLE_LENGTH)
  assert.equal(arquivo.from, RANGE_START)
  assert.equal(arquivo.to, RANGE_END)
  assert.equal(arquivo.days, datas.length)
  assert.deepEqual(arquivo.years, [2025, 2026, 2027, 2028, 2029, 2030, 2031])
})
