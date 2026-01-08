import Link from 'next/link';

export default function StripeConnectErrorPage() {
  return (
    <main className="layout onboarding-page">
      <section className="onboarding-card onboarding-card-error">
        <div className="onboarding-badge onboarding-badge-error">!</div>
        <h1>Onboarding interrompu</h1>
        <p className="onboarding-lead">
          L’enrôlement Stripe Express n’a pas pu être finalisé. Pas de panique : tu peux reprendre le
          processus en quelques secondes.
        </p>

        <div className="onboarding-actions">
          <Link href="/merchant" className="btn-primary">
            Revenir au dashboard
          </Link>
          <a
            href="https://support.stripe.com/"
            target="_blank"
            rel="noopener noreferrer"
            className="btn-outline"
          >
            Voir l’aide Stripe
          </a>
        </div>

        <p className="onboarding-hint">
          Vérifie que toutes les informations demandées par Stripe sont renseignées, puis relance l’onboarding
          depuis le tableau de bord marchand.
        </p>
      </section>
    </main>
  );
}


