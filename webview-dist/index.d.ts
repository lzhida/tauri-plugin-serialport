export interface OpenOption {
    path: string;
    baudRate: number;
}
export interface WriteOption {
    path: string;
    value: string;
}
export interface ReadOptions {
    path: string;
    readEvent?: string;
}
export declare function open(options: OpenOption): Promise<unknown>;
export declare function close(path: string): Promise<unknown>;
export declare function write(options: WriteOption): Promise<unknown>;
export declare function read(options: ReadOptions): Promise<unknown>;
export declare function listen<T>(event: string, handler: (...args: any[]) => void): Promise<import("@tauri-apps/api/event").UnlistenFn | undefined>;
export declare function available_ports(): Promise<unknown>;
