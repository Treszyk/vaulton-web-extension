import { FormDetector, LoginForm, FormSubmitData } from "./form-detector";
import { ButtonInjector } from "./button-injector";
import { CredentialPicker, CredentialOption } from "./credential-picker";
import { AutofillEngine } from "./autofill-engine";
import { browserApi, StorageCore } from "../core/storage/storage-core";
import { THROTTLES } from "../core/config/throttles";
import { SavePrompt } from "./save-prompt";
import { getBaseDomain } from "../core/utils/domain";
import { generateSecurePassword } from "../core/crypto/password-utils";

let lastResetTime = 0;

function isContextInvalidated(error: any): boolean {
  const msg = error?.message || String(error);
  return (
    msg.includes("context invalidated") ||
    msg.includes("Extension context invalidated")
  );
}

export function resetAutoLockTimer(): void {
  const now = Date.now();
  if (now - lastResetTime < THROTTLES.ACTIVITY_RESET) return;

  lastResetTime = now;
  browserApi.runtime.sendMessage({ type: "RESET_TIMER" }).catch((e: any) => {
    if (isContextInvalidated(e)) {
      console.warn("[Vaulton] Extension context invalidated (timer reset).");
    }
  });
}

document.addEventListener("mousedown", resetAutoLockTimer);
document.addEventListener("keydown", resetAutoLockTimer);

console.log("[Vaulton] Content script initialized");

const formDetector = new FormDetector();
const buttonInjector = new ButtonInjector();
const credentialPicker = new CredentialPicker();
const autofillEngine = new AutofillEngine();
const savePrompt = new SavePrompt();

let pendingLoginState: { username: string; domain: string } | null = null;

function extractDomain(url: string): string {
  return getBaseDomain(url);
}

async function fetchCredentials(
  domain: string,
): Promise<{ credentials: CredentialOption[]; locked: boolean }> {
  const response = await browserApi.runtime.sendMessage({
    type: "GET_CREDENTIALS",
    payload: { domain },
  });

  if (response && response.success && response.data) {
    return response.data;
  }
  return { credentials: [], locked: false };
}

async function fetchAllCredentials(): Promise<{
  credentials: CredentialOption[];
  locked: boolean;
}> {
  const response = await browserApi.runtime.sendMessage({
    type: "GET_CREDENTIALS",
    payload: { domain: "" },
  });

  if (response && response.success && response.data) {
    return response.data;
  }
  return { credentials: [], locked: false };
}

async function handleButtonClick(
  form: LoginForm,
  targetInput: HTMLInputElement,
): Promise<void> {
  const domain = extractDomain(window.location.href);

  try {
    const response = await fetchCredentials(domain);

    if (response.locked) {
      credentialPicker.showLockedState(targetInput);
      return;
    }

    const handleSelect = (cred: CredentialOption) => {
      pendingLoginState = {
        username: cred.username,
        domain,
      };

      browserApi.runtime
        .sendMessage({
          type: "SET_PENDING_SAVE",
          payload: {
            domain,
            username: cred.username,
            password: "",
            action: "save",
          },
        })
        .catch((e: any) => {
          console.error("[Vaulton] Failed to set pending save:", e);
        });

      autofillEngine.fillCredentials(
        form.usernameInput,
        form.passwordInput,
        cred.username,
        cred.password,
        form.confirmPasswordInput,
      );
    };

    const handleGenerate = () => {
      const target = form.passwordInput || targetInput;

      if (
        target.readOnly ||
        target.disabled ||
        target.getAttribute("readonly") !== null ||
        target.getAttribute("disabled") !== null
      ) {
        return;
      }

      const newPassword = generateSecurePassword(20);
      autofillEngine.fillInput(target, newPassword);
      if (form.confirmPasswordInput) {
        autofillEngine.fillInput(form.confirmPasswordInput, newPassword);
      }
    };

    const handleShowAll = async () => {
      try {
        const allResponse = await fetchAllCredentials();
        if (allResponse.locked) {
          credentialPicker.showLockedState(targetInput);
          return;
        }

        credentialPicker.show(
          allResponse.credentials,
          targetInput,
          handleSelect,
          handleGenerate,
          undefined,
          undefined,
          form.isRegistration,
        );
      } catch (e) {
        if (isContextInvalidated(e)) {
          credentialPicker.showInvalidatedState(targetInput);
        }
      }
    };

    credentialPicker.show(
      response.credentials,
      targetInput,
      handleSelect,
      handleGenerate,
      handleShowAll,
      domain,
      form.isRegistration,
    );

    if (form.usernameInput) {
      pendingLoginState = {
        username: form.usernameInput.value,
        domain,
      };
    }
  } catch (e) {
    if (isContextInvalidated(e)) {
      credentialPicker.showInvalidatedState(targetInput);
    } else {
      console.error("[Vaulton] handleButtonClick error:", e);
    }
  }
}

function setupForm(form: LoginForm): void {
  if (form.usernameInput) {
    buttonInjector.injectButton(form.usernameInput, (target) =>
      handleButtonClick(form, target),
    );
  }
  if (form.passwordInput) {
    buttonInjector.injectButton(form.passwordInput, (target) =>
      handleButtonClick(form, target),
    );
  }

  formDetector.setupSubmitListener(form, handleFormSubmit);
}

