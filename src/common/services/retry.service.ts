import { Injectable, Logger } from '@nestjs/common';

export interface RetryOptions {
  maxRetries?: number;
  initialDelayMs?: number;
  maxDelayMs?: number;
  backoffMultiplier?: number;
  retryableStatusCodes?: number[];
  retryableErrors?: string[];
}

@Injectable()
export class RetryService {
  private readonly logger = new Logger(RetryService.name);

  async withRetry<T>(fn: () => Promise<T>, options: RetryOptions = {}): Promise<T> {
    const {
      maxRetries = 3,
      initialDelayMs = 1000,
      maxDelayMs = 10000,
      backoffMultiplier = 2,
      retryableStatusCodes = [429, 500, 502, 503, 504],
      retryableErrors = ['ECONNRESET', 'ETIMEDOUT', 'ENOTFOUND', 'ECONNREFUSED'],
    } = options;

    let lastError: unknown;
    let delay = initialDelayMs;

    for (let attempt = 0; attempt <= maxRetries; attempt++) {
      try {
        return await fn();
      } catch (error: any) {
        lastError = error;

        // Ne pas retry si ce n'est pas la dernière tentative
        if (attempt >= maxRetries) {
          break;
        }

        // Vérifier si l'erreur est retriable
        if (!this.isRetriableError(error, retryableStatusCodes, retryableErrors)) {
          this.logger.debug(`Error is not retriable, stopping retries: ${error.message}`);
          throw error;
        }

        // Calculer le délai avec backoff exponentiel
        const currentDelay = Math.min(delay, maxDelayMs);
        this.logger.warn(
          `Retry attempt ${attempt + 1}/${maxRetries} after ${currentDelay}ms. Error: ${error.message}`,
        );

        await this.sleep(currentDelay);
        delay *= backoffMultiplier;
      }
    }

    // Si on arrive ici, toutes les tentatives ont échoué
    this.logger.error(`All retry attempts failed after ${maxRetries + 1} attempts`);
    throw lastError;
  }

  private isRetriableError(
    error: unknown,
    retryableStatusCodes: number[],
    retryableErrors: string[],
  ): boolean {
    if (!error) {
      return false;
    }

    // Vérifier les codes de statut HTTP
    if (typeof error === 'object' && 'status' in error) {
      const status = (error as { status: number }).status;
      if (typeof status === 'number' && retryableStatusCodes.includes(status)) {
        return true;
      }
    }

    // Vérifier les codes d'erreur réseau
    if (error instanceof Error) {
      // Type assertion pour accéder à la propriété code (présente sur NodeJS.ErrnoException)
      const errorWithCode = error as Error & { code?: string };
      if (errorWithCode.code && retryableErrors.includes(errorWithCode.code)) {
        return true;
      }

      // Vérifier les messages d'erreur
      if (error.message) {
        const message = error.message.toLowerCase();
        if (retryableErrors.some((errCode) => message.includes(errCode.toLowerCase()))) {
          return true;
        }
      }
    }

    // Par défaut, ne pas retry les erreurs 4xx (sauf 429)
    if (typeof error === 'object' && 'status' in error) {
      const status = (error as { status: number }).status;
      if (typeof status === 'number' && status >= 400 && status < 500 && status !== 429) {
        return false;
      }
    }

    return false;
  }

  private sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}
