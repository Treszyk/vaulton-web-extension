export type StorageArea = "local" | "session";

export const browserApi: any =
  (globalThis as any).browser || (globalThis as any).chrome;

export class StorageCore {
  static readonly KEYS = {
    ACCESS_TOKEN: "AccessToken",
    REFRESH_TOKEN: "RefreshToken",
    REFRESH_EXPIRES_AT: "RefreshExpiresAt",
    VAULT_KEY: "VaultKeyB64",
    VAULT_SESSION_KEY: "VaultSessionKey",
    ACCOUNT_ID: "AccountId",
    LOCKOUT_STRATEGY: "LockoutStrategy",
    ENCRYPTED_VAULT: "EncryptedVault",
    PENDING_SAVE: "PendingSavePrompts",
    EXCLUDED_SITES: "ExcludedSites",
    LAST_SYNC_TIME: "LastSyncTime",
    LAST_VERIFY_TIME: "LastVerifyTime",
    AUTOFILL_ENABLED: "AutofillEnabled",
  };

  private static readonly KEY_CHART: {
    [key: string]: StorageArea | "dynamic";
  } = {
    [StorageCore.KEYS.ACCESS_TOKEN]: "dynamic",
    [StorageCore.KEYS.REFRESH_TOKEN]: "dynamic",
    [StorageCore.KEYS.REFRESH_EXPIRES_AT]: "dynamic",
    [StorageCore.KEYS.VAULT_KEY]: "dynamic",
    [StorageCore.KEYS.VAULT_SESSION_KEY]: "session",
    [StorageCore.KEYS.ACCOUNT_ID]: "local",
    [StorageCore.KEYS.LOCKOUT_STRATEGY]: "local",
    [StorageCore.KEYS.ENCRYPTED_VAULT]: "session",
    [StorageCore.KEYS.EXCLUDED_SITES]: "local",
    [StorageCore.KEYS.PENDING_SAVE]: "session",
    [StorageCore.KEYS.LAST_SYNC_TIME]: "session",
    [StorageCore.KEYS.LAST_VERIFY_TIME]: "session",
    [StorageCore.KEYS.AUTOFILL_ENABLED]: "local",
  };

  private static readonly SCOPED_KEYS = [
    StorageCore.KEYS.ACCESS_TOKEN,
    StorageCore.KEYS.REFRESH_TOKEN,
    StorageCore.KEYS.REFRESH_EXPIRES_AT,
    StorageCore.KEYS.VAULT_KEY,
    StorageCore.KEYS.VAULT_SESSION_KEY,
    StorageCore.KEYS.ENCRYPTED_VAULT,
    StorageCore.KEYS.PENDING_SAVE,
    StorageCore.KEYS.LAST_SYNC_TIME,
    StorageCore.KEYS.LAST_VERIFY_TIME,
    StorageCore.KEYS.LOCKOUT_STRATEGY,
    StorageCore.KEYS.EXCLUDED_SITES,
    StorageCore.KEYS.AUTOFILL_ENABLED,
  ];

  private static strategyCache: {
    val: StorageArea | null;
    expiry: number;
  } = { val: null, expiry: 0 };

  private static _cachedAccountId: string | null = null;

  static getChange(
    changes: { [key: string]: any },
    key: string,
  ): { newValue?: any; oldValue?: any } | undefined {
    const prefix = this._cachedAccountId ? `acc:${this._cachedAccountId}:` : "";
    const scopedKey = this.SCOPED_KEYS.includes(key) ? `${prefix}${key}` : key;
    return changes[scopedKey];
  }

  static async initAccountId(): Promise<void> {
    const id = await this.get(this.KEYS.ACCOUNT_ID);
    if (id) this._cachedAccountId = id;
  }

  static async get(key: string, area?: StorageArea): Promise<any> {
    const scopedKey = await this.getScopedKey(key);
    const targetArea = area || (await this.resolveArea(key));
    const result = await this.execute("get", targetArea, [scopedKey]);
    return result ? result[scopedKey] : undefined;
  }

