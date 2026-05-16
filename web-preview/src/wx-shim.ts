/**
 * Minimal wx.* runtime shim for browser preview.
 *
 * This is INTENTIONALLY incomplete. It exposes only enough surface for
 * vibe-coding UI work in the dashboard preview iframe. Anything that
 * touches WeChat-specific capabilities (login, payment, subscribe message,
 * scan code, getUserProfile, etc.) is stubbed with a console warning and
 * a rejected/empty result — those need to be tested on a real device via
 * miniprogram-ci preview QR code.
 *
 * The shape matches the real wx.* enough that the same /src/ source tree
 * can be uploaded to WeChat unchanged.
 */

type Cb<T> = (res: T) => void;

function notImplemented(name: string) {
  return (opts: any = {}) => {
    console.warn(`[wx-shim] wx.${name} is not implemented in browser preview.`);
    opts?.fail?.({ errMsg: `${name}:fail not supported in browser preview` });
    opts?.complete?.({ errMsg: `${name}:complete (browser preview)` });
  };
}

const storage = {
  setSync(key: string, value: any) {
    try {
      localStorage.setItem(`wx:${key}`, JSON.stringify(value));
    } catch {}
  },
  getSync(key: string) {
    try {
      const raw = localStorage.getItem(`wx:${key}`);
      return raw === null ? "" : JSON.parse(raw);
    } catch {
      return "";
    }
  },
  removeSync(key: string) {
    try {
      localStorage.removeItem(`wx:${key}`);
    } catch {}
  },
};

export const wx = {
  // Storage
  setStorageSync: storage.setSync,
  getStorageSync: storage.getSync,
  removeStorageSync: storage.removeSync,
  setStorage(opts: { key: string; data: any; success?: Cb<any>; fail?: Cb<any> }) {
    storage.setSync(opts.key, opts.data);
    opts.success?.({ errMsg: "setStorage:ok" });
  },
  getStorage(opts: { key: string; success?: Cb<any>; fail?: Cb<any> }) {
    const data = storage.getSync(opts.key);
    if (data === "") {
      opts.fail?.({ errMsg: "getStorage:fail data not found" });
    } else {
      opts.success?.({ data, errMsg: "getStorage:ok" });
    }
  },

  // System info
  getSystemInfoSync() {
    return {
      brand: "browser",
      model: "OceanDino Dashboard Preview",
      pixelRatio: window.devicePixelRatio || 1,
      screenWidth: window.innerWidth,
      screenHeight: window.innerHeight,
      windowWidth: window.innerWidth,
      windowHeight: window.innerHeight,
      statusBarHeight: 0,
      language: navigator.language,
      version: "preview",
      system: "Web",
      platform: "browser",
      SDKVersion: "preview-0.1",
    };
  },

  // Toast / modal — keep it minimal but visually correct
  showToast(opts: { title: string; icon?: string; duration?: number; success?: Cb<any> }) {
    const wrap = document.createElement("div");
    wrap.textContent = opts.title;
    wrap.style.cssText =
      "position:fixed;top:50%;left:50%;transform:translate(-50%,-50%);padding:14px 22px;background:rgba(0,0,0,0.75);color:#fff;border-radius:10px;font-size:14px;z-index:9999;pointer-events:none;transition:opacity .2s";
    document.body.appendChild(wrap);
    setTimeout(() => {
      wrap.style.opacity = "0";
      setTimeout(() => wrap.remove(), 250);
    }, opts.duration ?? 1500);
    opts.success?.({ errMsg: "showToast:ok" });
  },
  showModal(opts: {
    title?: string;
    content?: string;
    confirmText?: string;
    cancelText?: string;
    showCancel?: boolean;
    success?: Cb<{ confirm: boolean; cancel: boolean }>;
  }) {
    const confirm = window.confirm(`${opts.title ?? ""}\n\n${opts.content ?? ""}`);
    opts.success?.({ confirm, cancel: !confirm });
  },

  // Network — pass-through to fetch
  request(opts: {
    url: string;
    method?: string;
    data?: any;
    header?: Record<string, string>;
    success?: Cb<any>;
    fail?: Cb<any>;
    complete?: Cb<any>;
  }) {
    const init: RequestInit = {
      method: opts.method ?? "GET",
      headers: opts.header,
    };
    if (opts.data !== undefined && init.method !== "GET") {
      init.body =
        typeof opts.data === "string" ? opts.data : JSON.stringify(opts.data);
    }
    fetch(opts.url, init)
      .then(async (res) => {
        const text = await res.text();
        let data: any = text;
        try {
          data = JSON.parse(text);
        } catch {}
        opts.success?.({ statusCode: res.status, data, header: {}, errMsg: "request:ok" });
        opts.complete?.({ errMsg: "request:ok" });
      })
      .catch((err) => {
        opts.fail?.({ errMsg: `request:fail ${err}` });
        opts.complete?.({ errMsg: "request:fail" });
      });
  },

  // Navigation — single-page preview, so these mostly log
  navigateTo: notImplemented("navigateTo"),
  redirectTo: notImplemented("redirectTo"),
  switchTab: notImplemented("switchTab"),
  reLaunch: notImplemented("reLaunch"),
  navigateBack: notImplemented("navigateBack"),

  // WeChat capabilities — DELIBERATELY not implemented
  login: notImplemented("login"),
  getUserProfile: notImplemented("getUserProfile"),
  requestPayment: notImplemented("requestPayment"),
  requestSubscribeMessage: notImplemented("requestSubscribeMessage"),
  scanCode: notImplemented("scanCode"),
  chooseImage: notImplemented("chooseImage"),
  chooseMedia: notImplemented("chooseMedia"),

  // Lifecycle helpers
  nextTick(fn: () => void) {
    Promise.resolve().then(fn);
  },
} as const;

// Globalize so wxapp /src/ JS that uses `wx.xxx` works without imports.
(globalThis as any).wx = wx;
