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
    isOpen: boolean;
    isWrite: boolean;
    unListen: any;
    encoding: string;
    readInterval: number;
    constructor(options: Options);
    /**
     * @description: 获取串口列表
     * @return {Promise<string[]>}
     */
    static available_ports(): Promise<string[]>;
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
    close(): Promise<InvokeResult>;
    /**
     * @description: 监听串口信息
     * @param {function} fn
     * @return {*}
     */
    listen(fn: (...args: any[]) => void): Promise<any>;
    /**
     * @description: 打开串口
     * @return {*}
     */
    open(): Promise<InvokeResult>;
    /**
     * @description: 读取串口信息
     * @return {*}
     */
    read(): Promise<any>;
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
     * @return {Promise<InvokeResult>}
     */
    write(value: string): Promise<InvokeResult>;
}
export { Serialport };
