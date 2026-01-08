"use client";

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Eye, EyeOff, Save, Loader2 } from 'lucide-react';

type WebhookConfigFormProps = {
  initialConfig?: {
    webhookUrl?: string;
    hasSecret: boolean;
  };
  onSave: (webhookUrl: string | undefined, webhookSecret: string | undefined) => Promise<void>;
  onCancel?: () => void;
};

export default function WebhookConfigForm({ initialConfig, onSave, onCancel }: WebhookConfigFormProps) {
  const [webhookUrl, setWebhookUrl] = useState(initialConfig?.webhookUrl || '');
  const [webhookSecret, setWebhookSecret] = useState('');
  const [showSecret, setShowSecret] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSaving(true);

    try {
      await onSave(
        webhookUrl.trim() || undefined,
        webhookSecret.trim() || undefined,
      );
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erreur lors de la sauvegarde');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Configuration des webhooks</CardTitle>
        <CardDescription>
          Configurez l'URL et le secret pour recevoir les événements de paiement en temps réel
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="space-y-2">
            <Label htmlFor="webhookUrl">URL du webhook</Label>
            <Input
              id="webhookUrl"
              type="url"
              placeholder="https://votre-domaine.com/webhooks"
              value={webhookUrl}
              onChange={(e) => setWebhookUrl(e.target.value)}
              disabled={saving}
            />
            <p className="text-xs text-muted-foreground">
              L'URL où les événements seront envoyés (POST)
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="webhookSecret">Secret du webhook (optionnel)</Label>
            <div className="relative">
              <Input
                id="webhookSecret"
                type={showSecret ? 'text' : 'password'}
                placeholder={initialConfig?.hasSecret ? '••••••••••••' : 'Laissez vide pour ne pas changer'}
                value={webhookSecret}
                onChange={(e) => setWebhookSecret(e.target.value)}
                disabled={saving}
                className="pr-10"
              />
              <button
                type="button"
                onClick={() => setShowSecret(!showSecret)}
                className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                disabled={saving}
              >
                {showSecret ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
            <p className="text-xs text-muted-foreground">
              Utilisé pour signer les requêtes (HMAC-SHA256). Laissez vide pour ne pas modifier.
            </p>
          </div>

          {error && (
            <div className="p-3 rounded-md bg-destructive/10 text-destructive text-sm">
              {error}
            </div>
          )}

          <div className="flex gap-2">
            <Button type="submit" disabled={saving}>
              {saving ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Enregistrement...
                </>
              ) : (
                <>
                  <Save className="w-4 h-4 mr-2" />
                  Enregistrer
                </>
              )}
            </Button>
            {onCancel && (
              <Button type="button" variant="outline" onClick={onCancel} disabled={saving}>
                Annuler
              </Button>
            )}
          </div>
        </form>
      </CardContent>
    </Card>
  );
}


