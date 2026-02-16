import { CredentialOption } from "./types";
import { PICKER_STYLES } from "./styles";
import { escapeHtml } from "../dom-utils";

export class PickerUI {
  static create(
    credentials: CredentialOption[],
    onSelect: (cred: CredentialOption) => void,
    onGenerate: () => void,
    onShowAll?: () => void,
    domain?: string,
    isRegistration?: boolean,
    targetInput?: HTMLInputElement,
  ): HTMLElement {
    const picker = document.createElement("div");
    picker.className = "vaulton-credential-picker";
    picker.style.cssText = PICKER_STYLES.CONTAINER;

    if (domain && onShowAll && targetInput) {
      const header = this.createHeader(
        domain,
        credentials.length,
        onShowAll,
        targetInput,
      );
      picker.appendChild(header);
    }

    const listContainer = document.createElement("div");
    listContainer.className = "vaulton-list-container";
    listContainer.style.cssText = PICKER_STYLES.LIST_CONTAINER;

    if (credentials.length === 0 && !isRegistration) {
      listContainer.innerHTML = `
        <div style="padding: 1rem; text-align: center; color: #d4d4d8; font-size: 0.875rem;">
          No credentials found${domain ? ` for <strong>${escapeHtml(domain)}</strong>` : ""}
        </div>
      `;
    } else {
      credentials.forEach((cred) => {
        const item = this.createCredentialItem(cred, onSelect);
        listContainer.appendChild(item);
      });
    }

    picker.appendChild(listContainer);

    const footer = document.createElement("div");
    footer.style.cssText = PICKER_STYLES.FOOTER;

    const genItem = this.createGenerationItem(onGenerate, isRegistration);
    footer.appendChild(genItem);

    picker.appendChild(footer);

    this.addStyles(picker);

    return picker;
  }

  static createLockedState(): HTMLElement {
    const picker = document.createElement("div");
    picker.className = "vaulton-credential-picker";
    picker.style.cssText = PICKER_STYLES.LOCKED_CONTAINER;

    picker.innerHTML = `
      <div style="display: flex !important; justify-content: center !important; margin-bottom: 0.75rem; color: #a855f7;">
          <rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect>
          <path d="M7 11V7a5 5 0 0 1 10 0v4"></path>
        </svg>
      </div>
      <div style="font-size: 1rem; font-weight: 600; margin-bottom: 0.25rem;">Vault is Locked</div>
      <div style="font-size: 0.875rem; color: #d4d4d8; margin-bottom: 1rem;">Please log in to the Vaulton extension to access your credentials.</div>
    `;

    const loginNote = document.createElement("div");
    loginNote.style.cssText = `
      font-size: 0.875rem;
      color: #a1a1aa;
      background: #27272a;
      padding: 0.5rem;
      border-radius: 0.375rem;
    `;
    loginNote.textContent =
      "Tip: Click the Vaulton icon in your browser toolbar to unlock.";
    picker.appendChild(loginNote);

    return picker;
  }

  static createInvalidatedState(): HTMLElement {
    const picker = document.createElement("div");
    picker.className = "vaulton-credential-picker";
    picker.style.cssText = PICKER_STYLES.LOCKED_CONTAINER;

    picker.innerHTML = `
      <div style="display: flex !important; justify-content: center !important; margin-bottom: 0.75rem; color: #a1a1aa;">
          <path d="M18.36 6.64a9 9 0 1 1-12.73 0"></path>
          <line x1="12" y1="2" x2="12" y2="12"></line>
        </svg>
      </div>
      <div style="font-size: 1rem; font-weight: 600; margin-bottom: 0.25rem;">Connection Lost</div>
      <div style="font-size: 0.875rem; color: #d4d4d8; margin-bottom: 1rem;">The extension has been updated or reloaded. Please refresh to continue.</div>
    `;

    const refreshBtn = document.createElement("button");
    refreshBtn.style.cssText = `
      background: #7c3aed;
      color: white;
      border: none;
      border-radius: 0.5rem;
      padding: 0.5rem 1rem;
      font-size: 0.875rem;
      font-weight: 600;
      cursor: pointer;
      transition: background 0.2s;
    `;
    refreshBtn.textContent = "Refresh Page";
    refreshBtn.onclick = () => window.location.reload();
    picker.appendChild(refreshBtn);

    return picker;
  }

  private static addStyles(picker: HTMLElement): void {
    const style = document.createElement("style");
    style.textContent =
      PICKER_STYLES.SCROLLBAR_CSS +
      `
      .vaulton-credential-item:hover {
        background: #27272a;
      }
    `;
    picker.appendChild(style);
  }

