import { Event } from '@tauri-apps/api/event';
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
export interface ReadDataResult {
    size: number;
    data: number[];
}
export declare function open(options: OpenOption): Promise<unknown>;
export declare function close(path: string): Promise<unknown>;
export declare function write(options: WriteOption): Promise<unknown>;
export declare function read(options: ReadOptions): Promise<unknown>;
export declare function listen(event: string, handler: (event: Event<ReadDataResult>) => void): Promise<import("@tauri-apps/api/event").UnlistenFn | undefined>;
export declare function available_ports(): Promise<unknown>;
