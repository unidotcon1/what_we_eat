import { Link } from 'react-router-dom'

const issues_url = 'https://github.com/unidotcon1/what_we_eat/issues'

function LegalShell({ title, other, children }: { title: string; other: { to: string; label: string }; children: React.ReactNode }) {
  return (
    <main className="app legal">
      <Link to="/">← Back to What We Eat</Link>
      <h1>{title}</h1>
      <p className="sub">Last updated 30 October 2026</p>
      {children}
      <p>
        <Link to={other.to}>{other.label}</Link>
      </p>
    </main>
  )
}

export function PrivacyPage() {
  return (
    <LegalShell title="Privacy policy" other={{ to: '/terms', label: 'Terms of service' }}>
      <p>
        What We Eat is a hobby project that helps groups and couples pick a place to eat in Singapore. This page says what
        it stores and who handles it.
      </p>

      <h2>What we store</h2>
      <p>
        If you sign in with Google, Google shares your email address and basic profile details (name and picture) with
        Supabase, which runs our sign-in and database. We use your email address to identify your account.
      </p>
      <p>
        We also store what you create: the places you save, your reviews (a rating and up to 280 characters of text), your
        points, and the polls you make and vote in. Reviews appear to other people only after approval, with the rating
        and text but not your name or email address. Anyone with a poll link can see its title, options and vote counts,
        so do not put private details in a poll title.
      </p>

      <h2>On your device</h2>
      <p>
        Your browser keeps your saved places, shortlist, list of polls, theme, and a random voting token. Voting does not
        need an account. The token lets you change your vote, and the server only keeps a hashed copy of it, so no one can
        read it and vote as you. Clearing your browser data removes what is on your device.
      </p>

      <h2>Location</h2>
      <p>
        If you tap Near me, your browser asks permission to share your location. Your location is used on your device to
        sort and filter restaurants and is never sent to our servers.
      </p>

      <h2>Who else handles data</h2>
      <p>
        Google (sign-in), Supabase (database and accounts), and Cloudflare (hosting, whose servers see standard request
        details such as your IP address). When you open the map, tiles load from OpenStreetMap, whose servers also see
        your IP address. The WhatsApp and Telegram share buttons only open those apps with a message you choose to send.
      </p>
      <p>We do not sell your data, and the app has no ads or analytics.</p>

      <h2>Your choices</h2>
      <p>
        To ask for your account data to be deleted, <a href={issues_url}>open an issue</a> on the project page without
        including private details, and we will arrange a private way to confirm it is you.
      </p>
    </LegalShell>
  )
}

export function TermsPage() {
  return (
    <LegalShell title="Terms of service" other={{ to: '/privacy', label: 'Privacy policy' }}>
      <p>By using What We Eat you agree to these terms.</p>

      <h2>The service</h2>
      <p>
        What We Eat is a hobby project provided as is, with no promise that it will always be available or free of
        mistakes. We may change it or stop it at any time.
      </p>

      <h2>Restaurant information</h2>
      <p>
        The restaurant listings are sample entries while the app is in its early stage, and some may be made up or out of
        date. Check opening hours and prices with the restaurant before you go.
      </p>

      <h2>What you post</h2>
      <p>
        Reviews should be your own honest words. Do not post spam, abuse, or anything
        unlawful. Reviews are approved by hand, and we may edit or remove content that breaks these rules.
      </p>

      <h2>Points</h2>
      <p>Points are for fun. They have no cash value and may be adjusted or reset.</p>

      <h2>The code</h2>
      <p>
        The source code is available under the MIT license on the project page. These terms cover the hosted website. To
        reach us, <a href={issues_url}>open an issue</a>.
      </p>
    </LegalShell>
  )
}
