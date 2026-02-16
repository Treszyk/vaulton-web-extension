export const PICKER_STYLES = {
  CONTAINER: `
    position: absolute !important;
    background: #18181b !important;
    border: 0.0625rem solid #27272a !important;
    border-radius: 0.75rem !important;
    padding: 0 !important;
    margin: 0 !important;
    box-sizing: border-box !important;
    min-width: 0 !important;
    max-height: 26.25rem !important;
    z-index: 999999 !important;
    box-shadow: 0 0.625rem 2.5rem rgba(0, 0, 0, 0.5) !important;
    font-family: 'Inter', -apple-system, BlinkMacSystemFont, sans-serif !important;
    animation: vaultonPickerSlideIn 0.2s ease-out !important;
    display: flex !important;
    flex-direction: column !important;
    overflow: hidden !important;
  `,
  LOCKED_CONTAINER: `
    position: absolute !important;
    background: #18181b !important;
    border: 0.0625rem solid #27272a !important;
    border-radius: 0.75rem !important;
    padding: 1rem !important;
    margin: 0 !important;
    box-sizing: border-box !important;
    z-index: 999999 !important;
    box-shadow: 0 0.625rem 2.5rem rgba(0, 0, 0, 0.5) !important;
    font-family: 'Inter', -apple-system, BlinkMacSystemFont, sans-serif !important;
    animation: vaultonPickerSlideIn 0.2s ease-out !important;
    display: flex !important;
    flex-direction: column !important;
    overflow: hidden !important;
    color: white !important;
    text-align: center !important;
  `,
  LIST_CONTAINER: `
    padding: 0.5rem;
    overflow-y: auto;
    overflow-x: hidden;
    flex: 1;
    min-height: 0;
    margin-right: 0.125rem;
    max-height: 20rem !important;
  `,
  FOOTER: `
    padding: 0.5rem;
    border-top: 0.0625rem solid #27272a;
    background: #18181b;
    border-bottom-left-radius: 0.75rem;
    border-bottom-right-radius: 0.75rem;
  `,
  HEADER: `
    padding: 0.75rem 0.75rem 0.5rem 0.75rem;
    border-bottom: 0.0625rem solid #27272a;
    display: flex;
    justify-content: space-between;
    align-items: center;
  `,
  CREDENTIAL_ITEM: `
    padding: 0.625rem 0.75rem;
    cursor: pointer;
    border-radius: 0.5rem;
    transition: background 0.15s;
    margin-bottom: 0.25rem;
  `,
  SCROLLBAR_CSS: `
    ::-webkit-scrollbar {
      width: 0.375rem;
    }
    ::-webkit-scrollbar-track {
      background: transparent;
    }
    ::-webkit-scrollbar-thumb {
      background: #3f3f46;
      border-radius: 0.375rem;
    }
    ::-webkit-scrollbar-thumb:hover {
      background: #52525b;
    }
  `,
  HEADER_BTN_CSS: `
    .vaulton-btn {
      box-sizing: border-box;
      padding: 0 0.75rem;
      height: 1.75rem;
      border-radius: 0.5rem;
      font-family: 'Inter', system-ui, sans-serif;
      font-size: 0.875rem;
      font-weight: 600;
      text-transform: uppercase;
      letter-spacing: 0.05em;
      cursor: pointer;
      transition: all 0.2s;
      display: flex;
      align-items: center;
      justify-content: center;
      white-space: nowrap;
      font-variant-numeric: tabular-nums;
      border-width: 0.0625rem;
      border-style: solid;
    }
    .vaulton-btn-secondary {
      background: transparent;
      color: #e4e4e7;
      border-color: #3f3f46;
    }
    .vaulton-btn-secondary:hover {
      background: rgba(255, 255, 255, 0.05);
      border-color: #52525b;
    }
    .vaulton-btn-primary {
      background: #7c3aed;
      color: white;
      border-color: #7c3aed;
    }
    .vaulton-btn-primary:hover {
      background: #8b5cf6;
      border-color: #8b5cf6;
    }
    .vaulton-btn-reveal {
      width: 8rem;
    }
    .vaulton-credential-picker[data-vaulton-narrow="true"] .vaulton-header {
      flex-direction: column;
      align-items: stretch;
      gap: 0.75rem;
    }
    .vaulton-credential-picker[data-vaulton-narrow="true"] .vaulton-header-tools {
      flex-direction: column;
      align-items: stretch;
      width: 100%;
    }
    .vaulton-credential-picker[data-vaulton-narrow="true"] .vaulton-btn {
      width: 100%;
    }
  `,
};
