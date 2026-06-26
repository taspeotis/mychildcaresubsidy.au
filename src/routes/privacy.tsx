import { createFileRoute } from '@tanstack/react-router'
import { Page } from '../components/Page'
import { pageMeta } from '../seo'

export const Route = createFileRoute('/privacy')({
  component: PrivacyPage,
  head: () => pageMeta({
    title: 'Privacy',
    description:
      'What this site does with your information. Nothing you enter leaves your browser, and we keep anonymous page-view counts only.',
  }),
})

const linkClass = 'font-medium text-brand-700 underline underline-offset-2 transition-colors hover:text-brand-900'

function PrivacyPage() {
  return (
    <Page
      title="Privacy"
      sidebar={<p className="text-xs text-white/50">Last updated 26 June 2026.</p>}
    >
      <section className="rounded-2xl card-glass p-6 sm:p-8">
        <h2 className="text-lg font-bold text-slate-900">Your figures stay in your browser</h2>
        <p className="mt-2 text-sm leading-relaxed text-slate-700">
          Everything you enter into the calculators stays on your device. Your income, your fees,
          and the estimates you save are never sent to us or stored anywhere we can see.
        </p>

        <h2 className="mt-8 text-lg font-bold text-slate-900">What we measure</h2>
        <p className="mt-2 text-sm leading-relaxed text-slate-700">
          We use{' '}
          <a href="https://www.goatcounter.com" target="_blank" rel="noopener noreferrer" className={linkClass}>
            GoatCounter
          </a>{' '}
          to count which pages get visited. It records the page and a rough location, with no
          cookies and no way to tie a visit back to you. We collect nothing else, and there are no
          ads or third-party trackers. You can read their{' '}
          <a
            href="https://www.goatcounter.com/help/privacy"
            target="_blank"
            rel="noopener noreferrer"
            className={linkClass}
          >
            privacy policy
          </a>{' '}
          if you&rsquo;d like the detail.
        </p>

        <h2 className="mt-8 text-lg font-bold text-slate-900">Hosting</h2>
        <p className="mt-2 text-sm leading-relaxed text-slate-700">
          Like any website, our host keeps brief server logs, including IP addresses, to keep the
          site running and secure. We don&rsquo;t use them to identify you.
        </p>
      </section>
    </Page>
  )
}
