/* tslint:disable */
/* eslint-disable */

export type SupportedTimezones =
  | 'Pacific/Midway'
  | 'Pacific/Niue'
  | 'Pacific/Honolulu'
  | 'Pacific/Rarotonga'
  | 'America/Anchorage'
  | 'Pacific/Gambier'
  | 'America/Los_Angeles'
  | 'America/Tijuana'
  | 'America/Denver'
  | 'America/Phoenix'
  | 'America/Chicago'
  | 'America/Guatemala'
  | 'America/New_York'
  | 'America/Bogota'
  | 'America/Caracas'
  | 'America/Santiago'
  | 'America/Buenos_Aires'
  | 'America/Sao_Paulo'
  | 'Atlantic/South_Georgia'
  | 'Atlantic/Azores'
  | 'Atlantic/Cape_Verde'
  | 'Europe/London'
  | 'Europe/Berlin'
  | 'Africa/Lagos'
  | 'Europe/Athens'
  | 'Africa/Cairo'
  | 'Europe/Moscow'
  | 'Asia/Riyadh'
  | 'Asia/Dubai'
  | 'Asia/Baku'
  | 'Asia/Karachi'
  | 'Asia/Tashkent'
  | 'Asia/Calcutta'
  | 'Asia/Dhaka'
  | 'Asia/Almaty'
  | 'Asia/Jakarta'
  | 'Asia/Bangkok'
  | 'Asia/Shanghai'
  | 'Asia/Singapore'
  | 'Asia/Tokyo'
  | 'Asia/Seoul'
  | 'Australia/Brisbane'
  | 'Australia/Sydney'
  | 'Pacific/Guam'
  | 'Pacific/Noumea'
  | 'Pacific/Auckland'
  | 'Pacific/Fiji';

