export interface InvokeResult {
    code: number;
    message: string;
}
export interface ReadDataResult {
    size: number;
    data: number[];
}
export interface Options {
    path: string;
    baudRate: number;
    readEvent?: string;
    encoding?: string;
    [key: string]: any;
}
declare class Serialport {
    path: string;
    baudRate: number;
    isRead: boolean;
    isOpen: boolean;
    isWrite: boolean;
    listener: any;
    readEvent: string;
    encoding: string;
    constructor(options: Options);
    /**
     * @description: 打开串口
     * @return {*}
     */
    open(): Promise<InvokeResult>;
    /**
     * @description: 关闭串口
     * @return {Promise<InvokeResult>}
     */
    close(): Promise<InvokeResult>;
    /**
     * @description: 串口写入数据
     * @param {string} value
     * @return {Promise<InvokeResult>}
     */
    write(value: string): Promise<InvokeResult>;
    /**
     * @description: 读取串口信息
     * @return {*}
     */
    read(): Promise<any>;
    /**
     * @description: 取消读取串口信息
     * @return {*}
     */
    cancelRead(): void;
    /**
     * @description: 获取串口列表
     * @return {*}
     */
    static available_ports(): Promise<any>;
    /**
     * @description: 监听串口信息
     * @param {function} fn
     * @return {*}
     */
    listen(fn: (...args: any[]) => void): Promise<any>;
    /**
     * @description: 取消串口监听
     * @return {*}
     */
    cancelListen(): Promise<any>;
}
export { Serialport };
