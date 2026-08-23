import { CircuitBreakerState, CircuitBreakerMetrics, AIExecutionResult } from '../types';
import { maskPIIPayload } from './piiMasking';

export interface CircuitBreakerConfig {
  failureThreshold: number;       // e.g. 3 consecutive failures to trip
  cooldownPeriodMs: number;       // e.g. 15,000 ms before half-open probe
  timeoutMs: number;              // e.g. 6,000 ms operation timeout
}

export const DEFAULT_CIRCUIT_CONFIG: CircuitBreakerConfig = {
  failureThreshold: 3,
  cooldownPeriodMs: 15000,
  timeoutMs: 8000
};

class CircuitBreaker {
  private state: CircuitBreakerState = 'CLOSED';
  private failureCount: number = 0;
  private successCount: number = 0;
  private consecutiveFailures: number = 0;
  private lastFailureTime?: string;
  private lastSuccessTime?: string;
  private lastStateChangeTime: number = Date.now();
  private totalCalls: number = 0;
  private failedCalls: number = 0;
  private fallbackCalls: number = 0;
  private lastFallbackReason?: string;
  private config: CircuitBreakerConfig;
  private listeners: ((metrics: CircuitBreakerMetrics) => void)[] = [];

  constructor(config: CircuitBreakerConfig = DEFAULT_CIRCUIT_CONFIG) {
    this.config = config;
  }

  public subscribe(listener: (metrics: CircuitBreakerMetrics) => void): () => void {
    this.listeners.push(listener);
    listener(this.getMetrics());
    return () => {
      this.listeners = this.listeners.filter(l => l !== listener);
    };
  }

  private notify() {
    const metrics = this.getMetrics();
    this.listeners.forEach(listener => {
      try {
        listener(metrics);
      } catch (e) {
        console.error('CircuitBreaker listener error:', e);
      }
    });
  }

  public getState(): CircuitBreakerState {
    const now = Date.now();
    // Check if cooldown elapsed to transition from OPEN to HALF_OPEN
    if (this.state === 'OPEN' && (now - this.lastStateChangeTime) > this.config.cooldownPeriodMs) {
      this.state = 'HALF_OPEN';
      this.lastStateChangeTime = now;
      this.notify();
    }
    return this.state;
  }

  public getMetrics(): CircuitBreakerMetrics {
    const currentState = this.getState();
    const total = this.totalCalls || 1;
    const uptimePercent = Math.max(0, Math.min(100, Number((((total - this.failedCalls) / total) * 100).toFixed(1))));

    return {
      state: currentState,
      failureCount: this.failureCount,
      successCount: this.successCount,
      consecutiveFailures: this.consecutiveFailures,
      lastFailureTime: this.lastFailureTime,
      lastSuccessTime: this.lastSuccessTime,
      fallbackActive: currentState === 'OPEN',
      lastFallbackReason: this.lastFallbackReason,
      totalCalls: this.totalCalls,
      failedCalls: this.failedCalls,
      fallbackCalls: this.fallbackCalls,
      uptimePercent
    };
  }

  public recordSuccess() {
    this.successCount++;
    this.consecutiveFailures = 0;
    this.lastSuccessTime = new Date().toLocaleTimeString();
    if (this.state === 'HALF_OPEN') {
      this.state = 'CLOSED';
      this.lastStateChangeTime = Date.now();
    }
    this.notify();
  }

  public recordFailure(errorReason: string) {
    this.failedCalls++;
    this.failureCount++;
    this.consecutiveFailures++;
    this.lastFailureTime = new Date().toLocaleTimeString();
    this.lastFallbackReason = errorReason;

    if (this.state === 'HALF_OPEN' || this.consecutiveFailures >= this.config.failureThreshold) {
      this.state = 'OPEN';
      this.lastStateChangeTime = Date.now();
    }
    this.notify();
  }

  public reset() {
    this.state = 'CLOSED';
    this.consecutiveFailures = 0;
    this.lastStateChangeTime = Date.now();
    this.lastFallbackReason = undefined;
    this.notify();
  }

  public trip(reason = 'Manual Test Trip') {
    this.state = 'OPEN';
    this.consecutiveFailures = this.config.failureThreshold;
    this.lastFailureTime = new Date().toLocaleTimeString();
    this.lastFallbackReason = reason;
    this.lastStateChangeTime = Date.now();
    this.notify();
  }

  /**
   * Execute an async AI operation with timeout, PII sanitization and automatic deterministic fallback
   */
  public async executeWithFallback<T>(
    operation: (sanitizedPayload?: any) => Promise<T>,
    fallback: (sanitizedPayload?: any) => T | Promise<T>,
    options?: {
      payloadToSanitize?: any;
      operationName?: string;
      customTimeoutMs?: number;
    }
  ): Promise<AIExecutionResult<T>> {
    this.totalCalls++;
    const startTime = Date.now();
    const currentState = this.getState();

    // 1. PII Sanitization
    let piiSanitized = false;
    let piiEntitiesCount = 0;
    let safePayload = options?.payloadToSanitize;

    if (options?.payloadToSanitize !== undefined) {
      const piiResult = maskPIIPayload(options.payloadToSanitize);
      safePayload = piiResult.sanitizedPayload;
      piiSanitized = piiResult.isSanitized;
      piiEntitiesCount = piiResult.count;
    }

    // 2. Fast Fail if OPEN
    if (currentState === 'OPEN') {
      this.fallbackCalls++;
      const fallbackResult = await fallback(safePayload);
      return {
        data: fallbackResult,
        fallbackUsed: true,
        fallbackReason: this.lastFallbackReason || 'CircuitBreaker is OPEN (Fast Fallback Engaged)',
        circuitBreakerState: 'OPEN',
        piiSanitized,
        piiEntitiesCount,
        latencyMs: Date.now() - startTime
      };
    }

    // 3. Attempt Execution with Timeout
    const timeoutDuration = options?.customTimeoutMs || this.config.timeoutMs;
    try {
      const result = await Promise.race([
        operation(safePayload),
        new Promise<never>((_, reject) =>
          setTimeout(() => reject(new Error(`Timeout of ${timeoutDuration}ms exceeded`)), timeoutDuration)
        )
      ]);

      this.recordSuccess();
      return {
        data: result,
        fallbackUsed: false,
        circuitBreakerState: this.state,
        piiSanitized,
        piiEntitiesCount,
        latencyMs: Date.now() - startTime
      };
    } catch (err: any) {
      const errorMsg = err?.message || 'AI invocation failed';
      this.recordFailure(errorMsg);
      this.fallbackCalls++;

      // Execute deterministic fallback
      try {
        const fallbackResult = await fallback(safePayload);
        return {
          data: fallbackResult,
          fallbackUsed: true,
          fallbackReason: errorMsg,
          circuitBreakerState: this.state,
          piiSanitized,
          piiEntitiesCount,
          latencyMs: Date.now() - startTime
        };
      } catch (fallbackErr: any) {
        throw new Error(`Both AI service and fallback failed: ${fallbackErr.message || fallbackErr}`);
      }
    }
  }
}

// Global Singleton Instance for application-wide telemetry
export const globalCircuitBreaker = new CircuitBreaker();
