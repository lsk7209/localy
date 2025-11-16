/**
 * 구조화된 로깅 유틸리티
 * JSON 형식으로 로그를 출력하여 모니터링 시스템과 통합 용이
 */

export enum LogLevel {
  DEBUG = 'debug',
  INFO = 'info',
  WARN = 'warn',
  ERROR = 'error',
}

export interface LogContext {
  [key: string]: unknown;
}

/**
 * 구조화된 로그 엔트리
 */
interface LogEntry {
  level: LogLevel;
  message: string;
  timestamp: string;
  context?: LogContext;
  error?: {
    message: string;
    stack?: string;
  };
}

/**
 * 로그 레벨별 출력 함수
 */
function log(level: LogLevel, message: string, context?: LogContext, error?: Error): void {
  const entry: LogEntry = {
    level,
    message,
    timestamp: new Date().toISOString(),
    ...(context && { context }),
    ...(error && {
      error: {
        message: error.message,
        stack: error.stack,
      },
    }),
  };

  // JSON 형식으로 출력 (프로덕션 환경에서 파싱 용이)
  const logString = JSON.stringify(entry);

  switch (level) {
    case LogLevel.DEBUG:
      console.debug(logString);
      break;
    case LogLevel.INFO:
      console.log(logString);
      break;
    case LogLevel.WARN:
      console.warn(logString);
      break;
    case LogLevel.ERROR:
      console.error(logString);
      break;
  }
}

/**
 * 로깅 헬퍼 함수들
 */
export const logger = {
  debug: (message: string, context?: LogContext) => {
    log(LogLevel.DEBUG, message, context);
  },

  info: (message: string, context?: LogContext) => {
    log(LogLevel.INFO, message, context);
  },

  warn: (message: string, context?: LogContext, error?: Error) => {
    log(LogLevel.WARN, message, context, error);
  },

  error: (message: string, context?: LogContext, error?: Error) => {
    log(LogLevel.ERROR, message, context, error);
  },

  /**
   * 워커 실행 시작 로그
   */
  workerStart: (workerName: string, context?: LogContext) => {
    logger.info(`Worker started: ${workerName}`, {
      worker: workerName,
      ...context,
    });
  },

  /**
   * 워커 실행 완료 로그
   */
  workerComplete: (workerName: string, itemsProcessed: number, duration: number, context?: LogContext) => {
    logger.info(`Worker completed: ${workerName}`, {
      worker: workerName,
      itemsProcessed,
      duration,
      ...context,
    });
  },

  /**
   * 워커 실행 실패 로그
   */
  workerError: (workerName: string, error: Error, context?: LogContext) => {
    logger.error(`Worker failed: ${workerName}`, {
      worker: workerName,
      ...context,
    }, error);
  },
};

