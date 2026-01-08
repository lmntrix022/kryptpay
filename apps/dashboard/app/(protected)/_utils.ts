/**
 * Utilitaire pour construire les URLs de l'API
 * Utilisez cette fonction au lieu de construire les URLs manuellement
 */

export function getApiUrl(): string {
  return process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:3000/v1';
}


