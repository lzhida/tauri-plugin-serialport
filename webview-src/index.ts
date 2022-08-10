import { invoke } from '@tauri-apps/api/tauri';
import { appWindow } from '@tauri-apps/api/window';

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

function sleep(delay: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, delay * 1000));
}

class Serialport {
  path: string;
  baudRate: number;
  isRead: boolean;
  isOpen: boolean;
  isWrite: boolean;
  listener: any;
  readEvent: string;
  encoding: string;
  readInterval: number;

  constructor(options: Options) {
    this.path = options.path;
    this.baudRate = options.baudRate;
    this.readEvent = options.readEvent || `${options.path}-read`;
    this.isOpen = false;
    this.isRead = false;
    this.isWrite = false;
    this.encoding = options.encoding || 'utf-8';
    this.readInterval = options.readInterval || 0.2;
  }

  /**
   * @description: 打开串口
   * @return {*}
   */
  async open(): Promise<InvokeResult> {
    try {
      if (!this.path) {
        return Promise.reject({
          code: -1,
          message: `path 不能为空!`,
        });
      }
      if (!this.baudRate) {
        return Promise.reject({
          code: -1,
          message: `baudRate 不能为空!`,
        });
      }
      if (this.isOpen) {
        return Promise.reject({
          code: -1,
          message: `串口 ${this.path} 已经打开!`,
        });
      }
      const res = await invoke<InvokeResult>('plugin:serialport|open', {
        path: this.path,
        baudRate: this.baudRate,
      });
      this.isOpen = true;
      return Promise.resolve(res);
    } catch (error) {
      return Promise.reject(error);
    }
  }

  /**
   * @description: 关闭串口
   * @return {Promise<InvokeResult>}
   */
  async close(): Promise<InvokeResult> {
    try {
      if (!this.isOpen) {
        return Promise.reject({
          code: -1,
          message: `串口 ${this.path} 未打开!`,
        });
      }
      const res = await invoke<InvokeResult>('plugin:serialport|close', {
        path: this.path,
      });

      await this.cancelListen();
      this.isRead = false;
      return res;
    } catch (error) {
      return Promise.reject(error);
    }
  }

  /**
   * @description: 串口写入数据
   * @param {string} value
   * @return {Promise<InvokeResult>}
   */
  async write(value: string): Promise<InvokeResult> {
    try {
      if (!this.isOpen) {
        return Promise.reject({
          code: -1,
          message: `串口 ${this.path} 未打开!`,
        });
      }
      this.isWrite = true;
      return await invoke<InvokeResult>('plugin:serialport|write', {
        value,
        path: this.path,
      });
    } catch (error) {
      return Promise.reject(error);
    } finally {
      this.isWrite = false;
    }
  }

  /**
   * @description: 读取串口信息
   * @return {*}
   */
  async read(): Promise<any> {
    if (this.isRead) {
      return;
    }

    this.isRead = true;
    while (this.isRead) {
      if (this.isWrite) {
        await sleep(this.readInterval);
        continue;
      }
      try {
        await invoke<InvokeResult>('plugin:serialport|read', {
          path: this.path,
          readEvent: this.readEvent,
        });
        await sleep(this.readInterval);
      } catch (error) {
        console.error(error);
        this.isRead = false;
        break;
      }
    }
  }

  /**
   * @description: 取消读取串口信息
   * @return {*}
   */
  cancelRead(): void {
    this.isRead = false;
  }

  /**
   * @description: 获取串口列表
   * @return {*}
   */
  static async available_ports(): Promise<any> {
    try {
      const res = await invoke<string[]>('plugin:serialport|available_ports');
      return Promise.resolve({
        code: 0,
        message: `获取串口列表成功!`,
        data: res,
      });
    } catch (error) {
      return Promise.reject(error);
    }
  }

  /**
   * @description: 监听串口信息
   * @param {function} fn
   * @return {*}
   */
  async listen(fn: (...args: any[]) => void): Promise<any> {
    try {
      await this.cancelListen();
      this.listener = await appWindow.listen<ReadDataResult>(
        this.readEvent,
        ({ payload }) => {
          try {
            const decoder = new TextDecoder(this.encoding);
            const data = decoder.decode(new Uint8Array(payload.data));
            fn(data);
          } catch (error) {
            console.error(error);
          }
        },
      );
      return Promise.resolve({
        code: 0,
        message: '添加串口信息成功!',
      });
    } catch (error) {
      console.error(error);
      return Promise.reject({
        code: -1,
        message: '添加串口信息失败!',
      });
    }
  }

  /**
   * @description: 取消串口监听
   * @return {*}
   */
  async cancelListen(): Promise<any> {
    try {
      if (this.listener) {
        this.listener();
        this.listener = undefined;
      }
      return Promise.resolve({
        code: 0,
        message: '取消串口监听成功!',
      });
    } catch (error) {
      console.error(error);
      return Promise.reject({
        code: -1,
        message: '取消串口监听失败!',
      });
    }
  }
}

export { Serialport };