  static async set(key: string, value: any, area?: StorageArea): Promise<void> {
    if (key === this.KEYS.LOCKOUT_STRATEGY) {
      this.invalidateStrategyCache();
    }
    if (key === this.KEYS.ACCOUNT_ID) {
      this._cachedAccountId = typeof value === "string" ? value : null;
    }
    const scopedKey = await this.getScopedKey(key);
    const targetArea = area || (await this.resolveArea(key));
    await this.execute("set", targetArea, { [scopedKey]: value });
  }

  static async setMultiple(
    items: { [key: string]: any },
    area?: StorageArea,
  ): Promise<void> {
    if (Object.keys(items).includes(this.KEYS.LOCKOUT_STRATEGY)) {
      this.invalidateStrategyCache();
    }
    if (area) {
      const scopedItems: { [key: string]: any } = {};
      for (const [key, val] of Object.entries(items)) {
        const scopedKey = await this.getScopedKey(key);
        scopedItems[scopedKey] = val;
      }
      await this.execute("set", area, scopedItems);
      return;
    }

    const buckets: { [key in StorageArea]: { [key: string]: any } } = {
      local: {},
      session: {},
    };

    for (const [key, val] of Object.entries(items)) {
      const target = await this.resolveArea(key);
      const scopedKey = await this.getScopedKey(key);
      buckets[target][scopedKey] = val;
    }

    if (Object.keys(buckets.local).length > 0) {
      await this.execute("set", "local", buckets.local);
    }
    if (Object.keys(buckets.session).length > 0) {
      await this.execute("set", "session", buckets.session);
    }
  }

  static async getMultiple(
    keys: string[],
    area?: StorageArea,
  ): Promise<{ [key: string]: any }> {
    if (area) {
      const scopedKeys = await Promise.all(
        keys.map((k) => this.getScopedKey(k)),
      );
      const raw = (await this.execute("get", area, scopedKeys)) || {};
      const result: { [key: string]: any } = {};
      for (let i = 0; i < keys.length; i++) {
        if (raw[scopedKeys[i]] !== undefined) {
          result[keys[i]] = raw[scopedKeys[i]];
        }
      }
      return result;
    }

    const buckets: { [key in StorageArea]: string[] } = {
      local: [],
      session: [],
    };

    for (const key of keys) {
      const target = await this.resolveArea(key);
      const scopedKey = await this.getScopedKey(key);
      buckets[target].push(scopedKey);
    }

    const results: { [key: string]: any } = {};
    if (buckets.local.length > 0) {
      const localRes = await this.execute("get", "local", buckets.local);
      for (const key of keys) {
        const scopedKey = await this.getScopedKey(key);
        if (localRes[scopedKey] !== undefined) {
          results[key] = localRes[scopedKey];
        }
      }
    }
    if (buckets.session.length > 0) {
      const sessionRes = await this.execute("get", "session", buckets.session);
      for (const key of keys) {
        const scopedKey = await this.getScopedKey(key);
        if (sessionRes[scopedKey] !== undefined) {
          results[key] = sessionRes[scopedKey];
        }
      }
    }
    return results;
  }

  static async remove(key: string, area?: StorageArea): Promise<void> {
    const scopedKey = await this.getScopedKey(key);
    const targetArea = area || (await this.resolveArea(key));
    await this.execute("remove", targetArea, [scopedKey]);
  }

  static async removeMultiple(
    keys: string[],
    area?: StorageArea,
  ): Promise<void> {
    if (area) {
      const scopedKeys = await Promise.all(
        keys.map((k) => this.getScopedKey(k)),
      );
      await this.execute("remove", area, scopedKeys);
      return;
    }

    const buckets: { [key in StorageArea]: string[] } = {
      local: [],
      session: [],
    };

    for (const key of keys) {
      const target = await this.resolveArea(key);
      const scopedKey = await this.getScopedKey(key);
      buckets[target].push(scopedKey);
    }

    if (buckets.local.length > 0) {
      await this.execute("remove", "local", buckets.local);
    }
    if (buckets.session.length > 0) {
      await this.execute("remove", "session", buckets.session);
    }
  }

  private static async getScopedKey(key: string): Promise<string> {
    if (!this.SCOPED_KEYS.includes(key)) return key;

    const globalAccountId = await this.execute("get", "local", [
      this.KEYS.ACCOUNT_ID,
    ]);
    const accountId = globalAccountId?.[this.KEYS.ACCOUNT_ID];

    return accountId ? `acc:${accountId}:${key}` : key;
  }