  private static createHeader(
    domain: string,
    count: number,
    onShowAll: () => void,
    targetInput: HTMLInputElement,
  ): HTMLElement {
    const header = document.createElement("div");
    header.style.cssText = PICKER_STYLES.HEADER;
    header.className = "vaulton-header";

    header.innerHTML = `
      <div style="flex: 1;">
        <div style="color: #d4d4d8; font-size: 0.875rem; text-transform: uppercase; letter-spacing: 0.05em; margin-bottom: 0.25rem;">
          Credentials for
        </div>
        <div style="color: white; font-size: 0.875rem; font-weight: 600; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;">
          ${escapeHtml(domain)} ${count > 0 ? `(${count})` : ""}
        </div>
      </div>
    `;

    const style = document.createElement("style");
    style.textContent = PICKER_STYLES.HEADER_BTN_CSS;
    header.appendChild(style);

    const toolsContainer = document.createElement("div");
    toolsContainer.className = "vaulton-header-tools";
    toolsContainer.style.cssText = `
      display: flex;
      align-items: center;
      gap: 0.5rem;
    `;

    const revealBtn = document.createElement("button");
    revealBtn.type = "button";
    revealBtn.className =
      "vaulton-btn vaulton-btn-secondary vaulton-btn-reveal";

    const REVEAL_DURATION_MS = 15000;
    let countdownInterval: number | null = null;


    const clearTimer = () => {
      if (countdownInterval) {
        clearInterval(countdownInterval);
        countdownInterval = null;
      }
    };

    const updateState = () => {
      const expiresAttr = targetInput.dataset.vaultonRevealExpires;
      const now = Date.now();

      if (expiresAttr) {
        const expires = parseInt(expiresAttr, 10);
        if (expires > now) {
          const msLeft = expires - now;
          const secondsLeft = Math.ceil(msLeft / 1000);

          if (targetInput.type !== "text") {
            targetInput.type = "text";
          }

          revealBtn.textContent = `HIDE (${secondsLeft}s)`;
          revealBtn.classList.remove("vaulton-btn-secondary");
          revealBtn.classList.add("vaulton-btn-primary");

          if (!countdownInterval) {
            countdownInterval = window.setInterval(updateState, 200);
          }
        } else {
          handleRevert();
        }
      } else {
        revealBtn.textContent = "REVEAL INPUT";
        revealBtn.classList.remove("vaulton-btn-primary");
        revealBtn.classList.add("vaulton-btn-secondary");

        clearTimer();
      }
    };

    const handleRevert = () => {
      targetInput.type = "password";
      delete targetInput.dataset.vaultonRevealExpires;
      clearTimer();
      updateState();
    };

    const handleToggle = (e: MouseEvent) => {
      e.preventDefault();
      e.stopPropagation();
      const isRevealed = !!targetInput.dataset.vaultonRevealExpires;

      if (isRevealed) {
        handleRevert();
      } else {
        const expires = Date.now() + REVEAL_DURATION_MS;
        targetInput.dataset.vaultonRevealExpires = expires.toString();
        targetInput.type = "text";
        updateState();
      }
    };

    updateState();
    revealBtn.addEventListener("click", handleToggle);

    const isPasswordInput =
      targetInput.type === "password" ||
      targetInput.autocomplete?.toLowerCase().includes("password") ||
      targetInput.autocomplete?.toLowerCase() === "current-password" ||
      targetInput.autocomplete?.toLowerCase() === "new-password" ||
      !!targetInput.dataset.vaultonRevealExpires;

    if (isPasswordInput) {
      toolsContainer.appendChild(revealBtn);
    }

    const showAllBtn = document.createElement("button");
    showAllBtn.textContent = "Show All";
    showAllBtn.className = "vaulton-btn vaulton-btn-primary";

    showAllBtn.addEventListener("click", (e) => {
      e.stopPropagation();
      onShowAll();
    });

    toolsContainer.appendChild(showAllBtn);
    header.appendChild(toolsContainer);
    return header;
  }

  private static createCredentialItem(
    cred: CredentialOption,
    onSelect: (cred: CredentialOption) => void,
  ): HTMLElement {
    const item = document.createElement("div");
    item.className = "vaulton-credential-item";
    item.style.cssText = PICKER_STYLES.CREDENTIAL_ITEM;

    item.innerHTML = `
      <div style="color: white; font-size: 1rem; font-weight: 600; margin-bottom: 0.25rem; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;">
        ${escapeHtml(cred.title)}
      </div>
      <div style="color: #d4d4d8; font-size: 1rem; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;">
        ${escapeHtml(cred.username)}
      </div>
    `;

    item.addEventListener("mouseenter", () => {
      item.style.background = "#27272a";
    });

    item.addEventListener("mouseleave", () => {
      item.style.background = "transparent";
    });

    item.addEventListener("click", (e) => {
      e.stopPropagation();
      onSelect(cred);
    });

    return item;
  }

  private static createGenerationItem(
    onGenerate: () => void,
    isRegistration?: boolean,
  ): HTMLElement {
    const item = document.createElement("div");
    item.className = "vaulton-credential-item vaulton-gen-item";

    const bg = isRegistration ? "#7c3aed" : "transparent";
    const hoverBg = isRegistration ? "#8b5cf6" : "#27272a";
    const textColor = "white";
    const subColor = isRegistration ? "#ddd6fe" : "#a1a1aa";

    item.style.cssText = `
      padding: 0.625rem 0.75rem;
      cursor: pointer;
      border-radius: 0.5rem;
      transition: all 0.2s;
      background: ${bg};
      display: flex;
      align-items: center;
      gap: 0.625rem;
    `;

    item.innerHTML = `
      <div style="flex-shrink: 0; color: ${textColor};">
        <svg style="width: 1.25rem; height: 1.25rem;" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" viewBox="0 0 24 24">
          <path d="M12 2v4m0 12v4M4.93 4.93l2.83 2.83m8.48 8.48l2.83 2.83M2 12h4m12 0h4M4.93 19.07l2.83-2.83m8.48-8.48l2.83-2.83M12 7c-2.76 0-5 2.24-5 5s2.24 5 5 5 5-2.24 5-5-2.24-5-5-5z"></path>
        </svg>
      </div>
      <div style="flex: 1;">
        <div style="color: ${textColor}; font-size: 1rem; font-weight: 600;">
          Generate Secure Password
        </div>
        <div style="color: ${subColor}; font-size: 0.875rem;">
          Created with high entropy
        </div>
      </div>
    `;

    item.addEventListener("mouseenter", () => {
      item.style.background = hoverBg;
    });

    item.addEventListener("mouseleave", () => {
      item.style.background = bg;
    });

    item.addEventListener("click", (e) => {
      e.stopPropagation();
      onGenerate();
    });

    return item;
  }
}
