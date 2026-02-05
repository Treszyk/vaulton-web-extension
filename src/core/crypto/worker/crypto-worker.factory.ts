import { Injectable } from '@angular/core';
import { vaultonPolicy } from '../../utils/trusted-types';

@Injectable({ providedIn: 'root' })
export class CryptoWorkerFactory {
	create(): Worker {
		if (typeof Worker !== 'undefined') {
			const win = window as any;
			const OriginalWorker = win.Worker;

			win.Worker = class TrustedWorkerProxy extends OriginalWorker {
				constructor(scriptURL: string | URL, options?: WorkerOptions) {
					const safeUrl = vaultonPolicy.createScriptURL(scriptURL.toString());
					super(safeUrl, options);
				}
			};

			try {
				return new Worker(new URL('./crypto.worker.ts', import.meta.url), {
					type: 'module',
				});
			} finally {
				win.Worker = OriginalWorker;
			}
		} else {
			throw new Error('Web Workers are required for this extension.');
		}
	}
}
