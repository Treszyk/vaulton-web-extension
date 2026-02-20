import { Component, signal, inject } from "@angular/core";
import { CommonModule } from "@angular/common";
import { VaultListComponent } from "../vault-list/vault-list.component";
import { SecurityComponent } from "../security/security.component";
import { AccountComponent } from "../account/account.component";
import { OnboardingModalComponent } from "../onboarding-modal/onboarding-modal.component";
import { StorageCore } from "../../../core/storage/storage-core";
import { NotificationService } from "../../../core/ui/notification.service";

type Tab = "vault" | "security" | "account";

@Component({
  selector: "app-main-layout",
  standalone: true,
  imports: [
    CommonModule,
    VaultListComponent,
    SecurityComponent,
    AccountComponent,
    OnboardingModalComponent,
  ],
  template: `
    <div class="layout-container">
      <main class="content-area">
        <app-vault-list *ngIf="activeTab() === 'vault'"></app-vault-list>
        <app-security *ngIf="activeTab() === 'security'"></app-security>
        <app-account *ngIf="activeTab() === 'account'"></app-account>
      </main>

      <div
        class="toast-overlay"
        *ngIf="notifications.notifications().length > 0"
      >
        <div
          *ngFor="let n of notifications.notifications()"
          class="toast-item"
          [class]="n.type"
          [class.closing]="n.isClosing"
          (click)="notifications.remove(n.id)"
        >
          <div class="toast-icon">
            <svg
              *ngIf="n.type === 'success'"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                stroke-linecap="round"
                stroke-linejoin="round"
                stroke-width="2"
                d="M5 13l4 4L19 7"
              />
            </svg>
            <svg
              *ngIf="n.type === 'error'"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                stroke-linecap="round"
                stroke-linejoin="round"
                stroke-width="2"
                d="M6 18L18 6M6 6l12 12"
              />
            </svg>
            <svg
              *ngIf="n.type === 'info' || n.type === 'warning'"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                stroke-linecap="round"
                stroke-linejoin="round"
                stroke-width="2"
                d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
              />
            </svg>
          </div>
          <div class="toast-content">{{ n.message }}</div>
        </div>
      </div>

      <nav class="bottom-nav tab-switcher">
        <button
          class="nav-tab"
          [class.active]="activeTab() === 'vault'"
          (click)="setTab('vault')"
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              stroke-linecap="round"
              stroke-linejoin="round"
              stroke-width="2"
              d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"
            />
          </svg>
          <span>Vault</span>
        </button>
        <button
          class="nav-tab"
          [class.active]="activeTab() === 'security'"
          (click)="setTab('security')"
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              stroke-linecap="round"
              stroke-linejoin="round"
              stroke-width="2"
              d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z"
            />
          </svg>
          <span>Security</span>
        </button>
        <button
          class="nav-tab"
          [class.active]="activeTab() === 'account'"
          (click)="setTab('account')"
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              stroke-linecap="round"
              stroke-linejoin="round"
              stroke-width="2"
              d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"
            />
          </svg>
          <span>Account</span>
        </button>
        <div
          class="nav-indicator"
          [style.transform]="getIndicatorTransform()"
          [style.width]="getIndicatorWidth()"
        ></div>
      </nav>

      <app-onboarding-modal
        *ngIf="showOnboarding()"
        (choice)="onOnboardingChoice($event)"
      ></app-onboarding-modal>
    </div>
  `,
  styles: [
    `
      :host {
        display: flex;
        flex-direction: column;
        flex: 1;
        min-height: 0;
      }

      .layout-container {
        display: flex;
        flex-direction: column;
        height: 100%;
        width: 100%;
        position: relative;
        overflow: hidden;
      }

      .content-area::-webkit-scrollbar {
        width: 4px;
        background: transparent;
      }
      .content-area::-webkit-scrollbar-thumb {
        background: rgba(255, 255, 255, 0.2);
        border-radius: 4px;
      }
      .content-area::-webkit-scrollbar-thumb:hover {
        background: rgba(255, 255, 255, 0.4);
      }

      .logo {
        display: flex;
        align-items: center;
        gap: 8px;
      }

      .logo h1 {
        font-size: 24px;
        font-weight: 900;
        margin: 0;
        letter-spacing: -1.5px;
        background: linear-gradient(135deg, #fff 0%, #d4d4d8 100%);
        -webkit-background-clip: text;
        -webkit-text-fill-color: transparent;
      }
      .logo .dot {
        color: #7c3aed;
        -webkit-text-fill-color: #7c3aed;
      }

      .content-area {
        flex: 1;
        overflow: hidden;
        padding: 0;
        min-height: 0;
        display: flex;
        flex-direction: column;
        margin-right: 6px;
      }

      .bottom-nav {
        background: #09090b;
        border-top: 1px solid rgba(255, 255, 255, 0.1);
        padding: 0;
        z-index: 110;
      }

      .tab-switcher {
        display: flex;
        padding: 12px 16px;
        position: relative;
        z-index: 120;
        margin: 0;
        width: 100%;
        box-sizing: border-box;
      }

      .nav-tab {
        flex: 1;
        background: none;
        border: none;
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: center;
        gap: 4px;
        padding: 10px 0;
        color: #d4d4d8;
        cursor: pointer;
        transition: all 0.3s cubic-bezier(0.16, 1, 0.3, 1);
        position: relative;
        z-index: 2;
        border-radius: 12px;
      }

      .nav-tab:hover {
        color: rgba(255, 255, 255, 0.7);
        background: rgba(255, 255, 255, 0.03);
      }

      .nav-tab svg {
        width: 20px;
        height: 20px;
      }

      .nav-tab span {
        font-size: 10px;
        font-weight: 700;
        text-transform: uppercase;
        letter-spacing: 0.5px;
      }

      .nav-tab.active {
        color: white;
      }

      .nav-indicator {
        position: absolute;
        left: 16px;
        top: 12px;
        bottom: 12px;
        background: #7c3aed;
        border-radius: 12px;
        transition: all 0.3s cubic-bezier(0.16, 1, 0.3, 1);
        z-index: 1;
        box-shadow: 0 4px 12px rgba(124, 58, 237, 0.3);
      }

      .placeholder-tab {
        height: 100%;
        display: flex;
        align-items: center;
        justify-content: center;
      }

      .empty-state {
        display: flex;
        flex-direction: column;
        align-items: center;
        gap: 16px;
        color: #d4d4d8;
        text-align: center;
        padding: 40px;
      }

      .large-icon {
        width: 64px;
        height: 64px;
        color: #d4d4d8;
      }

      .empty-state h3 {
        color: white;
        margin: 0;
        font-size: 20px;
      }

      .refresh-btn {
        background: transparent;
        border: none;
        color: #d4d4d8;
        cursor: pointer;
        padding: 8px;
        border-radius: 50%;
        transition: all 0.2s;
      }
      .refresh-btn:hover {
        background: rgba(255, 255, 255, 0.05);
        color: white;
      }

      @keyframes spin {
        from {
          transform: rotate(0deg);
        }
        to {
          transform: rotate(360deg);
        }
      }

      .spinning svg {
        animation: spin 1s linear infinite;
      }

      .toast-overlay {
        position: absolute;
        bottom: 0;
        left: 0;
        right: 0;
        padding-bottom: 80px;
        z-index: 50;
        display: flex;
        flex-direction: column-reverse;
        pointer-events: none;
        width: 100%;
        background: transparent;
      }

      .toast-item {
        pointer-events: auto;
        background: #09090b;
        border-bottom: 1px solid rgba(255, 255, 255, 0.05);
        padding: 10px 20px;
        display: flex;
        align-items: center;
        gap: 12px;
        cursor: pointer;
        width: 100%;
        box-sizing: border-box;
        overflow: hidden;
        animation: toastSlideIn 0.3s cubic-bezier(0.16, 1, 0.3, 1) forwards;
      }

      .toast-item.closing {
        animation: toastSlideOut 0.3s cubic-bezier(0.16, 1, 0.3, 1) forwards;
      }

      @keyframes toastSlideIn {
        from {
          max-height: 0;
          opacity: 0;
          transform: translateY(100%);
          padding-top: 0;
          padding-bottom: 0;
          border-top-width: 0;
        }
        to {
          max-height: 60px;
          opacity: 1;
          transform: translateY(0);
          padding-top: 10px;
          padding-bottom: 10px;
          border-top-width: 2px;
        }
      }

      @keyframes toastSlideOut {
        from {
          max-height: 60px;
          opacity: 1;
          transform: translateY(0);
          padding-top: 10px;
          padding-bottom: 10px;
          border-top-width: 2px;
        }
        to {
          max-height: 0;
          opacity: 0;
          transform: translateY(100%);
          padding-top: 0;
          padding-bottom: 0;
          border-top-width: 0;
        }
      }

      .toast-icon {
        width: 14px;
        height: 14px;
        flex-shrink: 0;
      }

      .toast-icon svg {
        width: 100%;
        height: 100%;
      }

      .toast-content {
        font-size: 10px;
        font-weight: 800;
        color: #fff;
        letter-spacing: 0.05em;
        text-transform: uppercase;
      }

      .toast-item.success {
        border-top: 2px solid #22c55e;
      }
      .toast-item.success .toast-icon {
        color: #22c55e;
      }
      .toast-item.error {
        border-top: 2px solid #ef4444;
      }
      .toast-item.error .toast-icon {
        color: #ef4444;
      }
      .toast-item.info {
        border-top: 2px solid #7c3aed;
      }
      .toast-item.info .toast-icon {
        color: #a78bfa;
      }
      .toast-item.warning {
        border-top: 2px solid #fbbf24;
      }
      .toast-item.warning .toast-icon {
        color: #fbbf24;
      }
    `,
  ],
})
export class MainLayoutComponent {
  notifications = inject(NotificationService);
  activeTab = signal<Tab>("vault");
  showOnboarding = signal(false);

  constructor() {
    this.checkOnboarding();
  }

  async checkOnboarding() {
    const result = await StorageCore.get(StorageCore.KEYS.AUTOFILL_ENABLED);

    if (result === undefined || result === null) {
      this.showOnboarding.set(true);
    }
  }

  async onOnboardingChoice(enabled: boolean) {
    await StorageCore.set(StorageCore.KEYS.AUTOFILL_ENABLED, enabled, "local");
    this.showOnboarding.set(false);
  }

  setTab(tab: Tab) {
    this.activeTab.set(tab);
  }

  getIndicatorWidth() {
    return `calc((100% - 32px) / 3)`;
  }

  getIndicatorTransform() {
    const index =
      this.activeTab() === "vault"
        ? 0
        : this.activeTab() === "security"
          ? 1
          : 2;
    return `translateX(${index * 100}%)`;
  }
}
