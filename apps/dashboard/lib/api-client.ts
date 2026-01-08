/**
 * Configuration de l'API client
 * Le backend utilise le préfixe /v1 (configuré dans src/main.ts)
 */

export const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:3000/v1';

/**
 * Construit une URL complète pour une route de l'API
 */
export function apiUrl(path: string): string {
  // Enlever le slash initial si présent pour éviter les doubles slashes
  const cleanPath = path.startsWith('/') ? path.slice(1) : path;
  return `${API_BASE_URL}/${cleanPath}`;
}


