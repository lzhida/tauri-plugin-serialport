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
    readInterval?: number;
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
    readInterval: number;
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
     * @description: 设置串口 path
     * @param {string} value
     * @return {Promise<void>}
     */
    setPath(value: string): Promise<void>;
    /**
     * @description: 设置串口 波特率
     * @param {number} value
     * @return {Promise<void>}
     */
    setBaudRate(value: number): Promise<void>;
}
export { Serialport };
