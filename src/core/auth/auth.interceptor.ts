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
import { ExtRefreshResponse } from '../api/auth-api.service';
import { SessionService } from './session.service';
import { BrowserStorageService } from '../storage/browser-storage.service';

let refreshInFlight$: Observable<ExtRefreshResponse> | null = null;

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
						return handle401Error(authReq, next, session);
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
		const local = await storage.getMultiple(['NeverLockout'], 'local');
		const area = local['NeverLockout'] === true ? 'local' : 'session';
		const tokens = await storage.getMultiple(['AccessToken'], area);
		const token = tokens['AccessToken'] || null;

		return token;
	} catch (e) {
		console.error('[Vaulton Interceptor] Failed to read token', e);
		return null;
	}
}

function handle401Error(
	req: HttpRequest<any>,
	next: HttpHandlerFn,
	session: SessionService,
) {
	if (!refreshInFlight$) {
		refreshInFlight$ = from(session.refresh()).pipe(
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
		switchMap((res) => {
			const newReq = req.clone({
				setHeaders: { Authorization: `Bearer ${res.AccessToken}` },
			});
			return next(newReq);
		}),
	);
}
