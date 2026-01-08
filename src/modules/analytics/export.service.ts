import { Injectable } from '@nestjs/common';
import { AnalyticsService, PaymentAnalytics, PayoutAnalytics } from './analytics.service';
import { Response } from 'express';

@Injectable()
export class ExportService {
  constructor(private readonly analyticsService: AnalyticsService) {}

  /**
   * Exporter les analytics en CSV amélioré
   */
  async exportToCSV(
    analytics: PaymentAnalytics | PayoutAnalytics,
    res: Response,
    filename: string,
  ): Promise<void> {
    const csv = this.generateCSV(analytics);
    
    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}.csv"`);
    res.send('\ufeff' + csv); // BOM UTF-8 pour Excel
  }

  /**
   * Exporter les analytics en PDF (format HTML bien formaté pour impression)
   */
  async exportToPDF(
    analytics: PaymentAnalytics | PayoutAnalytics,
    res: Response,
    filename: string,
  ): Promise<void> {
    const html = this.generatePDF(analytics, filename);
    
    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}.html"`);
    res.send(html);
  }

  private escapeCSV(value: string | number): string {
    const str = String(value);
    if (str.includes(',') || str.includes('"') || str.includes('\n')) {
      return `"${str.replace(/"/g, '""')}"`;
    }
    return str;
  }

  private formatCurrency(amount: number, currency: string = 'XAF'): string {
    return new Intl.NumberFormat('fr-FR', {
      style: 'currency',
      currency: currency,
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount / 100);
  }

  private generateCSV(analytics: PaymentAnalytics | PayoutAnalytics): string {
    const lines: string[] = [];
    const isPayment = 'byGateway' in analytics;
    const type = isPayment ? 'Paiements' : 'Versements';
    const date = new Date().toLocaleDateString('fr-FR');

    // En-tête avec métadonnées
    lines.push(`Rapport Analytics - ${type}`);
    lines.push(`Date de génération,${date}`);
    lines.push('');
    lines.push('=== RÉSUMÉ GÉNÉRAL ===');
    lines.push('Métrique,Valeur');

    // Totaux avec formatage
    lines.push(`Total transactions,${analytics.total.count}`);
    lines.push(`Volume total,${this.escapeCSV(this.formatCurrency(analytics.total.volumeMinor))}`);
    lines.push(`Succès,${analytics.total.succeeded}`);
    lines.push(`Échecs,${analytics.total.failed || 0}`);
    lines.push(`En attente,${analytics.total.pending || 0}`);

    if ('conversionRate' in analytics) {
      lines.push(`Taux de conversion,${analytics.conversionRate.toFixed(2)}%`);
    } else if ('successRate' in analytics) {
      lines.push(`Taux de succès,${analytics.successRate.toFixed(2)}%`);
    }

    lines.push(`Montant moyen,${this.escapeCSV(this.formatCurrency(analytics.averageAmount))}`);
    lines.push('');

    // Répartition par statut avec pourcentages
    lines.push('=== RÉPARTITION PAR STATUT ===');
    lines.push('Statut,Nombre,Volume,Pourcentage');
    const totalCount = analytics.total.count;
    for (const [status, data] of Object.entries(analytics.byStatus)) {
      const percentage = totalCount > 0 ? ((data.count / totalCount) * 100).toFixed(2) : '0.00';
      lines.push(`${this.escapeCSV(status)},${data.count},${this.escapeCSV(this.formatCurrency(data.volumeMinor))},${percentage}%`);
    }
    lines.push('');

    // Répartition par provider/gateway
    const providerKey = 'byGateway' in analytics ? 'byGateway' : 'byProvider';
    const providerLabel = providerKey === 'byGateway' ? 'Gateway' : 'Provider';
    if (providerKey in analytics) {
      lines.push(`=== RÉPARTITION PAR ${providerLabel.toUpperCase()} ===`);
      lines.push(`${providerLabel},Nombre,Volume,Succès,Échecs,Taux de réussite`);
      for (const [provider, data] of Object.entries((analytics as any)[providerKey] as Record<string, { count: number; succeeded?: number; failed?: number; volumeMinor: number }>)) {
        const successRate = data.count > 0 
          ? ((data.succeeded || 0) / data.count * 100).toFixed(2)
          : '0.00';
        lines.push(
          `${this.escapeCSV(provider)},${data.count},${this.escapeCSV(this.formatCurrency(data.volumeMinor))},${data.succeeded || 0},${data.failed || 0},${successRate}%`
        );
      }
      lines.push('');
    }

    // Répartition par devise (si disponible pour payments)
    if ('byCurrency' in analytics && analytics.byCurrency) {
      lines.push('=== RÉPARTITION PAR DEVISE ===');
      lines.push('Devise,Nombre,Volume');
      for (const [currency, data] of Object.entries(analytics.byCurrency as Record<string, { count: number; volumeMinor: number }>)) {
        lines.push(
          `${this.escapeCSV(currency)},${data.count},${this.escapeCSV(this.formatCurrency(data.volumeMinor, currency))}`
        );
      }
      lines.push('');
    }

    // Tendances par jour (si disponibles)
    if ('trends' in analytics && analytics.trends && analytics.trends.length > 0) {
      lines.push('=== TENDANCES PAR JOUR ===');
      lines.push('Date,Nombre,Volume,Succès,Taux de réussite');
      for (const trend of analytics.trends) {
        const trendSuccessRate = trend.count > 0 
          ? ((trend.succeeded / trend.count) * 100).toFixed(2)
          : '0.00';
        lines.push(
          `${trend.date},${trend.count},${this.escapeCSV(this.formatCurrency(trend.volumeMinor))},${trend.succeeded},${trendSuccessRate}%`
        );
      }
    }

    return lines.join('\n');
  }

  private generatePDF(analytics: PaymentAnalytics | PayoutAnalytics, filename: string): string {
    const isPayment = 'byGateway' in analytics;
    const type = isPayment ? 'Paiements' : 'Versements';
    const date = new Date().toLocaleDateString('fr-FR', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });

    const formatCurrency = (amount: number, currency: string = 'XAF') => {
      return new Intl.NumberFormat('fr-FR', {
        style: 'currency',
        currency: currency,
        minimumFractionDigits: 0,
        maximumFractionDigits: 0,
      }).format(amount / 100);
    };

    const html = `
<!DOCTYPE html>
<html lang="fr">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Rapport Analytics - ${type}</title>
  <style>
    @media print {
      @page { margin: 1.5cm; }
      body { margin: 0; }
      .no-print { display: none; }
    }
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
      line-height: 1.6;
      color: #333;
      max-width: 1000px;
      margin: 0 auto;
      padding: 20px;
      background: #fff;
    }
    .header {
      border-bottom: 3px solid #007bff;
      padding-bottom: 20px;
      margin-bottom: 30px;
    }
    .header h1 {
      margin: 0;
      color: #007bff;
      font-size: 28px;
    }
    .header .meta {
      color: #666;
      margin-top: 10px;
    }
    .section {
      margin-bottom: 40px;
      page-break-inside: avoid;
    }
    .section h2 {
      color: #007bff;
      border-bottom: 2px solid #e0e0e0;
      padding-bottom: 10px;
      margin-bottom: 20px;
      font-size: 20px;
    }
    table {
      width: 100%;
      border-collapse: collapse;
      margin-bottom: 20px;
      font-size: 14px;
    }
    table th {
      background-color: #f8f9fa;
      border: 1px solid #dee2e6;
      padding: 12px;
      text-align: left;
      font-weight: 600;
    }
    table td {
      border: 1px solid #dee2e6;
      padding: 10px 12px;
    }
    table tr:nth-child(even) {
      background-color: #f8f9fa;
    }
    .stat-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
      gap: 20px;
      margin-bottom: 30px;
    }
    .stat-card {
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      color: white;
      padding: 20px;
      border-radius: 8px;
      box-shadow: 0 2px 4px rgba(0,0,0,0.1);
    }
    .stat-card h3 {
      margin: 0 0 10px 0;
      font-size: 14px;
      opacity: 0.9;
      text-transform: uppercase;
      letter-spacing: 0.5px;
    }
    .stat-card .value {
      font-size: 32px;
      font-weight: bold;
      margin: 0;
    }
    .button-print {
      background: #007bff;
      color: white;
      border: none;
      padding: 12px 24px;
      border-radius: 6px;
      cursor: pointer;
      font-size: 16px;
      margin-bottom: 20px;
    }
    .button-print:hover {
      background: #0056b3;
    }
    .trend-bar {
      background: #e0e0e0;
      height: 24px;
      border-radius: 4px;
      margin: 5px 0;
      overflow: hidden;
      position: relative;
    }
    .trend-fill {
      background: linear-gradient(90deg, #667eea 0%, #764ba2 100%);
      height: 100%;
      display: flex;
      align-items: center;
      padding: 0 10px;
      color: white;
      font-size: 12px;
      font-weight: 600;
    }
  </style>
</head>
<body>
  <div class="header">
    <h1>📊 Rapport Analytics - ${type}</h1>
    <div class="meta">
      <strong>Date de génération:</strong> ${date}
    </div>
  </div>

  <button class="button-print no-print" onclick="window.print()">🖨️ Imprimer / Enregistrer en PDF</button>

  <div class="section">
    <h2>📈 Résumé Général</h2>
    <div class="stat-grid">
      <div class="stat-card">
        <h3>Total Transactions</h3>
        <p class="value">${analytics.total.count.toLocaleString('fr-FR')}</p>
      </div>
      <div class="stat-card">
        <h3>Volume Total</h3>
        <p class="value">${formatCurrency(analytics.total.volumeMinor)}</p>
      </div>
      <div class="stat-card">
        <h3>Succès</h3>
        <p class="value">${analytics.total.succeeded.toLocaleString('fr-FR')}</p>
      </div>
      <div class="stat-card">
        <h3>${'conversionRate' in analytics ? 'Taux Conversion' : 'Taux Succès'}</h3>
        <p class="value">${('conversionRate' in analytics ? analytics.conversionRate : analytics.successRate).toFixed(2)}%</p>
      </div>
    </div>

    <table>
      <thead>
        <tr>
          <th>Métrique</th>
          <th>Valeur</th>
        </tr>
      </thead>
      <tbody>
        <tr>
          <td><strong>Total transactions</strong></td>
          <td>${analytics.total.count.toLocaleString('fr-FR')}</td>
        </tr>
        <tr>
          <td><strong>Volume total</strong></td>
          <td>${formatCurrency(analytics.total.volumeMinor)}</td>
        </tr>
        <tr>
          <td><strong>Succès</strong></td>
          <td>${analytics.total.succeeded.toLocaleString('fr-FR')}</td>
        </tr>
        <tr>
          <td><strong>Échecs</strong></td>
          <td>${analytics.total.failed || 0}</td>
        </tr>
        <tr>
          <td><strong>En attente</strong></td>
          <td>${analytics.total.pending || 0}</td>
        </tr>
        <tr>
          <td><strong>${'conversionRate' in analytics ? 'Taux de conversion' : 'Taux de succès'}</strong></td>
          <td>${('conversionRate' in analytics ? analytics.conversionRate : analytics.successRate).toFixed(2)}%</td>
        </tr>
        <tr>
          <td><strong>Montant moyen</strong></td>
          <td>${formatCurrency(analytics.averageAmount)}</td>
        </tr>
      </tbody>
    </table>
  </div>

  ${this.generateStatusSection(analytics)}
  ${this.generateProviderSection(analytics, isPayment)}
  ${'byCurrency' in analytics && analytics.byCurrency ? this.generateCurrencySection(analytics.byCurrency, formatCurrency) : ''}
  ${'trends' in analytics && analytics.trends && analytics.trends.length > 0 ? this.generateTrendsSection(analytics.trends, formatCurrency) : ''}

  <div style="margin-top: 50px; padding-top: 20px; border-top: 2px solid #e0e0e0; color: #666; font-size: 12px; text-align: center;">
    <p>Rapport généré par KryptPay Analytics - ${date}</p>
  </div>

  <script>
    // Auto-trigger print dialog on mobile/tablet
    if (window.matchMedia && window.matchMedia('print').matches) {
      window.onload = function() { setTimeout(() => window.print(), 250); };
    }
  </script>
</body>
</html>`;

    return html;
  }

  private generateStatusSection(analytics: PaymentAnalytics | PayoutAnalytics): string {
    const totalCount = analytics.total.count;
    let html = '<div class="section"><h2>📊 Répartition par Statut</h2><table><thead><tr><th>Statut</th><th>Nombre</th><th>Volume</th><th>Pourcentage</th></tr></thead><tbody>';
    
    for (const [status, data] of Object.entries(analytics.byStatus)) {
      const percentage = totalCount > 0 ? ((data.count / totalCount) * 100).toFixed(2) : '0.00';
      html += `<tr>
        <td><strong>${status}</strong></td>
        <td>${data.count.toLocaleString('fr-FR')}</td>
        <td>${this.formatCurrency(data.volumeMinor)}</td>
        <td>${percentage}%</td>
      </tr>`;
    }
    
    html += '</tbody></table></div>';
    return html;
  }

  private generateProviderSection(analytics: PaymentAnalytics | PayoutAnalytics, isPayment: boolean): string {
    const providerKey = 'byGateway' in analytics ? 'byGateway' : 'byProvider';
    const providerLabel = providerKey === 'byGateway' ? 'Gateway' : 'Provider';
    
    if (!(providerKey in analytics)) return '';
    
    let html = `<div class="section"><h2>🔌 Répartition par ${providerLabel}</h2><table><thead><tr><th>${providerLabel}</th><th>Nombre</th><th>Volume</th><th>Succès</th><th>Échecs</th><th>Taux de réussite</th></tr></thead><tbody>`;
    
      for (const [provider, data] of Object.entries((analytics as any)[providerKey] as Record<string, { count: number; succeeded?: number; failed?: number; volumeMinor: number }>)) {
        const successRate = data.count > 0 
          ? ((data.succeeded || 0) / data.count * 100).toFixed(2)
          : '0.00';
        html += `<tr>
          <td><strong>${provider}</strong></td>
          <td>${data.count.toLocaleString('fr-FR')}</td>
          <td>${this.formatCurrency(data.volumeMinor)}</td>
          <td>${data.succeeded || 0}</td>
          <td>${data.failed || 0}</td>
          <td>${successRate}%</td>
        </tr>`;
      }
    
    html += '</tbody></table></div>';
    return html;
  }

  private generateCurrencySection(byCurrency: Record<string, { count: number; volumeMinor: number }>, formatCurrency: (amount: number, currency?: string) => string): string {
    let html = '<div class="section"><h2>💱 Répartition par Devise</h2><table><thead><tr><th>Devise</th><th>Nombre</th><th>Volume</th></tr></thead><tbody>';
    
    for (const [currency, data] of Object.entries(byCurrency)) {
      html += `<tr>
        <td><strong>${currency}</strong></td>
        <td>${data.count.toLocaleString('fr-FR')}</td>
        <td>${formatCurrency(data.volumeMinor, currency)}</td>
      </tr>`;
    }
    
    html += '</tbody></table></div>';
    return html;
  }

  private generateTrendsSection(trends: Array<{ date: string; count: number; volumeMinor: number; succeeded: number }>, formatCurrency: (amount: number) => string): string {
    const maxVolume = Math.max(...trends.map(t => t.volumeMinor));
    
    let html = '<div class="section"><h2>📈 Tendances par Jour</h2><table><thead><tr><th>Date</th><th>Nombre</th><th>Volume</th><th>Succès</th><th>Taux de réussite</th><th>Visualisation</th></tr></thead><tbody>';
    
    for (const trend of trends) {
      const successRate = trend.count > 0 
        ? ((trend.succeeded / trend.count) * 100).toFixed(2)
        : '0.00';
      const percentage = maxVolume > 0 ? (trend.volumeMinor / maxVolume) * 100 : 0;
      
      html += `<tr>
        <td><strong>${new Date(trend.date).toLocaleDateString('fr-FR')}</strong></td>
        <td>${trend.count}</td>
        <td>${formatCurrency(trend.volumeMinor)}</td>
        <td>${trend.succeeded}</td>
        <td>${successRate}%</td>
        <td>
          <div class="trend-bar">
            <div class="trend-fill" style="width: ${percentage}%">
              ${percentage.toFixed(1)}%
            </div>
          </div>
        </td>
      </tr>`;
    }
    
    html += '</tbody></table></div>';
    return html;
  }
}


