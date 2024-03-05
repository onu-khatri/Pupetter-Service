import { LinkedList, Node } from "./linked-list";
import { BrowserStatus, BrowserWorker, browserWorkerOptions } from "./browser-worker";
import { PageTask } from "./page-task";
import { PuppeteerLaunchOptions } from "puppeteer";
import { BrowserWorkerWatcher } from "./watcher";

export interface BrowserClusterOptions {
  maxWorkerNum: number;
  minWorkerNum: number;
}

export class BrowserCluster {
  allWorkers = new LinkedList<BrowserWorker>();
  availableWorkers = new LinkedList<BrowserWorker>();
  startingWorks = new LinkedList<BrowserWorker>();
  waitingTasks = new LinkedList<PageTask<Buffer>>();

  private static _clusterInstance: BrowserCluster;
  private _watcher: BrowserWorkerWatcher;
  private _running = false;

  private constructor(public browserClusterOptions: BrowserClusterOptions,
    public puppeteerLaunchOptions: PuppeteerLaunchOptions,
    public browserOptions: browserWorkerOptions
  ) {
  }

  public static createBrowserCluster = (browserClusterOptions: BrowserClusterOptions,
    puppeteerLaunchOptions: PuppeteerLaunchOptions,
    browserOptions: browserWorkerOptions) => {
    if (!this._clusterInstance) {
      this._clusterInstance = new BrowserCluster(browserClusterOptions, puppeteerLaunchOptions, browserOptions);
    }
    return this._clusterInstance;
  };

  public static getBrowserCluster = () => {
    if(!this._clusterInstance) {
      throw Error("Cluster is not created");
    }
   return this._clusterInstance
  };

  run() {
    if(this._running)
      return;

    this._watcher = new BrowserWorkerWatcher(this, {
      lifeSpanMsOfWorkers: this.browserOptions.maxLifeSpanOfBrowser,
      maxIdleTimeMsOfWorkers: this.browserOptions.maxIdleTimeOfBrowser,
      maxRemovalEachTime: 20,
      watchIntervalMS: 1000*60*2
    });

    this._watcher.schedule();
  this._running = true;
  }

  removeFromWaitingTask(id: string): void {
    this.waitingTasks.delete(t => id == id);
  }

  async addPageTask(task: PageTask<Buffer>) {
    if(!this._running) {
      this.run();
    }

    task.clusterLevelActionOnTimeOut = (id) => this.removeFromWaitingTask(id);
    task.initTimeOut(this.browserOptions.maxPageWaitingTime);
    this.waitingTasks.insertAtEnd(task);
    await this.dispatchTask();
  }

  async dispatchTask(): Promise<void> {
    if (this.availableWorkers.size < 1) {
      await this.ensureMinimumNumOfWorkers();
    }

    if (this.waitingTasks.isEmpty()) {
      return;
    }

    if (this.availableWorkers.isEmpty()) {
      await this.tryToCreateMoreWorkers();
      return;
    }

    while (!this.waitingTasks.isEmpty()) {
      const job = this.waitingTasks.getFirst()?.data;
      this.waitingTasks.delete(t => t.id == job?.id)

      if (!job?.waitToStart) {
        continue;
      }

      const worker = this.pickAWorker();

      if (worker == null) {
        this.waitingTasks.insertFirst(new Node(job));
        break;
      }

      worker.requestPageAction(job);
    }
  }

  pickAWorker() {
    let candidate = this.availableWorkers.getFirst();

    if (candidate == undefined || candidate == null) {
      return null;
    }

    let status = candidate?.data.browserStatus;

    while (status != BrowserStatus.IDLE && status != BrowserStatus.ACTIVE_PAGE_CLOSE && status != BrowserStatus.ACTIVE_PAGE_OPEN ) {
      if (candidate?.hasNext() == false) {
        return null;
      }

      candidate = candidate?.getNext();
      status = candidate?.data.browserStatus as BrowserStatus;
    }

    return candidate?.data;
  }

