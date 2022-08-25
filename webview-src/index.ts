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
  isOpen: boolean;
  isWrite: boolean;
  unListen: any;
  encoding: string;
  readInterval: number;

  constructor(options: Options) {
    // TODO: dataBits、flowControl、parity、stopBits、timeout配置
    this.path = options.path;
    this.baudRate = options.baudRate;
    this.isOpen = false;
    this.isWrite = false;
    this.encoding = options.encoding || 'utf-8';
    this.readInterval = options.readInterval || 0.2;
  }

  /**
   * @description: 获取串口列表
   * @return {Promise<string[]>}
   */
  static async available_ports(): Promise<string[]> {
    try {
      return await invoke<string[]>('plugin:serialport|available_ports');
    } catch (error) {
      return Promise.reject(error);
    }
  }

  /**
   * @description: 取消串口监听
   * @return {Promise<void>}
   */
  async cancelListen(): Promise<void> {
    try {
      if (this.unListen) {
        this.unListen();
        this.unListen = undefined;
      }
      return;
    } catch (error) {
      return Promise.reject({
        code: -1,
        message: '取消串口监听失败!' + error,
      });
    }
  }

  /**
   * @description: 取消读取数据
   * @return {Promise<void>}
   */
  async cancelRead(): Promise<void> {
    try {
      return await invoke<void>('plugin:serialport|cancel_read', {
        path: this.path,
      });
    } catch (error) {
      console.error(error);
    }
  }

  /**
   * @description:
   * @param {object} options
   * @return {Promise<void>}
   */
  async change(options: { path?: string; baudRate?: number }): Promise<void> {
    try {
      let isOpened = false;
      if (this.isOpen) {
        isOpened = true;
        await this.close();
      }
      if (options.path) {
        this.path = options.path;
      }
      if (options.baudRate) {
        this.baudRate = options.baudRate;
      }
      if (isOpened) {
        await this.open();
      }
      return Promise.resolve();
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
        return Promise.resolve({
          code: 2,
          message: `串口 ${this.path} 未打开!`,
        });
      }
      const res = await invoke<InvokeResult>('plugin:serialport|close', {
        path: this.path,
      });

      await this.cancelListen();
      this.isOpen = false;
      return res;
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
      let readEvent = 'plugin-serialport-read-' + this.path;
      this.unListen = await appWindow.listen<ReadDataResult>(
        readEvent,
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
      return Promise.reject({
        code: -1,
        message: '添加串口信息失败!' + error,
      });
    }
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
        return Promise.resolve({
          code: 2,
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
   * @description: 读取串口信息
   * @return {*}
   */
  async read(): Promise<any> {
    try {
      return await invoke<InvokeResult>('plugin:serialport|read', {
        path: this.path,
      });
    } catch (error) {
      return Promise.reject(error);
    }
  }

  /**
   * @description: 设置串口 波特率
   * @param {number} value
   * @return {Promise<void>}
   */
  async setBaudRate(value: number): Promise<void> {
    try {
      let isOpened = false;
      if (this.isOpen) {
        isOpened = true;
        await this.close();
      }
      this.baudRate = value;
      if (isOpened) {
        await this.open();
      }
      return Promise.resolve();
    } catch (error) {
      return Promise.reject(error);
    }
  }

  /**
   * @description: 设置串口 path
   * @param {string} value
   * @return {Promise<void>}
   */
  async setPath(value: string): Promise<void> {
    try {
      let isOpened = false;
      if (this.isOpen) {
        isOpened = true;
        await this.close();
      }
      this.path = value;
      if (isOpened) {
        await this.open();
      }
      return Promise.resolve();
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
}

export { Serialport };
