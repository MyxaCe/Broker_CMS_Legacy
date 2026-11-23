import { RISK_EN, RISK_RU, videos, type EducationSeed } from './types'

// Уровень 2 — Средний: от понимания графика до построения торговой системы.

export const LEVEL_2: EducationSeed[] = [
  {
    slug: 'l2-price-action',
    level: 'intermediate',
    locales: {
      ru: {
        title: 'Уровень 2 · Price Action: торговля по чистому графику',
        excerpt: 'Что такое Price Action, как торговать без индикаторов, ключевые свечные модели и разворотные ситуации.',
        markdown: `**Price Action** — подход, при котором решения принимаются по самому движению цены: свечам, уровням, структуре. Индикаторы при этом либо не используются, либо играют вспомогательную роль.

Идея простая: все индикаторы считаются из цены, значит, цена уже содержит всю их информацию, причём без запаздывания.

## Три опоры Price Action

1. **Контекст** — куда идёт рынок на старшем таймфрейме: тренд или диапазон.
2. **Место** — сильная зона: уровень, граница диапазона, трендовая линия.
3. **Сигнал** — свечная модель, которая показывает реакцию цены в этом месте.

Сигнал без места и контекста — это шум. Большинство неудачных сделок по Price Action — модель «посреди ничего» или против сильного тренда.

## Как торговать без индикаторов

- Чистый график: уберите всё лишнее, оставьте свечи и 3–5 ключевых зон.
- Работайте от старшего таймфрейма к младшему.
- Заранее опишите, какую модель в каком месте вы ждёте и где будет стоп.
- Пропускайте ситуации, которые не совпадают с планом, — их будет большинство.

## Ключевые модели

**Пин-бар.** Маленькое тело у одного края свечи и длинная тень (минимум в 2–3 раза больше тела). Показывает резкое отвержение цены. Вход — в сторону, противоположную тени; стоп — за кончик тени. Сильнее всего работает от уровня по направлению тренда.

**Поглощение (Engulfing).** Тело второй свечи полностью перекрывает тело первой в обратную сторону. Показывает перехват инициативы. Стоп — за экстремум модели.

**Внутренний бар (Inside Bar).** Свеча целиком внутри диапазона предыдущей («материнской»). Сжатие, накопление перед движением. Обычно торгуют пробой материнской свечи по направлению тренда.

## Ложные пробои и развороты

Классическая разворотная ситуация Price Action — **ложный пробой**: цена прокалывает уровень, собирает стоп-ордера и быстро возвращается. Часто это выглядит как пин-бар, тень которого выходит за уровень, а тело закрывается внутри.

Другие разворотные модели:

- **Двойная вершина / двойное дно** — две неудачные попытки пробить экстремум.
- **Голова и плечи** — три вершины, средняя выше, пробой «линии шеи» подтверждает разворот.

Разворот против сильного тренда — самая рискованная сделка. Требуйте больше подтверждений и берите меньший объём.

## Пример плана

EURUSD на H4 в восходящем тренде. Цена откатывает к зоне 1,0800, которая раньше была сопротивлением. На H1 появляется пин-бар с длинной нижней тенью, закрытие выше зоны. План: покупка после закрытия пин-бара, стоп за минимум тени, цель — предыдущий максимум. Если цены закрываются ниже зоны — сценарий отменён. Это пример логики, а не рекомендация.

## Типичные ошибки

- Торговля каждой похожей свечи без учёта места.
- Слишком близкий стоп — «внутри шума».
- Подгонка: видеть модель там, где её нет, потому что хочется войти.

## Главное

- Контекст → место → сигнал. Без первых двух сигнал не работает.
- Пин-бар, поглощение и внутренний бар — базовые модели.
- Ложный пробой — одна из самых частых разворотных ситуаций.

${videos('Видео по теме', [
  ['Полный курс Price Action', 'price action полный курс на русском'],
  ['Как торговать без индикаторов', 'торговля без индикаторов price action'],
  ['Свечные модели Price Action', 'price action свечные модели'],
  ['Pin Bar, Engulfing, Inside Bar', 'pin bar engulfing inside bar обучение'],
  ['Ложные пробои и разворотные модели', 'price action ложные пробои развороты'],
])}

${RISK_RU}`,
      },
      en: {
        title: 'Level 2 · Price action: trading the naked chart',
        excerpt: 'What price action is, trading without indicators, key candle patterns and reversal setups.',
        markdown: `**Price action** means deciding from price itself — candles, levels, structure — with indicators at most as a helper.

## Three pillars

**Context** (higher-timeframe trend or range), **location** (a strong zone) and **signal** (a candle pattern there). A signal without the first two is noise.

## Key patterns

- **Pin bar** — small body, long wick (2–3× the body): sharp rejection. Stop beyond the wick.
- **Engulfing** — the second body fully covers the first in the opposite direction.
- **Inside bar** — the candle sits within the previous one; trade the break of the mother bar with the trend.

## Reversals

The classic is the **false breakout**: price pokes through a level, triggers stops and returns. Double tops/bottoms and head and shoulders are other reversal shapes. Counter-trend reversals need more confirmation and smaller size.

## Common mistakes

Trading every similar candle regardless of location, stops inside the noise and seeing patterns because you want to trade.

${videos('Videos on this topic (Russian)', [
  ['Price action course', 'price action полный курс на русском'],
  ['Trading without indicators', 'торговля без индикаторов price action'],
  ['Price action candle patterns', 'price action свечные модели'],
  ['Pin bar, engulfing, inside bar', 'pin bar engulfing inside bar обучение'],
  ['False breakouts and reversals', 'price action ложные пробои развороты'],
])}

${RISK_EN}`,
      },
    },
  },
  {
    slug: 'l2-market-structure',
    level: 'intermediate',
    locales: {
      ru: {
        title: 'Уровень 2 · Структура рынка: HH/HL, BOS, CHoCH и мультитаймфрейм',
        excerpt: 'Как описать рынок через максимумы и минимумы, что такое слом структуры и смена характера, как совмещать таймфреймы.',
        markdown: `**Структура рынка** — способ описать движение цены через последовательность значимых максимумов и минимумов. Она отвечает на главный вопрос: кто сейчас контролирует рынок?

## Higher High и Higher Low

В **восходящей** структуре каждый новый максимум выше предыдущего (**HH — Higher High**), и каждый новый минимум тоже выше (**HL — Higher Low**).

В **нисходящей** — **LH (Lower High)** и **LL (Lower Low)**.

Важно определить, какие экстремумы считать значимыми. Простое правило: значимый максимум — тот, после которого было заметное движение вниз, обновившее предыдущий минимум или откатившее цену существенно. Мелкие колебания внутри — это внутренняя структура.

## BOS — Break of Structure

**Слом структуры** по направлению тренда: в восходящем тренде цена обновляет последний HH. Это подтверждение, что тренд продолжается.

Обычно BOS засчитывают по **закрытию свечи** за экстремумом, а не по проколу тенью.

## CHoCH — Change of Character

**Смена характера** — первый признак, что тренд может смениться. В восходящем тренде цена пробивает последний **HL** вниз. Это ещё не нисходящий тренд, но покупатели впервые не удержали минимум.

После CHoCH часто следует откат и попытка продолжить в новом направлении. Если затем появляется BOS вниз (обновление нового минимума), смена тренда подтверждается.

## MSS — Market Structure Shift

**Сдвиг структуры** — термин, близкий к CHoCH. Обычно им называют резкий слом структуры с импульсом (крупные свечи, разрывы), часто после снятия ликвидности над/под экстремумом. Терминология у разных авторов отличается — важнее понимать суть: предыдущий сценарий сломан.

## Мультитаймфреймовый анализ

Структура на разных таймфреймах может противоречить друг другу: на D1 восходящий тренд, а на M15 — локальное падение. Это нормально — откат на младшем таймфрейме часто и есть возможность для входа по старшему.

Практичная схема из трёх таймфреймов:

1. **Старший** (D1 или H4) — направление и ключевые зоны.
2. **Средний** (H1) — текущая структура, где сейчас откат.
3. **Младший** (M15 или M5) — точка входа: CHoCH в сторону старшего тренда внутри зоны.

## Пример

H4: восходящая структура, последний HL — 1,0780. H1: цена откатывает к зоне 1,0790–1,0800. M15: внутри отката нисходящая структура, затем цена пробивает последний LH вверх — CHoCH на младшем таймфрейме в сторону старшего тренда. Это потенциальная точка входа со стопом под минимум отката. Если H4 закроется ниже 1,0780 — старшая структура сломана, идея неактуальна.

## Типичные ошибки

- Считать каждое колебание значимым экстремумом.
- Путать CHoCH (первый сигнал) с подтверждённым разворотом.
- Торговать сигналы младшего таймфрейма против старшего.

## Главное

- HH/HL — восходящая структура, LH/LL — нисходящая.
- BOS — продолжение тренда, CHoCH — первый признак смены.
- Направление — со старшего таймфрейма, вход — на младшем.

${videos('Видео по теме', [
  ['Структура рынка Market Structure', 'market structure трейдинг обучение русский'],
  ['Higher High и Higher Low', 'higher high higher low трейдинг'],
  ['BOS — Break of Structure', 'BOS break of structure на русском'],
  ['CHoCH — Change of Character', 'CHoCH change of character трейдинг'],
  ['MSS — Market Structure Shift', 'market structure shift MSS обучение'],
  ['Multi Timeframe Analysis', 'мультитаймфреймовый анализ трейдинг'],
])}

${RISK_RU}`,
      },
      en: {
        title: 'Level 2 · Market structure: HH/HL, BOS, CHoCH and multiple timeframes',
        excerpt: 'Describing the market through highs and lows, break of structure, change of character and combining timeframes.',
        markdown: `Market structure describes price through its significant highs and lows and tells you who is in control.

## HH/HL and LH/LL

Uptrend: higher highs and higher lows. Downtrend: lower highs and lower lows. Only swings followed by a meaningful move count; small wiggles are internal structure.

## BOS, CHoCH, MSS

- **BOS** (break of structure) — price closes beyond the last high in an uptrend: continuation.
- **CHoCH** (change of character) — price breaks the last higher low: the first warning, not yet a reversal.
- **MSS** (market structure shift) — a forceful break, often after a liquidity grab. Terminology varies between authors.

## Multiple timeframes

Use a higher timeframe (D1/H4) for direction and zones, H1 for the current pullback and M15/M5 for the entry — for example a lower-timeframe CHoCH in the direction of the higher trend inside a zone.

## Common mistakes

Treating every swing as significant, confusing CHoCH with a confirmed reversal and trading lower-timeframe signals against the higher trend.

${videos('Videos on this topic (Russian)', [
  ['Market structure', 'market structure трейдинг обучение русский'],
  ['Higher high and higher low', 'higher high higher low трейдинг'],
  ['Break of structure', 'BOS break of structure на русском'],
  ['Change of character', 'CHoCH change of character трейдинг'],
  ['Market structure shift', 'market structure shift MSS обучение'],
  ['Multi-timeframe analysis', 'мультитаймфреймовый анализ трейдинг'],
])}

${RISK_EN}`,
      },
    },
  },
  {
    slug: 'l2-indicators',
    level: 'intermediate',
    locales: {
      ru: {
        title: 'Уровень 2 · Индикаторы: RSI, MACD, скользящие, Фибоначчи, Volume Profile, VWAP',
        excerpt: 'Как устроены популярные индикаторы, что они показывают на самом деле и как не утонуть в сигналах.',
        markdown: `Индикатор — формула, которая пересчитывает цену (и иногда объём) в другую форму. Он не знает будущего: всё, что он показывает, уже есть на графике. Польза индикаторов в том, что они делают некоторые свойства движения нагляднее.

Правило: 1–3 индикатора, каждый для своей задачи. Пять осцилляторов, показывающих одно и то же, не дают пяти подтверждений.

## Скользящие средние (MA и EMA)

**MA** — средняя цена за N свечей. **EMA** — экспоненциальная средняя, сильнее учитывает последние свечи и быстрее реагирует.

Как используют:

- **направление тренда** — цена выше средней и средняя растёт;
- **динамическая поддержка/сопротивление** — в тренде цена часто откатывает к EMA 20–50;
- **пересечения** — быстрая средняя пересекает медленную (например, 50 и 200). Сигнал запаздывает и много ложных срабатываний во флэте.

## RSI

**RSI (индекс относительной силы)** — осциллятор от 0 до 100, сравнивает силу роста и падения за период (обычно 14).

- Выше 70 — «перекупленность», ниже 30 — «перепроданность». В сильном тренде RSI может долго держаться в этих зонах — это не сигнал к развороту сам по себе.
- **Дивергенция** — цена обновила максимум, а RSI нет. Признак ослабления импульса, особенно у сильного уровня.

## MACD

**MACD** — разница двух EMA (обычно 12 и 26) и её сигнальная линия (EMA 9). Гистограмма показывает расстояние между ними.

- Пересечение MACD и сигнальной линии — смена краткосрочного импульса.
- Положение выше/ниже нуля — общее направление.
- Дивергенции — как у RSI.

## Фибоначчи (Fibonacci Retracement)

Инструмент разметки: натягивается от начала до конца импульса и показывает уровни отката 23,6 %, 38,2 %, 50 %, 61,8 %, 78,6 %. Многие трейдеры ждут откат в зону 50–61,8 %, чтобы войти по тренду.

Важно: уровни Фибоначчи работают в основном потому, что на них смотрит много участников. Ищите совпадение с уровнем или зоной на графике — одиночная линия Фибоначчи слабая.

## Volume Profile

**Профиль объёма** показывает, сколько проторговано на каждом **ценовом** уровне (а не во времени). Ключевые понятия:

- **POC** — цена с наибольшим объёмом, «справедливая цена» периода;
- **Value Area** — диапазон, где прошло около 70 % объёма;
- **зоны низкого объёма** — цена через них обычно проходит быстро.

## VWAP

**VWAP** — средняя цена, взвешенная по объёму, обычно считается с начала дня. Используется как ориентир «дорого/дёшево» внутри дня: выше VWAP — покупатели в среднем в плюсе, ниже — продавцы. Многие внутридневные трейдеры ждут возврата к VWAP.

Для Volume Profile и VWAP нужен надёжный объём. Где объём условный или отсутствует, эти инструменты теряют смысл.

## В нашем терминале

Индикаторы добавляются кнопкой «Индикаторы» над графиком: тренд, волатильность, объём и один осциллятор в отдельной панели снизу. Во вкладке «Сигналы» — простые сигналы по RSI и пересечению скользящих; это подсказка, а не рекомендация.

## Главное

- Индикаторы пересчитывают цену; они запаздывают и не знают будущего.
- Скользящие — для тренда, RSI и MACD — для импульса и дивергенций.
- Фибоначчи, Volume Profile, VWAP сильнее в связке с уровнями.

${videos('Видео по теме', [
  ['RSI — полный разбор', 'RSI индикатор полный курс'],
  ['MACD — обучение', 'MACD индикатор обучение'],
  ['Moving Average и EMA', 'moving average EMA трейдинг обучение'],
  ['Fibonacci Retracement', 'Fibonacci Retracement трейдинг на русском'],
  ['Volume Profile', 'Volume Profile трейдинг обучение'],
  ['VWAP и применение в торговле', 'VWAP трейдинг обучение'],
])}

${RISK_RU}`,
      },
      en: {
        title: 'Level 2 · Indicators: RSI, MACD, moving averages, Fibonacci, Volume Profile, VWAP',
        excerpt: 'How popular indicators work, what they really show and how not to drown in signals.',
        markdown: `Indicators re-express price (and sometimes volume). They lag and do not know the future. Use 1–3, each for its own job.

- **MA / EMA** — trend direction, dynamic support in trends, crossovers (lagging, noisy in ranges).
- **RSI** — 0–100 oscillator; above 70 / below 30 can persist in strong trends; divergences hint at fading momentum.
- **MACD** — difference of two EMAs with a signal line; crossovers, zero line, divergences.
- **Fibonacci retracement** — 38.2%, 50%, 61.8% pullback levels; strongest when they coincide with a chart zone.
- **Volume Profile** — volume by price: POC, value area, low-volume gaps.
- **VWAP** — volume-weighted average price, an intraday "cheap/expensive" reference.

Volume-based tools need reliable volume. In our terminal, add indicators via "Indicators"; the "Signals" tab shows simple RSI and MA-cross signals — hints, not advice.

${videos('Videos on this topic (Russian)', [
  ['RSI', 'RSI индикатор полный курс'],
  ['MACD', 'MACD индикатор обучение'],
  ['Moving averages and EMA', 'moving average EMA трейдинг обучение'],
  ['Fibonacci retracement', 'Fibonacci Retracement трейдинг на русском'],
  ['Volume Profile', 'Volume Profile трейдинг обучение'],
  ['VWAP', 'VWAP трейдинг обучение'],
])}

${RISK_EN}`,
      },
    },
  },
  {
    slug: 'l2-supply-demand',
    level: 'intermediate',
    locales: {
      ru: {
        title: 'Уровень 2 · Зоны спроса и предложения',
        excerpt: 'Что такое Supply и Demand зоны, как отличить сильную зону от слабой, ретест и подтверждение входа.',
        markdown: `Подход **Supply and Demand** развивает идею уровней: вместо линий ищут **зоны**, из которых цена ушла резко, — там, вероятно, остались неисполненные заявки крупных участников.

## Demand и Supply

- **Demand Zone (зона спроса)** — область, откуда цена резко пошла вверх. Покупателей там было больше, чем продавцов могли удовлетворить.
- **Supply Zone (зона предложения)** — область, откуда цена резко пошла вниз.

Зона обычно строится по небольшой базе (1–5 свечей консолидации) перед сильным импульсом: от минимума до максимума тел или теней базы.

## Типовые формации

- **Rally–Base–Rally (RBR)** — рост, пауза, рост: зона спроса продолжения.
- **Drop–Base–Rally (DBR)** — падение, пауза, рост: зона спроса разворота.
- **Rally–Base–Drop (RBD)** — зона предложения разворота.
- **Drop–Base–Drop (DBD)** — зона предложения продолжения.

## Как отличить сильную зону

- **Сила ухода:** чем резче и длиннее импульс из зоны, тем лучше. Крупные свечи, мало теней.
- **Короткая база:** 1–3 свечи лучше, чем долгий боковик.
- **Свежесть:** зона, к которой цена ещё не возвращалась, сильнее. Каждое касание «съедает» заявки.
- **Результат:** импульс из зоны сломал структуру (обновил экстремум).
- **Старший таймфрейм:** зоны H4/D1 весомее, чем M5.
- **По тренду:** зона спроса в восходящем тренде надёжнее, чем против него.

## Ретест и подтверждение входа

Есть два способа входа:

1. **Агрессивный** — лимитный ордер на границе зоны, стоп за дальней границей. Лучшее соотношение риска и прибыли, но больше ложных входов.
2. **Консервативный** — дождаться реакции в зоне: разворотную свечу, CHoCH на младшем таймфрейме. Меньше ложных входов, но часть движения упускается.

**Ретест** — возврат цены к пробитой зоне с другой стороны. Пробитая зона предложения часто становится спросом.

## Пример

На H4 цена из узкой базы у 1,2600 резко выросла до 1,2750, обновив максимум. Зона спроса 1,2590–1,2610 свежая. Через несколько дней цена возвращается. План: лимитная покупка у 1,2610, стоп ниже 1,2580, первая цель — 1,2700. Если на H1 внутри зоны нет реакции и свечи закрываются ниже — не входить или выйти по стопу. Это пример логики, а не рекомендация.

## Типичные ошибки

- Слишком широкие зоны — стоп становится огромным.
- Зоны «везде» — каждую паузу считать зоной.
- Вход в зону, которую уже несколько раз тестировали.

## Главное

- Зона — база перед сильным импульсом.
- Сильная зона: резкий уход, короткая база, свежая, по тренду.
- Агрессивный вход — лимит, консервативный — после реакции.

${videos('Видео по теме', [
  ['Зоны спроса и предложения', 'supply and demand трейдинг на русском'],
  ['Demand Zone и Supply Zone', 'demand zone supply zone обучение'],
  ['Как определять сильные зоны', 'сильные зоны спроса и предложения трейдинг'],
  ['Ретесты и подтверждение входа', 'ретест уровня подтверждение входа трейдинг'],
])}

${RISK_RU}`,
      },
      en: {
        title: 'Level 2 · Supply and demand zones',
        excerpt: 'What supply and demand zones are, how to tell a strong zone from a weak one, retests and entry confirmation.',
        markdown: `Supply and demand traders look for **zones** price left sharply, where unfilled orders may remain.

- **Demand zone** — the base before a sharp rally; **supply zone** — the base before a sharp drop.
- Formations: Rally–Base–Rally, Drop–Base–Rally, Rally–Base–Drop, Drop–Base–Drop.

## Strong zones

A forceful departure, a short base (1–3 candles), untested (fresh), broke structure, higher timeframe and in the trend direction.

## Entries

**Aggressive** — a limit order at the zone edge, stop beyond the far edge. **Conservative** — wait for a reaction (reversal candle, lower-timeframe CHoCH). A broken zone often flips on the **retest**.

## Common mistakes

Zones that are too wide, zones everywhere and trading zones that have already been tested several times.

${videos('Videos on this topic (Russian)', [
  ['Supply and demand', 'supply and demand трейдинг на русском'],
  ['Demand and supply zones', 'demand zone supply zone обучение'],
  ['Finding strong zones', 'сильные зоны спроса и предложения трейдинг'],
  ['Retests and entry confirmation', 'ретест уровня подтверждение входа трейдинг'],
])}

${RISK_EN}`,
      },
    },
  },
  {
    slug: 'l2-smart-money-concepts',
    level: 'intermediate',
    locales: {
      ru: {
        title: 'Уровень 2 · Smart Money Concepts: ордерблоки, FVG и ликвидность',
        excerpt: 'Ключевые понятия SMC — order blocks, fair value gap, liquidity sweep, breaker и inducement — и как к ним относиться.',
        markdown: `**Smart Money Concepts (SMC)** — популярный подход, который описывает рынок через предполагаемые действия крупных участников: где они набирают позиции и как используют чужие стоп-ордера.

Сразу важная оговорка: SMC — **один из подходов**, а не доказанная закономерность. Многие его понятия — новые названия для давно известных идей (зоны спроса/предложения, ложные пробои, гэпы). Относитесь к ним как к способу разметки графика и проверяйте на истории и демо-счёте.

## Ликвидность и Liquidity Sweep

В SMC **ликвидность** — это скопления стоп-ордеров и отложенных заявок: над очевидными максимумами, под минимумами, у трендовых линий, у равных вершин.

**Liquidity Sweep (снятие ликвидности)** — цена прокалывает такой экстремум, собирает стопы и разворачивается. По сути, это ложный пробой. Сторонники SMC считают, что крупному участнику нужна эта ликвидность, чтобы набрать позицию.

## Order Block

**Ордерблок** — последняя свеча против направления импульса перед сильным движением, сломавшим структуру. Например, последняя падающая свеча перед мощным ростом с BOS. Её диапазон считают зоной, куда цена может вернуться.

Это близко к зоне спроса/предложения. Сильнее те ордерблоки, которые: сняли ликвидность перед импульсом, привели к слому структуры и ещё не тестировались.

## Fair Value Gap (FVG)

**FVG (имбаланс)** — участок из трёх свечей, где тени первой и третьей не перекрываются: средняя свеча прошла так быстро, что встречной торговли почти не было. Цена часто возвращается «заполнить» такой разрыв частично или полностью.

Используется как зона входа на откате или как цель.

## Breaker Block

**Брейкер** — ордерблок, который не удержал цену и был пробит. После этого он, по логике SMC, работает в обратную сторону (смена ролей, как у обычного уровня).

## Inducement

**Inducement (приманка)** — небольшой локальный экстремум перед зоной интереса, который «приманивает» ранних трейдеров. Идея SMC: цена сначала снимет эту ликвидность, а потом дойдёт до настоящей зоны. Практический вывод — не входить на первом же мелком уровне перед зоной.

## Как собрать это в сценарий

1. Старший таймфрейм: направление и зона (ордерблок или FVG).
2. Цена снимает ликвидность у ближайшего экстремума.
3. На младшем таймфрейме — CHoCH в сторону старшего направления.
4. Вход на откате в FVG или ордерблок младшего таймфрейма, стоп за экстремум снятия.

## Критический взгляд

- Разметку SMC легко подогнать задним числом: на истории всё «очевидно».
- Разные авторы называют одно и то же по-разному и спорят о деталях.
- Проверяйте: соберите 50–100 примеров по своим правилам на истории, посчитайте результат с учётом издержек.

## Главное

- SMC описывает ликвидность, ордерблоки, FVG и сломы структуры.
- Многие идеи — переименованные классические концепции.
- Это гипотезы для проверки, а не гарантированный способ заработка.

${videos('Видео по теме', [
  ['Полный курс Smart Money Concepts', 'smart money concepts полный курс русский'],
  ['Order Blocks', 'order blocks обучение на русском'],
  ['Fair Value Gap (FVG)', 'FVG fair value gap обучение русский'],
  ['Liquidity и Liquidity Sweep', 'liquidity sweep трейдинг на русском'],
  ['Breaker Blocks', 'breaker block трейдинг обучение'],
  ['Inducement', 'inducement smart money на русском'],
])}

${RISK_RU}`,
      },
      en: {
        title: 'Level 2 · Smart Money Concepts: order blocks, FVG and liquidity',
        excerpt: 'Core SMC ideas — order blocks, fair value gaps, liquidity sweeps, breakers and inducement — and how to treat them.',
        markdown: `**Smart Money Concepts** describe the market through the presumed actions of large players. It is **one approach, not a proven law**; many ideas are new names for classic concepts. Test them on history and on demo.

- **Liquidity / sweep** — clusters of stops above highs and below lows; a sweep pokes through and reverses (essentially a false breakout).
- **Order block** — the last opposite candle before an impulse that broke structure.
- **Fair value gap** — three candles where the wicks of the first and third do not overlap; price often returns to fill it.
- **Breaker** — a failed order block that flips roles.
- **Inducement** — a small swing before the real zone that lures early entries.

A typical scenario: higher-timeframe zone → liquidity sweep → lower-timeframe CHoCH → entry on a pullback, stop beyond the sweep.

Be critical: SMC markup is easy to fit in hindsight. Collect 50–100 examples by your rules and measure the result including costs.

${videos('Videos on this topic (Russian)', [
  ['Smart Money Concepts course', 'smart money concepts полный курс русский'],
  ['Order blocks', 'order blocks обучение на русском'],
  ['Fair value gap', 'FVG fair value gap обучение русский'],
  ['Liquidity sweep', 'liquidity sweep трейдинг на русском'],
  ['Breaker blocks', 'breaker block трейдинг обучение'],
  ['Inducement', 'inducement smart money на русском'],
])}

${RISK_EN}`,
      },
    },
  },
]