async function handleFormSubmit(data: FormSubmitData): Promise<void> {
  console.log("[Vaulton] handleFormSubmit triggered");
  const currentUrl = window.location.href;
  const baseDomain = getBaseDomain(currentUrl);

  if (!baseDomain) {
    console.warn("[Vaulton] No base domain found for URL:", currentUrl);
    return;
  }

  let username = data.username;
  if (
    !username &&
    pendingLoginState &&
    pendingLoginState.domain === baseDomain
  ) {
    console.log("[Vaulton] Using stitched username from session state");
    username = pendingLoginState.username;
  }

  if (!username) {
    console.warn('[Vaulton] No username found, using "unknown" fallback');
    username = "unknown";
  }

  const exclusionsRes = await browserApi.runtime.sendMessage({
    type: "GET_EXCLUSIONS",
  });
  const exclusions: string[] = exclusionsRes?.data || [];
  if (exclusions.includes(baseDomain)) {
    console.log("[Vaulton] Domain is excluded from prompts:", baseDomain);
    return;
  }

  try {
    console.log(
      "[Vaulton] Notifying background of pending save for:",
      baseDomain,
    );
    await browserApi.runtime.sendMessage({
      type: "SET_PENDING_SAVE",
      payload: {
        domain: baseDomain,
        username: username,
        password: data.password,
        action: "save",
      },
    });
  } catch (e) {
    console.error("[Vaulton] Failed to set pending save:", e);
  }

  if (!data.password) {
    console.log(
      "[Vaulton] Stage 1 submission (username only), state preserved",
    );
    pendingLoginState = {
      username: username,
      domain: baseDomain,
    };
    return;
  }

  try {
    // console.log('[Vaulton] Checking existence for username:', username);
    const response = await browserApi.runtime.sendMessage({
      type: "CHECK_CREDENTIAL_EXISTS",
      payload: {
        domain: baseDomain,
        username: username,
        password: data.password,
      },
    });

    console.log("[Vaulton] Checked credential existence");

    if (response && response.success && response.data) {
      const { action } = response.data;

      if (action === "ignore") {
        console.log(
          "[Vaulton] Credential already exists, skipping save prompt.",
        );
        await clearStickyState(baseDomain);
        return;
      }

      if (action === "update") {
        await browserApi.runtime.sendMessage({
          type: "SET_PENDING_SAVE",
          payload: {
            domain: baseDomain,
            username: username,
            password: data.password,
            action: "update",
          },
        });
      }

      savePrompt.show(action, baseDomain, username, async (userAction) => {
        console.log("[Vaulton] Save prompt action:", userAction);
        await clearStickyState(baseDomain);

        if (userAction === "never") {
          await browserApi.runtime.sendMessage({
            type: "ADD_TO_EXCLUSIONS",
            payload: { domain: baseDomain },
          });
          return;
        }

        if (userAction === "save" || userAction === "update") {
          try {
            await browserApi.runtime.sendMessage({
              type: "SAVE_CREDENTIAL",
              payload: {
                domain: baseDomain,
                username: username,
                password: data.password,
              },
            });
          } catch (e) {
            console.error("[Vaulton] Failed to save credential:", e);
          }
        }
      });
    }
  } catch (e) {
    console.error("[Vaulton] Form submit handler error:", e);
  }
}

async function clearStickyState(domain: string): Promise<void> {
  pendingLoginState = null;
  await browserApi.runtime.sendMessage({
    type: "CLEAR_PENDING_SAVE",
    payload: { domain },
  });
}

async function initialize(): Promise<void> {
  console.log("[Vaulton] initialize() called");

  buttonInjector.removeAll();

  const currentUrl = window.location.href;
  const baseDomain = getBaseDomain(currentUrl);

  const autofillEnabled = await StorageCore.get(
    StorageCore.KEYS.AUTOFILL_ENABLED,
  );

  if (autofillEnabled === false) {
    console.log("[Vaulton] Autofill is disabled by user preference.");
    return;
  }

  console.log("[Vaulton] Checking pending saves for domain:", baseDomain);

  if (baseDomain) {
    const exclusionsRes = await browserApi.runtime.sendMessage({
      type: "GET_EXCLUSIONS",
    });
    const exclusions: string[] = exclusionsRes?.data || [];

    if (!exclusions.includes(baseDomain)) {
      const pendingResult = await browserApi.runtime.sendMessage({
        type: "GET_PENDING_SAVE",
        payload: { domain: baseDomain },
      });

      console.log("[Vaulton] Checked for pending saves");

      if (pendingResult && pendingResult.success && pendingResult.data) {
        const pending = pendingResult.data;
        console.log("[Vaulton] Recovered pending save from session");
        pendingLoginState = {
          username: pending.username,
          domain: pending.domain,
        };

        if (pending.password) {
          savePrompt.show(
            pending.action,
            pending.domain,
            pending.username,
            async (userAction) => {
              await clearStickyState(baseDomain);

              if (userAction === "never") {
                await browserApi.runtime.sendMessage({
                  type: "ADD_TO_EXCLUSIONS",
                  payload: { domain: baseDomain },
                });
                return;
              }

              if (userAction === "save" || userAction === "update") {
                await browserApi.runtime.sendMessage({
                  type: "SAVE_CREDENTIAL",
                  payload: {
                    domain: pending.domain,
                    username: pending.username,
                    password: pending.password,
                  },
                });
              }
            },
          );
        }
      } else {
        console.log("[Vaulton] No pending saves found.");
      }
    }
  }

  const forms = formDetector.detectForms();
  console.log("[Vaulton] About to setup", forms.length, "forms");

  forms.forEach((form, index) => {
    try {
      console.log(`[Vaulton] Setting up form ${index + 1}/${forms.length}`);
      setupForm(form);
    } catch (e) {
      console.error("[Vaulton] Error setting up form:", e);
    }
  });

  formDetector.observeForms((newForms) => {
    newForms.forEach(setupForm);
  });
}

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", initialize);
} else {
  initialize();
}
