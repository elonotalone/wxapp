/**
 * Mini-runtime that loads /src/ (a real WeChat mini program) and renders it
 * inside the browser using Vue 3 as the reactive engine.
 *
 * This is intentionally a small, hand-written subset; it is NOT a full
 * glass-easel port. The trade-off:
 *   + works today, no native compilation, no microtask hacks
 *   + /src/ stays a real mini program (uploads via miniprogram-ci unchanged)
 *   - subset of wxml syntax (wx:if, wx:for, bindtap, bindinput, data binding)
 *   - subset of wx.* (see wx-shim.ts)
 *
 * If we later need full fidelity, swap this file's WXML compiler for
 * glass-easel-template-compiler and let glass-easel render the result.
 */

import { reactive, defineComponent, h, type Component } from "vue";
import { wx as _wx } from "./wx-shim";

void _wx; // ensure shim is included so `globalThis.wx` is populated

type AnyObj = Record<string, any>;

interface PageDef {
  data?: AnyObj;
  [key: string]: any;
}
interface AppDef {
  globalData?: AnyObj;
  onLaunch?: () => void;
  [key: string]: any;
}

const registry: {
  app: AppDef | null;
  page: PageDef | null;
} = { app: null, page: null };

// Globals that mini-program source code expects.
(globalThis as any).App = (def: AppDef) => {
  registry.app = def;
};
(globalThis as any).Page = (def: PageDef) => {
  registry.page = def;
};
(globalThis as any).getApp = () => registry.app ?? {};

// ── WXML → Vue template compiler (subset) ───────────────────────────
// Strategy: regex-replace just enough wxml-isms to render via Vue 3.
//
//   {{ expr }}                ← keep as-is (Vue accepts it)
//   wx:if / wx:elif / wx:else → v-if / v-else-if / v-else
//   wx:for / wx:for-item / wx:for-index / wx:key
//                              → v-for="(item, index) in list" :key="..."
//   bindtap="fn"              → @tap="fn" (we register a 'tap' DOM event)
//   bindinput="fn"            → @input="fn"
//   catchtap="fn"             → @tap.stop.prevent="fn"
//   <view>/<text>/<button>/<input>/<image>/<scroll-view>
//                              → <div>/<span>/<button>/<input>/<img>/<div>
//                                (with sensible class fallbacks)
//
// We deliberately keep this small. Add cases as you hit them.

