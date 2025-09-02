"use strict";
(() => {
  // utils/color.ts
  function relativeLuminance(rgb) {
    const srgb = [rgb.r, rgb.g, rgb.b].map((v) => {
      const c = clamp01(v);
      return c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
    });
    return 0.2126 * srgb[0] + 0.7152 * srgb[1] + 0.0722 * srgb[2];
  }
  function contrastRatio(fg, bg) {
    const L1 = relativeLuminance(fg);
    const L2 = relativeLuminance(bg);
    const [a, b] = L1 > L2 ? [L1, L2] : [L2, L1];
    return (a + 0.05) / (b + 0.05);
  }
  function clamp01(v) {
    return Math.max(0, Math.min(1, v));
  }
  function solidPaintToRGB(paint) {
    var _a;
    if (paint.type !== "SOLID" || paint.visible === false) return null;
    const { r, g, b } = paint.color;
    const opacity = (_a = paint.opacity) != null ? _a : 1;
    return { r: r * opacity + (1 - opacity), g: g * opacity + (1 - opacity), b: b * opacity + (1 - opacity) };
  }
  function firstSolidFromFills(node) {
    const fills = node.fills;
    if (fills === figma.mixed || !fills || !Array.isArray(fills)) return null;
    for (const p of fills) {
      if (p.type === "SOLID" && p.visible !== false) {
        return solidPaintToRGB(p);
      }
    }
    return null;
  }
  function estimateBackgroundRGB(node) {
    let current = node.parent;
    while (current && current.type !== "PAGE") {
      const geom = current;
      if (geom.fills && geom.fills !== figma.mixed && Array.isArray(geom.fills)) {
        for (const p of geom.fills) {
          if (p.type === "SOLID" && p.visible !== false) {
            const rgb = solidPaintToRGB(p);
            if (rgb) return { rgb, source: `parent:${current.name}` };
          }
        }
      }
      current = current.parent;
    }
    return { rgb: { r: 1, g: 1, b: 1 }, source: "default:white" };
  }

  // utils/ruleEngine.ts
  function ts() {
    return (/* @__PURE__ */ new Date()).toISOString();
  }
  function isImageLike(node) {
    const geom = node;
    if (geom.fills && geom.fills !== figma.mixed && Array.isArray(geom.fills)) {
      return geom.fills.some((p) => p.type === "IMAGE");
    }
    return node.type === "RECTANGLE" || node.type === "ELLIPSE" || node.type === "POLYGON" || node.type === "STAR";
  }
  function collectNodesWithin(frames) {
    const nodes = [];
    for (const f of frames) {
      f.findAll((n) => {
        if (n.type === "TEXT" || n.type === "FRAME" || n.type === "GROUP" || n.type === "VECTOR" || n.type === "RECTANGLE" || n.type === "ELLIPSE" || n.type === "POLYGON" || n.type === "STAR" || n.type === "INSTANCE" || n.type === "COMPONENT" || n.type === "COMPONENT_SET") {
          nodes.push(n);
        }
        return false;
      });
    }
    return nodes;
  }
  function aaThreshold() {
    return 4.5;
  }
  function checkContrast(node, frameName, map) {
    const fg = firstSolidFromFills(node);
    const bgEst = estimateBackgroundRGB(node);
    if (!fg) {
      return {
        timestamp: ts(),
        frameName,
        nodeId: node.id,
        nodeName: node.name,
        issueType: "contrast",
        severity: "warning",
        details: "\u524D\u666F\u8272\uFF08Solid\uFF09\u304C\u53D6\u5F97\u3067\u304D\u307E\u305B\u3093\u3002\u30B0\u30E9\u30C7\u30FC\u30B7\u30E7\u30F3/\u753B\u50CF/\u30DF\u30C3\u30AF\u30B9\u306E\u53EF\u80FD\u6027\u3002",
        suggestedFix: "\u5358\u4E00\u306ESolid\u5857\u308A\u304B\u3001\u80CC\u666F\u3068\u306E\u30B3\u30F3\u30C8\u30E9\u30B9\u30C8\u304C\u5341\u5206\u304B\u3092\u78BA\u8A8D\u3057\u3066\u304F\u3060\u3055\u3044\u3002",
        JISClauseId: map.contrast
      };
    }
    const ratio = contrastRatio(fg, bgEst.rgb);
    const threshold = aaThreshold();
    if (ratio < threshold) {
      return {
        timestamp: ts(),
        frameName,
        nodeId: node.id,
        nodeName: node.name,
        issueType: "contrast",
        severity: "error",
        details: `\u30B3\u30F3\u30C8\u30E9\u30B9\u30C8\u6BD4=${ratio.toFixed(2)}\uFF08\u95BE\u5024=${threshold}\uFF09\u3002\u80CC\u666F\u63A8\u5B9A=${bgEst.source}`,
        suggestedFix: "\u524D\u666F/\u80CC\u666F\u306E\u8272\u3092\u8ABF\u6574\u3057\u3066\u30B3\u30F3\u30C8\u30E9\u30B9\u30C8\u6BD4\u3092\u4E0A\u3052\u3066\u304F\u3060\u3055\u3044\uFF08AA>=4.5\uFF09\u3002",
        JISClauseId: map.contrast
      };
    }
    return null;
  }
  function checkAltText(node, frameName, map) {
    if (!(node.type === "VECTOR" || isImageLike(node))) return null;
    const desc = node.description || "";
    if (desc.trim().length === 0) {
      return {
        timestamp: ts(),
        frameName,
        nodeId: node.id,
        nodeName: node.name,
        issueType: "altText",
        severity: "error",
        details: "\u4EE3\u66FF\u30C6\u30AD\u30B9\u30C8\uFF08description\uFF09\u304C\u672A\u8A2D\u5B9A\u3067\u3059\u3002",
        suggestedFix: "\u30CE\u30FC\u30C9\u306Edescription\u306B\u5185\u5BB9\u3092\u8981\u7D04\u3057\u305F\u4EE3\u66FF\u30C6\u30AD\u30B9\u30C8\u3092\u8A2D\u5B9A\u3057\u3066\u304F\u3060\u3055\u3044\u3002",
        JISClauseId: map.altText
      };
    }
    return null;
  }
  function checkTouchTarget(node, frameName, map) {
    const w = node.width;
    const h = node.height;
    if (typeof w !== "number" || typeof h !== "number") return null;
    if (w < 44 || h < 44) {
      return {
        timestamp: ts(),
        frameName,
        nodeId: node.id,
        nodeName: node.name,
        issueType: "touchTarget",
        severity: "error",
        details: `\u30B5\u30A4\u30BA\u4E0D\u8DB3\uFF1A${Math.round(w)}x${Math.round(h)}px\u3002\u6700\u5C0F44x44px\u3092\u63A8\u5968\u3002`,
        suggestedFix: "\u30DC\u30BF\u30F3/\u30EA\u30F3\u30AF\u7B49\u306F44x44px\u4EE5\u4E0A\u306E\u30BF\u30C3\u30C1\u30BF\u30FC\u30B2\u30C3\u30C8\u3092\u78BA\u4FDD\u3057\u3066\u304F\u3060\u3055\u3044\u3002",
        JISClauseId: map.touchTarget
      };
    }
    return null;
  }
  async function analyzeSelection(frames, jisMap) {
    const nodes = collectNodesWithin(frames);
    const rows = [];
    let errorCount = 0;
    let warnCount = 0;
    const perType = { contrast: 0, altText: 0, touchTarget: 0 };
    const frameName = frames.length === 1 ? frames[0].name : `${frames.length} frames`;
    for (const n of nodes) {
      for (const rule of [checkContrast, checkAltText, checkTouchTarget]) {
        try {
          const issue = rule(n, frameName, jisMap);
          if (issue) {
            rows.push(issue);
            perType[issue.issueType] = (perType[issue.issueType] || 0) + 1;
            if (issue.severity === "error") errorCount++;
            if (issue.severity === "warning") warnCount++;
          }
        } catch (e) {
          rows.push({
            timestamp: ts(),
            frameName,
            nodeId: n.id,
            nodeName: n.name,
            issueType: "contrast",
            severity: "warning",
            details: `\u30EB\u30FC\u30EB\u8A55\u4FA1\u4E2D\u306B\u4F8B\u5916: ${e.message}`,
            suggestedFix: "\u5BFE\u8C61\u30CE\u30FC\u30C9\u306E\u5857\u308A/\u30B5\u30A4\u30BA/description\u3092\u78BA\u8A8D\u3057\u3066\u304F\u3060\u3055\u3044\u3002",
            JISClauseId: jisMap.contrast
          });
          warnCount++;
        }
      }
    }
    return {
      rows,
      nodeCount: nodes.length,
      errorCount,
      warnCount,
      perType,
      frameName
    };
  }

  // rules/jis_mapping.json
  var jis_mapping_default = {
    contrast: "JIS8341-3: WCAG 1.4.3 / 1.4.11 \u6E96\u62E0\uFF08AA\uFF09",
    altText: "JIS8341-3: 1.1.1 \u975E\u30C6\u30AD\u30B9\u30C8\u30B3\u30F3\u30C6\u30F3\u30C4",
    touchTarget: "JIS8341-3: 2.5.5 \u30BF\u30FC\u30B2\u30C3\u30C8\u306E\u30B5\u30A4\u30BA\uFF08\u53C2\u8003\uFF09/ JIS\u9644\u5C5E\u66F8 \u56FD\u5185\u904B\u7528\u6CE8\u8A18\uFF08\u30C0\u30DF\u30FC\uFF09",
    meta: {
      jisVersion: "JIS X 8341-3:2016\uFF08\u30C0\u30DF\u30FC\uFF09",
      wcagVersion: "WCAG 2.1\uFF08\u30C0\u30DF\u30FC\uFF09"
    }
  };

  // code.ts
  function showUI() {
    figma.showUI(__html__, { width: 380, height: 460, themeColors: true });
  }
  function warnUI(message) {
    figma.ui.postMessage({ type: "warning", message });
  }
  async function runInspection(inspector) {
    const selection = figma.currentPage.selection;
    const frames = selection.filter((n) => n.type === "FRAME");
    if (frames.length === 0) {
      warnUI("\u30D5\u30EC\u30FC\u30E0\u30921\u3064\u4EE5\u4E0A\u9078\u629E\u3057\u3066\u304F\u3060\u3055\u3044\u3002");
      return;
    }
    try {
      const { rows, nodeCount, perType, errorCount, warnCount, frameName } = await analyzeSelection(
        frames,
        jis_mapping_default
      );
      const summary = {
        nodeCount,
        errorCount,
        warnCount,
        perType,
        frameName,
        fileKey: figma.fileKey,
        pageName: figma.currentPage.name,
        ruleVersions: {
          JIS: "JIS X 8341-3\uFF08\u30C0\u30DF\u30FC\u7248\u60C5\u5831\uFF09",
          WCAG: "WCAG 2.1 AA\uFF08\u30C0\u30DF\u30FC\uFF09"
        }
      };
      const payload = {
        rows,
        summary,
        inspector: inspector || ""
      };
      figma.ui.postMessage({ type: "summary", payload });
    } catch (err) {
      console.error(err);
      warnUI("\u691C\u67FB\u4E2D\u306B\u30A8\u30E9\u30FC\u304C\u767A\u751F\u3057\u307E\u3057\u305F\u3002\u8A73\u7D30\u306F\u30B3\u30F3\u30BD\u30FC\u30EB\u3092\u78BA\u8A8D\u3057\u3066\u304F\u3060\u3055\u3044\u3002");
    }
  }
  figma.on("run", () => {
    showUI();
    runInspection();
  });
  figma.ui.onmessage = (msg) => {
    if (msg.type === "reinspect") {
      runInspection(msg.inspector);
    }
  };
})();
