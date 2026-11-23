import { RISK_EN, RISK_RU, videos, type EducationSeed } from './types'

// Факты о платформе сверены с кодом: кабинет и витрина — Sait_Platform main ae97acd,
// терминал — Platform master 194a210. Цифры (плечо, комиссии, минимумы) не пишем:
// они настраиваются и показываются в кабинете и терминале.

export const PLATFORM: EducationSeed[] = [
  {
    slug: 'platform-first-steps',
    level: 'beginner',
    locales: {
      ru: {
        title: 'Платформа · Первые шаги: регистрация, верификация и защита аккаунта',
        excerpt: 'Как открыть демо-счёт, пройти верификацию с селфи по заданию и включить двухфакторную защиту.',
        markdown: `Эта инструкция проводит от регистрации до готового к работе аккаунта. Займёт она 10–15 минут, если документы под рукой.

## 1. Регистрация и демо-счёт

Нажмите «Открыть счёт» на сайте и заполните форму: email, пароль, имя, фамилию, телефон и страну. Сразу после регистрации у вас появляется **демо-счёт**: виртуальные деньги, но реальные котировки и те же инструменты, что на реальном счёте. На нём удобно разобраться с терминалом, не рискуя деньгами.

Открывая счёт, вы соглашаетесь с клиентским соглашением и уведомлением о рисках — их стоит прочитать до первой сделки на реальные деньги.

## 2. Личный кабинет

В кабинете собрано всё, что не связано с самой торговлей:

- **Обзор** — состояние заявки на счёт, демо-баланс, подсказки «Что дальше».
- **Торговля** — выбор счёта (демо или реальный) и запуск терминала.
- **Пополнить / Вывести** — операции с реальным счётом.
- **Профиль → Верификация** — документы.
- **Безопасность** — пароль, активные сессии и двухфакторная защита.
- **Условия счетов** — плечо, стоимость сделки и инструменты для вашего типа счёта.

## 3. Верификация

Верификация (KYC) подтверждает, что счёт открыт на вас. Без неё сумма вывода ограничена — кабинет покажет, сколько ещё доступно. Откройте **Профиль → Верификация** и пройдите три шага по очереди.

**Документ.** Паспорт или ID-карта: страница с фото, все углы видны, текст читается. Формат PDF, JPG или PNG до 10 МБ.

**Адрес.** Счёт за коммунальные услуги или банковская выписка не старше 3 месяцев, где видны ваше имя и адрес.

**Селфи.** Этот шаг принимает только снимки с камеры — фото из галереи загрузить нельзя. Включите камеру: на экране появятся случайное задание (например, повернуть голову или показать несколько пальцев) и код. Сделайте 3 снимка по подсказкам — на всё есть 2 минуты. Код и время видны на снимках, поэтому сотрудник понимает, что снимки сделаны сейчас, а не взяты из архива. Если вы за компьютером без камеры, кабинет предложит продолжить на телефоне по QR-коду.

После отправки документы проверяет сотрудник. Статус виден на той же странице: «На рассмотрении», «Пройдена», «Отклонена» или «Нужно дополнительное действие» — в последнем случае рядом будет написано, что исправить. Иногда сотрудник просит документ о происхождении средств: справку о доходах, выписку или договор.

## 4. Двухфакторная защита (2FA)

2FA необязательна, но заметно повышает защиту: даже зная пароль, войти без кода с вашего телефона не получится. Код потребуется при входе, выводе средств и смене пароля.

1. Установите приложение-аутентификатор: Google Authenticator, Microsoft Authenticator, 1Password или аналог.
2. В кабинете откройте **Безопасность** → «Включить двухфакторную защиту».
3. Отсканируйте QR-код приложением (или введите ключ вручную).
4. Введите 6-значный код из приложения и подтвердите.
5. **Сохраните резервные коды** — скачайте файл или перепишите. Каждый код срабатывает один раз и выручит, если телефон потерян. Показываются они только при включении.

О включении и отключении 2FA придёт письмо на email. Если письмо пришло, а вы ничего не меняли, — сразу смените пароль и напишите в поддержку.

## 5. Ещё две привычки

- В разделе **Безопасность → Активные сессии** завершайте входы с чужих устройств.
- Сотрудники платформы не спрашивают пароль, коды 2FA и резервные коды. Никому их не сообщайте.

## Главное

- Демо-счёт появляется сразу — начните с него.
- Верификация: документ, адрес, селфи с камеры по заданию. Без неё вывод ограничен.
- Включите 2FA и сохраните резервные коды.

${RISK_RU}`,
      },
      en: {
        title: 'Platform · First steps: sign-up, verification and account security',
        excerpt: 'Open a demo account, pass verification with a guided camera selfie and turn on two-factor protection.',
        markdown: `This guide takes you from sign-up to an account that is ready to use.

## 1. Sign-up and demo account

Click "Open account" and fill in email, password, name, phone and country. A **demo account** is created right away: virtual money, real prices and the same instruments as a live account. By opening an account you accept the client agreement and the risk disclosure — read them before your first live trade.

## 2. Client area

- **Overview** — application status, demo balance, next steps.
- **Trading** — choose demo or live and launch the terminal.
- **Deposit / Withdraw** — live account operations.
- **Profile → Verification** — documents.
- **Security** — password, active sessions and two-factor protection.
- **Account conditions** — leverage, trading costs and instruments for your account type.

## 3. Verification

Without verification the withdrawal amount is limited. Go to **Profile → Verification** and complete three steps:

- **ID document** — passport or ID card, photo page, all corners visible. PDF, JPG or PNG up to 10 MB.
- **Address** — utility bill or bank statement not older than 3 months showing your name and address.
- **Selfie** — camera only, no gallery uploads. A random task and a code appear on screen; take 3 photos within 2 minutes. On a computer without a camera you can continue on your phone via QR code.

An operator reviews the documents; the status is shown on the same page.

## 4. Two-factor authentication

Optional, but strongly recommended. The code is required to sign in, withdraw and change the password. In **Security**, turn on 2FA, scan the QR code with an authenticator app, enter the 6-digit code and **save the recovery codes** — each works once. You get an email whenever 2FA is turned on or off.

## Key points

- The demo account is ready immediately.
- Verification: ID, address, guided camera selfie.
- Turn on 2FA and keep the recovery codes safe. Staff never ask for your password or codes.

${RISK_EN}`,
      },
    },
  },
  {
    slug: 'platform-first-trade-sl-tp',
    level: 'beginner',
    locales: {
      ru: {
        title: 'Платформа · Первая сделка: как открыть и закрыть позицию со Stop Loss и Take Profit',
        excerpt: 'Пошагово: выбрать инструмент, задать объём, поставить защитные уровни, изменить их и закрыть позицию.',
        markdown: `Потренируйтесь сначала на демо-счёте: всё работает так же, как на реальном, только деньги виртуальные.

## Запуск терминала

В кабинете откройте **Торговля**, выберите счёт — демо или реальный — и нажмите «Открыть терминал». Тип счёта виден в шапке терминала: **DEMO** или **REAL ACCOUNT**. Вернуться в кабинет можно кнопкой «В кабинет». На телефоне удобнее держать экран горизонтально; внизу переключаются вкладки «График», «Стакан», «Ордер», «Позиции».

## Шаг 1. Выберите инструмент

Слева — список инструментов с вкладками по категориям: Крипто, Форекс, Металлы, Индексы, Акции, Энергоносители. Поиск ищет по всем категориям сразу. Нажмите на инструмент — график и форма ордера переключатся на него.

Обратите внимание на пометки рядом с названием. «Рынок закрыт» — рыночный ордер недоступен до открытия, но лимитный поставить можно: он дождётся открытия. «Только закрытие» — новые позиции не принимаются, закрыть открытые можно.

## Шаг 2. Выберите тип ордера

- **Рынок** — сделка сразу по текущей цене. Покупка исполняется по цене ask, продажа — по bid; разница между ними — спред, он виден в форме. Если для вашего счёта есть наценка на спред, она указана во вкладке «Баланс».
- **Лимит** — вы указываете цену, ордер ждёт её. Покупку ставят ниже текущей цены, продажу — выше. Ожидающие ордера видны во вкладке «Ордера», там же их можно отменить.

Стоп-ордера на вход пока не поддерживаются.

## Шаг 3. Задайте объём

Введите объём в поле «Объём». Под ним указаны минимальный объём и шаг; если число не совпадёт с шагом, форма покажет, каким оно уйдёт. Ниже форма считает:

- **Стоимость** — полный размер позиции;
- **Маржа** — сколько ваших средств будет заблокировано под позицию с учётом плеча;
- **Свободно** — сколько останется;
- **Комиссия** — если она есть для вашего счёта, форма покажет примерную сумму (она берётся при открытии и ещё раз при закрытии).

## Шаг 4. Поставьте Stop Loss и Take Profit

**Stop Loss** закрывает позицию, если цена пошла против вас до заданного уровня, — это ограничение убытка. **Take Profit** закрывает позицию, когда цена дошла до цели.

Для покупки Stop Loss ставят ниже цены входа, Take Profit — выше. Для продажи — наоборот. Платформа может задавать минимальное расстояние уровней от цены — форма покажет его и подставит уровни на этом расстоянии. Поставить ближе нельзя: форма подскажет ближайший допустимый уровень.

Совет: решите, где поставите Stop Loss, *до* того как нажмёте кнопку. Объём подбирайте под этот стоп (см. статью про управление капиталом).

## Шаг 5. Откройте позицию

Нажмите **«Купить / Long»**, если ждёте роста, или **«Продать / Short»**, если ждёте снижения. Терминал покажет номер позиции и цену входа. Позиция появится во вкладке «Позиции», а уровни SL/TP — линиями на графике (их показ включается кнопкой «Линии SL/TP»).

## Изменить SL/TP

Во вкладке «Позиции» нажмите на значение Stop Loss или Take Profit в строке позиции — откроется окно «Изменить SL/TP». Можно ввести новый уровень, поставить его на минимальное расстояние кнопкой «Мин.» или снять кнопкой «Снять». Если новый уровень уже по другую сторону цены (сработал бы сразу), терминал не даст его сохранить.

## Закрыть позицию

Во вкладке «Позиции» нажмите **«Закрыть»** в строке позиции. Закрытая сделка уйдёт во вкладку «История» с ценой входа, выхода, комиссией и результатом. Если рынок закрыт или торги приостановлены, закрыть позицию получится после открытия.

## Неттинг и хеджирование

Во вкладке «Баланс» указана модель позиций вашего счёта. При **неттинге** встречная сделка уменьшает или закрывает позицию. При **хеджировании** встречная сделка открывает вторую, отдельную позицию — первую она не закрывает. Знайте свою модель, чтобы не открыть лишнего.

## Главное

- Начните на демо-счёте.
- До входа определите Stop Loss и подберите под него объём.
- Следите за пометками «Рынок закрыт» и «Только закрытие».
- Закрытые сделки и их результат — во вкладке «История».

${videos('Видео по теме', [
  ['Как выставлять Stop Loss и Take Profit', 'stop loss take profit обучение на русском'],
  ['Market Order, Limit Order, Stop Order', 'рыночные лимитные стоп ордера обучение'],
])}

${RISK_RU}`,
      },
      en: {
        title: 'Platform · Your first trade: opening and closing a position with Stop Loss and Take Profit',
        excerpt: 'Step by step: pick an instrument, set the size, add protective levels, edit them and close the position.',
        markdown: `Practise on the demo account first — everything works the same way.

## Launch the terminal

In the client area open **Trading**, choose demo or live and click "Open terminal". The header shows **DEMO** or **REAL ACCOUNT**.

## Steps

1. **Pick an instrument** in the watchlist. Tabs group instruments by category; search covers all of them. "Market closed" means market orders wait for the open (limit orders can be placed). "Close only" means no new positions.
2. **Choose the order type.** *Market* fills now (buy at ask, sell at bid; the spread is shown). *Limit* waits for your price and appears under "Orders". Stop entry orders are not supported yet.
3. **Enter the size.** The form shows the minimum and step, then the notional value, required margin, free margin and, if your account has one, the estimated commission (charged on open and on close).
4. **Set Stop Loss and Take Profit.** For a buy, SL below the entry and TP above; for a sell, the opposite. The platform may enforce a minimum distance; the form suggests the nearest allowed level.
5. **Click "Buy / Long" or "Sell / Short".** The position appears under "Positions" and the SL/TP lines on the chart.

## Edit and close

Click the Stop Loss or Take Profit value in the position row to change, reset to minimum or remove a level. Click **"Close"** to exit; the trade moves to "History". Check the position model under "Balance": with *netting* an opposite trade reduces the position, with *hedging* it opens a separate one.

## Key points

Start on demo, decide where the Stop Loss goes before entering and size the trade around it.

${videos('Videos on this topic (Russian)', [
  ['Stop Loss and Take Profit', 'stop loss take profit обучение на русском'],
  ['Market, limit and stop orders', 'рыночные лимитные стоп ордера обучение'],
])}

${RISK_EN}`,
      },
    },
  },
  {
    slug: 'platform-leverage-margin',
    level: 'beginner',
    locales: {
      ru: {
        title: 'Платформа · Плечо, маржа, маржин-колл и стоп-аут',
        excerpt: 'Как устроены плечо и маржа, где посмотреть плечо по категориям инструментов и что происходит при нехватке средств.',
        markdown: `Плечо позволяет открыть позицию больше ваших средств. Оно увеличивает и прибыль, и убыток — поэтому в нём нужно разобраться до первой сделки.

## Что такое плечо и маржа

**Маржа** — часть ваших средств, которую платформа блокирует как залог под открытую позицию. **Плечо** показывает соотношение: при плече 1:10 позиция стоимостью 1 000 USD требует 100 USD маржи.

Пример. На счёте 500 USD. Вы открываете позицию стоимостью 1 000 USD при плече 1:10 — заблокировано 100 USD. Цена ушла против вас на 5 % — убыток 50 USD, то есть **10 % вашего счёта**. Без плеча то же движение стоило бы вам 5 % от вложенного в позицию. Чем больше плечо и объём, тем быстрее небольшие движения цены превращаются в большие суммы.

Плечо не делает сделку выгоднее. Оно лишь позволяет занять больше залога — и столько же потерять.

## Где посмотреть своё плечо

Плечо назначает платформа по типу вашего счёта, и оно может отличаться по категориям инструментов: у криптовалют, форекса, металлов, акций, индексов и энергоносителей своё значение.

- **Кабинет → Условия счетов** — плечо по категориям, стоимость сделки и инструменты для вашего типа счёта (ваш тип отмечен).
- **Терминал, панель счёта** — поле «Плечо»; во вкладке «Баланс» — плечо счёта и значения по категориям.
- **Форма ордера** — плечо для выбранного инструмента и рассчитанная маржа.

Изменения плеча действуют на новые позиции. Открытые позиции держат плечо, с которым были открыты. Сменить тип счёта можно через поддержку.

## Цифры счёта в терминале

- **Баланс** — деньги на счёте без учёта открытых позиций.
- **Средства** — баланс плюс текущий результат открытых позиций.
- **Маржа** — сколько заблокировано под открытые позиции.
- **Свободно** — сколько можно использовать для новых позиций или вывести.
- **Открытый P&L** — текущий результат по открытым позициям.
- **Уровень маржи** = Средства / Маржа × 100 %. Без открытых позиций он не определён.

## Маржин-колл и стоп-аут

Если цена идёт против вас, «Средства» уменьшаются, и уровень маржи падает.

- **Маржин-колл** — уровень маржи опустился ниже порога. Терминал показывает предупреждение: пора пополнить счёт или сократить позиции.
- **Стоп-аут** — уровень маржи дошёл до порога стоп-аута. Платформа закрывает позиции автоматически, чтобы убыток не превысил средства.

Пороги вашего счёта указаны во вкладке «Баланс»: «Маржин-колл при» и «Стоп-аут при». Там же видно, включена ли защита от отрицательного баланса.

Пример. Средства 300 USD, маржа 200 USD — уровень 150 %. Если позиции уйдут в минус ещё на 100 USD, средства станут 200 USD, уровень — 100 %. Дальше всё зависит от порогов вашего счёта.

## Режим «Только закрытие» и блокировка

У инструмента может появиться пометка **«Только закрытие»**: новые позиции и ордера по нему не принимаются, но открытые можно закрыть. Так бывает, например, когда инструмент выводят из торговли. Если счёт заблокирован оператором, терминал покажет это вверху: открывать позиции нельзя, закрывать — можно; в таком случае обратитесь в поддержку.

## Как не дойти до стоп-аута

- Держите уровень маржи с большим запасом, не используйте всё «Свободно».
- Ставьте Stop Loss в каждой сделке — он закроет позицию раньше стоп-аута и по вашему решению.
- Считайте объём от риска, а не от доступного плеча.

## Главное

- Плечо увеличивает и прибыль, и убыток в одинаковой пропорции.
- Плечо по категориям — в кабинете в «Условиях счетов» и в терминале.
- Следите за уровнем маржи; пороги маржин-колла и стоп-аута — во вкладке «Баланс».

${RISK_RU}`,
      },
      en: {
        title: 'Platform · Leverage, margin, margin call and stop-out',
        excerpt: 'How leverage and margin work, where to see leverage per instrument category and what happens when funds run low.',
        markdown: `Leverage lets you open a position larger than your funds. It magnifies gains and losses alike.

## Leverage and margin

**Margin** is the part of your funds locked as collateral. With 1:10 leverage a 1,000 USD position needs 100 USD of margin. Example: with 500 USD on the account, a 5% move against that position loses 50 USD — 10% of the account.

## Where to see your leverage

Leverage is set by the platform for your account type and can differ by instrument category (crypto, forex, metals, stocks, indices, energy).

- **Client area → Account conditions** — leverage per category, trading costs, instruments.
- **Terminal** — the "Leverage" field in the account panel; per-category values under "Balance"; the order form shows the leverage and margin for the selected instrument.

Changes apply to new positions; open positions keep the leverage they were opened with.

## Account figures

Balance, Equity (balance plus open P&L), Margin, Free margin, Open P&L and **Margin level = Equity / Margin × 100%**.

## Margin call and stop-out

Below the margin-call level the terminal warns you to deposit or reduce positions. At the stop-out level positions are closed automatically. Your thresholds and negative balance protection status are shown under "Balance".

## Close only

An instrument marked **"Close only"** accepts no new positions or orders, but open ones can be closed.

## Key points

Keep a wide margin buffer, use a Stop Loss on every trade and size positions by risk, not by available leverage.

${RISK_EN}`,
      },
    },
  },
  {
    slug: 'platform-deposit-withdrawal',
    level: 'beginner',
    locales: {
      ru: {
        title: 'Платформа · Пополнение и вывод средств (USDT TRC20)',
        excerpt: 'Как пополнить реальный счёт в USDT по сети TRON, где взять хэш транзакции и как подать заявку на вывод.',
        markdown: `Реальный счёт пополняется и выводится в **USDT в сети TRON (TRC20)**. Обе операции — в личном кабинете, разделы «Пополнить» и «Вывести».

## Пополнение

**Шаг 1. Отправьте USDT на адрес.** В разделе «Пополнить» показан адрес для пополнения и QR-код. Скопируйте адрес кнопкой «Скопировать адрес» и после вставки в кошелёк сверьте первые и последние 4 символа.

Важно:

- Отправляйте **только USDT в сети TRON (TRC20)**. Другие токены и сети (ERC20, BEP20 и т. п.) не зачисляются — такие средства могут быть потеряны безвозвратно.
- Есть минимальная сумма пополнения — она указана на странице. Меньшая сумма не зачисляется.
- Не используйте старые сохранённые адреса. Если на странице написано, что реквизиты обновляются, не отправляйте средства и попробуйте позже.

**Шаг 2. Вставьте хэш транзакции.** Когда перевод уйдёт, найдите его хэш (TxID): в кошельке или на бирже, откуда отправляли, — «История» → этот перевод → «Хэш транзакции». Это 64 символа: цифры 0–9 и буквы a–f. Вставьте хэш и нажмите «Проверить и зачислить».

Платформа найдёт транзакцию в сети и зачислит средства — обычно примерно через минуту после подтверждения. Статус — в «Истории пополнений»: «Проверяется в сети», «Зачислено» или «Отклонено» с причиной (например, «это не USDT TRC20» или «сумма меньше минимума»). Каждую транзакцию можно открыть в Tronscan.

## Вывод

1. Откройте «Вывести». Там показано **«Доступно к выводу»** — это свободная маржа, то есть средства, не занятые открытыми позициями.
2. Укажите адрес получателя в сети TRON (начинается с T, 34 символа) и сумму в USDT (не больше двух знаков после запятой, не меньше минимума).
3. Нажмите «Подать заявку на вывод». Если включена двухфакторная защита, потребуется код.

Сумма списывается со счёта сразу при подаче — это резерв. Отправка — после проверки оператором. Статусы в «Истории выводов»: «На проверке», «Одобрена», «Отправлена», «Исполнена». Если заявку отклонят, деньги вернутся на счёт.

## Частые причины отказа

- **Нужно пройти верификацию.** Без верификации доступен вывод только в пределах лимита — кабинет покажет остаток. Пройдите верификацию в «Профиль → Верификация».
- **Недостаточно свободных средств.** Часть баланса занята открытыми позициями. Закройте часть позиций или выведите меньше.
- **Неверный адрес.** Проверьте каждый символ адреса TRON.

## Безопасность

- Проверяйте адрес перед каждой отправкой: перевод в блокчейне нельзя отменить.
- Включите двухфакторную защиту — тогда вывод без кода с вашего телефона невозможен.
- Сотрудники не просят перевести деньги на «другой адрес» в переписке. Адрес пополнения — только в кабинете.

## Главное

- Только USDT в сети TRON (TRC20), не меньше минимума.
- После перевода вставьте хэш транзакции.
- К выводу доступна свободная маржа; без верификации действует лимит.

${RISK_RU}`,
      },
      en: {
        title: 'Platform · Deposits and withdrawals (USDT TRC20)',
        excerpt: 'How to fund a live account with USDT on TRON, where to find the transaction hash and how to request a withdrawal.',
        markdown: `Live accounts are funded and withdrawn in **USDT on the TRON network (TRC20)** from the client area.

## Deposit

1. In **Deposit**, copy the address (or scan the QR code) and check the first and last 4 characters after pasting. Send **only USDT TRC20** — other tokens or networks (ERC20, BEP20, etc.) are not credited and may be lost. Amounts below the minimum shown on the page are not credited.
2. After sending, paste the **transaction hash** (TxID, 64 characters 0–9 and a–f) from your wallet's history and click "Check and credit". Funds are usually credited about a minute after confirmation. Status and reasons for rejection are shown in the deposit history.

## Withdrawal

In **Withdraw** you see the amount available — your free margin. Enter a TRON address (starts with T, 34 characters) and the amount, then submit. With 2FA enabled a code is required. The amount is reserved immediately and sent after an operator review; if rejected, it returns to your account. Without verification withdrawals are limited.

## Key points

Only USDT TRC20, paste the hash after sending, double-check addresses — blockchain transfers cannot be reversed.

${RISK_EN}`,
      },
    },
  },
]
