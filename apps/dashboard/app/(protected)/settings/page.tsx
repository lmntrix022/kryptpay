'use client';

import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { 
  DollarSign, 
  CheckCircle2, 
  Info, 
  CreditCard, 
  Smartphone,
  Bell,
  Filter,
  Mail,
  MessageSquare,
  Smartphone as SmartphoneIcon,
  Save,
  Trash2,
  Edit2,
  Plus,
  X,
  Settings,
} from 'lucide-react';
import { useCurrency, type CurrencyPreference } from '../../../context/CurrencyContext';
import { useAuth } from '../../../context/AuthContext';
import type { SavedFilterItem } from '../../../lib/types';
import { PremiumHero, PremiumCard, PremiumLoader, PremiumBadge, PremiumTabs } from '../../../components/premium-ui';
import { CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { cn } from '@/lib/utils';

type NotificationPreferences = {
  paymentNotifications: boolean;
  payoutNotifications: boolean;
  refundNotifications: boolean;
  systemNotifications: boolean;
  customerNotifications: boolean;
  emailEnabled: boolean;
  smsEnabled: boolean;
  pushEnabled: boolean;
};

type Tab = 'currency' | 'notifications' | 'filters';

export default function SettingsPage() {
  const { auth } = useAuth();
  const { preferredCurrency, setPreferredCurrency } = useCurrency();
  const [activeTab, setActiveTab] = useState<Tab>('currency');
  const [saved, setSaved] = useState(false);
  
  // Notification preferences
  const [notifPrefs, setNotifPrefs] = useState<NotificationPreferences>({
    paymentNotifications: true,
    payoutNotifications: true,
    refundNotifications: true,
    systemNotifications: true,
    customerNotifications: true,
    emailEnabled: true,
    smsEnabled: false,
    pushEnabled: false,
  });
  const [loadingNotif, setLoadingNotif] = useState(false);
  const [savingNotif, setSavingNotif] = useState(false);
  
  // Saved filters
  const [savedFilters, setSavedFilters] = useState<SavedFilterItem[]>([]);
  const [loadingFilters, setLoadingFilters] = useState(false);
  const [showFilterForm, setShowFilterForm] = useState(false);
  const [editingFilter, setEditingFilter] = useState<SavedFilterItem | null>(null);
  const [filterForm, setFilterForm] = useState({
    name: '',
    type: 'payment',
    isDefault: false,
  });

  // Load notification preferences
  useEffect(() => {
    if (!auth || auth.user.role !== 'MERCHANT') return;
    
    const loadPreferences = async () => {
      setLoadingNotif(true);
      try {
        const response = await fetch(
          `${process.env.NEXT_PUBLIC_API_BASE_URL}/admin/notifications/preferences`,
          {
            headers: { Authorization: `Bearer ${auth.accessToken}` },
          },
        );
        if (response.ok) {
          const data = await response.json();
          setNotifPrefs({
            paymentNotifications: data.paymentNotifications ?? true,
            payoutNotifications: data.payoutNotifications ?? true,
            refundNotifications: data.refundNotifications ?? true,
            systemNotifications: data.systemNotifications ?? true,
            customerNotifications: data.customerNotifications ?? true,
            emailEnabled: data.emailEnabled ?? true,
            smsEnabled: data.smsEnabled ?? false,
            pushEnabled: data.pushEnabled ?? false,
          });
        }
      } catch (err) {
        console.error('Failed to load notification preferences', err);
      } finally {
        setLoadingNotif(false);
      }
    };

    loadPreferences();
  }, [auth]);

  // Load saved filters
  useEffect(() => {
    if (!auth || auth.user.role !== 'MERCHANT') return;
    
    const loadFilters = async () => {
      setLoadingFilters(true);
      try {
        const response = await fetch(
          `${process.env.NEXT_PUBLIC_API_BASE_URL}/admin/filters/saved`,
          {
            headers: { Authorization: `Bearer ${auth.accessToken}` },
          },
        );
        if (response.ok) {
          const data = await response.json();
          setSavedFilters(Array.isArray(data) ? data : []);
        }
      } catch (err) {
        console.error('Failed to load saved filters', err);
      } finally {
        setLoadingFilters(false);
      }
    };

    loadFilters();
  }, [auth]);

  const handleCurrencyChange = (currency: CurrencyPreference) => {
    setPreferredCurrency(currency);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  const handleSaveNotifications = async () => {
    if (!auth || auth.user.role !== 'MERCHANT') return;
    
    setSavingNotif(true);
    try {
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_API_BASE_URL}/admin/notifications/preferences`,
        {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${auth.accessToken}`,
          },
          body: JSON.stringify(notifPrefs),
        },
      );
      
      if (response.ok) {
        setSaved(true);
        setTimeout(() => setSaved(false), 2000);
      } else {
        alert('Erreur lors de la sauvegarde des préférences');
      }
    } catch (err) {
      alert('Erreur lors de la sauvegarde des préférences');
    } finally {
      setSavingNotif(false);
    }
  };

  const handleSaveFilter = async () => {
    if (!auth || auth.user.role !== 'MERCHANT') return;
    if (!filterForm.name.trim()) {
      alert('Le nom du filtre est requis');
      return;
    }

    try {
      const url = editingFilter
        ? `${process.env.NEXT_PUBLIC_API_BASE_URL}/admin/filters/saved/${editingFilter.id}`
        : `${process.env.NEXT_PUBLIC_API_BASE_URL}/admin/filters/saved`;
      
      const response = await fetch(url, {
        method: editingFilter ? 'PUT' : 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${auth.accessToken}`,
        },
        body: JSON.stringify({
          name: filterForm.name,
          type: filterForm.type,
          filters: {},
          isDefault: filterForm.isDefault,
        }),
      });

      if (response.ok) {
        setShowFilterForm(false);
        setEditingFilter(null);
        setFilterForm({ name: '', type: 'payment', isDefault: false });
        const reloadResponse = await fetch(
          `${process.env.NEXT_PUBLIC_API_BASE_URL}/admin/filters/saved`,
          {
            headers: { Authorization: `Bearer ${auth.accessToken}` },
          },
        );
        if (reloadResponse.ok) {
          const data = await reloadResponse.json();
          setSavedFilters(Array.isArray(data) ? data : []);
        }
      }
    } catch (err) {
      alert('Erreur lors de la sauvegarde du filtre');
    }
  };

  const handleDeleteFilter = async (id: string) => {
    if (!auth || auth.user.role !== 'MERCHANT') return;
    if (!confirm('Êtes-vous sûr de vouloir supprimer ce filtre ?')) return;

    try {
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_API_BASE_URL}/admin/filters/saved/${id}`,
        {
          method: 'DELETE',
          headers: { Authorization: `Bearer ${auth.accessToken}` },
        },
      );

      if (response.ok) {
        setSavedFilters(savedFilters.filter((f) => f.id !== id));
      }
    } catch (err) {
      alert('Erreur lors de la suppression du filtre');
    }
  };

  const tabs = [
    { id: 'currency' as Tab, label: 'Devise', icon: <DollarSign className="w-4 h-4" /> },
    { id: 'notifications' as Tab, label: 'Notifications', icon: <Bell className="w-4 h-4" /> },
    { id: 'filters' as Tab, label: 'Filtres', icon: <Filter className="w-4 h-4" /> },
  ];

  const isMerchant = auth?.user.role === 'MERCHANT';

  return (
    <div className="space-y-8">
      {/* Premium Hero */}
      <PremiumHero
        title="Paramètres"
        description="Gérez vos préférences et configurations"
        icon={<Settings className="w-7 h-7 text-white" />}
        badge="Configuration"
      />

      {/* Tabs */}
      <PremiumTabs
        tabs={tabs}
        activeTab={activeTab}
        onTabChange={(id) => setActiveTab(id as Tab)}
      />

      {/* Currency Tab */}
      {activeTab === 'currency' && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <PremiumCard hoverable={false}>
          <CardHeader>
            <div className="flex items-center gap-3">
                <div className="p-2 rounded-xl bg-gradient-to-br from-cyan-500 to-cyan-600 text-white">
                  <DollarSign className="w-5 h-5" />
              </div>
              <div>
                  <CardTitle className="text-xl font-bold">Devise d'affichage</CardTitle>
                <CardDescription className="mt-1">
                    Choisissez la devise dans laquelle vous souhaitez voir tous les montants affichés
                </CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-6">
            <div>
                <label className="block text-sm font-semibold text-zinc-700 dark:text-zinc-300 mb-4 uppercase tracking-wider">
                Devise préférée
              </label>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  {[
                    { value: 'EUR', label: '€ Euro (EUR)', icon: CreditCard, desc: 'Recommandé pour Stripe' },
                    { value: 'USD', label: '$ Dollar (USD)', icon: DollarSign, desc: 'Recommandé pour Moneroo' },
                    { value: 'XAF', label: 'FCFA (XAF)', icon: Smartphone, desc: 'Recommandé pour Mobile Money' },
                  ].map((currency) => {
                    const Icon = currency.icon;
                    const isSelected = preferredCurrency === currency.value;
                    return (
                      <motion.button
                        key={currency.value}
                        whileHover={{ scale: 1.02 }}
                        whileTap={{ scale: 0.98 }}
                  type="button"
                        onClick={() => handleCurrencyChange(currency.value as CurrencyPreference)}
                  className={cn(
                          'relative p-6 rounded-xl border-2 transition-all text-left',
                          isSelected
                            ? 'border-cyan-500 bg-violet-50 dark:bg-violet-900/20'
                            : 'border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 hover:border-cyan-300'
                  )}
                >
                  <div className="flex items-start gap-4">
                          {isSelected && (
                            <CheckCircle2 className="w-5 h-5 text-cyan-600 flex-shrink-0 mt-0.5" />
                    )}
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                              <Icon className="w-6 h-6 text-cyan-600" />
                        <div>
                                <div className="text-lg font-bold">{currency.label}</div>
                                <div className="text-sm text-zinc-500 mt-1">
                                  {currency.desc}
                      </div>
                    </div>
                  </div>
                          </div>
                        </div>
                      </motion.button>
                    );
                  })}
              </div>
            </div>

            {saved && (
                <motion.div 
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="p-4 rounded-xl bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-200 dark:border-emerald-800 flex items-center gap-3"
                >
                  <CheckCircle2 className="w-5 h-5 text-emerald-600 flex-shrink-0" />
                  <span className="text-sm text-emerald-700 dark:text-emerald-300">
                  Préférence sauvegardée ! Les montants seront maintenant affichés en {preferredCurrency}.
                </span>
                </motion.div>
            )}

              <div className="p-4 rounded-xl bg-violet-50 dark:bg-violet-900/20 border border-cyan-200 dark:border-cyan-800">
              <div className="flex items-start gap-3">
                  <Info className="w-5 h-5 text-cyan-600 flex-shrink-0 mt-0.5" />
                <div className="flex-1">
                    <p className="text-sm text-cyan-800 dark:text-cyan-200">
                      <strong>Note :</strong> Les taux de change utilisés sont approximatifs. La conversion est effectuée automatiquement pour un affichage homogène.
                  </p>
                </div>
              </div>
            </div>
          </CardContent>
          </PremiumCard>
        </motion.div>
      )}

      {/* Notifications Tab */}
      {activeTab === 'notifications' && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <PremiumCard hoverable={false}>
          <CardHeader>
            <div className="flex items-center gap-3">
                <div className="p-2 rounded-xl bg-gradient-to-br from-cyan-500 to-cyan-600 text-white">
                  <Bell className="w-5 h-5" />
              </div>
              <div>
                  <CardTitle className="text-xl font-bold">Préférences de notifications</CardTitle>
                <CardDescription className="mt-1">
                  Configurez les notifications que vous souhaitez recevoir
                </CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-6">
            {!isMerchant ? (
                <div className="p-4 rounded-xl bg-zinc-100 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700">
                  <p className="text-sm text-zinc-500">
                  Les préférences de notifications sont uniquement disponibles pour les marchands.
                </p>
              </div>
            ) : loadingNotif ? (
                <PremiumLoader message="Chargement des préférences..." />
            ) : (
              <>
                <div>
                  <h3 className="text-lg font-semibold mb-4">Types de notifications</h3>
                  <div className="space-y-3">
                      {[
                        { key: 'paymentNotifications', icon: CreditCard, title: 'Paiements', desc: 'Notifications pour les changements de statut des paiements' },
                        { key: 'payoutNotifications', icon: DollarSign, title: 'Versements', desc: 'Notifications pour les changements de statut des versements' },
                        { key: 'refundNotifications', icon: MessageSquare, title: 'Remboursements', desc: 'Notifications pour les remboursements' },
                        { key: 'systemNotifications', icon: Bell, title: 'Système', desc: 'Notifications pour les alertes système' },
                      ].map((item) => {
                        const Icon = item.icon;
                        return (
                          <label 
                            key={item.key}
                            className="flex items-center justify-between p-4 rounded-xl border border-zinc-200 dark:border-zinc-700 cursor-pointer hover:bg-zinc-50 dark:hover:bg-zinc-800/50 transition-colors"
                          >
                      <div className="flex items-center gap-3">
                              <Icon className="w-5 h-5 text-[#08c2db]" />
                        <div>
                                <div className="font-medium">{item.title}</div>
                                <div className="text-sm text-zinc-500">{item.desc}</div>
                        </div>
                      </div>
                      <input
                        type="checkbox"
                              checked={notifPrefs[item.key as keyof NotificationPreferences] as boolean}
                        onChange={(e) =>
                                setNotifPrefs({ ...notifPrefs, [item.key]: e.target.checked })
                        }
                              className="w-5 h-5 rounded border-zinc-300 text-cyan-600 focus:ring-cyan-500"
                      />
                    </label>
                        );
                      })}
                  </div>
                </div>

                <div>
                  <h3 className="text-lg font-semibold mb-4">Canaux de notification</h3>
                  <div className="space-y-3">
                      {[
                        { key: 'emailEnabled', icon: Mail, title: 'E-mail', desc: 'Recevoir des notifications par e-mail' },
                        { key: 'smsEnabled', icon: SmartphoneIcon, title: 'SMS', desc: 'Recevoir des notifications par SMS' },
                      ].map((item) => {
                        const Icon = item.icon;
                        return (
                          <label 
                            key={item.key}
                            className="flex items-center justify-between p-4 rounded-xl border border-zinc-200 dark:border-zinc-700 cursor-pointer hover:bg-zinc-50 dark:hover:bg-zinc-800/50 transition-colors"
                          >
                      <div className="flex items-center gap-3">
                              <Icon className="w-5 h-5 text-[#08c2db]" />
                        <div>
                                <div className="font-medium">{item.title}</div>
                                <div className="text-sm text-zinc-500">{item.desc}</div>
                        </div>
                      </div>
                      <input
                        type="checkbox"
                              checked={notifPrefs[item.key as keyof NotificationPreferences] as boolean}
                        onChange={(e) =>
                                setNotifPrefs({ ...notifPrefs, [item.key]: e.target.checked })
                        }
                              className="w-5 h-5 rounded border-zinc-300 text-cyan-600 focus:ring-cyan-500"
                      />
                    </label>
                        );
                      })}
                  </div>
                </div>

                <div className="flex justify-end">
                    <Button 
                      onClick={handleSaveNotifications} 
                      disabled={savingNotif}
                      className="rounded-xl bg-gradient-to-r from-cyan-500 to-cyan-600 hover:from-violet-600 hover:to-purple-700"
                    >
                    <Save className="w-4 h-4 mr-2" />
                      {savingNotif ? 'Sauvegarde...' : 'Enregistrer'}
                  </Button>
                  </div>
              </>
            )}
          </CardContent>
          </PremiumCard>
        </motion.div>
      )}

      {/* Filters Tab */}
      {activeTab === 'filters' && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <PremiumCard hoverable={false}>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                  <div className="p-2 rounded-xl bg-gradient-to-br from-cyan-500 to-cyan-600 text-white">
                    <Filter className="w-5 h-5" />
                </div>
                <div>
                    <CardTitle className="text-xl font-bold">Filtres sauvegardés</CardTitle>
                  <CardDescription className="mt-1">
                    Gérez vos filtres de recherche personnalisés
                  </CardDescription>
                </div>
              </div>
              {isMerchant && (
                  <Button 
                    onClick={() => {
                  setEditingFilter(null);
                  setFilterForm({ name: '', type: 'payment', isDefault: false });
                  setShowFilterForm(true);
                    }}
                    className="rounded-xl bg-gradient-to-r from-cyan-500 to-cyan-600 hover:from-violet-600 hover:to-purple-700"
                  >
                  <Plus className="w-4 h-4 mr-2" />
                  Nouveau filtre
                </Button>
              )}
            </div>
          </CardHeader>
          <CardContent>
            {!isMerchant ? (
                <div className="p-4 rounded-xl bg-zinc-100 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700">
                  <p className="text-sm text-zinc-500">
                  Les filtres sauvegardés sont uniquement disponibles pour les marchands.
                </p>
              </div>
            ) : loadingFilters ? (
                <PremiumLoader message="Chargement des filtres..." />
            ) : savedFilters.length === 0 ? (
              <div className="text-center py-12">
                  <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-gradient-to-br from-cyan-500/10 to-cyan-600/10 flex items-center justify-center">
                    <Filter className="w-8 h-8 text-[#08c2db]" />
                  </div>
                  <p className="text-zinc-500 mb-4">Aucun filtre sauvegardé</p>
                  <Button 
                    onClick={() => setShowFilterForm(true)}
                    className="rounded-xl bg-gradient-to-r from-cyan-500 to-cyan-600 hover:from-violet-600 hover:to-purple-700"
                  >
                  <Plus className="w-4 h-4 mr-2" />
                  Créer votre premier filtre
                </Button>
              </div>
            ) : (
              <div className="space-y-3">
                  {savedFilters.map((filter, index) => (
                    <motion.div
                    key={filter.id}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: index * 0.05 }}
                      className="flex items-center justify-between p-4 rounded-xl border border-zinc-200 dark:border-zinc-700 hover:bg-zinc-50 dark:hover:bg-zinc-800/50 transition-colors"
                  >
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="font-medium">{filter.name}</span>
                        {filter.isDefault && (
                            <PremiumBadge variant="violet">Par défaut</PremiumBadge>
                        )}
                          <PremiumBadge variant="default">{filter.type}</PremiumBadge>
                      </div>
                        <p className="text-sm text-zinc-500">
                        Créé le {new Date(filter.createdAt).toLocaleDateString('fr-FR')}
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                          className="rounded-lg"
                        onClick={() => {
                          setEditingFilter(filter);
                          setFilterForm({
                            name: filter.name,
                            type: filter.type,
                            isDefault: filter.isDefault,
                          });
                          setShowFilterForm(true);
                        }}
                      >
                        <Edit2 className="w-4 h-4" />
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                          className="rounded-lg hover:bg-red-50 hover:text-red-600 hover:border-red-200"
                        onClick={() => handleDeleteFilter(filter.id)}
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                    </motion.div>
                ))}
              </div>
              )}
            </CardContent>
          </PremiumCard>
        </motion.div>
            )}

            {/* Filter Form Dialog */}
      <Dialog open={showFilterForm} onOpenChange={setShowFilterForm}>
        <DialogContent className="sm:max-w-md rounded-2xl">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold">
                        {editingFilter ? 'Modifier le filtre' : 'Nouveau filtre'}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="filter-name" className="font-semibold">Nom du filtre</Label>
                      <Input
                        id="filter-name"
                        value={filterForm.name}
                onChange={(e) => setFilterForm({ ...filterForm, name: e.target.value })}
                        placeholder="Ex: Transactions réussies"
                className="rounded-xl"
                      />
                    </div>
            <div className="space-y-2">
              <Label htmlFor="filter-type" className="font-semibold">Type</Label>
              <select
                        id="filter-type"
                        value={filterForm.type}
                onChange={(e) => setFilterForm({ ...filterForm, type: e.target.value })}
                className="flex h-10 w-full rounded-xl border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-cyan-500"
                      >
                        <option value="payment">Paiements</option>
                        <option value="payout">Versements</option>
                        <option value="refund">Remboursements</option>
              </select>
                    </div>
                    <label className="flex items-center gap-2">
                      <input
                        type="checkbox"
                        checked={filterForm.isDefault}
                onChange={(e) => setFilterForm({ ...filterForm, isDefault: e.target.checked })}
                className="w-4 h-4 rounded border-zinc-300 text-cyan-600 focus:ring-cyan-500"
                      />
                      <span className="text-sm">Définir comme filtre par défaut</span>
                    </label>
            <div className="flex justify-end gap-2 pt-2">
                      <Button
                        variant="outline"
                        onClick={() => {
                          setShowFilterForm(false);
                          setEditingFilter(null);
                        }}
                className="rounded-xl"
                      >
                        Annuler
                      </Button>
              <Button 
                onClick={handleSaveFilter}
                className="rounded-xl bg-gradient-to-r from-cyan-500 to-cyan-600 hover:from-violet-600 hover:to-purple-700"
              >
                        <Save className="w-4 h-4 mr-2" />
                        {editingFilter ? 'Mettre à jour' : 'Créer'}
                      </Button>
                    </div>
              </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
