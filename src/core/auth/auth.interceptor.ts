import {
	HttpErrorResponse,
	HttpHandlerFn,
	HttpInterceptorFn,
	HttpRequest,
} from '@angular/common/http';
import { inject } from '@angular/core';
import {
	Observable,
	catchError,
	finalize,
	from,
	shareReplay,
	switchMap,
	throwError,
} from 'rxjs';
import { SessionService } from './session.service';
import { BrowserStorageService } from '../storage/browser-storage.service';
import { StorageCore } from '../storage/storage-core';

let refreshInFlight$: Observable<string | null> | null = null;

export const authInterceptor: HttpInterceptorFn = (req, next) => {
	const storage = inject(BrowserStorageService);
	const session = inject(SessionService);

	if (
		req.url.includes('/auth/ext/refresh') ||
		req.url.includes('/auth/ext/login') ||
		req.url.includes('/auth/pre-login') ||
		req.url.includes('/auth/ext/logout')
	) {
		return next(req);
	}

	return from(getAccessToken(storage)).pipe(
		switchMap((token) => {
			let authReq = req;
			if (token) {
				authReq = req.clone({
					setHeaders: { Authorization: `Bearer ${token}` },
				});
			}

			return next(authReq).pipe(
				catchError((error) => {
					if (error instanceof HttpErrorResponse && error.status === 401) {
						return handle401Error(authReq, next, session, storage);
					}
					return throwError(() => error);
				}),
			);
		}),
	);
};

async function getAccessToken(
	storage: BrowserStorageService,
): Promise<string | null> {
	try {
		const area = await StorageCore.detectArea();
		const tokens = await storage.getMultiple(['AccessToken'], area);
		return tokens['AccessToken'] || null;
	} catch (e) {
		console.error('[Vaulton Interceptor] Failed to read token', e);
		return null;
	}
}

function handle401Error(
	req: HttpRequest<any>,
	next: HttpHandlerFn,
	session: SessionService,
	storage: BrowserStorageService,
) {
	if (!refreshInFlight$) {
		refreshInFlight$ = from(session.refresh()).pipe(
			switchMap(() => from(getAccessToken(storage))),
			catchError((err) => {
				session.logout();
				return throwError(() => err);
			}),
			shareReplay(1),
			finalize(() => {
				refreshInFlight$ = null;
			}),
		);
	}

	return refreshInFlight$.pipe(
		switchMap((newToken) => {
			if (newToken) {
				const newReq = req.clone({
					setHeaders: { Authorization: `Bearer ${newToken}` },
				});
				return next(newReq);
			}
			return throwError(() => new Error('Refresh failed to provide token'));
		}),
	);
}
