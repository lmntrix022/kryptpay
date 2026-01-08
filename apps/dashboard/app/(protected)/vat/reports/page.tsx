'use client';

import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { FileText, Download, Calendar, Plus, CheckCircle2, Clock, XCircle, FileSpreadsheet, File } from 'lucide-react';
import { useAuth } from '../../../../context/AuthContext';
import { useCurrency } from '../../../../context/CurrencyContext';
import { apiUrl } from '../../../../lib/api-client';
import { PremiumHero, PremiumCard, PremiumLoader, PremiumButton, PremiumStatCard } from '@/components/premium-ui';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';

interface VatReport {
  id: string;
  merchantId: string;
  periodStart: string;
  periodEnd: string;
  totalVat: number;
  totalSales: number;
  totalNet: number;
  transactionCount: number;
  status: string;
  generatedAt: string;
  downloadUrl?: string;
}

const statusConfig = {
  DRAFT: { label: 'Brouillon', icon: FileText, color: 'bg-zinc-100 text-zinc-800 dark:bg-zinc-800 dark:text-zinc-300' },
  SUBMITTED: { label: 'Soumis', icon: Clock, color: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400' },
  PAID: { label: 'Payé', icon: CheckCircle2, color: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-400' },
  RECONCILED: { label: 'Réconcilié', icon: CheckCircle2, color: 'bg-violet-100 text-violet-800 dark:bg-violet-900/30 dark:text-violet-400' },
  CANCELLED: { label: 'Annulé', icon: XCircle, color: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400' },
};

export default function VatReportsPage() {
  const { auth, isLoading } = useAuth();
  const { formatAmount } = useCurrency();
  const [loading, setLoading] = useState(true);
  const [reports, setReports] = useState<VatReport[]>([]);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [periodStart, setPeriodStart] = useState('');
  const [periodEnd, setPeriodEnd] = useState('');

  const merchantId = auth?.user?.merchantId || auth?.user?.id;

  useEffect(() => {
    if (merchantId && auth?.accessToken) {
      loadReports();
    }
  }, [merchantId, auth?.accessToken]);

  const loadReports = async () => {
    if (!auth?.accessToken) return;
    
    setLoading(true);
    try {
      const response = await fetch(`${apiUrl(`vat/merchants/${merchantId}/vat-reports`)}`, {
        headers: {
          'Authorization': `Bearer ${auth.accessToken}`,
        },
      });

      if (response.ok) {
        const data = await response.json();
        setReports(Array.isArray(data) ? data : []);
      }
    } catch (error) {
      console.error('Error loading reports:', error);
    } finally {
      setLoading(false);
    }
  };

  const generateReport = async () => {
    if (!periodStart || !periodEnd || !auth?.accessToken) return;

    setGenerating(true);
    try {
      const response = await fetch(`${apiUrl(`vat/merchants/${merchantId}/vat-reports`)}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${auth.accessToken}`,
        },
        body: JSON.stringify({
          periodStart,
          periodEnd,
          format: 'csv',
          includeRefunds: true,
        }),
      });

      if (response.ok) {
        const newReport = await response.json();
        setReports([newReport, ...reports]);
        setDialogOpen(false);
        setPeriodStart('');
        setPeriodEnd('');
      }
    } catch (error) {
      console.error('Error generating report:', error);
    } finally {
      setGenerating(false);
    }
  };

  const handleExport = async (reportId: string, format: 'csv' | 'xlsx' | 'pdf') => {
    if (!auth?.accessToken) return;

    try {
      const url = `${apiUrl(`vat/vat-reports/${reportId}/export?format=${format}`)}`;
      const response = await fetch(url, {
        headers: {
          Authorization: `Bearer ${auth.accessToken}`,
        },
      });

      if (!response.ok) {
        throw new Error(`Erreur ${response.status} lors de l'export`);
      }

      const blob = await response.blob();
      const downloadUrl = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = downloadUrl;
      
      // Générer le nom de fichier
      const report = reports.find(r => r.id === reportId);
      const periodStart = report ? new Date(report.periodStart).toISOString().split('T')[0].replace(/-/g, '') : '';
      const periodEnd = report ? new Date(report.periodEnd).toISOString().split('T')[0].replace(/-/g, '') : '';
      a.download = `vat-report-${periodStart}-${periodEnd}.${format}`;
      
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(downloadUrl);
      document.body.removeChild(a);
    } catch (error) {
      console.error('Error exporting report:', error);
      alert(error instanceof Error ? error.message : 'Erreur lors de l\'export du rapport');
    }
  };

  // Calculer les stats depuis les rapports
  const totalReports = reports.length;
  const totalVatInReports = reports.reduce((sum, r) => sum + (typeof r.totalVat === 'bigint' ? Number(r.totalVat) : r.totalVat), 0);
  const paidReports = reports.filter(r => r.status === 'PAID' || r.status === 'RECONCILED').length;

  if (isLoading || !auth) {
    return <PremiumLoader message={isLoading ? 'Chargement...' : 'Veuillez vous connecter'} />;
  }

  if (loading) {
    return <PremiumLoader message="Chargement des rapports..." />;
  }

  return (
    <div className="space-y-8">
      {/* Premium Hero */}
      <PremiumHero
        title="Rapports"
        highlight="TVA"
        description="Générez et téléchargez vos rapports TVA périodiques pour vos déclarations fiscales"
        icon={<FileText className="w-7 h-7 text-white" />}
        badge="Déclarations"
        badgeIcon={<Calendar className="w-3.5 h-3.5 text-violet-400" />}
        stats={[
          { value: totalReports, label: 'Rapports' },
          { value: formatAmount(totalVatInReports, 'XAF'), label: 'TVA totale' },
        ]}
        actions={
          <PremiumButton
            onClick={() => setDialogOpen(true)}
            icon={<Plus className="w-4 h-4" />}
          >
            Nouveau rapport
          </PremiumButton>
        }
      />

      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-3">
        <PremiumStatCard
          icon={<FileText className="w-5 h-5" />}
          title="Total Rapports"
          value={totalReports}
          description={`${paidReports} payé${paidReports > 1 ? 's' : ''}`}
        />
        <PremiumStatCard
          icon={<Download className="w-5 h-5" />}
          title="TVA Totale"
          value={formatAmount(totalVatInReports, 'XAF')}
          description="Dans tous les rapports"
          gradient="from-violet-500 to-purple-600"
        />
        <PremiumStatCard
          icon={<CheckCircle2 className="w-5 h-5" />}
          title="Rapports Payés"
          value={paidReports}
          description={`${totalReports - paidReports} en attente`}
          gradient="from-emerald-500 to-teal-600"
        />
      </div>

      {/* Generate Report Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Générer un rapport TVA</DialogTitle>
            <DialogDescription>
              Sélectionnez la période pour laquelle vous souhaitez générer un rapport TVA
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="periodStart">Date de début</Label>
              <Input
                id="periodStart"
                type="date"
                value={periodStart}
                onChange={(e) => setPeriodStart(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="periodEnd">Date de fin</Label>
              <Input
                id="periodEnd"
                type="date"
                value={periodEnd}
                onChange={(e) => setPeriodEnd(e.target.value)}
              />
            </div>
            <div className="flex justify-end gap-2 pt-4">
              <Button variant="outline" onClick={() => setDialogOpen(false)}>
                Annuler
              </Button>
              <PremiumButton
                onClick={generateReport}
                disabled={generating || !periodStart || !periodEnd}
                icon={generating ? undefined : <FileText className="w-4 h-4" />}
              >
                {generating ? 'Génération...' : 'Générer le rapport'}
              </PremiumButton>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Reports List */}
      <div className="grid gap-4">
        {reports.length === 0 ? (
          <PremiumCard>
            <div className="py-12 text-center">
              <div className="flex h-16 w-16 items-center justify-center rounded-full bg-zinc-100 dark:bg-zinc-800 mx-auto mb-4">
                <FileText className="h-8 w-8 text-zinc-400" />
              </div>
              <h3 className="font-semibold text-zinc-900 dark:text-white mb-2">Aucun rapport généré</h3>
              <p className="text-sm text-zinc-500 dark:text-zinc-400 mb-4">
                Générez votre premier rapport TVA pour commencer
              </p>
              <PremiumButton
                onClick={() => setDialogOpen(true)}
                icon={<Plus className="w-4 h-4" />}
              >
                Créer un rapport
              </PremiumButton>
            </div>
          </PremiumCard>
        ) : (
          reports.map((report, idx) => {
            const statusInfo = statusConfig[report.status as keyof typeof statusConfig] || statusConfig.DRAFT;
            const StatusIcon = statusInfo.icon;
            const totalVat = typeof report.totalVat === 'bigint' ? Number(report.totalVat) : report.totalVat;
            const totalSales = typeof report.totalSales === 'bigint' ? Number(report.totalSales) : report.totalSales;
            const totalNet = typeof report.totalNet === 'bigint' ? Number(report.totalNet) : report.totalNet;

            return (
              <motion.div
                key={report.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: idx * 0.05 }}
              >
                <PremiumCard hoverable>
                  <div className="space-y-4">
                    {/* Header */}
                    <div className="flex items-start justify-between">
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <Calendar className="h-5 w-5 text-zinc-500" />
                          <h3 className="font-semibold text-zinc-900 dark:text-white">
                            {new Date(report.periodStart).toLocaleDateString('fr-FR', {
                              day: '2-digit',
                              month: 'long',
                              year: 'numeric',
                            })}{' '}
                            -{' '}
                            {new Date(report.periodEnd).toLocaleDateString('fr-FR', {
                              day: '2-digit',
                              month: 'long',
                              year: 'numeric',
                            })}
                          </h3>
                        </div>
                        <p className="text-sm text-zinc-500 dark:text-zinc-400">
                          Généré le {new Date(report.generatedAt).toLocaleDateString('fr-FR', {
                            day: '2-digit',
                            month: 'long',
                            year: 'numeric',
                            hour: '2-digit',
                            minute: '2-digit',
                          })}
                        </p>
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge className={statusInfo.color}>
                          <StatusIcon className="w-3 h-3 mr-1" />
                          {statusInfo.label}
                        </Badge>
                        <div className="flex items-center gap-1">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleExport(report.id, 'csv')}
                            title="Exporter en CSV"
                          >
                            <FileText className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleExport(report.id, 'xlsx')}
                            title="Exporter en XLSX"
                          >
                            <FileSpreadsheet className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleExport(report.id, 'pdf')}
                            title="Exporter en PDF"
                          >
                            <File className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    </div>

                    {/* Stats */}
                    <div className="grid grid-cols-3 gap-4 pt-4 border-t border-zinc-200 dark:border-zinc-800">
                      <div>
                        <p className="text-sm text-zinc-500 dark:text-zinc-400 mb-1">TVA Totale</p>
                        <p className="text-lg font-bold text-violet-600 dark:text-violet-400">
                          {formatAmount(totalVat, 'XAF')}
                        </p>
                      </div>
                      <div>
                        <p className="text-sm text-zinc-500 dark:text-zinc-400 mb-1">Ventes TTC</p>
                        <p className="text-lg font-bold text-zinc-900 dark:text-white">
                          {formatAmount(totalSales, 'XAF')}
                        </p>
                      </div>
                      <div>
                        <p className="text-sm text-zinc-500 dark:text-zinc-400 mb-1">Transactions</p>
                        <p className="text-lg font-bold text-zinc-900 dark:text-white">
                          {report.transactionCount}
                        </p>
                      </div>
                    </div>
                  </div>
                </PremiumCard>
              </motion.div>
            );
          })
        )}
      </div>
    </div>
  );
}
