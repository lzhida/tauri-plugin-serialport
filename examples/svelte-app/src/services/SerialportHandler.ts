/*
 * @Description: tauri 串口操作
 * @Author: zhidal
 * @Date: 2022-07-20 17:02:07
 * @LastEditors: zhidal
 * @LastEditTime: 2022-07-22 14:25:25
 */

import { invoke } from '@tauri-apps/api/tauri';
import { sleep } from './utils';
import { open, close, write, read, listen, available_ports } from 'tauri-plugin-serialport-api';
class SerialportHandler {
  path: string;
  baudRate: number;
  isRead: boolean;
  isOpen: boolean;
  isWrite: boolean;
  listener: any;
  readEvent: string;
  encoding: string;

  constructor(options: any) {
    this.path = options.path;
    this.baudRate = options.baudRate;
    this.readEvent = options.readEvent || `${options.path}-read`;
    this.isOpen = false;
    this.isRead = false;
    this.isWrite = false;
    this.encoding = options.encoding || 'utf-8';
  }

  /**
   * @description: 打开串口
   * @param {any} options
   * @return {*}
   */
  async open(): Promise<any> {
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
      const res = await open({ path: this.path, baudRate: this.baudRate });
      this.isOpen = true;
      return Promise.resolve(res)
    } catch (error) {
      return Promise.reject(error);
    }
  }

  /**
   * @description: 关闭串口
   * @return {Promise<any>}
   */
  async close(): Promise<any> {
    try {
      if (!this.isOpen) {
        return Promise.reject({
          code: -1,
          message: `串口 ${this.path} 未打开!`,
        });
      }
      await this.cancelListen();
      this.cancelRead();
      return await close(this.path);
    } catch (error) {
      return Promise.reject(error);
    }
  }

  /**
   * @description: 串口写入数据
   * @param {string} value
   * @return {*}
   */
  async write(value: string): Promise<any> {
    try {
      if (!this.isOpen) {
        return Promise.reject({
          code: -1,
          message: `串口 ${this.path} 未打开!`,
        });
      }
      this.isWrite = true;
      return await write({ path: this.path, value: value });
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
        await sleep(0.2);
        continue;
      }
      try {
        await read({ path: this.path, readEvent: this.readEvent });
        await sleep(0.2);
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
      const res = await available_ports();
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
      this.listener = await listen(this.readEvent, ({ payload }) => {
        try {
          const decoder = new TextDecoder(this.encoding);
          const data = decoder.decode(new Uint8Array(payload.data));
          fn(data);
        } catch (error) {
          console.error(error);
        }
      });
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

export default SerialportHandler;