  static async clear(area: StorageArea = "session"): Promise<void> {
    await this.execute("clear", area);
  }

  static async clearSession(): Promise<void> {
    await this.execute("clear", "session");

    const dynamicKeys = Object.entries(this.KEY_CHART)
      .filter(([_, val]) => val === "dynamic")
      .map(([k, _]) => k);

    await this.removeMultiple(
      [...dynamicKeys, this.KEYS.ENCRYPTED_VAULT],
      "local",
    );
  }

  private static async resolveArea(key: string): Promise<StorageArea> {
    const chartValue = this.KEY_CHART[key];
    if (chartValue && chartValue !== "dynamic") {
      return chartValue;
    }
    return this.detectArea();
  }

  static async detectArea(): Promise<StorageArea> {
    const now = Date.now();
    if (this.strategyCache.val && now < this.strategyCache.expiry) {
      return this.strategyCache.val;
    }

    const scopedKey = await this.getScopedKey(this.KEYS.LOCKOUT_STRATEGY);
    const strategy = await this.execute("get", "local", [scopedKey]);
    let val = strategy?.[scopedKey];

    if (val === undefined && scopedKey !== this.KEYS.LOCKOUT_STRATEGY) {
      const globalStrategy = await this.execute("get", "local", [
        this.KEYS.LOCKOUT_STRATEGY,
      ]);
      val = globalStrategy?.[this.KEYS.LOCKOUT_STRATEGY];
    }

    const res = val === "Persistent" ? "local" : "session";

    this.strategyCache = {
      val: res,
      expiry: now + 5000,
    };

    return res;
  }

  static invalidateStrategyCache(): void {
    this.strategyCache = { val: null, expiry: 0 };
  }

  private static async execute(
    method: string,
    area: StorageArea,
    ...args: any[]
  ): Promise<any> {
    if (!browserApi || !browserApi.storage) {
      return this.webFallback(method, area, ...args);
    }

    const handle = this.getAreaHandle(area);
    if (!handle || typeof handle[method] !== "function") {
      return this.webFallback(method, area, ...args);
    }

    return new Promise((resolve, reject) => {
      try {
        let callbackCalled = false;
        const callback = (res: any) => {
          if (callbackCalled) return;
          callbackCalled = true;
          if (browserApi.runtime?.lastError)
            reject(browserApi.runtime.lastError);
          else resolve(res);
        };

        const result = handle[method](...args, callback);

        if (result && typeof result.then === "function") {
          result
            .then((res: any) => {
              if (!callbackCalled) {
                callbackCalled = true;
                resolve(res);
              }
            })
            .catch((err: any) => {
              if (!callbackCalled) {
                callbackCalled = true;
                reject(err);
              }
            });
        }
      } catch (err) {
        reject(err);
      }
    });
  }

  private static getAreaHandle(area: StorageArea): any {
    if (area === "session") {
      return browserApi.storage.session || browserApi.storage.local;
    }
    return browserApi.storage.local;
  }

  private static async webFallback(
    method: string,
    area: StorageArea,
    ...args: any[]
  ): Promise<any> {
    if (typeof window === "undefined") return;
    const storage =
      area === "session" ? window.sessionStorage : window.localStorage;
    if (!storage) return;

    switch (method) {
      case "get":
        const keys = Array.isArray(args[0]) ? args[0] : [args[0]];
        const result: any = {};
        keys.forEach((k: string) => {
          const val = storage.getItem(k);
          if (val !== null) {
            try {
              result[k] = JSON.parse(val);
            } catch {
              result[k] = val;
            }
          }
        });
        return result;
      case "set":
        const items = args[0];
        Object.keys(items).forEach((k) => {
          const val =
            typeof items[k] === "string" ? items[k] : JSON.stringify(items[k]);
          storage.setItem(k, val);
        });
        break;
      case "remove":
        const toRemove = Array.isArray(args[0]) ? args[0] : [args[0]];
        toRemove.forEach((k: string) => storage.removeItem(k));
        break;
      case "clear":
        storage.clear();
        break;
    }
  }
}
