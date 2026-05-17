declare class Logger {
    private context?;
    constructor(context?: string);
    debug(message: string, data?: unknown): void;
    info(message: string, data?: unknown): void;
    warn(message: string, data?: unknown): void;
    error(message: string, err?: unknown, data?: unknown): void;
    child(subContext: string): Logger;
}
export declare const logger: Logger;
export declare const createLogger: (context: string) => Logger;
export declare const createRequestLogger: (requestId: string, context?: string) => Logger;
export default Logger;
//# sourceMappingURL=logger.d.ts.map