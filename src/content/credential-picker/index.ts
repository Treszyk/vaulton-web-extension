import { CredentialOption } from "./types";
import { PickerUI } from "./picker-ui";
import { OverlayManager } from "../overlay-manager";

export type { CredentialOption };

export class CredentialPicker {
  private element: HTMLElement | null = null;
  private repositionListener: (() => void) | null = null;
  private intersectionObserver: IntersectionObserver | null = null;
  private initialSide: "top" | "bottom" = "bottom";
  private initialMaxHeight: number = 420;

  show(
    credentials: CredentialOption[],
    targetInput: HTMLInputElement,
    onSelect: (cred: CredentialOption) => void,
    onGenerate: () => void,
    onShowAll?: () => void,
    domain?: string,
    isRegistration?: boolean,
  ): void {
    this.hide();

    const handleSelect = (cred: CredentialOption) => {
      onSelect(cred);
      this.hide();
    };

    const handleGenerate = () => {
      onGenerate();
      this.hide();
    };

    const picker = PickerUI.create(
      credentials,
      handleSelect,
      handleGenerate,
      onShowAll,
      domain,
      isRegistration,
      targetInput,
    );

    const shadow = OverlayManager.getShadowRoot();
    shadow.appendChild(picker);
    this.element = picker;

    this.determineInitialPosition(targetInput);
    this.setupStickyListeners(picker, targetInput);
    this.positionPicker(picker, targetInput);

    const handleOutsideClick = (e: MouseEvent) => {
      if (!e.composedPath().includes(picker)) {
        this.hide();
        window.removeEventListener("click", handleOutsideClick, {
          capture: true,
        });
      }
    };

    setTimeout(() => {
      window.addEventListener("click", handleOutsideClick, { capture: true });
    }, 100);
  }

  showLockedState(targetInput: HTMLInputElement): void {
    this.hide();

    const picker = PickerUI.createLockedState();
    const shadow = OverlayManager.getShadowRoot();
    shadow.appendChild(picker);
    this.element = picker;

    this.determineInitialPosition(targetInput);
    this.setupStickyListeners(picker, targetInput);
    this.positionPicker(picker, targetInput);

    const handleOutsideClick = (e: MouseEvent) => {
      if (!e.composedPath().includes(picker)) {
        this.hide();
        window.removeEventListener("click", handleOutsideClick, {
          capture: true,
        });
      }
    };

    setTimeout(() => {
      window.addEventListener("click", handleOutsideClick, { capture: true });
    }, 100);
  }

  showInvalidatedState(targetInput: HTMLInputElement): void {
    this.hide();

    const picker = PickerUI.createInvalidatedState();
    const shadow = OverlayManager.getShadowRoot();
    shadow.appendChild(picker);
    this.element = picker;

    this.determineInitialPosition(targetInput);
    this.setupStickyListeners(picker, targetInput);
    this.positionPicker(picker, targetInput);

    const handleOutsideClick = (e: MouseEvent) => {
      if (!e.composedPath().includes(picker)) {
        this.hide();
        window.removeEventListener("click", handleOutsideClick, {
          capture: true,
        });
      }
    };

    setTimeout(() => {
      window.addEventListener("click", handleOutsideClick, { capture: true });
    }, 100);
  }

  hide(): void {
    if (this.repositionListener) {
      window.removeEventListener("scroll", this.repositionListener, {
        capture: true,
      });
      window.removeEventListener("resize", this.repositionListener, {
        capture: true,
      });
      this.repositionListener = null;
    }

    if (this.intersectionObserver) {
      this.intersectionObserver.disconnect();
      this.intersectionObserver = null;
    }

    const el = this.element;
    if (el) {
      this.element = null;
      el.style.setProperty(
        "animation",
        "vaultonPickerSlideOut 0.2s ease-in forwards",
        "important",
      );
      el.addEventListener("animationend", () => el.remove(), { once: true });
      setTimeout(() => el.remove(), 250);
    }
  }

  private setupStickyListeners(
    picker: HTMLElement,
    targetInput: HTMLInputElement,
  ): void {
    this.repositionListener = () => this.positionPicker(picker, targetInput);
    window.addEventListener("scroll", this.repositionListener, {
      capture: true,
      passive: true,
    });
    window.addEventListener("resize", this.repositionListener, {
      capture: true,
      passive: true,
    });

    this.intersectionObserver = new IntersectionObserver(
      (entries) => {
        if (!entries[0].isIntersecting && this.element) {
          this.hide();
        }
      },
      { threshold: 0 },
    );
    this.intersectionObserver.observe(targetInput);
  }

  private determineInitialPosition(targetInput: HTMLInputElement): void {
    const visualContainer = this.findVisualContainer(targetInput);
    const rect = visualContainer.getBoundingClientRect();
    const spaceBelow = window.innerHeight - rect.bottom;
    const spaceAbove = rect.top;

    const fontSize =
      parseFloat(window.getComputedStyle(document.documentElement).fontSize) ||
      16;
    const maxHeightRem = 26.25;
    const maxHeightPx = maxHeightRem * fontSize;

    if (spaceBelow < 250 && spaceAbove > spaceBelow) {
      this.initialSide = "top";
      this.initialMaxHeight = spaceAbove - 10;
    } else {
      this.initialSide = "bottom";
      this.initialMaxHeight = Math.min(maxHeightPx, spaceBelow - 10);
    }
  }

  private findVisualContainer(input: HTMLInputElement): HTMLElement {
    let current: HTMLElement | null = input.parentElement;

    for (let i = 0; i < 3; i++) {
      if (!current) break;

      const className = current.className || "";
      const isFuiInput = className.includes("fui-Input");
      const isFormControl = className.includes("form-control");
      const isInputWrapper =
        className.includes("input-wrapper") ||
        className.includes("field-wrapper");

      if (isFuiInput || isFormControl || isInputWrapper) {
        return current;
      }

      const parentRect = current.getBoundingClientRect();
      const inputRect = input.getBoundingClientRect();

      if (
        parentRect.width > inputRect.width + 10 &&
        parentRect.height < inputRect.height + 20
      ) {
        return current;
      }

      current = current.parentElement;
    }

    return input;
  }

  private positionPicker(
    picker: HTMLElement,
    targetInput: HTMLInputElement,
  ): void {
    const visualContainer = this.findVisualContainer(targetInput);
    const rect = visualContainer.getBoundingClientRect();

    picker.style.setProperty("position", "fixed", "important");
    picker.style.setProperty(
      "max-height",
      `${this.initialMaxHeight}px`,
      "important",
    );

    if (this.initialSide === "top") {
      picker.style.setProperty(
        "bottom",
        `${window.innerHeight - rect.top + 4}px`,
        "important",
      );
      picker.style.removeProperty("top");
    } else {
      picker.style.setProperty("top", `${rect.bottom + 4}px`, "important");
      picker.style.removeProperty("bottom");
    }

    picker.style.setProperty("left", `${rect.left}px`, "important");
    picker.style.setProperty("width", `${rect.width}px`, "important");

    if (rect.width < 350) {
      picker.setAttribute("data-vaulton-narrow", "true");
    } else {
      picker.removeAttribute("data-vaulton-narrow");
    }
  }
}
