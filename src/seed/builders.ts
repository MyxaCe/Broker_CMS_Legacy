export interface ContentBuilder {
  collection: string
  build: (f: any) => Record<string, unknown>
}

export const CONTENT_BUILDERS: Record<string, ContentBuilder> = {
  navigation: {
    collection: 'site-navigation',
    build: (f) => ({ header: f.header, footerColumns: f.footer.columns, riskWarning: f.footer.riskWarning }),
  },
  faq: { collection: 'site-faq', build: (f) => ({ sections: f.sections }) },
  instruments: {
    collection: 'site-instruments',
    build: (f) => ({
      items: f.items.map((i: any) => ({
        symbol: i.symbol,
        name: i.name,
        category: i.category,
        digits: i.digits,
        ...(i.leverageMax !== undefined ? { leverageMax: i.leverageMax } : {}),
        spreadFrom: i.spreadFrom,
        swapFree: i.swapFree,
      })),
    }),
  },
  accounts: {
    collection: 'site-accounts',
    build: (f) => ({
      items: f.items.map((p: any) => ({
        planId: p.id,
        ...(p.portfolioKey !== undefined ? { portfolioKey: p.portfolioKey } : {}),
        name: p.name,
        description: p.description,
        ...(p.minDeposit !== undefined ? { minDeposit: p.minDeposit } : {}),
        featured: p.featured,
        features: p.features,
        ...(p.pricing !== undefined ? { pricing: p.pricing } : {}),
      })),
    }),
  },
  promotions: {
    collection: 'site-promotions',
    build: (f) => ({
      items: f.items.map((p: any) => ({
        promoId: p.id,
        ...(p.promoId !== undefined ? { enginePromoId: p.promoId } : {}),
        badge: p.badge,
        title: p.title,
        description: p.description,
        terms: p.terms,
        ctaLabel: p.ctaLabel,
        ctaHref: p.ctaHref,
        featured: p.featured,
        ...(p.activeFrom ? { activeFrom: p.activeFrom } : {}),
        ...(p.activeTo ? { activeTo: p.activeTo } : {}),
      })),
    }),
  },
  partners: {
    collection: 'site-partners',
    build: (f) => ({
      models: f.models.map((m: any) => ({
        name: m.name,
        description: m.description,
        features: m.features.map((text: string) => ({ text })),
      })),
      tiers: f.tiers.map((t: any) => ({
        name: t.name,
        clients: t.clients,
        share: t.share,
        featured: t.featured ?? false,
      })),
      steps: f.steps,
    }),
  },
  academy: {
    collection: 'site-academy',
    build: (f) => ({
      articles: f.articles,
      webinars: f.webinars.map((w: any) => ({
        webinarId: w.id,
        title: w.title,
        speaker: w.speaker,
        speakerRole: w.speakerRole,
        startsAt: w.startsAt,
        durationMinutes: w.durationMinutes,
        level: w.level,
        description: w.description,
      })),
      glossary: f.glossary,
    }),
  },
  streams: {
    collection: 'site-streams',
    build: (f) => ({
      items: f.items.map((s: any) => ({
        provider: s.provider,
        videoId: s.videoId,
        title: s.title,
        startsAt: s.startsAt,
        status: s.status,
      })),
    }),
  },
  contacts: { collection: 'site-contacts', build: (f) => ({ channels: f.channels, offices: f.offices }) },
  careers: { collection: 'site-careers', build: (f) => ({ benefits: f.benefits, vacancies: f.vacancies }) },
  legal: {
    collection: 'site-legal',
    build: (f) => ({
      items: f.items.map((d: any) => ({
        slug: d.slug,
        title: d.title,
        updatedAt: d.updatedAt,
        intro: d.intro,
        sections: d.sections.map((s: any) => ({
          heading: s.heading,
          paragraphsMarkdown: s.paragraphsMarkdown.map((text: string) => ({ text })),
        })),
      })),
    }),
  },
  'system-status': {
    collection: 'site-system-status',
    build: (f) => ({
      services: f.services.map((s: any) => ({
        serviceId: s.id,
        name: s.name,
        description: s.description,
        check: s.check ?? null,
        manualStatus: s.manualStatus ?? 'auto',
        maintenanceNote: s.maintenanceNote ?? null,
        maintenanceFrom: s.maintenanceFrom ?? null,
        maintenanceTo: s.maintenanceTo ?? null,
        status: s.status,
        uptime90d: s.uptime90d,
      })),
      incidents: f.incidents.map((i: any) => ({
        occurredOn: `${i.date}T12:00:00.000Z`,
        date: i.date,
        title: i.title,
        state: i.state,
        status: i.status,
        text: i.text,
      })),
    }),
  },
  'cabinet-home': {
    collection: 'site-cabinet-home',
    build: (f) => ({
      modules: f.modules.map((m: any) => ({
        type: m.type,
        enabled: m.enabled,
        ...(m.steps ? { steps: m.steps } : {}),
        ...(m.buttons ? { buttons: m.buttons } : {}),
        ...(m.tabs ? { tabs: m.tabs } : {}),
        ...(m.newListingSymbols
          ? { newListingSymbols: m.newListingSymbols.map((symbol: string) => ({ symbol })) }
          : {}),
      })),
    }),
  },
}
