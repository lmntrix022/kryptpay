# Export de Rapports TVA - Implémentation Complète

**Date** : 30 novembre 2025  
**Version** : 1.0.0

---

## ✅ Implémentation réalisée

### 1. Service d'export (`VatReportExportService`)

**Fichier** : `src/modules/vat/vat-report-export.service.ts`

#### Fonctionnalités

- ✅ **Export CSV** : Format texte avec BOM UTF-8 pour Excel
- ✅ **Export XLSX** : Fichier Excel avec plusieurs feuilles (Résumé + Transactions)
- ✅ **Export PDF** : Document PDF formaté avec tableaux

#### Méthodes principales

```typescript
// Export CSV
async exportToCSV(reportId: string, merchantId: string, res: Response): Promise<void>

// Export XLSX
async exportToXLSX(reportId: string, merchantId: string, res: Response): Promise<void>

// Export PDF
async exportToPDF(reportId: string, merchantId: string, res: Response): Promise<void>
```

### 2. Endpoint API

**Route** : `GET /v1/vat/vat-reports/:reportId/export?format=csv|xlsx|pdf`

#### Paramètres

- `reportId` (path) : ID du rapport TVA
- `format` (query, optionnel) : Format d'export (`csv`, `xlsx`, `pdf`). Par défaut : `csv`

#### Exemple d'utilisation

```bash
# Export CSV
GET /v1/vat/vat-reports/abc123/export?format=csv

# Export XLSX
GET /v1/vat/vat-reports/abc123/export?format=xlsx

# Export PDF
GET /v1/vat/vat-reports/abc123/export?format=pdf
```

### 3. Contenu des exports

#### CSV

- En-tête avec informations du marchand et période
- Résumé (nombre de transactions, totaux)
- Détail des transactions (une ligne par transaction)

**Colonnes** :
- Date
- ID Transaction
- Pays Vendeur
- Pays Acheteur
- Devise
- Montant TTC
- Montant HT
- TVA
- Taux TVA
- Règle appliquée
- B2B (Oui/Non)

#### XLSX

**Feuille 1 : Résumé**
- Informations du marchand
- Période
- Date de génération
- Statut
- Nombre de transactions
- Ventes totales TTC
- Ventes totales HT
- TVA totale

**Feuille 2 : Transactions**
- Tableau détaillé avec toutes les transactions
- Formatage des montants (devise)
- En-têtes stylisés

#### PDF

- En-tête avec logo/titre
- Informations du marchand
- Résumé formaté
- Tableau des transactions (limité à 30 pour lisibilité)
- Pagination automatique
- Pied de page avec numéro de page

---

## 📦 Dépendances installées

```json
{
  "exceljs": "^4.x.x",
  "pdfkit": "^0.x.x",
  "@types/pdfkit": "^0.x.x"
}
```

---

## 🔧 Structure du code

### Service d'export

```typescript
@Injectable()
export class VatReportExportService {
  // Récupère les données complètes du rapport
  async getReportData(reportId: string, merchantId: string): Promise<VatReportData>
  
  // Exports par format
  async exportToCSV(...)
  async exportToXLSX(...)
  async exportToPDF(...)
  
  // Génération de contenu
  private generateCSV(data: VatReportData): string
  private async generateXLSX(data: VatReportData): Promise<ExcelJS.Workbook>
  private generatePDF(data: VatReportData): PDFDocument
}
```

### Contrôleur

```typescript
@Get('vat-reports/:reportId/export')
async exportReport(
  @Param('reportId') reportId: string,
  @Query('format') format: ReportFormat = ReportFormat.CSV,
  @CurrentUser() user: AuthenticatedUser | undefined,
  @CurrentMerchant() merchant: Merchant | undefined,
  @Res() res: Response,
)
```

---

## 📊 Format des données exportées

### Résumé

- **Nombre de transactions** : Nombre total de transactions TVA dans la période
- **Ventes totales TTC** : Somme de tous les `amount_gross`
- **Ventes totales HT** : Somme de tous les `amount_net`
- **TVA totale** : Somme de tous les `vat_amount`

### Détail des transactions

Chaque transaction inclut :
- Date de création
- ID du paiement
- Pays vendeur et acheteur
- Devise
- Montants (TTC, HT, TVA)
- Taux de TVA appliqué
- Règle fiscale appliquée
- Indicateur B2B

---

## 🎨 Formatage

### CSV

- BOM UTF-8 pour compatibilité Excel
- Échappement des caractères spéciaux
- Formatage des montants en devise locale (XAF)

### XLSX

- Feuilles multiples (Résumé + Transactions)
- En-têtes stylisés (gras, fond gris)
- Formatage numérique des montants
- Largeurs de colonnes optimisées

### PDF

- Mise en page professionnelle
- Tableaux formatés
- Pagination automatique
- Limite de 30 transactions par page (pour lisibilité)

---

## 🔒 Sécurité

