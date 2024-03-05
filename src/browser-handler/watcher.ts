import { BrowserCluster } from "./browser-cluster";
import { BrowserStatus, BrowserWorker } from "./browser-worker";

export interface WatcherOption {
  watchIntervalMS: number;
  lifeSpanMsOfWorkers: number;
  maxIdleTimeMsOfWorkers: number;
  maxRemovalEachTime: number
}

export class BrowserWorkerWatcher {
  private timer?: NodeJS.Timeout;

  constructor(private cluster: BrowserCluster, private config: WatcherOption) { }

  schedule() {
    this.stop();
    this.timer = setInterval(this.closeBrowsers.bind(this), this.config.watchIntervalMS).unref();
  }

  stop() {
    if (this.timer)
      clearInterval(this.timer);
  }

  private closeBrowsers() {
    let candidates: BrowserWorker[] = []
    const currentTime = Date.now();

    for (const worker of this.cluster.allWorkers) {
      if (!(worker && [BrowserStatus.IDLE, BrowserStatus.ACTIVE_PAGE_CLOSE, BrowserStatus.ACTIVE_PAGE_OPEN, BrowserStatus.BUSY].includes(worker.browserStatus))) {
        continue;
      }

      if (currentTime - worker?.createTime >= this.config.lifeSpanMsOfWorkers) {
        candidates.push(worker);
      } else if (currentTime - worker?.lastWorkTime >= this.config.maxIdleTimeMsOfWorkers) {
        candidates.push(worker);
      }
    }

    candidates
      .slice(0, this.config.maxRemovalEachTime)
      .forEach((worker) => worker.close());
  }
}