/**
 * Элементы, на которые может указывать шаг экскурсии. Список закрыт: произвольный
 * CSS-селектор в CMS ввести нельзя. Тот же список — в кабинете
 * (apps/cabinet/lib/onboarding/anchors.ts) и терминале (public/tour.js):
 * там имя переводится в селекторы для компьютера и телефона.
 */
export const ONBOARDING_PARTS = ['registration', 'cabinet', 'terminal'] as const
export type OnboardingPart = (typeof ONBOARDING_PARTS)[number]

export const ONBOARDING_PART_LABELS: Record<OnboardingPart, string> = {
  registration: 'Регистрация',
  cabinet: 'Личный кабинет',
  terminal: 'Терминал',
}

export const ONBOARDING_ANCHORS: { value: string; label: string }[] = [
  { value: 'registration.firstName', label: 'Регистрация — поле «Имя»' },
  { value: 'registration.lastName', label: 'Регистрация — поле «Фамилия»' },
  { value: 'registration.email', label: 'Регистрация — поле «Email»' },
  { value: 'registration.phone', label: 'Регистрация — поле «Телефон»' },
  { value: 'registration.country', label: 'Регистрация — поле «Страна»' },
  { value: 'registration.password', label: 'Регистрация — поле «Пароль»' },
  { value: 'registration.submit', label: 'Регистрация — кнопка отправки формы' },
  { value: 'cabinet.balanceDemo', label: 'Кабинет — демо-счёт' },
  { value: 'cabinet.balanceReal', label: 'Кабинет — реальный счёт' },
  { value: 'cabinet.deposit', label: 'Кабинет — кнопка «Пополнить»' },
  { value: 'cabinet.withdraw', label: 'Кабинет — кнопка «Вывести»' },
  { value: 'cabinet.nextSteps', label: 'Кабинет — «Следующие шаги» (проверка, пополнение, сделка)' },
  { value: 'cabinet.wallet', label: 'Кабинет — меню «Кошелёк»' },
  { value: 'cabinet.history', label: 'Кабинет — меню «История»' },
  { value: 'cabinet.profile', label: 'Кабинет — меню «Профиль» (документы, проверка личности)' },
  { value: 'cabinet.security', label: 'Кабинет — безопасность и 2FA (меню «Профиль»)' },
  { value: 'cabinet.trade', label: 'Кабинет — меню «Торговля» (переход в терминал)' },
  { value: 'cabinet.help', label: 'Кабинет — кнопка «?» (повторить экскурсию)' },
  { value: 'terminal.pairs', label: 'Терминал — список инструментов' },
  { value: 'terminal.categories', label: 'Терминал — вкладки категорий' },
  { value: 'terminal.chart', label: 'Терминал — график' },
  { value: 'terminal.timeframes', label: 'Терминал — таймфреймы графика' },
  { value: 'terminal.deal', label: 'Терминал — панель сделки' },
  { value: 'terminal.volume', label: 'Терминал — объём сделки' },
  { value: 'terminal.sltp', label: 'Терминал — стоп-лосс и тейк-профит' },
  { value: 'terminal.buySell', label: 'Терминал — кнопки «Купить» / «Продать»' },
  { value: 'terminal.positions', label: 'Терминал — открытые позиции' },
  { value: 'terminal.close', label: 'Терминал — закрытие сделки' },
  { value: 'terminal.help', label: 'Терминал — кнопка «?» (повторить экскурсию)' },
]

const ANCHOR_VALUES = new Set(ONBOARDING_ANCHORS.map((a) => a.value))

export function isOnboardingPart(value: unknown): value is OnboardingPart {
  return typeof value === 'string' && (ONBOARDING_PARTS as readonly string[]).includes(value)
}

/** Якорь известен и относится к своей части (`cabinet.deposit` — только в части «кабинет»). */
export function anchorFitsPart(anchor: unknown, part: unknown): boolean {
  return typeof anchor === 'string' && ANCHOR_VALUES.has(anchor) && isOnboardingPart(part) && anchor.startsWith(`${part}.`)
}