- ✅ Vérification de l'authentification (JWT ou API Key)
- ✅ Vérification que le marchand correspond à l'utilisateur authentifié
- ✅ Validation du format d'export
- ✅ Gestion des erreurs (rapport non trouvé, format invalide)

---

## 📝 Exemple d'utilisation côté frontend

```typescript
const handleExport = async (reportId: string, format: 'csv' | 'xlsx' | 'pdf') => {
  try {
    const url = `${API_BASE_URL}/v1/vat/vat-reports/${reportId}/export?format=${format}`;
    const response = await fetch(url, {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    });

    if (!response.ok) {
      throw new Error('Erreur lors de l\'export');
    }

    const blob = await response.blob();
    const downloadUrl = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = downloadUrl;
    a.download = `vat-report-${reportId}.${format}`;
    document.body.appendChild(a);
    a.click();
    window.URL.revokeObjectURL(downloadUrl);
    document.body.removeChild(a);
  } catch (error) {
    console.error('Erreur export:', error);
    alert('Erreur lors de l\'export du rapport');
  }
};
```

---

## 🧪 Tests recommandés

### Tests unitaires

```typescript
describe('VatReportExportService', () => {
  it('should generate CSV with correct format', async () => {
    const csv = await service.generateCSV(mockData);
    expect(csv).toContain('RAPPORT TVA');
    expect(csv).toContain('RÉSUMÉ');
  });

  it('should generate XLSX with multiple sheets', async () => {
    const workbook = await service.generateXLSX(mockData);
    expect(workbook.worksheets.length).toBe(2);
    expect(workbook.worksheets[0].name).toBe('Résumé');
    expect(workbook.worksheets[1].name).toBe('Transactions');
  });

  it('should generate PDF document', () => {
    const doc = service.generatePDF(mockData);
    expect(doc).toBeInstanceOf(PDFDocument);
  });
});
```

### Tests d'intégration

- Tester l'endpoint avec différents formats
- Vérifier la génération des fichiers
- Vérifier les permissions (marchand authentifié uniquement)
- Tester avec des rapports vides

---

## 🚀 Améliorations futures

### Court terme

1. **Stockage cloud** : Stocker les fichiers générés dans S3/Cloud Storage
2. **URLs signées** : Générer des URLs temporaires pour téléchargement
3. **Cache** : Mettre en cache les exports pour éviter la régénération

### Moyen terme

4. **Export asynchrone** : Queue pour générer les exports en arrière-plan
5. **Notifications** : Notifier l'utilisateur quand l'export est prêt
6. **Filtres avancés** : Permettre de filtrer les transactions dans l'export

### Long terme

7. **Templates personnalisés** : Permettre aux marchands de personnaliser le format
8. **Export programmé** : Exports automatiques périodiques
9. **Intégration comptable** : Export direct vers systèmes comptables

---

## 📚 Documentation API

### Swagger

L'endpoint est documenté dans Swagger avec :
- Description de l'opération
- Paramètres (path et query)
- Réponses possibles (200, 400, 404)
- Exemples

### Exemple de réponse

**Succès (200)** :
- Headers :
  - `Content-Type: text/csv; charset=utf-8` (CSV)
  - `Content-Type: application/vnd.openxmlformats-officedocument.spreadsheetml.sheet` (XLSX)
  - `Content-Type: application/pdf` (PDF)
  - `Content-Disposition: attachment; filename="vat-report-20251101-20251130.csv"`

**Erreur (404)** :
```json
{
  "statusCode": 404,
  "message": "VAT report abc123 not found"
}
```

**Erreur (400)** :
```json
{
  "statusCode": 400,
  "message": "Format invalide. Formats supportés: csv, xlsx, pdf"
}
```

---

## ✅ Checklist de validation

- [x] Service `VatReportExportService` créé
- [x] Export CSV implémenté
- [x] Export XLSX implémenté
- [x] Export PDF implémenté
- [x] Endpoint API créé
- [x] Validation des formats
- [x] Sécurité (authentification, autorisation)
- [x] Gestion des erreurs
- [x] Documentation Swagger
- [x] Module VAT mis à jour
- [ ] Tests unitaires (à créer)
- [ ] Tests d'intégration (à créer)
- [ ] Interface frontend (à créer)

---

## 🔍 Détails techniques

### Format CSV

- Encodage : UTF-8 avec BOM (`\ufeff`)
- Séparateur : Virgule (`,`)
- Échappement : Guillemets doubles pour valeurs contenant virgules
- Formatage : Montants en devise locale

### Format XLSX

- Bibliothèque : `exceljs`
- Feuilles : Résumé + Transactions
- Styles : En-têtes en gras avec fond gris
- Formatage : Montants numériques avec format devise

### Format PDF

- Bibliothèque : `pdfkit`
- Mise en page : Marges de 50px
- Tableaux : Colonnes ajustées automatiquement
- Pagination : Limite de 30 transactions par page
- Pied de page : Numéro de page

---

**Statut** : ✅ Implémenté et fonctionnel  
**Prochaine révision** : Après implémentation des tests et interface frontend

