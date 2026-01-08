'use client';

import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { useState } from 'react';

type FiltersProps = {
  gateway?: string;
  status?: string;
  limit?: number;
};

const gatewayOptions = [
  { label: 'Toutes passerelles', value: '' },
  { label: 'Stripe', value: 'STRIPE' },
  { label: 'Moneroo', value: 'MONEROO' },
];

const statusOptions = [
  { label: 'Tous statuts', value: '' },
  { label: 'En attente', value: 'PENDING' },
  { label: 'Autorisé', value: 'AUTHORIZED' },
  { label: 'Réussi', value: 'SUCCEEDED' },
  { label: 'Échoué', value: 'FAILED' },
];

const limitOptions = [10, 20, 50, 100];

export default function Filters({ gateway, status, limit }: FiltersProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const pathname = usePathname();

  const [gatewayValue, setGateway] = useState(gateway ?? '');
  const [statusValue, setStatus] = useState(status ?? '');
  const [limitValue, setLimit] = useState(limit ?? 20);

  const applyFilters = () => {
    const params = new URLSearchParams(searchParams.toString());

    if (gatewayValue) {
      params.set('gateway', gatewayValue);
    } else {
      params.delete('gateway');
    }

    if (statusValue) {
      params.set('status', statusValue);
    } else {
      params.delete('status');
    }

    params.set('limit', String(limitValue));

    router.push(`${pathname}?${params.toString()}`);
  };

  const reset = () => {
    setGateway('');
    setStatus('');
    setLimit(20);
    router.push(pathname);
  };

  return (
    <div className="filters">
      <select value={gatewayValue} onChange={(event) => setGateway(event.target.value)}>
        {gatewayOptions.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>

      <select value={statusValue} onChange={(event) => setStatus(event.target.value)}>
        {statusOptions.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>

      <select
        value={limitValue}
        onChange={(event) => setLimit(Number(event.target.value))}
      >
        {limitOptions.map((value) => (
          <option key={value} value={value}>
            {value} lignes
          </option>
        ))}
      </select>

      <button onClick={applyFilters} type="button">
        Appliquer
      </button>
      <button onClick={reset} type="button" style={{ background: 'transparent', border: '1px solid rgba(148,163,184,0.3)' }}>
        Réinitialiser
      </button>
    </div>
  );
}






