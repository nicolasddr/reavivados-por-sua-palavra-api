# Plano — Reavivados Por Sua Palavra API

> Documento de planejamento. Revisado e aprovado antes da implementação.

## 1. Objetivo

Publicar, como arquivos JSON estáticos em um repositório GitHub, qual capítulo da
Bíblia corresponde a cada dia do plano de leitura **Reavivados Por Sua Palavra**
da Igreja Adventista do Sétimo Dia.

O projeto lê a Bíblia inteira a um capítulo por dia, de Gênesis 1 a Apocalipse 22,
e recomeça em seguida — indefinidamente.

A intenção é que qualquer pessoa consiga criar sites e aplicativos próprios
consumindo esses dados, sem depender de nenhum servidor nosso.

## 2. O modelo

A Bíblia tem **1.189 capítulos** (929 no Antigo Testamento, 260 no Novo).
Um ciclo completo dura 1.189 dias, ou aproximadamente 3 anos e 3 meses.

Como não há realinhamento de calendário em nenhum momento do ano, a regra é
uma função pura:

```
capítulo(data) = CAPÍTULOS[ (dias entre a época e a data) mod 1189 ]
```

### Anos bissextos

Não são um caso especial. A conta é feita em **dias corridos**, não em anos ou
dias-do-ano. O 29 de fevereiro é apenas mais um dia, que consome um capítulo
como qualquer outro. A aritmética de datas já cobre o calendário gregoriano
inteiro.

A única armadilha real é usar horário **local** em vez de UTC: sob horário de
verão um dia pode ter 23 ou 25 horas e a divisão quebra. Por isso toda a
aritmética é feita em UTC sobre datas civis (`YYYY-MM-DD`), nunca com timestamps.

### A época

Derivada da âncora confirmada **04/09/2026 → Salmos 28**.

Salmos 28 é o capítulo nº 506 do ciclo, o que coloca o início do ciclo corrente
em 17/04/2025. Voltando de 1.189 em 1.189 dias:

| Ciclo | Início | Fim |
|-------|------------|------------|
| 1 | 09/04/2012 | 11/07/2015 |
| 2 | 12/07/2015 | 12/10/2018 |
| 3 | 13/10/2018 | 13/01/2022 |
| 4 | 14/01/2022 | 16/04/2025 |
| **5** | **17/04/2025** | **18/07/2028** |
| 6 | 19/07/2028 | 20/10/2031 |

O ciclo 1 cai em abril de 2012, coerente com o lançamento mundial do projeto.
Isso corrobora a época, mas não foi verificado em fonte oficial.

**Observação importante:** ainda que a data de 2012 esteja incorreta, o capítulo
de cada dia permanece correto — a época só é usada em módulo 1.189. O único
campo afetado seria o número em `cycle`.

## 3. Decisões fechadas

| Tema | Decisão |
|---|---|
| Modelo | `época + módulo 1189`, sem realinhamento |
| Época | 09/04/2012 = ciclo 1, dia 1, Gênesis 1 |
| Hospedagem | GitHub Pages servindo a pasta `docs/` do branch principal |
| Formato | JSON estático, gerado uma única vez |
| "Hoje" | O cliente calcula a data local dele e busca aquele arquivo |
| Fuso horário | Não existe no servidor — é responsabilidade do cliente |
| Texto bíblico | Não incluído (direito autoral das traduções) |
| Links externos | Não incluídos |
| Action agendada | Não haverá |
| Faixa gerada | Ciclos 5 e 6: **17/04/2025 a 20/10/2031** |
| Idioma das chaves | Inglês |
| Idioma dos valores | Português |
| Dependências | Zero. Node puro + `node --test` |

### Por que não há `?tz=` nem endpoint `/hoje`

Quem pergunta já sabe que dia é hoje. O cliente calcula a própria data local e
busca o arquivo daquele dia:

```js
const hoje = new Date().toLocaleDateString('sv'); // "2026-09-04"
const r = await fetch(`.../v1/day/${hoje}.json`);
```

Isso funciona corretamente no Brasil, em Portugal ou no Japão, sem nenhum
parâmetro. O problema de fuso horário deixa de existir em vez de ser resolvido.

### Por que não há Action diária

Todo arquivo de dia é imutável: gerado uma vez, nunca mais alterado. Uma rotina
agendada só faria sentido para manter um `hoje.json`, que não teremos. Além
disso, o GitHub desativa workflows agendados após 60 dias sem atividade no
repositório — a rotina pararia em silêncio e o arquivo congelaria em um capítulo
antigo, errado e sem aviso. O GitHub Actions será usado apenas para rodar os
testes em Pull Request.