function wxmlToVue(wxml: string): string {
  let out = wxml;

  // bindXxx="fn"   → @xxx="fn"
  out = out.replace(/\bbind([A-Za-z]+)\s*=\s*(['"])([^'"]+)\2/g, '@$1="$3"');
  // catchXxx="fn"  → @xxx.stop.prevent="fn"
  out = out.replace(/\bcatch([A-Za-z]+)\s*=\s*(['"])([^'"]+)\2/g, '@$1.stop.prevent="$3"');

  // wx:if / wx:elif / wx:else
  out = out.replace(/\bwx:if\b/g, "v-if");
  out = out.replace(/\bwx:elif\b/g, "v-else-if");
  out = out.replace(/\bwx:else\b(?:="[^"]*")?/g, "v-else");

  // wx:for + wx:for-item + wx:for-index + wx:key on a single element
  out = out.replace(
    /<([a-z][\w-]*)\b([^>]*?)\swx:for\s*=\s*"\{\{\s*([^}]+?)\s*\}\}"([^>]*)>/g,
    (_m, tag, pre, listExpr, post) => {
      const itemMatch = (pre + post).match(/\swx:for-item\s*=\s*"([^"]+)"/);
      const idxMatch = (pre + post).match(/\swx:for-index\s*=\s*"([^"]+)"/);
      const keyMatch = (pre + post).match(/\swx:key\s*=\s*"([^"]+)"/);
      const itemName = itemMatch?.[1] ?? "item";
      const idxName = idxMatch?.[1] ?? "index";
      const keyName = keyMatch?.[1] ?? "index";
      const cleaned = (pre + post)
        .replace(/\swx:for-item\s*=\s*"[^"]+"/, "")
        .replace(/\swx:for-index\s*=\s*"[^"]+"/, "")
        .replace(/\swx:key\s*=\s*"[^"]+"/, "");
      const keyExpr = keyName === "index" || keyName === "*this" ? idxName : `${itemName}.${keyName}`;
      return `<${tag}${cleaned} v-for="(${itemName}, ${idxName}) in ${listExpr.trim()}" :key="${keyExpr}">`;
    }
  );

  // Tag remap: keep class/style intact; div for view/scroll-view, span for text
  out = out.replace(/<(\/?)view\b/g, "<$1div");
  out = out.replace(/<(\/?)scroll-view\b/g, "<$1div");
  out = out.replace(/<(\/?)text\b/g, "<$1span");
  out = out.replace(/<(\/?)block\b/g, "<$1template");
  // <image src="x" /> → <img :src="x" />
  out = out.replace(/<image\b([^>]*)\/>/g, "<img$1 />");
  out = out.replace(/<image\b([^>]*)>/g, "<img$1>");
  out = out.replace(/<\/image>/g, "");
  // <input value="{{x}}"> we keep but rewrite to :value (Vue) — already in
  // {{ }} form Vue can parse via prop binding, so convert:
  out = out.replace(/\svalue\s*=\s*"\{\{\s*([^}]+?)\s*\}\}"/g, ' :value="$1"');

  return `<div class="wxapp-root">${out}</div>`;
}

// ── WXSS → CSS (rpx → px conversion, screen-width responsive) ────────
// Real mini program: 750rpx == screen width. We approximate by mapping
// 750rpx → 375px (iPhone width). Caller can change this if needed.

function wxssToCss(wxss: string, rpxPerPx = 2): string {
  return wxss.replace(/(-?\d*\.?\d+)\s*rpx\b/g, (_m, n) => `${parseFloat(n) / rpxPerPx}px`);
}

// ── Wire mini program /src/ into a Vue root component ───────────────

async function loadProgram() {
  // Eagerly import source files via Vite glob so any change in /src/ hot reloads.
  const appWxss = (await import("@wxapp/app.wxss?raw")).default as string;
  const indexWxml = (await import("@wxapp/pages/index/index.wxml?raw")).default as string;
  const indexWxss = (await import("@wxapp/pages/index/index.wxss?raw")).default as string;
  // Run app.js + page js as side-effect modules; they call App(...) / Page(...)
  await import("@wxapp/app.js");
  await import("@wxapp/pages/index/index.js");
  return { appWxss, indexWxml, indexWxss };
}

function injectStyle(id: string, css: string) {
  let el = document.getElementById(id) as HTMLStyleElement | null;
  if (!el) {
    el = document.createElement("style");
    el.id = id;
    document.head.appendChild(el);
  }
  el.textContent = css;
}

export async function bootPage(rpxPerPx = 2): Promise<Component> {
  const { appWxss, indexWxml, indexWxss } = await loadProgram();

  injectStyle("wxapp-app-wxss", wxssToCss(appWxss, rpxPerPx));
  injectStyle("wxapp-page-wxss", wxssToCss(indexWxss, rpxPerPx));

  registry.app?.onLaunch?.();

  const pageDef = registry.page ?? {};
  const initialData = JSON.parse(JSON.stringify(pageDef.data ?? {}));

  const template = wxmlToVue(indexWxml);

  return defineComponent({
    name: "WxappIndexPage",
    template,
    setup() {
      const state = reactive(initialData);

      const ctx: any = {
        data: state,
        setData(patch: AnyObj, cb?: () => void) {
          Object.assign(state, patch);
          if (cb) Promise.resolve().then(cb);
        },
      };

      const methods: AnyObj = {};
      for (const [key, val] of Object.entries(pageDef)) {
        if (key === "data") continue;
        if (typeof val === "function") {
          methods[key] = (e: any) => val.call(ctx, e);
        } else {
          ctx[key] = val;
        }
      }
      pageDef.onLoad?.call(ctx, {});
      pageDef.onShow?.call(ctx);

      return { ...methods, ...state, __ctx: ctx };
    },
  });
}

// Helper for App.vue to know the screen frame style.
export const FRAME = {
  width: 375,
  height: 812,
};

export { h };
