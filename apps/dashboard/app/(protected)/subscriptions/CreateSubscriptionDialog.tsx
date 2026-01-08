'use client';

import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

interface CreateSubscriptionDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (data: {
    customerEmail: string;
    customerPhone?: string;
    amountMinor: number;
    currency: string;
    billingCycle: string;
    isTestMode?: boolean;
  }) => void;
  loading?: boolean;
}

const billingCycles = [
  { value: 'DAILY', label: 'Quotidien' },
  { value: 'WEEKLY', label: 'Hebdomadaire' },
  { value: 'MONTHLY', label: 'Mensuel' },
  { value: 'QUARTERLY', label: 'Trimestriel' },
  { value: 'YEARLY', label: 'Annuel' },
];

const currencies = ['XAF', 'XOF', 'EUR', 'USD'];

export default function CreateSubscriptionDialog({
  open,
  onOpenChange,
  onSubmit,
  loading = false,
}: CreateSubscriptionDialogProps) {
  const [formData, setFormData] = useState({
    customerEmail: '',
    customerPhone: '',
    amountMinor: '',
    currency: 'XAF',
    billingCycle: 'MONTHLY',
    isTestMode: false,
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.customerEmail || !formData.amountMinor || !formData.billingCycle) {
      alert('Veuillez remplir tous les champs obligatoires');
      return;
    }

    const amountMinor = Math.round(parseFloat(formData.amountMinor) * 100);
    if (isNaN(amountMinor) || amountMinor <= 0) {
      alert('Le montant doit être un nombre positif');
      return;
    }

    onSubmit({
      customerEmail: formData.customerEmail,
      customerPhone: formData.customerPhone || undefined,
      amountMinor,
      currency: formData.currency,
      billingCycle: formData.billingCycle,
      isTestMode: formData.isTestMode,
    });

    // Reset form
    setFormData({
      customerEmail: '',
      customerPhone: '',
      amountMinor: '',
      currency: 'XAF',
      billingCycle: 'MONTHLY',
      isTestMode: false,
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Créer un abonnement</DialogTitle>
          <DialogDescription>
            Créez un nouvel abonnement récurrent pour un client
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <Label htmlFor="email">Email client *</Label>
            <Input
              id="email"
              type="email"
              placeholder="client@example.com"
              value={formData.customerEmail}
              onChange={(e) => setFormData({ ...formData, customerEmail: e.target.value })}
              required
            />
          </div>

          <div>
            <Label htmlFor="phone">Téléphone client</Label>
            <Input
              id="phone"
              type="tel"
              placeholder="+237 6XX XXX XXX"
              value={formData.customerPhone}
              onChange={(e) => setFormData({ ...formData, customerPhone: e.target.value })}
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="amount">Montant *</Label>
              <Input
                id="amount"
                type="number"
                step="0.01"
                placeholder="1000"
                value={formData.amountMinor}
                onChange={(e) => setFormData({ ...formData, amountMinor: e.target.value })}
                required
              />
            </div>
            <div>
              <Label htmlFor="currency">Devise *</Label>
              <select
                id="currency"
                value={formData.currency}
                onChange={(e) => setFormData({ ...formData, currency: e.target.value })}
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                required
              >
                {currencies.map((curr) => (
                  <option key={curr} value={curr}>
                    {curr}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div>
            <Label htmlFor="billingCycle">Cycle de facturation *</Label>
            <select
              id="billingCycle"
              value={formData.billingCycle}
              onChange={(e) => setFormData({ ...formData, billingCycle: e.target.value })}
              className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
              required
            >
              {billingCycles.map((cycle) => (
                <option key={cycle.value} value={cycle.value}>
                  {cycle.label}
                </option>
              ))}
            </select>
          </div>

          <div className="flex items-center space-x-2">
            <input
              type="checkbox"
              id="testMode"
              checked={formData.isTestMode}
              onChange={(e) =>
                setFormData({ ...formData, isTestMode: e.target.checked })
              }
              className="w-4 h-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
            />
            <Label htmlFor="testMode" className="text-sm font-normal cursor-pointer">
              Mode test
            </Label>
          </div>

          <div className="flex justify-end gap-2 pt-4">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={loading}
            >
              Annuler
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? 'Création...' : 'Créer'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}