## 4. Estrutura do repositório

```
reavivados-por-sua-palavra-api/
├── README.md
├── PLANO.md
├── LICENSE                        MIT (código) + CC0 (dados)
├── package.json                   type:module + scripts
├── src/
│   ├── books.js                   tabela dos 66 livros
│   ├── chapters.js                lista ordenada dos 1.189 capítulos
│   ├── calendar.js                função pura: data <-> capítulo
│   └── generate.js                escreve docs/v1/
├── tests/
│   ├── books.test.js
│   ├── calendar.test.js
│   └── known-dates.json           pares data -> capítulo para verificação
├── .github/workflows/tests.yml    roda em Pull Request, não agendada
└── docs/                          publicado pelo GitHub Pages
    ├── index.html                 página mostrando o capítulo de hoje
    └── v1/
        ├── books.json
        ├── day/
        │   └── 2026-09-04.json    2.378 arquivos
        └── year/
            └── 2026.json          7 arquivos
```

A época fica isolada em uma única constante em `src/calendar.js`.

Usar `docs/` em vez de um branch `gh-pages` dispensa qualquer Action de deploy:
basta o commit.

## 5. Formato dos dados

As **chaves** são em inglês. Os **valores** permanecem em português, por serem
conteúdo do domínio: nomes de livros, abreviações e slugs.

### `GET /v1/day/2026-09-04.json`

```json
{
  "date": "2026-09-04",
  "reference": "Salmos 28",
  "book": {
    "name": "Salmos",
    "slug": "salmos",
    "abbreviation": "Sl",
    "testament": "AT",
    "position": 19
  },
  "chapter": 28,
  "cycle": 5,
  "dayOfCycle": 506,
  "totalDays": 1189
}
```

`testament` usa `"AT"` e `"NT"`, acompanhando o português dos demais valores.

### `GET /v1/year/2026.json`

Os dias do ano em um array, para montar calendários mensais sem trinta
requisições. Os anos das pontas (2025 e 2031) são parciais, contendo apenas os
dias dentro da faixa gerada.

### `GET /v1/books.json`

Os 66 livros com nome, slug, abreviação, testamento, posição e número de
capítulos.

### Datas inexistentes

`/v1/day/2026-02-29.json` simplesmente não existe e devolve 404. O modelo
estático elimina uma classe inteira de bug de validação: só há arquivo para
data que existe.

## 6. Etapas de execução

**Etapa 1 — Tabela dos livros**
Os 66 livros com nome, slug, abreviação, testamento e quantidade de capítulos.
Grafia pós-acordo ortográfico: *Cânticos*, *Oseias*, *Miqueias*, *Amós*,
*Filemom*.
Testes: 66 livros; soma exatamente 1.189 capítulos; slugs únicos.

**Etapa 2 — Função calendário**
`chapterForDate(date)` e a inversa `datesForChapter(book, chapter)`.
Aritmética exclusivamente em UTC sobre datas civis.
Testes:
- a âncora `2026-09-04 → Salmos 28`
- as viradas de ciclo: `2025-04-17 → Gênesis 1`, `2028-07-18 → Apocalipse 22`,
  `2028-07-19 → Gênesis 1`
- `29/02/2028` (bissexto) e `28/02/2027 → 01/03/2027`
- datas anteriores à época (módulo negativo)
- ida-e-volta em todos os 1.189 capítulos

**Etapa 3 — Gerador**
`node src/generate.js` reescreve `docs/v1/` por completo.
Determinístico: rodar duas vezes produz exatamente os mesmos bytes.

**Etapa 4 — Gerar e commitar**
2.378 arquivos de dia, 7 de ano, 1 de livros. Cerca de 800 KB.

**Etapa 5 — Página e README**
`index.html` mostrando o capítulo de hoje, que serve ao mesmo tempo de prova de
funcionamento e de exemplo de consumo.
README com as URLs e exemplos em JavaScript, Python e Dart.

**Etapa 6 — CI**
Action rodando os testes em Pull Request, para que nenhuma contribuição quebre
o dataset.

## 7. Fora de escopo

Deliberadamente adiados. Nenhum deles exige refazer o que está aqui:

- texto bíblico embutido
- links para sites externos
- nomes de livros em outros idiomas
- feed de calendário ICS
- endpoint dinâmico `/today`
- pacote npm
- especificação OpenAPI

## 8. Pendências

Nenhuma bloqueante.

A data de início do ciclo 1 (09/04/2012) permanece não verificada em fonte
oficial. Confirmá-la afetaria apenas o campo `cycle`, nunca o capítulo do dia.