export interface Config {
  auth: {
    users: UserAuthOperations;
  };
  blocks: {};
  collections: {
    users: User;
    media: Media;
    sites: Site;
    articles: Article;
    'site-navigation': SiteNavigation;
    'site-faq': SiteFaq;
    'site-instruments': SiteInstrument;
    'site-accounts': SiteAccount;
    'site-promotions': SitePromotion;
    'site-partners': SitePartner;
    'site-academy': SiteAcademy;
    'site-streams': SiteStream;
    'site-contacts': SiteContact;
    'site-careers': SiteCareer;
    'site-legal': SiteLegal;
    'site-system-status': SiteSystemStatus;
    'site-cabinet-home': SiteCabinetHome;
    'payload-kv': PayloadKv;
    'payload-locked-documents': PayloadLockedDocument;
    'payload-preferences': PayloadPreference;
    'payload-migrations': PayloadMigration;
  };
  collectionsJoins: {};
  collectionsSelect: {
    users: UsersSelect<false> | UsersSelect<true>;
    media: MediaSelect<false> | MediaSelect<true>;
    sites: SitesSelect<false> | SitesSelect<true>;
    articles: ArticlesSelect<false> | ArticlesSelect<true>;
    'site-navigation': SiteNavigationSelect<false> | SiteNavigationSelect<true>;
    'site-faq': SiteFaqSelect<false> | SiteFaqSelect<true>;
    'site-instruments': SiteInstrumentsSelect<false> | SiteInstrumentsSelect<true>;
    'site-accounts': SiteAccountsSelect<false> | SiteAccountsSelect<true>;
    'site-promotions': SitePromotionsSelect<false> | SitePromotionsSelect<true>;
    'site-partners': SitePartnersSelect<false> | SitePartnersSelect<true>;
    'site-academy': SiteAcademySelect<false> | SiteAcademySelect<true>;
    'site-streams': SiteStreamsSelect<false> | SiteStreamsSelect<true>;
    'site-contacts': SiteContactsSelect<false> | SiteContactsSelect<true>;
    'site-careers': SiteCareersSelect<false> | SiteCareersSelect<true>;
    'site-legal': SiteLegalSelect<false> | SiteLegalSelect<true>;
    'site-system-status': SiteSystemStatusSelect<false> | SiteSystemStatusSelect<true>;
    'site-cabinet-home': SiteCabinetHomeSelect<false> | SiteCabinetHomeSelect<true>;
    'payload-kv': PayloadKvSelect<false> | PayloadKvSelect<true>;
    'payload-locked-documents': PayloadLockedDocumentsSelect<false> | PayloadLockedDocumentsSelect<true>;
    'payload-preferences': PayloadPreferencesSelect<false> | PayloadPreferencesSelect<true>;
    'payload-migrations': PayloadMigrationsSelect<false> | PayloadMigrationsSelect<true>;
  };
  db: {
    defaultIDType: number;
  };
  fallbackLocale:
    | ('false' | 'none' | 'null')
    | false
    | null
    | ('ru' | 'en' | 'de' | 'fr' | 'es')
    | ('ru' | 'en' | 'de' | 'fr' | 'es')[];
  globals: {
    'platform-instruments': PlatformInstrument;
  };
  globalsSelect: {
    'platform-instruments': PlatformInstrumentsSelect<false> | PlatformInstrumentsSelect<true>;
  };
  locale: 'ru' | 'en' | 'de' | 'fr' | 'es';
  widgets: {
    collections: CollectionsWidget;
  };
  user: User;
  jobs: {
    tasks: unknown;
    workflows: unknown;
  };
}
export interface UserAuthOperations {
  forgotPassword: {
    email: string;
    password: string;
  };
  login: {
    email: string;
    password: string;
  };
  registerFirstUser: {
    email: string;
    password: string;
  };
  unlock: {
    email: string;
    password: string;
  };
}
export interface User {
  id: number;
  role: 'admin' | 'editor';
  updatedAt: string;
  createdAt: string;
  email: string;
  resetPasswordToken?: string | null;
  resetPasswordExpiration?: string | null;
  salt?: string | null;
  hash?: string | null;
  loginAttempts?: number | null;
  lockUntil?: string | null;
  sessions?:
    | {
        id: string;
        createdAt?: string | null;
        expiresAt: string;
      }[]
    | null;
  password?: string | null;
  collection: 'users';
}
export interface Media {
  id: number;
  alt: string;
  updatedAt: string;
  createdAt: string;
  url?: string | null;
  thumbnailURL?: string | null;
  filename?: string | null;
  mimeType?: string | null;
  filesize?: number | null;
  width?: number | null;
  height?: number | null;
  focalX?: number | null;
  focalY?: number | null;
}
export interface Site {
  id: number;
  slug: string;
  name: string;
  logo?: (number | null) | Media;
  favicon?: (number | null) | Media;
  primaryColor: string;
  socials?:
    | {
        name: string;
        url: string;
        id?: string | null;
      }[]
    | null;
  instruments?:
    | {
        [k: string]: unknown;
      }
    | unknown[]
    | string
    | number
    | boolean
    | null;
  closeOnlyInstruments?:
    | {
        [k: string]: unknown;
      }
    | unknown[]
    | string
    | number
    | boolean
    | null;
  languages: ('ru' | 'en' | 'de' | 'fr' | 'es')[];
  defaultLanguage: 'ru' | 'en' | 'de' | 'fr' | 'es';
  heroBackground: 'quotes' | 'off';
  demoStartBalanceCents: number;
  webhookUrl?: string | null;
  webhookSecret?: string | null;
  updatedAt: string;
  createdAt: string;
}
export interface Article {
  id: number;
  site?: (number | null) | Site;
  slug: string;
  title: string;
  excerpt: string;
  category: string;
  source: string;
  publishedAt: string;
  readingMinutes: number;
  bodyMarkdown: string;
  updatedAt: string;
  createdAt: string;
  _status?: ('draft' | 'published') | null;
}
export interface SiteNavigation {
  id: number;
  site?: (number | null) | Site;
  header?:
    | {
        label: string;
        href: string;
        id?: string | null;
      }[]
    | null;
  footerColumns?:
    | {
        title: string;
        links?:
          | {
              label: string;
              href: string;
              id?: string | null;
            }[]
          | null;
        id?: string | null;
      }[]
    | null;
  riskWarning: string;
  updatedAt: string;
  createdAt: string;
  _status?: ('draft' | 'published') | null;
}
export interface SiteFaq {
  id: number;
  site?: (number | null) | Site;
  sections?:
    | {
        title: string;
        items?:
          | {
              question: string;
              answer: string;
              id?: string | null;
            }[]
          | null;
        id?: string | null;
      }[]
    | null;
  updatedAt: string;
  createdAt: string;
  _status?: ('draft' | 'published') | null;
}
export interface SiteInstrument {
  id: number;
  site?: (number | null) | Site;
  items?:
    | {
        symbol: string;
        name: string;
        category: 'forex' | 'metals' | 'crypto' | 'indices' | 'stocks' | 'energy';
        digits: number;
        leverageMax?: string | null;
        spreadFrom: string;
        swapFree?: boolean | null;
        icon?: (number | null) | Media;
        id?: string | null;
      }[]
    | null;
  updatedAt: string;
  createdAt: string;
  _status?: ('draft' | 'published') | null;
}
export interface SiteAccount {
  id: number;
  site?: (number | null) | Site;
  items?:
    | {
        planId: string;
        portfolioKey?: string | null;
        name: string;
        description: string;
        minDeposit?: string | null;
        featured?: boolean | null;
        features?:
          | {
              label: string;
              value: string;
              id?: string | null;
            }[]
          | null;
        pricing?: {
          spreadPips?: number | null;
          commissionPerLotRT?: number | null;
        };
        id?: string | null;
      }[]
    | null;
  updatedAt: string;
  createdAt: string;
  _status?: ('draft' | 'published') | null;
}
export interface SitePromotion {
  id: number;
  site?: (number | null) | Site;
  items?:
    | {
        promoId: string;
        enginePromoId?: string | null;
        badge: string;
        title: string;
        description: string;
        terms: string;
        ctaLabel: string;
        ctaHref: string;
        featured?: boolean | null;
        activeFrom?: string | null;
        activeTo?: string | null;
        id?: string | null;
      }[]
    | null;
  updatedAt: string;
  createdAt: string;
  _status?: ('draft' | 'published') | null;
}
export interface SitePartner {
  id: number;
  site?: (number | null) | Site;
  models?:
    | {
        name: string;
        description: string;
        features?:
          | {
              text: string;
              id?: string | null;
            }[]
          | null;
        id?: string | null;
      }[]
    | null;
  tiers?:
    | {
        name: string;
        clients: string;
        share: string;
        featured?: boolean | null;
        id?: string | null;
      }[]
    | null;
  steps?:
    | {
        title: string;
        text: string;
        id?: string | null;
      }[]
    | null;
  updatedAt: string;
  createdAt: string;
  _status?: ('draft' | 'published') | null;
}
export interface SiteAcademy {
  id: number;
  site?: (number | null) | Site;
  articles?:
    | {
        slug: string;
        title: string;
        excerpt: string;
        level: 'beginner' | 'intermediate';
        readingMinutes: number;
        bodyMarkdown: string;
        id?: string | null;
      }[]
    | null;
  webinars?:
    | {
        webinarId: string;
        title: string;
        speaker: string;
        speakerRole: string;
        startsAt: string;
        durationMinutes: number;
        level: string;
        description: string;
        id?: string | null;
      }[]
    | null;
  glossary?:
    | {
        term: string;
        definition: string;
        id?: string | null;
      }[]
    | null;
  updatedAt: string;
  createdAt: string;
  _status?: ('draft' | 'published') | null;
}
export interface SiteStream {
  id: number;
  site?: (number | null) | Site;
  items?:
    | {
        provider: 'youtube' | 'vimeo';
        videoId: string;
        title: string;
        poster?: (number | null) | Media;
        startsAt: string;
        status: 'live' | 'upcoming' | 'past';
        id?: string | null;
      }[]
    | null;
  updatedAt: string;
  createdAt: string;
  _status?: ('draft' | 'published') | null;
}
export interface SiteContact {
  id: number;
  site?: (number | null) | Site;
  channels?:
    | {
        title: string;
        value: string;
        detail: string;
        id?: string | null;
      }[]
    | null;
  offices?:
    | {
        city: string;
        country: string;
        address: string;
        id?: string | null;
      }[]
    | null;
  updatedAt: string;
  createdAt: string;
  _status?: ('draft' | 'published') | null;
}
export interface SiteCareer {
  id: number;
  site?: (number | null) | Site;
  benefits?:
    | {
        title: string;
        text: string;
        id?: string | null;
      }[]
    | null;
  vacancies?:
    | {
        title: string;
        department: string;
        location: string;
        type: string;
        applyEmail: string;
        id?: string | null;
      }[]
    | null;
  updatedAt: string;
  createdAt: string;
  _status?: ('draft' | 'published') | null;
}
export interface SiteLegal {
  id: number;
  site?: (number | null) | Site;
  items?:
    | {
        slug: string;
        title: string;
        updatedAt: string;
        intro: string;
        sections?:
          | {
              heading: string;
              paragraphsMarkdown?:
                | {
                    text: string;
                    id?: string | null;
                  }[]
                | null;
              id?: string | null;
            }[]
          | null;
        id?: string | null;
      }[]
    | null;
  updatedAt: string;
  createdAt: string;
  _status?: ('draft' | 'published') | null;
}
export interface SiteSystemStatus {
  id: number;
  site?: (number | null) | Site;
  services?:
    | {
        serviceId: string;
        name: string;
        description: string;
        status: 'operational' | 'degraded' | 'outage' | 'maintenance';
        uptime90d: string;
        id?: string | null;
      }[]
    | null;
  incidents?:
    | {
        date: string;
        title: string;
        status: string;
        text: string;
        id?: string | null;
      }[]
    | null;
  updatedAt: string;
  createdAt: string;
  _status?: ('draft' | 'published') | null;
}
export interface SiteCabinetHome {
  id: number;
  site?: (number | null) | Site;
  modules?:
    | {
        type: 'profile' | 'onboarding' | 'balance' | 'markets' | 'promotions';
        enabled?: boolean | null;
        steps?: {
          verification?: boolean | null;
          deposit?: boolean | null;
          firstTrade?: boolean | null;
        };
        buttons?: {
          deposit?: boolean | null;
          withdraw?: boolean | null;
          buyFiat?: boolean | null;
        };
        tabs?: {
          assets?: boolean | null;
          popular?: boolean | null;
          newListing?: boolean | null;
          favorites?: boolean | null;
          gainers?: boolean | null;
          volume?: boolean | null;
        };
        newListingSymbols?:
          | {
              symbol: string;
              id?: string | null;
            }[]
          | null;
        id?: string | null;
      }[]
    | null;
  updatedAt: string;
  createdAt: string;
  _status?: ('draft' | 'published') | null;
}
export interface PayloadKv {
  id: number;
  key: string;
  data:
    | {
        [k: string]: unknown;
      }
    | unknown[]
    | string
    | number
    | boolean
    | null;
}
export interface PayloadLockedDocument {
  id: number;
  document?:
    | ({
        relationTo: 'users';
        value: number | User;
      } | null)
    | ({
        relationTo: 'media';
        value: number | Media;
      } | null)
    | ({
        relationTo: 'sites';
        value: number | Site;
      } | null)
    | ({
        relationTo: 'articles';
        value: number | Article;
      } | null)
    | ({
        relationTo: 'site-navigation';
        value: number | SiteNavigation;
      } | null)
    | ({
        relationTo: 'site-faq';
        value: number | SiteFaq;
      } | null)
    | ({
        relationTo: 'site-instruments';
        value: number | SiteInstrument;
      } | null)
    | ({
        relationTo: 'site-accounts';
        value: number | SiteAccount;
      } | null)
    | ({
        relationTo: 'site-promotions';
        value: number | SitePromotion;
      } | null)
    | ({
        relationTo: 'site-partners';
        value: number | SitePartner;
      } | null)
    | ({
        relationTo: 'site-academy';
        value: number | SiteAcademy;
      } | null)
    | ({
        relationTo: 'site-streams';
        value: number | SiteStream;
      } | null)
    | ({
        relationTo: 'site-contacts';
        value: number | SiteContact;
      } | null)
    | ({
        relationTo: 'site-careers';
        value: number | SiteCareer;
      } | null)
    | ({
        relationTo: 'site-legal';
        value: number | SiteLegal;
      } | null)
    | ({
        relationTo: 'site-system-status';
        value: number | SiteSystemStatus;
      } | null)
    | ({
        relationTo: 'site-cabinet-home';
        value: number | SiteCabinetHome;
      } | null);
  globalSlug?: string | null;
  user: {
    relationTo: 'users';
    value: number | User;
  };
  updatedAt: string;
  createdAt: string;
}
export interface PayloadPreference {
  id: number;
  user: {
    relationTo: 'users';
    value: number | User;
  };
  key?: string | null;
  value?:
    | {
        [k: string]: unknown;
      }
    | unknown[]
    | string
    | number
    | boolean
    | null;
  updatedAt: string;
  createdAt: string;
}
export interface PayloadMigration {
  id: number;
  name?: string | null;
  batch?: number | null;
  updatedAt: string;
  createdAt: string;
}
export interface UsersSelect<T extends boolean = true> {
  role?: T;
  updatedAt?: T;
  createdAt?: T;
  email?: T;
  resetPasswordToken?: T;
  resetPasswordExpiration?: T;
  salt?: T;
  hash?: T;
  loginAttempts?: T;
  lockUntil?: T;
  sessions?:
    | T
    | {
        id?: T;
        createdAt?: T;
        expiresAt?: T;
      };
}
export interface MediaSelect<T extends boolean = true> {
  alt?: T;
  updatedAt?: T;
  createdAt?: T;
  url?: T;
  thumbnailURL?: T;
  filename?: T;
  mimeType?: T;
  filesize?: T;
  width?: T;
  height?: T;
  focalX?: T;
  focalY?: T;
}
export interface SitesSelect<T extends boolean = true> {
  slug?: T;
  name?: T;
  logo?: T;
  favicon?: T;
  primaryColor?: T;
  socials?:
    | T
    | {
        name?: T;
        url?: T;
        id?: T;
      };
  instruments?: T;
  closeOnlyInstruments?: T;
  languages?: T;
  defaultLanguage?: T;
  heroBackground?: T;
  demoStartBalanceCents?: T;
  webhookUrl?: T;
  webhookSecret?: T;
  updatedAt?: T;
  createdAt?: T;
}
export interface ArticlesSelect<T extends boolean = true> {
  site?: T;
  slug?: T;
  title?: T;
  excerpt?: T;
  category?: T;
  source?: T;
  publishedAt?: T;
  readingMinutes?: T;
  bodyMarkdown?: T;
  updatedAt?: T;
  createdAt?: T;
  _status?: T;
}
export interface SiteNavigationSelect<T extends boolean = true> {
  site?: T;
  header?:
    | T
    | {
        label?: T;
        href?: T;
        id?: T;
      };
  footerColumns?:
    | T
    | {
        title?: T;
        links?:
          | T
          | {
              label?: T;
              href?: T;
              id?: T;
            };
        id?: T;
      };
  riskWarning?: T;
  updatedAt?: T;
  createdAt?: T;
  _status?: T;
}
export interface SiteFaqSelect<T extends boolean = true> {
  site?: T;
  sections?:
    | T
    | {
        title?: T;
        items?:
          | T
          | {
              question?: T;
              answer?: T;
              id?: T;
            };
        id?: T;
      };
  updatedAt?: T;
  createdAt?: T;
  _status?: T;
}
export interface SiteInstrumentsSelect<T extends boolean = true> {
  site?: T;
  items?:
    | T
    | {
        symbol?: T;
        name?: T;
        category?: T;
        digits?: T;
        leverageMax?: T;
        spreadFrom?: T;
        swapFree?: T;
        icon?: T;
        id?: T;
      };
  updatedAt?: T;
  createdAt?: T;
  _status?: T;
}
export interface SiteAccountsSelect<T extends boolean = true> {
  site?: T;
  items?:
    | T
    | {
        planId?: T;
        portfolioKey?: T;
        name?: T;
        description?: T;
        minDeposit?: T;
        featured?: T;
        features?:
          | T
          | {
              label?: T;
              value?: T;
              id?: T;
            };
        pricing?:
          | T
          | {
              spreadPips?: T;
              commissionPerLotRT?: T;
            };
        id?: T;
      };
  updatedAt?: T;
  createdAt?: T;
  _status?: T;
}
export interface SitePromotionsSelect<T extends boolean = true> {
  site?: T;
  items?:
    | T
    | {
        promoId?: T;
        enginePromoId?: T;
        badge?: T;
        title?: T;
        description?: T;
        terms?: T;
        ctaLabel?: T;
        ctaHref?: T;
        featured?: T;
        activeFrom?: T;
        activeTo?: T;
        id?: T;
      };
  updatedAt?: T;
  createdAt?: T;
  _status?: T;
}
export interface SitePartnersSelect<T extends boolean = true> {
  site?: T;
  models?:
    | T
    | {
        name?: T;
        description?: T;
        features?:
          | T
          | {
              text?: T;
              id?: T;
            };
        id?: T;
      };
  tiers?:
    | T
    | {
        name?: T;
        clients?: T;
        share?: T;
        featured?: T;
        id?: T;
      };
  steps?:
    | T
    | {
        title?: T;
        text?: T;
        id?: T;
      };
  updatedAt?: T;
  createdAt?: T;
  _status?: T;
}
export interface SiteAcademySelect<T extends boolean = true> {
  site?: T;
  articles?:
    | T
    | {
        slug?: T;
        title?: T;
        excerpt?: T;
        level?: T;
        readingMinutes?: T;
        bodyMarkdown?: T;
        id?: T;
      };
  webinars?:
    | T
    | {
        webinarId?: T;
        title?: T;
        speaker?: T;
        speakerRole?: T;
        startsAt?: T;
        durationMinutes?: T;
        level?: T;
        description?: T;
        id?: T;
      };
  glossary?:
    | T
    | {
        term?: T;
        definition?: T;
        id?: T;
      };
  updatedAt?: T;
  createdAt?: T;
  _status?: T;
}
export interface SiteStreamsSelect<T extends boolean = true> {
  site?: T;
  items?:
    | T
    | {
        provider?: T;
        videoId?: T;
        title?: T;
        poster?: T;
        startsAt?: T;
        status?: T;
        id?: T;
      };
  updatedAt?: T;
  createdAt?: T;
  _status?: T;
}
export interface SiteContactsSelect<T extends boolean = true> {
  site?: T;
  channels?:
    | T
    | {
        title?: T;
        value?: T;
        detail?: T;
        id?: T;
      };
  offices?:
    | T
    | {
        city?: T;
        country?: T;
        address?: T;
        id?: T;
      };
  updatedAt?: T;
  createdAt?: T;
  _status?: T;
}
export interface SiteCareersSelect<T extends boolean = true> {
  site?: T;
  benefits?:
    | T
    | {
        title?: T;
        text?: T;
        id?: T;
      };
  vacancies?:
    | T
    | {
        title?: T;
        department?: T;
        location?: T;
        type?: T;
        applyEmail?: T;
        id?: T;
      };
  updatedAt?: T;
  createdAt?: T;
  _status?: T;
}
export interface SiteLegalSelect<T extends boolean = true> {
  site?: T;
  items?:
    | T
    | {
        slug?: T;
        title?: T;
        updatedAt?: T;
        intro?: T;
        sections?:
          | T
          | {
              heading?: T;
              paragraphsMarkdown?:
                | T
                | {
                    text?: T;
                    id?: T;
                  };
              id?: T;
            };
        id?: T;
      };
  updatedAt?: T;
  createdAt?: T;
  _status?: T;
}
export interface SiteSystemStatusSelect<T extends boolean = true> {
  site?: T;
  services?:
    | T
    | {
        serviceId?: T;
        name?: T;
        description?: T;
        status?: T;
        uptime90d?: T;
        id?: T;
      };
  incidents?:
    | T
    | {
        date?: T;
        title?: T;
        status?: T;
        text?: T;
        id?: T;
      };
  updatedAt?: T;
  createdAt?: T;
  _status?: T;
}
export interface SiteCabinetHomeSelect<T extends boolean = true> {
  site?: T;
  modules?:
    | T
    | {
        type?: T;
        enabled?: T;
        steps?:
          | T
          | {
              verification?: T;
              deposit?: T;
              firstTrade?: T;
            };
        buttons?:
          | T
          | {
              deposit?: T;
              withdraw?: T;
              buyFiat?: T;
            };
        tabs?:
          | T
          | {
              assets?: T;
              popular?: T;
              newListing?: T;
              favorites?: T;
              gainers?: T;
              volume?: T;
            };
        newListingSymbols?:
          | T
          | {
              symbol?: T;
              id?: T;
            };
        id?: T;
      };
  updatedAt?: T;
  createdAt?: T;
  _status?: T;
}
export interface PayloadKvSelect<T extends boolean = true> {
  key?: T;
  data?: T;
}
export interface PayloadLockedDocumentsSelect<T extends boolean = true> {
  document?: T;
  globalSlug?: T;
  user?: T;
  updatedAt?: T;
  createdAt?: T;
}
export interface PayloadPreferencesSelect<T extends boolean = true> {
  user?: T;
  key?: T;
  value?: T;
  updatedAt?: T;
  createdAt?: T;
}
export interface PayloadMigrationsSelect<T extends boolean = true> {
  name?: T;
  batch?: T;
  updatedAt?: T;
  createdAt?: T;
}
export interface PlatformInstrument {
  id: number;
  instruments?:
    | {
        [k: string]: unknown;
      }
    | unknown[]
    | string
    | number
    | boolean
    | null;
  version?: number | null;
  computedHash?: string | null;
  updatedAt?: string | null;
  createdAt?: string | null;
}
export interface PlatformInstrumentsSelect<T extends boolean = true> {
  instruments?: T;
  version?: T;
  computedHash?: T;
  updatedAt?: T;
  createdAt?: T;
  globalType?: T;
}
export interface CollectionsWidget {
  data?: {
    [k: string]: unknown;
  };
  width: 'full';
}
export interface Auth {
  [k: string]: unknown;
}


declare module 'payload' {
  export interface GeneratedTypes extends Config {}
}