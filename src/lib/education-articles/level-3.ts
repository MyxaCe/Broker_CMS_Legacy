import { RISK_EN, RISK_RU, videos, type EducationSeed } from './types'

// Уровень 3 — Профессиональный: продвинутая рыночная аналитика.
// level = intermediate: третьего значения уровня пока нет ни в CMS, ни на сайте.

export const LEVEL_3: EducationSeed[] = [
  {
    slug: 'l3-ict-concepts',
    level: 'intermediate',
    locales: {
      ru: {
        title: 'Уровень 3 · ICT: ключевые идеи Inner Circle Trader',
        excerpt: 'Обзор концепций ICT — Kill Zones, Power of Three, Judas Swing, OTE и Silver Bullet — и как их проверять.',
        markdown: `**ICT (Inner Circle Trader)** — методика американского трейдера Майкла Хаддлстона, из которой во многом выросли Smart Money Concepts. Она описывает рынок через ликвидность, время и «справедливую цену».

Как и SMC, ICT — **одна из моделей**, а не доказанный закон рынка. У неё много сторонников и много критиков. Отнеситесь к ней как к набору гипотез, которые нужно проверить на своих данных, прежде чем рисковать деньгами.

## Базовые идеи (Core Concepts)

- **Ликвидность** — цена движется от одного скопления стоп-ордеров к другому.
- **Premium и Discount** — диапазон делят пополам: выше середины — «дорого» (продажи), ниже — «дёшево» (покупки).
- **FVG и ордерблоки** — зоны, куда цена возвращается за ликвидностью.
- **Время** — важны не только уровни, но и часы, когда рынок активен.

## Kill Zones

**Kill Zones** — отрезки времени с наибольшей активностью, связанные с открытием торговых сессий: азиатская, лондонская, нью-йоркская. Идея: значимые движения и развороты чаще происходят в эти часы, вне их рынок тише.

Практический вывод полезен и без ICT: торговать в активные часы инструмента обычно проще, чем в затишье. Учитывайте, что разные рынки активны в разное время, а криптовалюты торгуются круглосуточно.

## Power of Three (AMD)

Модель дня или сессии из трёх фаз:

1. **Accumulation** — накопление, узкий диапазон;
2. **Manipulation** — ложное движение против будущего направления, снятие ликвидности;
3. **Distribution** — основное движение.

## Judas Swing

Частный случай фазы манипуляции: в начале сессии цена делает ложный рывок (например, вверх, снимая максимумы азиатской сессии), а затем разворачивается в настоящее направление дня.

## Optimal Trade Entry (OTE)

Зона входа на откате после импульса — уровни Фибоначчи примерно **62–79 %** от импульса. Идея — входить с хорошим соотношением риска и прибыли, когда цена вернулась в «скидку» (для покупок).

## Silver Bullet

Шаблон внутри определённого часового окна: ищут FVG, сформированный после снятия ликвидности, и входят на возврате в него. Это узкая и формализованная модель — её удобно проверять на истории.

## Курсы ICT Mentorship

Исходные материалы — большие циклы видео (в том числе Mentorship 2022). На русском доступны пересказы и переводы разного качества. Если изучаете, сверяйте с первоисточником и не путайте интерпретации авторов с исходной методикой.

## Как проверять

1. Выберите **одну** модель (например, Silver Bullet) и опишите правила так, чтобы два человека отметили одни и те же сделки.
2. Пройдите историю: 100+ примеров, включая неудачные.
3. Посчитайте долю прибыльных, средний R/R, максимальную просадку с учётом спреда и комиссий.
4. Затем — демо-счёт на несколько недель. Только после этого — небольшой реальный объём.

## Главное

- ICT описывает рынок через ликвидность, время и premium/discount.
- Kill Zones, Power of Three, Judas Swing, OTE, Silver Bullet — отдельные модели.
- Проверяйте каждую формально и на истории; результат прошлого не гарантирует будущего.

${videos('Видео по теме', [
  ['ICT Mentorship — полный курс', 'ICT Mentorship полный курс на русском'],
  ['ICT Core Concepts', 'ICT Core Concepts обучение'],
  ['ICT 2022 Mentorship', 'ICT 2022 Mentorship перевод русский'],
  ['ICT Silver Bullet', 'ICT Silver Bullet на русском'],
  ['ICT Optimal Trade Entry (OTE)', 'ICT OTE Optimal Trade Entry'],
  ['ICT Kill Zones', 'ICT Kill Zones обучение'],
  ['ICT Judas Swing', 'ICT Judas Swing на русском'],
  ['ICT Power of Three', 'ICT Power of Three AMD на русском'],
])}

${RISK_RU}`,
      },
      en: {
        title: 'Level 3 · ICT: key ideas of the Inner Circle Trader',
        excerpt: 'An overview of ICT concepts — kill zones, power of three, Judas swing, OTE and silver bullet — and how to test them.',
        markdown: `**ICT** is a methodology by Michael Huddleston from which much of Smart Money Concepts grew. It is **one model, not a proven law** — treat it as hypotheses to test.

- **Core concepts** — liquidity, premium/discount halves of a range, FVGs and order blocks, and time.
- **Kill zones** — the most active hours around session opens.
- **Power of three (AMD)** — accumulation, manipulation, distribution.
- **Judas swing** — a false move early in the session before the real direction.
- **OTE** — a pullback entry around the 62–79% Fibonacci zone.
- **Silver bullet** — an FVG entry after a liquidity sweep inside a set time window.

## How to test

Pick one model, write rules precise enough that two people mark the same trades, go through 100+ historical examples, measure win rate, average R/R and drawdown including costs, then trade it on demo before any small live size.

${videos('Videos on this topic (Russian)', [
  ['ICT Mentorship', 'ICT Mentorship полный курс на русском'],
  ['ICT core concepts', 'ICT Core Concepts обучение'],
  ['ICT 2022 Mentorship', 'ICT 2022 Mentorship перевод русский'],
  ['ICT Silver Bullet', 'ICT Silver Bullet на русском'],
  ['ICT OTE', 'ICT OTE Optimal Trade Entry'],
  ['ICT kill zones', 'ICT Kill Zones обучение'],
  ['ICT Judas swing', 'ICT Judas Swing на русском'],
  ['ICT power of three', 'ICT Power of Three AMD на русском'],
])}

${RISK_EN}`,
      },
    },
  },
  {
    slug: 'l3-advanced-liquidity',
    level: 'intermediate',
    locales: {
      ru: {
        title: 'Уровень 3 · Продвинутая ликвидность',
        excerpt: 'Buy side и sell side ликвидность, внешняя и внутренняя, равные максимумы и минимумы, inducement и liquidity grab.',
        markdown: `В продвинутых подходах (ICT, SMC, торговля от ликвидности) рынок рассматривают как движение от одного скопления заявок к другому. Понимание того, где стоят чужие стопы, помогает и находить цели, и не ставить собственный стоп в самое очевидное место.

## Buy Side и Sell Side Liquidity

- **Buy Side Liquidity (BSL)** — над максимумами. Там стоят стоп-ордера продавцов (их стоп — это покупка) и ордера на покупку на пробой.
- **Sell Side Liquidity (SSL)** — под минимумами: стопы покупателей и ордера на продажу на пробой.

Когда цена доходит до BSL, срабатывает много покупок — крупному продавцу удобно продать в этот поток. И наоборот.

## External и Internal Liquidity

- **Внешняя** — за границами текущего диапазона: главный максимум и минимум свинга.
- **Внутренняя** — внутри диапазона: мелкие экстремумы, FVG, ордерблоки.

Частая модель: цена движется от внутренней ликвидности к внешней и обратно. Сняв внешний максимум, цена может вернуться к внутренней зоне (FVG) — и наоборот.

## Equal Highs и Equal Lows

**Равные максимумы или минимумы** (две-три вершины почти на одном уровне) — очевидное место для стопов. Многие видят здесь «двойную вершину» и ставят стоп чуть выше. Поэтому такие уровни часто снимают, прежде чем пойти в обратную сторону.

## Liquidity Engineering

Идея, что рынок «строит» ликвидность: формирует аккуратные уровни, трендовые линии, равные вершины, которые привлекают стопы, а затем снимает их. Это интерпретация, а не наблюдаемый факт: заранее отличить «построенную» ликвидность от обычного уровня трудно.

## Inducement и Liquidity Grab

- **Inducement** — мелкий экстремум перед зоной интереса, на котором входят слишком рано.
- **Liquidity Grab** — быстрое снятие ликвидности с немедленным возвратом (длинная тень за уровень).

## Как использовать практично

- **Цели:** ближайшая противоположная ликвидность — логичная цель для Take Profit.
- **Стопы:** не ставьте стоп ровно за очевидным максимумом/минимумом; дайте запас или выберите другую точку отмены идеи.
- **Фильтр входа:** вход после снятия ликвидности и реакции надёжнее, чем вход перед ней.

## Пример

Две вершины BTC на 68 000 и 68 050 — равные максимумы. Цена пробивает их до 68 400 и быстро закрывает часовую свечу ниже 68 000. Сценарий продажи: снята BSL, вход после CHoCH на младшем таймфрейме, стоп выше 68 400, цель — ближайшая SSL под минимумом диапазона. Если цена закрепится выше 68 400, идея отменена. Это пример логики, а не рекомендация.

## Главное

- BSL — над максимумами, SSL — под минимумами.
- Равные вершины и очевидные уровни часто снимают перед разворотом.
- Используйте ликвидность для целей и для размещения стопа, а не как гарантию разворота.

${videos('Видео по теме', [
  ['Buy Side и Sell Side Liquidity', 'buy side sell side liquidity обучение'],
  ['External и Internal Liquidity', 'external internal liquidity ICT'],
  ['Liquidity Engineering', 'liquidity engineering ICT обучение'],
  ['Equal Highs и Equal Lows', 'equal highs equal lows трейдинг'],
  ['Inducement и Liquidity Grab', 'inducement liquidity grab ICT'],
])}

${RISK_RU}`,
      },
      en: {
        title: 'Level 3 · Advanced liquidity',
        excerpt: 'Buy-side and sell-side liquidity, external and internal liquidity, equal highs and lows, inducement and liquidity grabs.',
        markdown: `Liquidity-based approaches see price moving from one cluster of orders to another.

- **Buy-side liquidity** sits above highs, **sell-side** below lows.
- **External** liquidity lies beyond the swing range, **internal** inside it (minor swings, FVGs); price often alternates between them.
- **Equal highs/lows** attract stops and are often swept before a reversal.
- **Liquidity engineering** is an interpretation, not an observable fact.
- **Inducement** lures early entries; a **liquidity grab** is a quick sweep and return.

## Practical use

Use opposing liquidity as targets, avoid placing your own stop exactly beyond the obvious high or low and prefer entries after a sweep and reaction.

${videos('Videos on this topic (Russian)', [
  ['Buy-side and sell-side liquidity', 'buy side sell side liquidity обучение'],
  ['External and internal liquidity', 'external internal liquidity ICT'],
  ['Liquidity engineering', 'liquidity engineering ICT обучение'],
  ['Equal highs and lows', 'equal highs equal lows трейдинг'],
  ['Inducement and liquidity grab', 'inducement liquidity grab ICT'],
])}

${RISK_EN}`,
      },
    },
  },
  {
    slug: 'l3-order-flow',
    level: 'intermediate',
    locales: {
      ru: {
        title: 'Уровень 3 · Order Flow: поток ордеров, футпринт, дельта и стакан',
        excerpt: 'Что показывают кластерные графики, дельта и кумулятивная дельта, стакан и поглощение — и где эти данные есть.',
        markdown: `**Order Flow** — анализ того, *как* торгуется цена: кто агрессивнее — покупатели или продавцы, где проходит крупный объём, где заявки поглощаются. Если свеча показывает результат, то поток ордеров показывает процесс.

## Агрессор и пассивная сторона

Каждая сделка — встреча двух сторон:

- **пассивная** — лимитная заявка, которая стояла в стакане;
- **агрессивная** — рыночный ордер, который её «съел».

Покупка по ask — агрессивная покупка, продажа по bid — агрессивная продажа. На этом строятся все инструменты Order Flow.

## Footprint (кластерный график)

**Футпринт** раскладывает каждую свечу по ценам: на каждом уровне видно, сколько проторговано агрессивными покупками и продажами. Что ищут:

- **дисбалансы** — на соседних уровнях покупок в разы больше, чем продаж (или наоборот);
- **уровни с максимальным объёмом** внутри свечи;
- **отсутствие объёма** на экстремуме — движение «выдохлось».

## Delta и Cumulative Delta

- **Дельта** — агрессивные покупки минус агрессивные продажи за свечу.
- **Кумулятивная дельта** — нарастающий итог дельты.

Полезны **расхождения**: цена обновляет максимум, а кумулятивная дельта — нет. Значит, рост идёт без агрессивных покупок — признак слабости.

## DOM (Depth of Market) — стакан

**Стакан** показывает лимитные заявки на покупку и продажу рядом с текущей ценой. Крупные заявки могут остановить цену — или оказаться приманкой: их могут снять за мгновение до касания. Поэтому одного стакана мало, важно, что происходит с заявками, когда цена к ним подходит.

## Volume Delta и Absorption

**Поглощение (absorption)** — агрессивные продажи идут, объём большой, а цена не падает: кто-то крупный пассивно выкупает всё лимитными заявками. Это часто предшествует развороту или сильному отскоку.

Обратная ситуация — **истощение**: цена дошла до экстремума, а агрессивных ордеров почти нет.

## Где эти данные есть

Order Flow требует настоящих данных о сделках и заявках биржи. Они есть на централизованных рынках — фьючерсах, части акций, криптобиржах. На внебиржевом форексе единой ленты сделок нет, и объём каждого поставщика отражает только его поток.

В нашем терминале у части инструментов есть глубина рынка и лента сделок рынка-источника цен. Ваши ордера исполняет брокер по этим ценам (CFD) и в этот стакан они не попадают. У инструментов, по которым поставщик даёт только котировки, стакана и ленты нет.

## Как начать

1. Наблюдайте ленту и стакан у ключевых уровней без сделок — несколько недель.
2. Записывайте ситуации: поглощение, истощение, расхождение дельты.
3. Только потом добавляйте эти признаки как фильтр к уже проверенной системе.

## Главное

- Order Flow показывает процесс: агрессоров, дисбалансы, поглощение.
- Дельта и кумулятивная дельта помогают видеть слабость движения.
- Нужны настоящие данные биржи; на внебиржевых рынках анализ ограничен.

${videos('Видео по теме', [
  ['Order Flow Trading', 'order flow trading полный курс русский'],
  ['Footprint Charts', 'footprint charts обучение русский'],
  ['Delta и Cumulative Delta', 'delta cumulative delta трейдинг'],
  ['DOM — Depth of Market', 'DOM depth of market обучение'],
  ['Volume Delta и Absorption', 'volume delta absorption трейдинг'],
])}

${RISK_RU}`,
      },
      en: {
        title: 'Level 3 · Order flow: footprint, delta and the order book',
        excerpt: 'What footprint charts, delta and cumulative delta, the order book and absorption show — and where the data exists.',
        markdown: `Order flow analyses *how* price trades: who is aggressive, where volume concentrates and where orders are absorbed.

- **Aggressor vs passive** — market orders hit resting limit orders; buys at ask are aggressive buys.
- **Footprint** — each candle split by price into aggressive buys and sells; look for imbalances and exhaustion.
- **Delta / cumulative delta** — aggressive buys minus sells; divergences with price signal weakness.
- **DOM** — resting orders near price; large orders can be pulled, so watch what happens on approach.
- **Absorption** — heavy selling without a price drop: someone large is buying passively.

Order flow needs real exchange data (futures, some stocks, crypto exchanges); OTC forex has no consolidated tape. In our terminal some instruments show the depth and trades of the price-source market; your CFD orders are executed by the broker and do not enter that book.

${videos('Videos on this topic (Russian)', [
  ['Order flow trading', 'order flow trading полный курс русский'],
  ['Footprint charts', 'footprint charts обучение русский'],
  ['Delta and cumulative delta', 'delta cumulative delta трейдинг'],
  ['Depth of market', 'DOM depth of market обучение'],
  ['Volume delta and absorption', 'volume delta absorption трейдинг'],
])}

${RISK_EN}`,
      },
    },
  },
  {
    slug: 'l3-trading-systems',
    level: 'intermediate',
    locales: {
      ru: {
        title: 'Уровень 3 · Торговая система: стратегия, бэктест, журнал, матожидание и просадка',
        excerpt: 'Как построить собственную стратегию, проверить её на истории, вести журнал и оценивать систему цифрами.',
        markdown: `На этом уровне недостаточно знать названия моделей. Нужно уметь сформулировать гипотезу, проверить её цифрами и понять, когда стратегия перестала работать.

## Из чего состоит торговая система

1. **Рынок и время** — какие инструменты и в какие часы.
2. **Условия входа** — формально, без «по ощущениям». Пример: «цена в зоне спроса H4, на M15 CHoCH вверх, вход на откате в FVG».
3. **Стоп** — где идея отменяется.
4. **Выход** — цель, частичная фиксация, трейлинг или выход по времени.
5. **Размер позиции** — фиксированный риск на сделку.
6. **Ограничения** — дневной лимит убытка, максимум сделок, новости.

Проверка формальности: дайте правила другому человеку — он должен отметить на истории те же сделки, что и вы.

## Бэктест

**Бэктест** — проверка правил на исторических данных.

- **Ручной:** листаете график и отмечаете каждую ситуацию по правилам. Медленно, но хорошо тренирует глаз.
- **Автоматический:** правила в коде, программа прогоняет историю. Быстро, но нужны точные данные и формализация.

Правила честного бэктеста:

- достаточно примеров — хотя бы 100 сделок;
- разные периоды рынка: тренды, флэты, высокая и низкая волатильность;
- учитывайте **спред, комиссии и проскальзывание**;
- не подгоняйте параметры под историю (**переобучение**): часть данных оставьте для проверки «вслепую».

## Журнал сделок

Журнал — главный инструмент развития. Для каждой сделки:

- дата, инструмент, направление, вход, стоп, цель, объём;
- причина входа (по каким правилам), скриншот до и после;
- результат в деньгах и в R (во сколько риска);
- эмоции и ошибки: соблюдены ли правила.

Раз в неделю или месяц разбирайте журнал: какие ситуации работают, какие нет, где вы нарушали правила. История сделок в терминале поможет сверить цифры.

## Математическое ожидание (Expectancy)

**Матожидание** — средний результат одной сделки:

**E = (доля прибыльных × средняя прибыль) − (доля убыточных × средний убыток)**

В единицах риска (R): 40 % сделок по +2R и 60 % по −1R дают E = 0,4 × 2 − 0,6 × 1 = **+0,2R** на сделку. Положительное матожидание после всех издержек — необходимое условие. Но даже с ним возможны долгие серии убытков.

## Просадка (Drawdown)

**Просадка** — падение счёта от максимума до минимума. Важны **максимальная просадка** и её длительность.

- Оцените заранее, какую просадку система даёт на истории, и умножьте с запасом — в реальности бывает хуже.
- Задайте порог: например, если просадка превысила исторический максимум в 1,5 раза — остановиться и пересмотреть систему.
- Помните асимметрию: после −20 % нужно +25 %, после −50 % — +100 %.

## Когда стратегия перестала работать

Признаки: матожидание на последних 30–50 сделках ушло в минус, просадка вышла за исторические рамки, рынок изменил характер (волатильность, режим). Не меняйте правила после каждой неудачной сделки — меняйте после анализа достаточной выборки.

## Главное

- Система — это формальные правила входа, стопа, выхода, объёма и ограничений.
- Честный бэктест: 100+ сделок, издержки, проверка вне выборки.
- Оценивайте систему по матожиданию и просадке, а не по последним сделкам.

${videos('Видео по теме', [
  ['Разработка собственной торговой стратегии', 'разработка торговой стратегии трейдинг'],
  ['Backtesting торговых стратегий', 'backtesting торговых стратегий на русском'],
  ['Trading Journal и анализ сделок', 'trading journal анализ сделок'],
  ['Expectancy и математическое ожидание', 'expectancy математическое ожидание трейдинг'],
  ['Drawdown и управление риском', 'drawdown risk management трейдинг'],
])}

${RISK_RU}`,
      },
      en: {
        title: 'Level 3 · Trading systems: strategy, backtest, journal, expectancy and drawdown',
        excerpt: 'How to build your own strategy, test it on history, keep a journal and judge a system by the numbers.',
        markdown: `## A trading system

Market and hours, formal entry conditions, stop, exit, position size and limits (daily loss, max trades, news). Rules are formal if another person marks the same trades.

## Backtesting

Manual or automated; 100+ trades across different regimes, including spread, commission and slippage. Keep part of the data for out-of-sample testing to avoid overfitting.

## Journal

Record every trade with reasons, screenshots, result in money and in R, and whether you followed the rules. Review weekly or monthly.

## Expectancy

E = win rate × average win − loss rate × average loss. 40% at +2R and 60% at −1R gives +0.2R per trade. Positive expectancy after costs is necessary but losing streaks still happen.

## Drawdown

Know the historical maximum drawdown, expect worse and set a stop rule (for example 1.5× the historical maximum). After −20% you need +25%; after −50%, +100%.

Change rules after analysing a sufficient sample, not after each loss.

${videos('Videos on this topic (Russian)', [
  ['Building a strategy', 'разработка торговой стратегии трейдинг'],
  ['Backtesting', 'backtesting торговых стратегий на русском'],
  ['Trading journal', 'trading journal анализ сделок'],
  ['Expectancy', 'expectancy математическое ожидание трейдинг'],
  ['Drawdown and risk', 'drawdown risk management трейдинг'],
])}

${RISK_EN}`,
      },
    },
  },
  {
    slug: 'l3-trading-psychology',
    level: 'intermediate',
    locales: {
      ru: {
        title: 'Уровень 3 · Психология и дисциплина профессионального трейдера',
        excerpt: 'Мышление вероятностями, контроль эмоций, как переживать серии убытков и строить дисциплину.',
        markdown: `Когда правила системы понятны, главным ограничением становится сам трейдер. Большинство счетов теряют деньги не из-за плохой стратегии, а из-за отклонений от неё.

## Мышление вероятностями

Идея, которую подробно разбирает Марк Дуглас в книге «Trading in the Zone»: результат **отдельной** сделки случаен, преимущество проявляется только на **серии** сделок.

Отсюда следствия:

- убыточная сделка по правилам — не ошибка, а нормальная часть системы;
- прибыльная сделка с нарушением правил — ошибка, даже если принесла деньги;
- не нужно знать, что будет дальше, чтобы зарабатывать на дистанции, — нужно исполнять правила одинаково.

## Как контролировать эмоции

**Страх** — пропуск сигналов, ранний выход, слишком близкий стоп. **Жадность** — увеличение объёма, перенос цели, удержание сверх плана. **Желание отыграться** — серия импульсивных сделок после убытка.

Что помогает:

- **План до открытия рынка**: какие инструменты, какие сценарии, где входы и стопы.
- **Фиксированный риск**: если сумма возможного убытка спокойно переносима, эмоций меньше.
- **Правило паузы**: после сильной эмоции (большая прибыль или убыток) — перерыв минимум 15–30 минут.
- **Чек-лист перед входом**: все условия выполнены? Стоп и объём посчитаны?
- **Физическое состояние**: сон, еда, отсутствие спешки влияют на решения сильнее, чем кажется.

## Как переживать серии убытков

Серии неизбежны. При доле прибыльных 50 % серия из 6–7 убытков подряд на дистанции в несколько сотен сделок — обычное явление.

- **Заранее** посчитайте, какую серию даёт ваша система, — тогда она не станет неожиданностью.
- **Сократите объём** при просадке (например, вдвое после −5 %), а не увеличивайте его.
- **Дневной и недельный лимит**: достигли — торговля прекращается до следующего периода.
- **Разбор без самобичевания**: были ли нарушения правил? Если нет — система работает как обычно. Если да — что именно и почему.
- **Вернитесь на демо**, если подряд нарушаете правила: восстановите привычку без давления денег.

## Дисциплина как система, а не сила воли

Силы воли не хватит надолго. Дисциплина — это среда, в которой нарушать правила трудно:

- стоп ставится вместе с ордером, а не «потом»;
- размер позиции считается заранее по формуле;
- лимиты записаны и соблюдаются;
- журнал ведётся после каждой сделки.

## Признаки, что пора остановиться

- Вы торгуете, чтобы вернуть деньги, а не по сигналу.
- Объём растёт после убытков.
- Вы убираете или отодвигаете стопы.
- Торговля начинает влиять на сон, работу, отношения.

В этих случаях лучшее решение — перерыв. Если торговля становится навязчивой, обратитесь за поддержкой к близким или специалисту.

## Главное

- Результат одной сделки случаен — оценивайте серию и исполнение правил.
- Эмоции снижают фиксированный риск, план, чек-лист и паузы.
- Серии убытков нормальны: заранее знайте их размер, сокращайте объём в просадке.

${videos('Видео по теме', [
  ['Психология профессионального трейдера', 'психология профессионального трейдера'],
  ['Trading in the Zone — Марк Дуглас', 'Trading in the Zone Марк Дуглас русский'],
  ['Как контролировать эмоции', 'эмоции дисциплина психология трейдинга'],
  ['Как переживать серии убытков', 'серия убытков трейдинг психология'],
])}

${RISK_RU}`,
      },
      en: {
        title: 'Level 3 · Psychology and discipline of a professional trader',
        excerpt: 'Thinking in probabilities, controlling emotions, surviving losing streaks and building discipline.',
        markdown: `Once the rules are clear, the trader becomes the main constraint.

## Thinking in probabilities

As Mark Douglas explains in *Trading in the Zone*, a single trade's outcome is random; an edge shows over a series. A rule-following loss is not a mistake; a rule-breaking win is.

## Emotions

Fear, greed and revenge trading. Counter them with a pre-market plan, fixed risk, a pause rule after strong emotions, a pre-entry checklist and good rest.

## Losing streaks

With a 50% win rate, 6–7 losses in a row over a few hundred trades is normal. Know your system's streaks in advance, cut size in drawdown, respect daily and weekly limits, review without self-blame and return to demo if you keep breaking rules.

## Discipline as an environment

Stop placed with the order, size calculated by formula, written limits and a journal after every trade.

If trading starts to affect your sleep, work or relationships, take a break and seek support.

${videos('Videos on this topic (Russian)', [
  ['Professional trader psychology', 'психология профессионального трейдера'],
  ['Trading in the Zone — Mark Douglas', 'Trading in the Zone Марк Дуглас русский'],
  ['Controlling emotions', 'эмоции дисциплина психология трейдинга'],
  ['Losing streaks', 'серия убытков трейдинг психология'],
])}

${RISK_EN}`,
      },
    },
  },
]
