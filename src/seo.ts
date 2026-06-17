const SITE = 'mychildcaresubsidy.au'

interface PageMetaInput {
  title: string
  description: string
  /** Set true to keep the page out of search engines (e.g. low-key utility pages). */
  noindex?: boolean
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
export function pageMeta({ title, description, noindex }: PageMetaInput): { meta: MetaTag[] } {
  return {
    meta: [
      { title: `${title} | ${SITE}` },
      { name: 'description', content: description },
      { property: 'og:title', content: title },
      { property: 'og:description', content: description },
      ...(noindex ? [{ name: 'robots', content: 'noindex' }] : []),
    ],
  }
}
