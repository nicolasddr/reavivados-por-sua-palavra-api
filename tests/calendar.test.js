import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { test } from 'node:test'

import { CHAPTERS, CYCLE_LENGTH } from '../src/chapters.js'
import {
  EPOCH,
  RANGE_END,
  RANGE_START,
  addDays,
  chapterForDate,
  datesForChapter,
  daysBetween,
  eachDate,
  formatDate,
  parseDate,
} from '../src/calendar.js'

const known = JSON.parse(readFileSync(new URL('./known-dates.json', import.meta.url), 'utf8'))

test('a âncora confirmada: 2026-09-04 é Salmos 28', () => {
  const dia = chapterForDate('2026-09-04')
  assert.equal(dia.reference, 'Salmos 28')
  assert.equal(dia.book.slug, 'salmos')
  assert.equal(dia.book.abbreviation, 'Sl')
  assert.equal(dia.book.testament, 'AT')
  assert.equal(dia.book.position, 19)
  assert.equal(dia.chapter, 28)
  assert.equal(dia.cycle, 5)
  assert.equal(dia.dayOfCycle, 506)
  assert.equal(dia.totalDays, 1189)
})

test('todos os pares conhecidos de data -> capítulo', () => {
  for (const esperado of known.dates) {
    const dia = chapterForDate(esperado.date)
    assert.equal(dia.reference, esperado.reference, `${esperado.date} (${esperado.why})`)
    assert.equal(dia.cycle, esperado.cycle, `${esperado.date} (${esperado.why})`)
    assert.equal(dia.dayOfCycle, esperado.dayOfCycle, `${esperado.date} (${esperado.why})`)
  }
})

test('a época é o dia 1 do ciclo 1, Gênesis 1', () => {
  const dia = chapterForDate(EPOCH)
  assert.equal(dia.reference, 'Gênesis 1')
  assert.equal(dia.cycle, 1)
  assert.equal(dia.dayOfCycle, 1)
})

test('as viradas de ciclo', () => {
  assert.equal(chapterForDate('2025-04-17').reference, 'Gênesis 1')
  assert.equal(chapterForDate('2028-07-18').reference, 'Apocalipse 22')
  assert.equal(chapterForDate('2028-07-19').reference, 'Gênesis 1')

  assert.equal(chapterForDate('2025-04-17').cycle, 5)
  assert.equal(chapterForDate('2028-07-18').cycle, 5)
  assert.equal(chapterForDate('2028-07-19').cycle, 6)
})

test('um ciclo dura exatamente 1.189 dias', () => {
  assert.equal(daysBetween('2025-04-17', '2028-07-19'), CYCLE_LENGTH)
  assert.equal(daysBetween('2028-07-19', '2031-10-21'), CYCLE_LENGTH)
})

test('o 29 de fevereiro não é caso especial: consome um capítulo como os demais', () => {
  assert.equal(chapterForDate('2028-02-28').reference, 'Romanos 2')
  assert.equal(chapterForDate('2028-02-29').reference, 'Romanos 3')
  assert.equal(chapterForDate('2028-03-01').reference, 'Romanos 4')
})

test('em ano comum, 28/02 é seguido direto por 01/03', () => {
  const fevereiro = chapterForDate('2027-02-28')
  const marco = chapterForDate('2027-03-01')
  assert.equal(marco.dayOfCycle - fevereiro.dayOfCycle, 1)
  assert.equal(fevereiro.reference, 'Isaías 4')
  assert.equal(marco.reference, 'Isaías 5')
})

test('a virada de ano não realinha nada', () => {
  const ultimo = chapterForDate('2025-12-31')
  const primeiro = chapterForDate('2026-01-01')
  assert.equal(primeiro.dayOfCycle - ultimo.dayOfCycle, 1)
})

test('datas anteriores à época funcionam, com módulo negativo normalizado', () => {
  const vespera = chapterForDate('2012-04-08')
  assert.equal(vespera.reference, 'Apocalipse 22')
  assert.equal(vespera.dayOfCycle, CYCLE_LENGTH)
  assert.equal(vespera.cycle, 0)

  const umCicloAntes = chapterForDate(addDays(EPOCH, -CYCLE_LENGTH))
  assert.equal(umCicloAntes.reference, 'Gênesis 1')
  assert.equal(umCicloAntes.dayOfCycle, 1)
  assert.equal(umCicloAntes.cycle, 0)

  const doisCiclosAntes = chapterForDate(addDays(EPOCH, -2 * CYCLE_LENGTH))
  assert.equal(doisCiclosAntes.reference, 'Gênesis 1')
  assert.equal(doisCiclosAntes.cycle, -1)
})