  async createWorker(): Promise<boolean> {
    const worker = new BrowserWorker(this.puppeteerLaunchOptions, this.browserOptions);
    const promise = this.addWorkerLister(worker);
    
    this.allWorkers.appendNode(new Node<BrowserWorker>(worker));
    this.startingWorks.appendNode(new Node<BrowserWorker>(worker));

    await worker.launchBrowser();    
    return promise;
  }

  private addWorkerLister(worker: BrowserWorker): Promise<boolean> {
    let ready!: (value: boolean | PromiseLike<boolean>) => void;

    const promise = new Promise<boolean>((resolve, _) => {
      ready = resolve;
    });

    worker.on(BrowserWorker.StatusUpdated, (prevStatus: BrowserStatus, status: BrowserStatus) => {
      console.log("Listning Event.."," prevStatus: "+ prevStatus, ", status: "+ status );
      if (prevStatus == BrowserStatus.PENDING && status == BrowserStatus.IDLE) {
        if (worker.isProcessingDone) {
          return;
        }
        worker.isProcessingDone = true;
        this.availableWorkers.insertFirst(new Node(worker));
        this.startingWorks.delete((browserWorker) => worker.id == browserWorker.id);
        ready(true);
      } else if (status == BrowserStatus.BUSY) {
        this.availableWorkers.delete(t => t.id == worker.id);
      } else if (prevStatus == BrowserStatus.PENDING && status == BrowserStatus.UNLINK) {
        if (worker.isProcessingDone) {
          return;
        }
        worker.isProcessingDone = true;
        this.startingWorks.delete((browserWorker) => worker.id == browserWorker.id);
        this.allWorkers.delete((browserWorker) => worker.id == browserWorker.id);
        ready(false);
      } else if (prevStatus == BrowserStatus.BUSY &&
        (status == BrowserStatus.IDLE || status == BrowserStatus.ACTIVE_PAGE_CLOSE || status == BrowserStatus.ACTIVE_PAGE_OPEN)) {
        this.availableWorkers.insertAtEnd(worker);
        this.dispatchTask();
      } else if (status == BrowserStatus.CLOSING) {
        this.availableWorkers.delete(t => t.id == worker.id);
      } else if (status == BrowserStatus.UNLINK) {
        this.availableWorkers.delete(t => t.id == worker.id);
        this.allWorkers.delete(t => t.id == worker.id);
        this.dispatchTask();
      }
      if(status == BrowserStatus.ACTIVE_PAGE_CLOSE) {
        this.dispatchTask();
      }
    });

    return promise;
  }

  async ensureMinimumNumOfWorkers(): Promise<void> {
    for (let i = this.allWorkers.size; i < this.browserClusterOptions.minWorkerNum; i++) {
      await this.createWorkerAndDispatch();
    }
  }

  async createWorkerAndDispatch() {
    if (this.allWorkers.size >= this.browserClusterOptions.maxWorkerNum) {
      return;
    }

    await this.createWorker();

    this.dispatchTask();
  }

  async tryToCreateMoreWorkers(): Promise<void> {
    const need = Math.min(
      Math.ceil(this.waitingTasks.size / this.browserOptions.maxParallelTasks),
      this.browserClusterOptions.maxWorkerNum - this.allWorkers.size
    );

    for (let i = 0; i < need; i++) {
      await this.createWorkerAndDispatch();
    }
  }

  async closeAllWorkers(): Promise<any>{
    let candidates: BrowserWorker[] = []

    for (const worker of this.allWorkers) {
      if (!(worker && [BrowserStatus.IDLE, BrowserStatus.ACTIVE_PAGE_CLOSE, BrowserStatus.ACTIVE_PAGE_OPEN, BrowserStatus.BUSY].includes(worker.browserStatus))) {
        continue;
      }
        candidates.push(worker);
    }

    await Promise.all(candidates.map((worker) => worker.close()));
  }
}