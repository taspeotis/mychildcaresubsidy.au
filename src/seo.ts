const SITE = 'mychildcaresubsidy.au'

interface PageMetaInput {
  title: string
  description: string
}

interface MetaTag {
  title?: string
  name?: string
  property?: string
  content?: string
}

/**
 * Build the `head` payload for a TanStack Router route.
 * Appends " | mychildcaresubsidy.au" to the title and mirrors title/description
 * into Open Graph tags so social shares look right.
 */
export function pageMeta({ title, description }: PageMetaInput): { meta: MetaTag[] } {
  const fullTitle = `${title} | ${SITE}`
  return {
    meta: [
      { title: fullTitle },
      { name: 'description', content: description },
      { property: 'og:title', content: fullTitle },
      { property: 'og:description', content: description },
    ],
  }
}
