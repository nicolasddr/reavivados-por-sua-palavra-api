/**
 * A regra do plano de leitura, como função pura.
 *
 *     capítulo(data) = CAPÍTULOS[ (dias entre a época e a data) mod 1189 ]
 *
 * Não há realinhamento de calendário em nenhum momento do ano. Anos bissextos
 * não são caso especial: a conta é feita em dias corridos, e o 29 de fevereiro
 * consome um capítulo como qualquer outro dia.
 *
 * Toda a aritmética é feita em UTC sobre datas civis (`YYYY-MM-DD`), nunca com
 * timestamps locais — sob horário de verão um dia pode ter 23 ou 25 horas e a
 * divisão por dia quebraria.
 */

import { CHAPTERS, CYCLE_LENGTH, indexOfChapter } from './chapters.js'

/**
 * A época do plano: 09/04/2012 é o dia 1 do ciclo 1, Gênesis 1.
 *
 * Derivada da âncora confirmada 04/09/2026 -> Salmos 28 (capítulo nº 506 do
 * ciclo), voltando de 1.189 em 1.189 dias. Ainda que a data de 2012 esteja
 * incorreta, o capítulo de cada dia permanece correto — a época só é usada em
 * módulo 1.189, e o único campo afetado seria `cycle`.
 */
export const EPOCH = '2012-04-09'

/** Primeiro dia da faixa publicada (início do ciclo 5). */
export const RANGE_START = '2025-04-17'

/** Último dia da faixa publicada (fim do ciclo 6). */
export const RANGE_END = '2031-10-20'

const MS_PER_DAY = 86_400_000
const DATE_PATTERN = /^(\d{4})-(\d{2})-(\d{2})$/

/**
 * Converte uma data civil `YYYY-MM-DD` no instante da meia-noite UTC daquele dia.
 *
 * Rejeita datas que não existem: `2026-02-29` não passa, porque 2026 não é
 * bissexto e a data reformatada não bate com a de entrada.
 *
 * @param {string} date
 * @returns {number} milissegundos desde a época Unix, em UTC
 */
export function parseDate(date) {
  if (typeof date !== 'string') {
    throw new TypeError(`Data deve ser uma string YYYY-MM-DD, recebido: ${typeof date}`)
  }
  const match = DATE_PATTERN.exec(date)
  if (match === null) {
    throw new RangeError(`Data fora do formato YYYY-MM-DD: ${date}`)
  }
  const year = Number(match[1])
  const month = Number(match[2])
  const day = Number(match[3])
  const utc = Date.UTC(year, month - 1, day)
  if (Number.isNaN(utc) || formatDate(utc) !== date) {
    throw new RangeError(`Data inexistente: ${date}`)
  }
  return utc
}

/**
 * Formata um instante UTC como data civil `YYYY-MM-DD`.
 * @param {number|Date} utc
 * @returns {string}
 */
export function formatDate(utc) {
  const value = new Date(utc)
  const year = String(value.getUTCFullYear()).padStart(4, '0')
  const month = String(value.getUTCMonth() + 1).padStart(2, '0')
  const day = String(value.getUTCDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

/**
 * Soma dias a uma data civil, em UTC.
 * @param {string} date
 * @param {number} days
 * @returns {string}
 */
export function addDays(date, days) {
  return formatDate(parseDate(date) + days * MS_PER_DAY)
}

/**
 * Dias corridos de `from` até `to`. Negativo se `to` for anterior.
 * @param {string} from
 * @param {string} to
 * @returns {number}
 */
export function daysBetween(from, to) {
  return (parseDate(to) - parseDate(from)) / MS_PER_DAY
}

const EPOCH_UTC = parseDate(EPOCH)

/**
 * O capítulo lido em uma data, com o ciclo e a posição dentro dele.
 *
 * Datas anteriores à época são válidas: o módulo é normalizado para positivo e
 * o ciclo passa a ser 0, -1, e assim por diante.
 *
 * @param {string} date data civil `YYYY-MM-DD`
 * @returns {{
 *   date: string,
 *   reference: string,
 *   book: { name: string, slug: string, abbreviation: string, testament: 'AT'|'NT', position: number },
 *   chapter: number,
 *   cycle: number,
 *   dayOfCycle: number,
 *   totalDays: number,
 * }}
 */
export function chapterForDate(date) {
  const days = (parseDate(date) - EPOCH_UTC) / MS_PER_DAY
  const dayOfCycle = ((days % CYCLE_LENGTH) + CYCLE_LENGTH) % CYCLE_LENGTH
  const cycle = Math.floor(days / CYCLE_LENGTH) + 1
  const entry = CHAPTERS[dayOfCycle]
  return {
    date,
    reference: entry.reference,
    book: {
      name: entry.book.name,
      slug: entry.book.slug,
      abbreviation: entry.book.abbreviation,
      testament: entry.book.testament,
      position: entry.book.position,
    },
    chapter: entry.chapter,
    cycle,
    dayOfCycle: dayOfCycle + 1,
    totalDays: CYCLE_LENGTH,
  }
}

/**
 * A inversa: em que datas um capítulo é lido, dentro de uma faixa.
 *
 * Como o ciclo dura 1.189 dias e a faixa publicada cobre dois ciclos, o
 * resultado normalmente traz duas datas.
 *
 * @param {string} slug     Slug do livro, ex.: "salmos"
 * @param {number} chapter  Capítulo dentro do livro, base 1
 * @param {{ from?: string, to?: string }} [range]
 * @returns {string[]} datas em ordem crescente
 */
export function datesForChapter(slug, chapter, range = {}) {
  const { from = RANGE_START, to = RANGE_END } = range
  const index = indexOfChapter(slug, chapter)
  const firstDay = (parseDate(from) - EPOCH_UTC) / MS_PER_DAY
  const lastDay = (parseDate(to) - EPOCH_UTC) / MS_PER_DAY

  const shift = (((index - firstDay) % CYCLE_LENGTH) + CYCLE_LENGTH) % CYCLE_LENGTH
  const dates = []
  for (let day = firstDay + shift; day <= lastDay; day += CYCLE_LENGTH) {
    dates.push(formatDate(EPOCH_UTC + day * MS_PER_DAY))
  }
  return dates
}

/**
 * Todas as datas civis de `from` a `to`, inclusive nas duas pontas.
 * @param {string} from
 * @param {string} to
 * @returns {string[]}
 */
export function eachDate(from, to) {
  const dates = []
  const last = parseDate(to)
  for (let utc = parseDate(from); utc <= last; utc += MS_PER_DAY) {
    dates.push(formatDate(utc))
  }
  return dates
}
