import { PageOptions } from "./browser-page";
import { timeoutError } from "./timeout-error";

export enum TaskState {
  PENDING,
  WORKING,
  FULFILLED,
  REJECTED,
  TIMEOUT
}

export class PageTask<T> {
  id: string;
  createTime: number;
  expirationTime: number;
  clusterLevelActionOnTimeOut: (id: string) => void;

  private _state = TaskState.PENDING;
  private _resolve!: (value: T | PromiseLike<T>) => void;
  private _reject!: (reason?: any) => void;
  private timeoutRef: NodeJS.Timeout;
  public timeoutMs = 1000 * 60 * 2;

  constructor(public url: string, public pageOptions: PageOptions, public taskAction: Function, public taskOptions: any) {
    this.id = this.id = (new Date()).getTime().toString(36) + Math.random().toString(36).slice(2);
    console.log("page-task created: "+ this.id);
  }

  public initTimeOut(timeoutMs?: number): void {
    if(timeoutMs) {
      this.timeoutMs = timeoutMs;
    }

    this.createTime = Date.now();
    this.expirationTime = this.createTime + this.timeoutMs;
    this.timeout();
  }

  public resultObserver = new Promise<T>((resolve, reject) => {
    this._resolve = resolve;
    this._reject = reject;
  });

  get waitToStart() {
    return this._state == TaskState.PENDING;
  }

  get hasStarted() {
    return this._state == TaskState.WORKING;
  }

  get hasFinished() {
    return this._state == TaskState.REJECTED || this._state == TaskState.FULFILLED;
  }

  reject(reason: any) {
    if (this._state == TaskState.PENDING || this._state == TaskState.WORKING) {
      this._state = TaskState.REJECTED;
      this._reject(reason);
    }
  }

  resolve(value: T) {
    if (this._state == TaskState.PENDING || this._state == TaskState.WORKING) {
      this._state = TaskState.FULFILLED;
      this._resolve(value);
      console.log("page-task completed: "+ this.id);
    }
  }

  async start() {
    console.log("page-task started: "+ this.id);
    if (this.waitToStart == false) {
      return;
    }

    clearTimeout(this.timeoutRef);

    this._state = TaskState.WORKING;
  }

  private timeout() {
    if (this.timeoutMs) {
      this.timeoutRef = setTimeout(() => {
        if (this.waitToStart) {
          
          this._state = TaskState.TIMEOUT;
          this.clusterLevelActionOnTimeOut(this.id);
          this.reject(new timeoutError('page-job timeout', this.timeoutMs));          
          clearTimeout(this.timeoutRef);
        }
      }, this.timeoutMs).unref();
    }
  }
}