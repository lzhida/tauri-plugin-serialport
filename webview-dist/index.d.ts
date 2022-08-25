import { UnlistenFn } from '@tauri-apps/api/event';
export interface InvokeResult {
    code: number;
    message: string;
}
export interface ReadDataResult {
    size: number;
    data: number[];
}
export interface SerialportOptions {
    path: string;
    baudRate: number;
    encoding?: string;
    dataBits?: 5 | 6 | 7 | 8;
    flowControl?: null | 'Software' | 'Hardware';
    parity?: null | 'Odd' | 'Even';
    stopBits?: 1 | 2;
    timeout?: number;
    [key: string]: any;
}
interface Options {
    dataBits: 5 | 6 | 7 | 8;
    flowControl: null | 'Software' | 'Hardware';
    parity: null | 'Odd' | 'Even';
    stopBits: 1 | 2;
    timeout: number;
    [key: string]: any;
}
declare class Serialport {
    isOpen: boolean;
    unListen?: UnlistenFn;
    encoding: string;
    options: Options;
    constructor(options: SerialportOptions);
    /**
     * @description: 获取串口列表
     * @return {Promise<string[]>}
     */
    static available_ports(): Promise<string[]>;
    /**
     * @description: 强制关闭
     * @param {string} path
     * @return {Promise<void>}
     */
    static forceClose(path: string): Promise<void>;
    /**
     * @description: 关闭所有串口
     * @return {Promise<void>}
     */
    static closeAll(): Promise<void>;
    /**
     * @description: 取消串口监听
     * @return {Promise<void>}
     */
    cancelListen(): Promise<void>;
    /**
     * @description: 取消读取数据
     * @return {Promise<void>}
     */
    cancelRead(): Promise<void>;
    /**
     * @description:
     * @param {object} options
     * @return {Promise<void>}
     */
    change(options: {
        path?: string;
        baudRate?: number;
    }): Promise<void>;
    /**
     * @description: 关闭串口
     * @return {Promise<InvokeResult>}
     */
    close(): Promise<void>;
    /**
     * @description: 监听串口信息
     * @param {function} fn
     * @return {Promise<void>}
     */
    listen(fn: (...args: any[]) => void): Promise<void>;
    /**
     * @description: 打开串口
     * @return {*}
     */
    open(): Promise<void>;
    /**
     * @description: 读取串口信息
     * @return {Promise<void>}
     */
    read(): Promise<void>;
    /**
     * @description: 设置串口 波特率
     * @param {number} value
     * @return {Promise<void>}
     */
    setBaudRate(value: number): Promise<void>;
    /**
     * @description: 设置串口 path
     * @param {string} value
     * @return {Promise<void>}
     */
    setPath(value: string): Promise<void>;
    /**
     * @description: 串口写入数据
     * @param {string} value
     * @return {Promise<number>}
     */
    write(value: string): Promise<number>;
}
export { Serialport };
