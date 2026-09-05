import assert from 'node:assert/strict'
import { test } from 'node:test'

import { BOOKS, TOTAL_CHAPTERS, bookBySlug } from '../src/books.js'
import { CHAPTERS, CYCLE_LENGTH, indexOfChapter } from '../src/chapters.js'

test('a Bíblia tem 66 livros', () => {
  assert.equal(BOOKS.length, 66)
})

test('a soma dos capítulos é exatamente 1.189', () => {
  assert.equal(TOTAL_CHAPTERS, 1189)
})

test('o Antigo Testamento tem 929 capítulos e o Novo, 260', () => {
  const soma = (testament) =>
    BOOKS.filter((book) => book.testament === testament).reduce((total, book) => total + book.chapters, 0)

  assert.equal(soma('AT'), 929)
  assert.equal(soma('NT'), 260)
})

test('os slugs são únicos', () => {
  const slugs = new Set(BOOKS.map((book) => book.slug))
  assert.equal(slugs.size, BOOKS.length)
})

test('as abreviações são únicas', () => {
  const abbreviations = new Set(BOOKS.map((book) => book.abbreviation))
  assert.equal(abbreviations.size, BOOKS.length)
})

test('os nomes são únicos', () => {
  const names = new Set(BOOKS.map((book) => book.name))
  assert.equal(names.size, BOOKS.length)
})

test('as posições vão de 1 a 66, em ordem', () => {
  BOOKS.forEach((book, index) => {
    assert.equal(book.position, index + 1, `${book.name} está fora de posição`)
  })
})

test('os 39 primeiros livros são do AT e os 27 seguintes, do NT', () => {
  assert.deepEqual(
    BOOKS.map((book) => book.testament),
    [...Array(39).fill('AT'), ...Array(27).fill('NT')],
  )
})

test('todo livro tem ao menos um capítulo', () => {
  for (const book of BOOKS) {
    assert.ok(book.chapters >= 1, `${book.name} tem ${book.chapters} capítulos`)
  }
})

test('os slugs são minúsculos, sem acento e sem espaço', () => {
  for (const book of BOOKS) {
    assert.match(book.slug, /^[1-3]?-?[a-z]+$/, `slug inesperado: ${book.slug}`)
  }
})

test('a grafia segue o acordo ortográfico', () => {
  const esperados = ['Cânticos', 'Oseias', 'Miqueias', 'Amós', 'Filemom']
  for (const nome of esperados) {
    assert.ok(
      BOOKS.some((book) => book.name === nome),
      `faltou o livro grafado como "${nome}"`,
    )
  }
})

test('bookBySlug encontra livros e devolve undefined para slug desconhecido', () => {
  assert.equal(bookBySlug('salmos').name, 'Salmos')
  assert.equal(bookBySlug('jo').name, 'Jó')
  assert.equal(bookBySlug('joao').name, 'João')
  assert.equal(bookBySlug('apocalipse').chapters, 22)
  assert.equal(bookBySlug('evangelho-de-tomé'), undefined)
})

test('a lista de capítulos tem 1.189 entradas, de Gênesis 1 a Apocalipse 22', () => {
  assert.equal(CHAPTERS.length, 1189)
  assert.equal(CYCLE_LENGTH, 1189)
  assert.equal(CHAPTERS[0].reference, 'Gênesis 1')
  assert.equal(CHAPTERS.at(-1).reference, 'Apocalipse 22')
})

test('os capítulos estão na ordem canônica, sem buraco nem repetição', () => {
  let esperado = 0
  for (const book of BOOKS) {
    for (let chapter = 1; chapter <= book.chapters; chapter += 1) {
      const entry = CHAPTERS[esperado]
      assert.equal(entry.book.slug, book.slug)
      assert.equal(entry.chapter, chapter)
      assert.equal(entry.reference, `${book.name} ${chapter}`)
      esperado += 1
    }
  }
  assert.equal(esperado, CHAPTERS.length)
})

test('indexOfChapter é o inverso da posição na lista', () => {
  CHAPTERS.forEach((entry, index) => {
    assert.equal(indexOfChapter(entry.book.slug, entry.chapter), index)
  })
})

test('indexOfChapter rejeita capítulo fora da faixa e livro desconhecido', () => {
  assert.throws(() => indexOfChapter('salmos', 151), RangeError)
  assert.throws(() => indexOfChapter('salmos', 0), RangeError)
  assert.throws(() => indexOfChapter('salmos', 1.5), RangeError)
  assert.throws(() => indexOfChapter('obadias', 2), RangeError)
  assert.throws(() => indexOfChapter('nao-existe', 1), RangeError)
})
