import { IsDateString, IsEnum, IsNotEmpty, IsOptional, IsString } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export enum ReportFormat {
  CSV = 'csv',
  XLSX = 'xlsx',
  PDF = 'pdf',
}

export class GenerateVatReportDto {
  @ApiProperty({ description: 'Date de début de période (ISO 8601)', example: '2025-11-01' })
  @IsDateString()
  @IsNotEmpty()
  periodStart!: string;

  @ApiProperty({ description: 'Date de fin de période (ISO 8601)', example: '2025-11-30' })
  @IsDateString()
  @IsNotEmpty()
  periodEnd!: string;

  @ApiPropertyOptional({ 
    description: 'Format du rapport', 
    enum: ReportFormat,
    example: ReportFormat.CSV,
    default: ReportFormat.CSV
  })
  @IsEnum(ReportFormat)
  @IsOptional()
  format?: ReportFormat;

  @ApiPropertyOptional({ description: 'Inclure les remboursements', example: true, default: true })
  @IsOptional()
  includeRefunds?: boolean;
}

export class VatReportResponseDto {
  @ApiProperty({ description: 'ID du rapport', example: 'vat_report_01HXYZ' })
  id!: string;

  @ApiProperty({ description: 'ID du marchand', example: 'mrc_01M' })
  merchantId!: string;

  @ApiProperty({ description: 'Date de début de période', example: '2025-11-01' })
  periodStart!: string;

  @ApiProperty({ description: 'Date de fin de période', example: '2025-11-30' })
  periodEnd!: string;

  @ApiProperty({ description: 'TVA totale collectée (unités mineures)', example: 152600 })
  totalVat!: number;

  @ApiProperty({ description: 'Ventes totales TTC (unités mineures)', example: 1000000 })
  totalSales!: number;

  @ApiProperty({ description: 'Ventes totales HT (unités mineures)', example: 847400 })
  totalNet!: number;

  @ApiProperty({ description: 'Nombre de transactions', example: 100 })
  transactionCount!: number;

  @ApiProperty({ description: 'Statut du rapport', enum: ['DRAFT', 'SUBMITTED', 'PAID', 'RECONCILED', 'CANCELLED'] })
  status!: string;

  @ApiPropertyOptional({ description: 'URL de téléchargement (si disponible)' })
  downloadUrl?: string;

  @ApiProperty({ description: 'Date de génération', example: '2025-12-01T10:00:00Z' })
  generatedAt!: string;
}

