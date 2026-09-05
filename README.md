# Reavivados Por Sua Palavra — API

Qual capítulo da Bíblia corresponde a cada dia do plano de leitura
**Reavivados Por Sua Palavra**, da Igreja Adventista do Sétimo Dia, publicado
como arquivos JSON estáticos.

O plano lê a Bíblia inteira a um capítulo por dia, de Gênesis 1 a Apocalipse 22,
e recomeça em seguida — indefinidamente. Um ciclo completo dura 1.189 dias,
cerca de 3 anos e 3 meses.

Não há servidor, banco de dados nem chave de API. São arquivos servidos pelo
GitHub Pages, com CORS liberado, para que você monte seu site ou aplicativo sem
depender de nada nosso.

**URL base:** `https://nicolasddr.github.io/reavivados-por-sua-palavra-api`

## Como pegar o capítulo de hoje

O cliente calcula a própria data local e busca o arquivo daquele dia. Isso
funciona no Brasil, em Portugal ou no Japão, sem nenhum parâmetro de fuso
horário — o problema deixa de existir em vez de ser resolvido.

### JavaScript

```js
const BASE = 'https://nicolasddr.github.io/reavivados-por-sua-palavra-api/v1'

// 'sv' formata como YYYY-MM-DD, no fuso local de quem está lendo.
const hoje = new Date().toLocaleDateString('sv') // "2026-09-04"

const dia = await fetch(`${BASE}/day/${hoje}.json`).then((r) => r.json())
console.log(dia.reference) // "Salmos 28"
```

### Python

```python
import datetime, json, urllib.request

BASE = "https://nicolasddr.github.io/reavivados-por-sua-palavra-api/v1"

hoje = datetime.date.today().isoformat()  # "2026-09-04"

with urllib.request.urlopen(f"{BASE}/day/{hoje}.json") as r:
    dia = json.load(r)

print(dia["reference"])  # "Salmos 28"
```

### Dart

```dart
import 'dart:convert';
import 'package:http/http.dart' as http;

const base = 'https://nicolasddr.github.io/reavivados-por-sua-palavra-api/v1';

Future<String> capituloDeHoje() async {
  final agora = DateTime.now();
  final hoje = '${agora.year.toString().padLeft(4, '0')}'
      '-${agora.month.toString().padLeft(2, '0')}'
      '-${agora.day.toString().padLeft(2, '0')}';

  final resposta = await http.get(Uri.parse('$base/day/$hoje.json'));
  final dia = jsonDecode(resposta.body) as Map<String, dynamic>;

  return dia['reference'] as String; // "Salmos 28"
}
```

## Endpoints

| Arquivo | Conteúdo |
|---|---|
| `/v1/day/{YYYY-MM-DD}.json` | O capítulo de um dia |
| `/v1/year/{YYYY}.json` | Todos os dias de um ano, em um array |
| `/v1/books.json` | Os 66 livros, com abreviação e número de capítulos |
| `/v1/index.json` | A faixa publicada e a lista de endpoints |

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

As **chaves** são em inglês. Os **valores** permanecem em português, por serem
conteúdo do domínio: nomes de livros, abreviações e slugs. `testament` usa
`"AT"` e `"NT"`.

### `GET /v1/year/2026.json`

Os dias do ano em um array, para montar um calendário mensal inteiro sem trinta
requisições. Cada item tem exatamente a mesma forma do arquivo de dia.

```json
{
  "year": 2026,
  "from": "2026-01-01",
  "to": "2026-12-31",
  "partial": false,
  "days": [ { "date": "2026-01-01", "reference": "1 Samuel 24", "…": "…" } ]
}
```

`partial` é `true` nos anos das pontas (2025 e 2031), que contêm apenas os dias
dentro da faixa publicada.

### Datas inexistentes

`/v1/day/2026-02-29.json` simplesmente não existe e devolve 404. Só há arquivo
para data que existe — o modelo estático elimina uma classe inteira de bug de
validação.

## Faixa publicada

De **17/04/2025 a 20/10/2031**: os ciclos 5 e 6 completos, 2.378 dias.

| Ciclo | Início | Fim |
|-------|------------|------------|
| 1 | 09/04/2012 | 11/07/2015 |
| 2 | 12/07/2015 | 12/10/2018 |
| 3 | 13/10/2018 | 13/01/2022 |
| 4 | 14/01/2022 | 16/04/2025 |
| **5** | **17/04/2025** | **18/07/2028** |
| **6** | **19/07/2028** | **20/10/2031** |

Fora dessa faixa, use o código: `chapterForDate()` funciona para qualquer data,
inclusive anteriores à época.

## O modelo

Como não há realinhamento de calendário em nenhum momento do ano, a regra é uma
função pura:

```
capítulo(data) = CAPÍTULOS[ (dias entre a época e a data) mod 1189 ]
```

A época é **09/04/2012 = ciclo 1, dia 1, Gênesis 1**, derivada da âncora
confirmada 04/09/2026 → Salmos 28 (o capítulo nº 506 do ciclo).

**Anos bissextos não são caso especial.** A conta é feita em dias corridos, não
em anos ou dias-do-ano: o 29 de fevereiro é apenas mais um dia, que consome um
capítulo como qualquer outro.

A única armadilha real é usar horário **local** em vez de UTC — sob horário de
verão um dia pode ter 23 ou 25 horas e a divisão por dia quebra. Por isso toda a
aritmética aqui é feita em UTC sobre datas civis (`YYYY-MM-DD`), nunca com
timestamps.

## Desenvolvimento

Zero dependências. Node 18 ou mais novo, e só a biblioteca padrão.

```bash
npm test          # node --test
npm run generate  # reescreve docs/v1/ por completo
```

O gerador é determinístico: rodar duas vezes produz exatamente os mesmos bytes.
Um `git status` limpo depois de gerar significa que nada mudou de fato — é
justamente o que o CI verifica em cada Pull Request.

```
src/books.js      tabela dos 66 livros
src/chapters.js   lista ordenada dos 1.189 capítulos
src/calendar.js   função pura: data <-> capítulo (a época mora aqui)
src/generate.js   escreve docs/v1/
```

Não há workflow agendado, de propósito: todo arquivo de dia é imutável, gerado
uma vez e nunca mais alterado. Uma rotina agendada só faria sentido para manter
um `hoje.json`, que não temos — e o GitHub desativa workflows agendados após 60
dias sem atividade, o que congelaria o arquivo em um capítulo antigo, errado e
sem aviso.

## Publicação

GitHub Pages servindo a pasta `docs/` do branch principal. Não há Action de
deploy: basta o commit.

## Fora de escopo

Deliberadamente adiados; nenhum deles exige refazer o que está aqui.

- texto bíblico embutido (as traduções modernas têm direito autoral próprio)
- links para sites externos
- nomes de livros em outros idiomas
- feed de calendário ICS
- endpoint dinâmico `/today`
- pacote npm
- especificação OpenAPI

## Licença

Código MIT, dados em domínio público (CC0). Veja [LICENSE](LICENSE).

Nenhum texto bíblico é incluído — apenas referências de capítulo.

Este é um projeto independente, não é publicação oficial da Igreja Adventista do
Sétimo Dia.
