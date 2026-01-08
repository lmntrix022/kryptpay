import Link from 'next/link';

export default function StripeConnectSuccessPage() {
  return (
    <main className="layout onboarding-page">
      <section className="onboarding-card onboarding-card-success">
        <div className="onboarding-badge onboarding-badge-success">✓</div>
        <h1>Onboarding Stripe terminé 🎉</h1>
        <p className="onboarding-lead">
          Ton compte Stripe Express est prêt. Tu peux maintenant encaisser et reverser des paiements
          directement depuis BoohPay.
        </p>

        <div className="onboarding-actions">
          <Link href="/merchant" className="btn-primary">
            Retour au tableau de bord
          </Link>
          <a
            href="https://dashboard.stripe.com/express"
            target="_blank"
            rel="noopener noreferrer"
            className="btn-outline"
          >
            Ouvrir Stripe Express
          </a>
        </div>

        <p className="onboarding-hint">
          Le statut peut prendre quelques secondes pour se synchroniser. Rafraîchis le dashboard marchand si
          besoin.
        </p>
      </section>
    </main>
  );
}