test('dias consecutivos avançam exatamente um capítulo, ciclo inteiro', () => {
  let data = RANGE_START
  for (let i = 0; i < CYCLE_LENGTH; i += 1) {
    const dia = chapterForDate(data)
    assert.equal(dia.dayOfCycle, i + 1)
    assert.equal(dia.reference, CHAPTERS[i].reference)
    data = addDays(data, 1)
  }
  assert.equal(chapterForDate(data).dayOfCycle, 1)
})

test('somar 1.189 dias a qualquer data devolve o mesmo capítulo', () => {
  for (const data of ['2025-04-17', '2026-09-04', '2027-02-28', '2028-02-29', '2030-11-11']) {
    assert.equal(
      chapterForDate(addDays(data, CYCLE_LENGTH)).reference,
      chapterForDate(data).reference,
    )
  }
})

test('ida-e-volta em todos os 1.189 capítulos', () => {
  for (const entry of CHAPTERS) {
    const datas = datesForChapter(entry.book.slug, entry.chapter)
    assert.equal(datas.length, 2, `${entry.reference} deveria cair duas vezes na faixa publicada`)
    for (const data of datas) {
      assert.equal(chapterForDate(data).reference, entry.reference)
    }
    assert.equal(daysBetween(datas[0], datas[1]), CYCLE_LENGTH)
  }
})

test('datesForChapter aceita uma faixa própria', () => {
  assert.deepEqual(datesForChapter('genesis', 1, { from: '2025-04-17', to: '2025-04-17' }), [
    '2025-04-17',
  ])
  assert.deepEqual(datesForChapter('genesis', 2, { from: '2025-04-17', to: '2025-04-17' }), [])
  assert.deepEqual(datesForChapter('salmos', 28, { from: '2025-01-01', to: '2030-01-01' }), [
    '2026-09-04',
    '2029-12-06',
  ])
})

test('datesForChapter rejeita capítulo inexistente', () => {
  assert.throws(() => datesForChapter('obadias', 2), RangeError)
  assert.throws(() => datesForChapter('nao-existe', 1), RangeError)
})

test('parseDate rejeita datas inexistentes', () => {
  assert.throws(() => parseDate('2026-02-29'), RangeError)
  assert.throws(() => parseDate('2025-02-30'), RangeError)
  assert.throws(() => parseDate('2025-13-01'), RangeError)
  assert.throws(() => parseDate('2025-00-10'), RangeError)
  assert.throws(() => parseDate('2025-04-31'), RangeError)
  assert.doesNotThrow(() => parseDate('2028-02-29'))
})

test('parseDate exige o formato YYYY-MM-DD', () => {
  assert.throws(() => parseDate('4/9/2026'), RangeError)
  assert.throws(() => parseDate('2026-9-4'), RangeError)
  assert.throws(() => parseDate('2026-09-04T00:00:00Z'), RangeError)
  assert.throws(() => parseDate(''), RangeError)
  assert.throws(() => parseDate(20260904), TypeError)
  assert.throws(() => parseDate(null), TypeError)
})

test('a aritmética é em UTC e não depende do fuso da máquina', () => {
  // parseDate devolve sempre a meia-noite UTC, nunca a local.
  assert.equal(new Date(parseDate('2026-09-04')).toISOString(), '2026-09-04T00:00:00.000Z')
  assert.equal(formatDate(parseDate('2026-09-04')), '2026-09-04')

  // Datas dentro do horário de verão do hemisfério sul e do norte, onde um dia
  // local pode ter 23 ou 25 horas: aqui todo dia tem 24 horas exatas.
  assert.equal(daysBetween('2025-10-01', '2025-11-01'), 31)
  assert.equal(daysBetween('2026-03-01', '2026-04-01'), 31)
})

test('eachDate cobre as duas pontas, inclusive', () => {
  assert.deepEqual(eachDate('2026-02-27', '2026-03-02'), [
    '2026-02-27',
    '2026-02-28',
    '2026-03-01',
    '2026-03-02',
  ])
  assert.equal(eachDate(RANGE_START, RANGE_END).length, 2 * CYCLE_LENGTH)
  assert.deepEqual(eachDate('2026-01-02', '2026-01-01'), [])
})

test('a faixa publicada cobre exatamente dois ciclos completos', () => {
  assert.equal(chapterForDate(RANGE_START).dayOfCycle, 1)
  assert.equal(chapterForDate(RANGE_END).dayOfCycle, CYCLE_LENGTH)
  assert.equal(daysBetween(RANGE_START, RANGE_END) + 1, 2 * CYCLE_LENGTH)
})
