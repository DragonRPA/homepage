#!/usr/bin/env node
"use strict";

/**
 * www.dragonrpa.co.kr/erp 코드 파일 및 파일별 기능 명세서(SSOT) 생성·검증·영향도 조회 엔진
 *
 * 사용법:
 *   node scripts/generate_code_file_spec.cjs --sync
 *   node scripts/generate_code_file_spec.cjs --verify
 *   node scripts/generate_code_file_spec.cjs --query <검색어>
 */

const fs = require("fs");
const path = require("path");
const crypto = require("crypto");
const ts = require("typescript");

const ROOT_DIR = path.resolve(__dirname, "..");
const DOCS_DIR = path.join(ROOT_DIR, "docs");
const MANIFEST_PATH = path.join(DOCS_DIR, "code_file_manifest.json");
const SPEC_MD_PATH = path.join(DOCS_DIR, "CODE_FILE_SPECIFICATION.md");
const DESCRIPTIONS_PATH = path.join(__dirname, "code_file_descriptions.cjs");

const FORBIDDEN_MODIFIERS = [
  "실시간",
  "강력한",
  "스마트",
  "완벽한",
  "완벽히",
  "원클릭",
  "자유롭게",
  "비주얼",
  "직통",
  "영구보존",
  "직관적인",
  "편리한",
  "혁신적인",
  "손쉽게",
  "깔끔한",
];

const SENSITIVE_PATTERNS = [
  /postgres(?:ql)?:\/\/[^\s"'`]+/i,
  /BKK5s3E1ydVKx6qJ/i,
  /eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9\.[A-Za-z0-9_-]+/,
  /gsk_[A-Za-z0-9]{20,}/,
];

const EXCLUDE_ERP_IDENTIFIERS = new Set([
  "erp_approval_rules_dept_head_ssot_v1",
  "erp_bank_closing_schema_v1",
  "erp_cloud_shares_schema_v1",
  "erp_core_indexes_v1",
  "erp_corporate_docs_schema_v1",
  "erp_employment_contracts_schema_v1",
  "erp_expenses_schema_v1",
  "erp_financial_report_schema_v2",
  "erp_gov_support_schema_v2",
  "erp_obsidian_schema_v1",
  "erp_partner_nts_schema_v1",
  "erp_partners_partner_code_key",
  "erp_permissions_defaults_v1",
  "erp_rental_directory_schema_v1",
  "erp_security_audit_logs_v1",
  "erp_shareholder_registry_v1",
  "erp_tax_payments_electronic_pay_no_key",
  "erp_tax_payments_epay_date_amt_key",
  "erp_work_improvements_schema_v2",
  "erp_schema_cache",
]);

const KNOWN_CORE_TABLES = new Set([
  "employees",
  "leave_requests",
  "overtimes",
  "document_folders",
  "documents",
  "assets",
  "asset_logs",
  "contracts",
  "dispatches",
  "contract_history",
  "consumable_items",
  "consumable_logs",
  "invoices",
  "tax_invoices",
  "orders",
  "licenses",
  "license_activations",
  "products",
  "product_plans",
]);

const ERP_LIB_PREFIX_PATTERN =
  /^src\/lib\/(?:erp|forklift|rental|trade|ibk|popbill|partnerStatus|piiCrypto|r2Erp|supabaseErp|businessEntities|hangulSearch|groqServerKey|db\b)/;

function toPosix(p) {
  return p.split(path.sep).join("/");
}

function walkRelativeFiles(relDir) {
  const absDir = path.join(ROOT_DIR, relDir);
  if (!fs.existsSync(absDir)) return [];
  const results = [];
  const entries = fs.readdirSync(absDir, { withFileTypes: true });
  for (const entry of entries) {
    const relPath = relDir ? `${relDir}/${entry.name}` : entry.name;
    if (entry.isDirectory()) {
      results.push(...walkRelativeFiles(relPath));
    } else if (entry.isFile()) {
      results.push(toPosix(relPath));
    }
  }
  return results.sort();
}

function getScriptKind(filePath) {
  if (filePath.endsWith(".tsx")) return ts.ScriptKind.TSX;
  if (filePath.endsWith(".ts")) return ts.ScriptKind.TS;
  if (filePath.endsWith(".jsx")) return ts.ScriptKind.JSX;
  return ts.ScriptKind.JS;
}

function resolveInternalModule(fromFile, specifier, allKnownSet) {
  if (!specifier) return null;
  let base = null;
  if (specifier.startsWith("@/")) {
    base = "src/" + specifier.slice(2);
  } else if (specifier.startsWith("./") || specifier.startsWith("../")) {
    base = path.posix.normalize(path.posix.join(path.posix.dirname(fromFile), specifier));
  } else {
    return null;
  }

  const candidates = [
    base,
    `${base}.ts`,
    `${base}.tsx`,
    `${base}.js`,
    `${base}.cjs`,
    `${base}.json`,
    `${base}.css`,
    `${base}/index.ts`,
    `${base}/index.tsx`,
    `${base}/index.js`,
  ];
  for (const candidate of candidates) {
    if (allKnownSet.has(candidate)) return candidate;
  }
  return null;
}

function parseSourceAst(relPath, content, allKnownSet) {
  const sf = ts.createSourceFile(
    relPath,
    content,
    ts.ScriptTarget.Latest,
    true,
    getScriptKind(relPath)
  );

  const staticImports = new Set();
  const dynamicImports = new Set();
  const requireImports = new Set();
  const exportsSet = new Set();
  const stringLiterals = [];
  const apiEndpoints = new Set();

  const hasExportModifier = (node) =>
    Boolean(
      node.modifiers &&
        node.modifiers.some((m) => m.kind === ts.SyntaxKind.ExportKeyword)
    );

  const hasDefaultModifier = (node) =>
    Boolean(
      node.modifiers &&
        node.modifiers.some((m) => m.kind === ts.SyntaxKind.DefaultKeyword)
    );

  function addApiCandidate(rawText) {
    if (!rawText || typeof rawText !== "string") return;
    const match = rawText.match(/^(\/api\/(?:erp|share)\/[^\s?#"'`]*)/);
    if (match) {
      let endpoint = match[1]
        .replace(/\/__EXPR__/g, "/[param]")
        .replace(/__EXPR__.*$/, "")
        .replace(/\/+$/, "");
      if (endpoint.startsWith("/api/share/[param]")) {
        endpoint = endpoint.replace("/api/share/[param]", "/api/share/[code]");
      }
      if (endpoint) apiEndpoints.add(endpoint);
    }
  }

  function visit(node) {
    // 1. Imports / Re-exports
    if (
      ts.isImportDeclaration(node) &&
      node.moduleSpecifier &&
      ts.isStringLiteral(node.moduleSpecifier)
    ) {
      const resolved = resolveInternalModule(
        relPath,
        node.moduleSpecifier.text,
        allKnownSet
      );
      if (resolved) staticImports.add(resolved);
    } else if (
      ts.isExportDeclaration(node) &&
      node.moduleSpecifier &&
      ts.isStringLiteral(node.moduleSpecifier)
    ) {
      const resolved = resolveInternalModule(
        relPath,
        node.moduleSpecifier.text,
        allKnownSet
      );
      if (resolved) staticImports.add(resolved);
    } else if (
      ts.isCallExpression(node) &&
      node.arguments.length >= 1 &&
      ts.isStringLiteral(node.arguments[0])
    ) {
      if (node.expression.kind === ts.SyntaxKind.ImportKeyword) {
        const resolved = resolveInternalModule(
          relPath,
          node.arguments[0].text,
          allKnownSet
        );
        if (resolved) dynamicImports.add(resolved);
      } else if (
        ts.isIdentifier(node.expression) &&
        node.expression.text === "require"
      ) {
        const resolved = resolveInternalModule(
          relPath,
          node.arguments[0].text,
          allKnownSet
        );
        if (resolved) requireImports.add(resolved);
      }
    }

    // 2. Exports
    if (ts.isFunctionDeclaration(node) && hasExportModifier(node)) {
      if (hasDefaultModifier(node)) {
        exportsSet.add(
          node.name ? `default (${node.name.text})` : "default"
        );
      } else if (node.name) {
        exportsSet.add(node.name.text);
      }
    } else if (ts.isClassDeclaration(node) && hasExportModifier(node)) {
      if (hasDefaultModifier(node)) {
        exportsSet.add(
          node.name ? `default (${node.name.text})` : "default"
        );
      } else if (node.name) {
        exportsSet.add(node.name.text);
      }
    } else if (ts.isVariableStatement(node) && hasExportModifier(node)) {
      for (const decl of node.declarationList.declarations) {
        if (ts.isIdentifier(decl.name)) {
          exportsSet.add(decl.name.text);
        }
      }
    } else if (
      (ts.isInterfaceDeclaration(node) ||
        ts.isTypeAliasDeclaration(node) ||
        ts.isEnumDeclaration(node)) &&
      hasExportModifier(node) &&
      node.name
    ) {
      exportsSet.add(node.name.text);
    } else if (ts.isExportAssignment(node)) {
      if (ts.isIdentifier(node.expression)) {
        exportsSet.add(`default (${node.expression.text})`);
      } else {
        exportsSet.add("default");
      }
    } else if (
      ts.isExportDeclaration(node) &&
      node.exportClause &&
      ts.isNamedExports(node.exportClause)
    ) {
      for (const el of node.exportClause.elements) {
        exportsSet.add(el.name.text);
      }
    } else if (
      ts.isBinaryExpression(node) &&
      node.operatorToken.kind === ts.SyntaxKind.EqualsToken
    ) {
      // CommonJS module.exports = { ... } or exports.foo = ...
      const leftText = node.left.getText(sf);
      if (leftText === "module.exports" && ts.isObjectLiteralExpression(node.right)) {
        for (const prop of node.right.properties) {
          if (ts.isPropertyAssignment(prop) || ts.isShorthandPropertyAssignment(prop)) {
            if (ts.isIdentifier(prop.name)) exportsSet.add(prop.name.text);
          }
        }
      } else if (leftText.startsWith("exports.")) {
        exportsSet.add(leftText.slice("exports.".length));
      }
    }

    // 3. String literals & template literals for SQL / API endpoint discovery
    if (ts.isStringLiteral(node) || ts.isNoSubstitutionTemplateLiteral(node)) {
      stringLiterals.push(node.text);
      addApiCandidate(node.text);
    } else if (ts.isTemplateExpression(node)) {
      let text = node.head.text;
      for (const span of node.templateSpans) {
        text += "__EXPR__" + span.literal.text;
      }
      stringLiterals.push(text);
      addApiCandidate(text);
    }

    ts.forEachChild(node, visit);
  }

  visit(sf);

  const internalImports = Array.from(
    new Set([...staticImports, ...dynamicImports, ...requireImports])
  )
    .filter((target) => target !== relPath)
    .sort();

  return {
    exports: Array.from(exportsSet),
    staticImports: Array.from(staticImports).sort(),
    dynamicImports: Array.from(dynamicImports).sort(),
    internalImports,
    apiEndpointsCalled: Array.from(apiEndpoints).sort(),
    stringLiterals,
  };
}

function extractDbTables(relPath, content, stringLiterals) {
  if (
    relPath === "scripts/generate_code_file_spec.cjs" ||
    relPath === "scripts/code_file_descriptions.cjs" ||
    relPath.startsWith("scripts/descriptions/")
  ) {
    return [];
  }
  const isCodeOrSql = /\.(ts|tsx|js|cjs|sql)$/.test(relPath);
  if (!isCodeOrSql) return [];

  const sources = relPath.endsWith(".sql") ? [content] : stringLiterals;
  const found = new Set();

  for (const s of sources) {
    if (!s) continue;
    const hasSqlContext =
      relPath.endsWith(".sql") ||
      /\b(?:SELECT|FROM|JOIN|INTO|UPDATE|DELETE|CREATE\s+TABLE|ALTER\s+TABLE|TRUNCATE)\b/i.test(
        s
      );

    if (hasSqlContext) {
      for (const m of s.matchAll(/\b(erp_[a-z][a-z0-9_]*)\b/g)) {
        const tbl = m[1];
        if (
          !EXCLUDE_ERP_IDENTIFIERS.has(tbl) &&
          !/_schema_v\d+$/.test(tbl) &&
          !/_v\d+$/.test(tbl) &&
          !/_key$/.test(tbl) &&
          !/_idx$/.test(tbl) &&
          !tbl.startsWith("erp_session")
        ) {
          found.add(tbl);
        }
      }
      for (const m of s.matchAll(
        /\b(?:FROM|JOIN|INTO|UPDATE|CREATE\s+TABLE(?:\s+IF\s+NOT\s+EXISTS)?|ALTER\s+TABLE|DELETE\s+FROM)\s+([a-z][a-z0-9_]+)\b/gi
      )) {
        const tbl = m[1].toLowerCase();
        if (KNOWN_CORE_TABLES.has(tbl)) {
          found.add(tbl);
        }
      }
    }
  }

  for (const m of content.matchAll(
    /\.from\(\s*['"]([a-z][a-z0-9_]+)['"]\s*\)/g
  )) {
    found.add(m[1].toLowerCase());
  }

  return Array.from(found).sort();
}

function discoverScopeFiles() {
  const allSrc = walkRelativeFiles("src");
  const allScripts = walkRelativeFiles("scripts");
  const publicErpManifest = fs.existsSync(
    path.join(ROOT_DIR, "public/erp-manifest.json")
  )
    ? ["public/erp-manifest.json"]
    : [];
  const rootSchema = fs.existsSync(path.join(ROOT_DIR, "schema.sql"))
    ? ["schema.sql"]
    : [];

  const allKnownSet = new Set([
    ...allSrc,
    ...publicErpManifest,
    ...rootSchema,
    ...allScripts,
  ]);

  const seeds = [
    ...walkRelativeFiles("src/app/erp"),
    ...walkRelativeFiles("src/app/api/erp"),
    "src/middleware.ts",
    "src/app/layout.tsx",
    "src/app/globals.css",
    "src/components/security/ClientSecurityGuard.tsx",
    ...publicErpManifest,
    ...walkRelativeFiles("src/app/share"),
    ...walkRelativeFiles("src/app/api/share"),
    ...walkRelativeFiles("src/app/shareholder-registry"),
  ].filter((f) => allKnownSet.has(f));

  const visited = new Set(seeds);
  const queue = [...seeds];

  while (queue.length > 0) {
    const cur = queue.shift();
    if (!/\.(ts|tsx|js|cjs)$/.test(cur)) continue;
    const content = fs.readFileSync(path.join(ROOT_DIR, cur), "utf8");
    const ast = parseSourceAst(cur, content, allKnownSet);
    for (const dep of ast.internalImports) {
      if (!visited.has(dep)) {
        visited.add(dep);
        queue.push(dep);
      }
    }
  }

  // ERP 접두사/도메인 라이브러리 및 타입 선언이 고아 상태여도 추적 누락을 막기 위해 포함
  for (const f of allSrc) {
    if (ERP_LIB_PREFIX_PATTERN.test(f) || f === "src/types/popbill.d.ts") {
      visited.add(f);
    }
  }

  for (const f of rootSchema) {
    visited.add(f);
  }
  for (const f of allScripts) {
    if (f !== "scripts/vercel-autopurge.cjs" && /\.(cjs|js)$/.test(f)) {
      visited.add(f);
    }
  }

  const erpFiles = Array.from(visited).sort();
  const erpSet = new Set(erpFiles);

  const nonErpFiles = [
    ...allSrc.filter((f) => !erpSet.has(f)),
    ...allScripts.filter((f) => !erpSet.has(f)),
  ].sort();

  const publicDocs = [
    ...walkRelativeFiles("public/docs"),
    ...walkRelativeFiles("public/documents"),
  ].sort();

  return { erpFiles, nonErpFiles, publicDocs, allKnownSet };
}

function classifyNonErpDomain(relPath) {
  if (relPath.startsWith("src/scripts/")) return "라이선스·제품·스케치 DB 초기화 스크립트";
  if (relPath === "scripts/vercel-autopurge.cjs") return "Vercel 배포 슬롯 정리 스크립트";
  if (relPath.startsWith("src/app/api/license/") || relPath.startsWith("src/app/api/payments/")) {
    return "라이선스·결제 API";
  }
  if (relPath.startsWith("src/app/api/sketch/") || relPath === "src/app/sketch/route.ts") {
    return "스케치 릴레이 API";
  }
  if (relPath.startsWith("src/app/api/products") || relPath.startsWith("src/app/api/contact")) {
    return "공식 홈페이지·스토어 API";
  }
  if (
    relPath.startsWith("src/lib/license") ||
    relPath.startsWith("src/lib/product") ||
    relPath === "src/lib/emailService.ts"
  ) {
    return "라이선스·제품·메일 도메인 서비스";
  }
  return "공식 홈페이지·마케팅·스토어 화면";
}

function parseMenuConfigAndRouting(allKnownSet) {
  const configPath = "src/app/erp/erpMenuConfig.ts";
  const pagePath = "src/app/erp/page.tsx";
  const configCode = fs.readFileSync(path.join(ROOT_DIR, configPath), "utf8");
  const pageCode = fs.readFileSync(path.join(ROOT_DIR, pagePath), "utf8");

  const configSf = ts.createSourceFile(configPath, configCode, ts.ScriptTarget.Latest, true);
  const pageSf = ts.createSourceFile(pagePath, pageCode, ts.ScriptTarget.Latest, true);

  const categories = [];
  const permKeyMap = {};

  function evalString(node) {
    if (!node) return null;
    if (ts.isStringLiteral(node) || ts.isNoSubstitutionTemplateLiteral(node)) {
      return node.text;
    }
    return null;
  }

  function visitConfig(node) {
    if (ts.isVariableDeclaration(node) && ts.isIdentifier(node.name)) {
      if (node.name.text === "CATEGORIES" && node.initializer && ts.isArrayLiteralExpression(node.initializer)) {
        for (const catObj of node.initializer.elements) {
          if (!ts.isObjectLiteralExpression(catObj)) continue;
          let key = "";
          let label = "";
          const items = [];
          for (const prop of catObj.properties) {
            if (!ts.isPropertyAssignment(prop) || !ts.isIdentifier(prop.name)) continue;
            const pname = prop.name.text;
            if (pname === "key") key = evalString(prop.initializer) || "";
            else if (pname === "label") label = evalString(prop.initializer) || "";
            else if (pname === "items" && ts.isArrayLiteralExpression(prop.initializer)) {
              for (const itemObj of prop.initializer.elements) {
                if (!ts.isObjectLiteralExpression(itemObj)) continue;
                let iKey = "";
                let iLabel = "";
                for (const ip of itemObj.properties) {
                  if (!ts.isPropertyAssignment(ip) || !ts.isIdentifier(ip.name)) continue;
                  if (ip.name.text === "key") iKey = evalString(ip.initializer) || "";
                  else if (ip.name.text === "label") iLabel = evalString(ip.initializer) || "";
                }
                if (iKey) items.push({ key: iKey, label: iLabel });
              }
            }
          }
          if (key) categories.push({ key, label, items });
        }
      } else if (
        node.name.text === "MENU_PERM_KEY_MAP" &&
        node.initializer &&
        ts.isObjectLiteralExpression(node.initializer)
      ) {
        for (const prop of node.initializer.properties) {
          if (ts.isPropertyAssignment(prop) && ts.isIdentifier(prop.name)) {
            permKeyMap[prop.name.text] = evalString(prop.initializer) || "";
          }
        }
      }
    }
    ts.forEachChild(node, visitConfig);
  }
  visitConfig(configSf);

  // Map component identifier -> resolved file path in src/app/erp/page.tsx
  const componentImportMap = {};
  const eagerComponentImports = [];

  function visitPageImports(node) {
    if (ts.isImportDeclaration(node) && node.moduleSpecifier && ts.isStringLiteral(node.moduleSpecifier)) {
      const resolved = resolveInternalModule(pagePath, node.moduleSpecifier.text, allKnownSet);
      if (resolved && resolved.startsWith("src/app/erp/components/") && node.importClause) {
        if (node.importClause.name) {
          componentImportMap[node.importClause.name.text] = resolved;
          eagerComponentImports.push({ symbol: node.importClause.name.text, path: resolved });
        }
        if (node.importClause.namedBindings && ts.isNamedImports(node.importClause.namedBindings)) {
          for (const el of node.importClause.namedBindings.elements) {
            componentImportMap[el.name.text] = resolved;
            eagerComponentImports.push({ symbol: el.name.text, path: resolved });
          }
        }
      }
    } else if (ts.isVariableDeclaration(node) && ts.isIdentifier(node.name) && node.initializer) {
      const initText = node.initializer.getText(pageSf);
      if (initText.includes("dynamic(")) {
        let dynTarget = null;
        const findImport = (n) => {
          if (
            ts.isCallExpression(n) &&
            n.expression.kind === ts.SyntaxKind.ImportKeyword &&
            n.arguments.length >= 1 &&
            ts.isStringLiteral(n.arguments[0])
          ) {
            dynTarget = resolveInternalModule(pagePath, n.arguments[0].text, allKnownSet);
          }
          ts.forEachChild(n, findImport);
        };
        findImport(node.initializer);
        if (dynTarget) {
          componentImportMap[node.name.text] = dynTarget;
        }
      }
    }
    ts.forEachChild(node, visitPageImports);
  }
  visitPageImports(pageSf);

  // Map menuKey -> Tab component path via renderMenuContent switch
  const menuComponentMap = {};
  function visitSwitch(node) {
    if (ts.isCaseClause(node) && ts.isStringLiteral(node.expression)) {
      const menuKey = node.expression.text;
      let foundComp = null;
      const findJsx = (n) => {
        if (foundComp) return;
        if (
          (ts.isJsxOpeningElement(n) || ts.isJsxSelfClosingElement(n)) &&
          ts.isIdentifier(n.tagName)
        ) {
          const tag = n.tagName.text;
          if (componentImportMap[tag]) {
            foundComp = componentImportMap[tag];
          }
        }
        ts.forEachChild(n, findJsx);
      };
      for (const stmt of node.statements) {
        findJsx(stmt);
      }
      if (foundComp) {
        menuComponentMap[menuKey] = foundComp;
      }
    }
    ts.forEachChild(node, visitSwitch);
  }
  visitSwitch(pageSf);

  return {
    categories,
    permKeyMap,
    menuComponentMap,
    eagerComponentImports,
  };
}

function buildAnalysisData() {
  if (!fs.existsSync(DESCRIPTIONS_PATH)) {
    throw new Error(`기능 설명 사전 파일이 없습니다: ${DESCRIPTIONS_PATH}`);
  }
  const descCatalog = require(DESCRIPTIONS_PATH);
  const { LAYERS, FILES: descMap } = descCatalog;
  const layerMetaMap = Object.fromEntries(LAYERS.map((l) => [l.key, l]));

  const { erpFiles, nonErpFiles, publicDocs, allKnownSet } = discoverScopeFiles();
  const erpSet = new Set(erpFiles);
  const menuRouting = parseMenuConfigAndRouting(allKnownSet);
  const eagerPathsSet = new Set(menuRouting.eagerComponentImports.map((e) => e.path));

  const astByFile = {};
  const importedByMap = {};
  for (const f of erpFiles) importedByMap[f] = [];

  let maxMtimeMs = 0;

  for (const relPath of erpFiles) {
    const absPath = path.join(ROOT_DIR, relPath);
    const stat = fs.statSync(absPath);
    if (stat.mtimeMs > maxMtimeMs) maxMtimeMs = stat.mtimeMs;
    const rawBuf = fs.readFileSync(absPath);
    const content = rawBuf.toString("utf8");
    const lines = content === "" ? 0 : content.split(/\r?\n/).length;
    const sizeBytes = stat.size;
    const sizeKB = Number((sizeBytes / 1024).toFixed(1));

    let ast = {
      exports: [],
      staticImports: [],
      dynamicImports: [],
      internalImports: [],
      apiEndpointsCalled: [],
      stringLiterals: [],
    };
    if (/\.(ts|tsx|js|cjs)$/.test(relPath)) {
      ast = parseSourceAst(relPath, content, allKnownSet);
    }
    const dbTables = extractDbTables(relPath, content, ast.stringLiterals);

    astByFile[relPath] = {
      lines,
      sizeBytes,
      sizeKB,
      exports: ast.exports,
      internalImports: ast.internalImports.filter((d) => erpSet.has(d)),
      staticImports: ast.staticImports.filter((d) => erpSet.has(d)),
      dynamicImports: ast.dynamicImports.filter((d) => erpSet.has(d)),
      apiEndpointsCalled: ast.apiEndpointsCalled,
      dbTables,
    };

    for (const dep of astByFile[relPath].internalImports) {
      if (!importedByMap[dep]) importedByMap[dep] = [];
      importedByMap[dep].push(relPath);
    }
  }

  // Build final file entries
  const fileEntries = erpFiles.map((relPath) => {
    const info = astByFile[relPath];
    const meta = descMap[relPath] || {
      layer: "UNKNOWN",
      menuId: "UNSPECIFIED",
      counterpart: null,
      description: "",
    };
    const importedBy = (importedByMap[relPath] || []).slice().sort();
    const fanIn = importedBy.length;

    const signals = [];
    const isStaticDataFile =
      /\.(json|sql)$/.test(relPath) || meta.layer === "L5_STATIC_DATA";
    if (info.lines >= 1500 || info.sizeKB > 80) {
      signals.push(isStaticDataFile ? "LARGE_STATIC_DATA" : "GOD_FILE");
    }
    if (fanIn >= 8) {
      signals.push("HIGH_COUPLING_HUB");
    }
    if (eagerPathsSet.has(relPath)) {
      signals.push("EAGER_ROUTE_IMPORT");
    }
    const isEntrypointOrStatic =
      /(?:^|\/)(?:page|layout|route)\.(?:ts|tsx)$/.test(relPath) ||
      relPath === "src/middleware.ts" ||
      relPath.startsWith("scripts/") ||
      relPath === "schema.sql" ||
      /\.(css|json|d\.ts)$/.test(relPath);
    if (!isEntrypointOrStatic && fanIn === 0) {
      signals.push("ORPHAN_CANDIDATE");
    }

    return {
      path: relPath,
      lines: info.lines,
      sizeBytes: info.sizeBytes,
      sizeKB: info.sizeKB,
      layer: meta.layer,
      layerLabel: layerMetaMap[meta.layer]?.label || meta.layer,
      menuId: meta.menuId,
      counterpart: meta.counterpart || null,
      exports: info.exports,
      internalImports: info.internalImports,
      importedBy,
      fanIn,
      apiEndpointsCalled: info.apiEndpointsCalled,
      dbTables: info.dbTables,
      optimizationSignals: signals,
      description: meta.description,
    };
  });

  // Collect public docs references from src/app/erp & public/docs
  const erpCodeStrings = {};
  for (const f of erpFiles) {
    if (f.startsWith("src/app/erp/") && /\.(ts|tsx)$/.test(f)) {
      erpCodeStrings[f] = fs.readFileSync(path.join(ROOT_DIR, f), "utf8");
    }
  }
  const publicDocEntries = publicDocs.map((docPath) => {
    const stat = fs.statSync(path.join(ROOT_DIR, docPath));
    const webUrl = "/" + docPath.replace(/^public\//, "");
    const baseName = path.basename(docPath);
    const refs = [];
    for (const [erpFile, code] of Object.entries(erpCodeStrings)) {
      if (code.includes(webUrl) || code.includes(baseName)) {
        refs.push(erpFile);
      }
    }
    return {
      path: docPath,
      webUrl,
      sizeKB: Number((stat.size / 1024).toFixed(1)),
      referencedBy: refs.sort(),
    };
  });

  const nonErpEntries = nonErpFiles.map((relPath) => {
    const absPath = path.join(ROOT_DIR, relPath);
    const stat = fs.statSync(absPath);
    const content = fs.readFileSync(absPath, "utf8");
    return {
      path: relPath,
      lines: content === "" ? 0 : content.split(/\r?\n/).length,
      sizeKB: Number((stat.size / 1024).toFixed(1)),
      domain: classifyNonErpDomain(relPath),
    };
  });

  // Deterministic fingerprint (independent of generated time)
  const fingerprintInput = JSON.stringify({
    files: fileEntries,
    nonErpEntries,
    publicDocEntries,
  });
  const specFingerprint = crypto
    .createHash("sha256")
    .update(fingerprintInput)
    .digest("hex")
    .slice(0, 16);

  return {
    schemaVersion: "1.0.0",
    targetRoute: "https://www.dragonrpa.co.kr/erp",
    specFingerprint,
    lastSourceModifiedAt: new Date(maxMtimeMs).toISOString(),
    layers: LAYERS,
    menuRouting,
    files: fileEntries,
    publicDocs: publicDocEntries,
    nonErpFiles: nonErpEntries,
    descCatalog,
  };
}

function buildManifestJson(analysis) {
  const layerStats = analysis.layers.map((l) => {
    const items = analysis.files.filter((f) => f.layer === l.key);
    const totalLines = items.reduce((s, f) => s + f.lines, 0);
    const totalBytes = items.reduce((s, f) => s + f.sizeBytes, 0);
    return {
      key: l.key,
      label: l.label,
      fileCount: items.length,
      totalLines,
      totalKB: Number((totalBytes / 1024).toFixed(1)),
    };
  });

  const payload = {
    schemaVersion: analysis.schemaVersion,
    targetRoute: analysis.targetRoute,
    specFingerprint: analysis.specFingerprint,
    summary: {
      totalErpFiles: analysis.files.length,
      totalLines: analysis.files.reduce((s, f) => s + f.lines, 0),
      totalKB: Number(
        (
          analysis.files.reduce((s, f) => s + f.sizeBytes, 0) / 1024
        ).toFixed(1)
      ),
      godFileCount: analysis.files.filter((f) =>
        f.optimizationSignals.includes("GOD_FILE")
      ).length,
      largeStaticDataCount: analysis.files.filter((f) =>
        f.optimizationSignals.includes("LARGE_STATIC_DATA")
      ).length,
      highCouplingHubCount: analysis.files.filter((f) =>
        f.optimizationSignals.includes("HIGH_COUPLING_HUB")
      ).length,
      eagerRouteImportCount: analysis.files.filter((f) =>
        f.optimizationSignals.includes("EAGER_ROUTE_IMPORT")
      ).length,
      orphanCandidateCount: analysis.files.filter((f) =>
        f.optimizationSignals.includes("ORPHAN_CANDIDATE")
      ).length,
      publicDocsCount: analysis.publicDocs.length,
      nonErpExcludedCount: analysis.nonErpFiles.length,
    },
    layerStats,
    files: analysis.files,
    publicDocs: analysis.publicDocs,
    nonErpExcludedFiles: analysis.nonErpFiles,
  };

  return JSON.stringify(payload, null, 2) + "\n";
}

function escapePipe(str) {
  return String(str || "").replace(/\|/g, "\\|").replace(/\r?\n/g, " ");
}

function formatCodeList(items, emptyText = "없음") {
  if (!items || items.length === 0) return emptyText;
  return items.map((s) => `\`${s}\``).join(", ");
}

function renderSpecMarkdownPass(analysis, lineMap) {
  const getLineBadge = (anchorKey) => {
    const ln = lineMap[anchorKey];
    return ln ? `L${ln}` : "L0000";
  };

  const lines = [];
  const push = (...args) => {
    for (const a of args) lines.push(a);
  };

  const totalFiles = analysis.files.length;
  const totalLines = analysis.files.reduce((s, f) => s + f.lines, 0);
  const totalKB = Number(
    (analysis.files.reduce((s, f) => s + f.sizeBytes, 0) / 1024).toFixed(1)
  );

  push(
    "# `www.dragonrpa.co.kr/erp` 코드 파일 목록 및 기능 명세서 (SSOT)",
    "",
    "> [!NOTE]",
    "> 본 문서는 전사 시스템 개발 표준 헌장 **1.5조** 및 **카테고리 XV(15.1~15.5조)**에 따라 TypeScript AST 분석 엔진(`scripts/generate_code_file_spec.cjs`)과 기능 설명 사전(`scripts/code_file_descriptions.cjs`)으로 생성되는 단일 진실의 원천(SSOT)이다.",
    "",
    `- **대상 서비스**: \`${analysis.targetRoute}\` (드래곤알피에이 통합 ERP & 그룹웨어 웹앱)`,
    `- **스키마 버전 / 무결성 지문**: \`v${analysis.schemaVersion}\` / \`${analysis.specFingerprint}\``,
    `- **총 구성 코드 파일**: **${totalFiles}개** (${totalLines.toLocaleString("en-US")}줄, ${totalKB.toLocaleString("en-US")} KB)`,
    `- **기계 판독 매니페스트**: [code_file_manifest.json](file:///${toPosix(MANIFEST_PATH)})`,
    `- **비대상 경계**: 동일 저장소 내 공식 홈페이지·스토어·스케치 릴레이·배포 정리 파일(${analysis.nonErpFiles.length}개)은 부록 B에 분리 명시한다.`,
    "",
    "---",
    "",
    "## 제1장. 개요 및 계층별 요약",
    "",
    "### 1.1 아키텍처 구성 및 계층별 통계",
    "",
    "| 계층 코드 | 계층명 | 대상 경로 범위 | 파일 수 | 총 라인 수 | 총 용량(KB) | 명세 시작 라인 |",
    "| :--- | :--- | :--- | :---: | :---: | :---: | :---: |",
  );

  for (const layer of analysis.layers) {
    const items = analysis.files.filter((f) => f.layer === layer.key);
    const lLines = items.reduce((s, f) => s + f.lines, 0);
    const lKB = Number(
      (items.reduce((s, f) => s + f.sizeBytes, 0) / 1024).toFixed(1)
    );
    push(
      `| \`${layer.key}\` | ${layer.label} | ${layer.dirHint} | ${items.length} | ${lLines.toLocaleString("en-US")} | ${lKB.toLocaleString("en-US")} | ${getLineBadge(layer.key)} |`
    );
  }
  push(
    `| **합계** | **전체 9개 계층** | **\`/erp\` 종단 의존성 범위 전수** | **${totalFiles}** | **${totalLines.toLocaleString("en-US")}** | **${totalKB.toLocaleString("en-US")}** | **${getLineBadge("CH4")}** |`,
    "",
    "### 1.2 전체 목차 및 시작 라인 색인",
    "",
    `- **제1장. 개요 및 계층별 요약**: ${getLineBadge("CH1")}`,
    `- **제2장. 코드 최적화 레이더 (헌장 15.3조 정량 지표)**: ${getLineBadge("CH2")}`,
    `- **제3장. 7개 그룹·34개 \`ErpMenuKey\` 메뉴 ↔ UI 탭 ↔ API ↔ 권한키 1:1 매핑 총괄표**: ${getLineBadge("CH3")}`,
    `- **제4장. 계층별 전체 코드 파일 상세 기능 명세 (${totalFiles}개 전수)**: ${getLineBadge("CH4")}`,
  );

  analysis.layers.forEach((layer, idx) => {
    const cnt = analysis.files.filter((f) => f.layer === layer.key).length;
    push(
      `  - **4.${idx + 1} \`${layer.key}\` (${layer.label}, ${cnt}개)**: ${getLineBadge(layer.key)}`
    );
  });

  push(
    `- **부록 A. ERP 참조 정적 문서 목록 (${analysis.publicDocs.length}종)**: ${getLineBadge("APP_A")}`,
    `- **부록 B. 동일 저장소 내 비ERP 제외 파일 경계 (${analysis.nonErpFiles.length}개)**: ${getLineBadge("APP_B")}`,
    "",
    "### 1.3 명세 동기화·검증·영향도 조회 명령",
    "",
    "| 목적 | 실행 명령 (Windows PowerShell 기준) | 동작 |",
    "| :--- | :--- | :--- |",
    "| 명세서·매니페스트 재생성 | `npm.cmd run spec:sync` | AST 재분석 후 JSON 매니페스트 및 마크다운 명세서 동기화 |",
    "| 정합성·규정 게이트 검증 | `npm.cmd run spec:verify` | 파일 누락·설명 미기재·금지 수식어·민감문자·동기화 상태 검사 (`exit 0`) |",
    "| 수정 전 영향도 조회 | `npm.cmd run spec:query -- <검색어>` | 파일·심볼·테이블·`menuId` 검색 및 `importedBy` 역참조 목록 출력 |",
    "",
    "---",
    "",
    "## 제2장. 코드 최적화 레이더 (헌장 15.3조 정량 지표)",
    ""
  );

  // 2.1 GOD_FILE & LARGE_STATIC_DATA
  const godFiles = analysis.files
    .filter((f) => f.optimizationSignals.includes("GOD_FILE"))
    .sort((a, b) => b.lines - a.lines);
  const largeStaticFiles = analysis.files
    .filter((f) => f.optimizationSignals.includes("LARGE_STATIC_DATA"))
    .sort((a, b) => b.sizeKB - a.sizeKB);

  push(
    `### 2.1 비대 코드 모듈 (\`GOD_FILE\`: ${godFiles.length}개) 및 대용량 정적 데이터 (\`LARGE_STATIC_DATA\`: ${largeStaticFiles.length}개)`,
    "",
    "코드 파일(`.ts`, `.tsx`, `.cjs`) 기준 `1,500줄 이상` 또는 `80KB 초과` 항목을 `GOD_FILE`로 분류하고, `.json` 및 `src/app/erp/data/*` 정적 데이터 파일은 `LARGE_STATIC_DATA`로 분리 표기한다.",
    "",
    "#### 2.1.1 비대 코드 모듈 (`GOD_FILE`)",
    "",
    "| 순위 | 파일 경로 | 계층 | 라인 수 | 용량(KB) | `Fan-In` | 권고 분할 경계 |",
    "| :---: | :--- | :--- | :---: | :---: | :---: | :--- |",
  );
  godFiles.forEach((f, idx) => {
    const advice = f.layer === "L6_API_ROUTES"
      ? "도메인 쿼리·계산 서비스(`src/lib/`) 및 액션별 핸들러 분리"
      : f.layer === "L8_DOMAIN_LIBS"
        ? "테이블 DDL·마이그레이션 시드와 도메인 로직 분리"
        : f.layer === "L9_DB_RPA_SCRIPTS"
          ? "계층별 사전 분할(`descriptions/*.cjs`) 분리"
          : "순수 계산 헬퍼(`*Helpers.ts`)·커스텀 훅(`use*.ts`)·하위 모달 분리";
    push(
      `| ${idx + 1} | \`${f.path}\` | \`${f.layer}\` | ${f.lines} | ${f.sizeKB} | ${f.fanIn} | ${advice} |`
    );
  });

  push(
    "",
    "#### 2.1.2 대용량 정적 데이터 (`LARGE_STATIC_DATA`)",
    "",
    "| 파일 경로 | 계층 | 라인 수 | 용량(KB) | 용도 |",
    "| :--- | :--- | :---: | :---: | :--- |",
  );
  for (const f of largeStaticFiles) {
    push(
      `| \`${f.path}\` | \`${f.layer}\` | ${f.lines} | ${f.sizeKB} | ${escapePipe(f.description)} |`
    );
  }

  // 2.2 HIGH_COUPLING_HUB
  const hubs = analysis.files
    .filter((f) => f.optimizationSignals.includes("HIGH_COUPLING_HUB"))
    .sort((a, b) => b.fanIn - a.fanIn || a.path.localeCompare(b.path));

  push(
    "",
    `### 2.2 고결합 허브 모듈 (\`HIGH_COUPLING_HUB\`, \`Fan-In >= 8\`: ${hubs.length}개)`,
    "",
    "| 순위 | 파일 경로 | 계층 | `Fan-In` | 규모(줄 / KB) | 주요 역할 |",
    "| :---: | :--- | :--- | :---: | :---: | :--- |",
  );
  hubs.forEach((f, idx) => {
    push(
      `| ${idx + 1} | \`${f.path}\` | \`${f.layer}\` | ${f.fanIn} | ${f.lines}L / ${f.sizeKB}KB | ${escapePipe(f.description)} |`
    );
  });

  // 2.3 EAGER_ROUTE_IMPORT vs next/dynamic
  const eagerFiles = analysis.files
    .filter((f) => f.optimizationSignals.includes("EAGER_ROUTE_IMPORT"))
    .sort((a, b) => a.path.localeCompare(b.path));
  const pageAstImports =
    analysis.files.find((f) => f.path === "src/app/erp/page.tsx")?.internalImports || [];
  const dynamicPageImports = pageAstImports.filter(
    (p) => p.startsWith("src/app/erp/components/") && !eagerFiles.some((e) => e.path === p)
  );
  const dynamicTabCount = dynamicPageImports.filter((p) => p.endsWith("Tab.tsx")).length;
  const dynamicModalCount = dynamicPageImports.filter((p) => !p.endsWith("Tab.tsx")).length;

  push(
    "",
    `### 2.3 라우트 셸 코드 스플리팅 점검 (\`EAGER_ROUTE_IMPORT\`: ${eagerFiles.length}개, \`next/dynamic\` 지연 로딩: ${dynamicPageImports.length}개)`,
    "",
    `\`src/app/erp/page.tsx\` 기준 활성 \`*Tab.tsx\` 모듈 ${dynamicTabCount}개(\`PartnerManagementTab.tsx\`는 \`CUSTOMER\`·\`VENDOR\` 공용)와 조건부 셸 모달 ${dynamicModalCount}개는 \`next/dynamic({ ssr: false })\`로 지연 로딩되며, 아래 ${eagerFiles.length}개 컴포넌트만 정적 \`import\`로 초기 번들에 포함된다.`,
    "",
    "| 구분 | 파일 경로 | 용량(KB) | 상태 및 검토 의견 |",
    "| :--- | :--- | :---: | :--- |",
  );
  for (const f of eagerFiles) {
    const note =
      f.path.endsWith("Modal.tsx")
        ? "조건부 모달 컴포넌트 (`next/dynamic` 지연 로딩 전환 후보)"
        : "초기 인증/헤더 셸 필수 컴포넌트 (정적 로딩 유지 타당)";
    push(`| \`EAGER_ROUTE_IMPORT\` | \`${f.path}\` | ${f.sizeKB} | ${note} |`);
  }

  // 2.4 ORPHAN_CANDIDATE
  const orphans = analysis.files
    .filter((f) => f.optimizationSignals.includes("ORPHAN_CANDIDATE"))
    .sort((a, b) => a.path.localeCompare(b.path));

  push(
    "",
    `### 2.4 미참조 데드코드 후보 (\`ORPHAN_CANDIDATE\`, \`Fan-In = 0\`: ${orphans.length}개)`,
    "",
    "진입점(`page.tsx`, `layout.tsx`, `route.ts`, `middleware.ts`, `.css`, `.json`, `.sql`, `scripts/*.cjs`, `.d.ts`)을 제외하고 AST 역참조(`importedBy`)가 0건인 파일 목록이다.",
    "",
    "| 파일 경로 | 계층 | 라인 수 | 용량(KB) | 실사 판정 |",
    "| :--- | :--- | :---: | :---: | :--- |",
  );
  for (const f of orphans) {
    push(
      `| \`${f.path}\` | \`${f.layer}\` | ${f.lines} | ${f.sizeKB} | ${escapePipe(f.description)} |`
    );
  }

  // 2.5 DB Table matrix
  const tableToFiles = {};
  for (const f of analysis.files) {
    if (f.path === "schema.sql" || f.path.startsWith("scripts/init_") || f.path.startsWith("scripts/migrate_")) {
      continue;
    }
    for (const tbl of f.dbTables) {
      if (!tableToFiles[tbl]) tableToFiles[tbl] = [];
      tableToFiles[tbl].push(f.path);
    }
  }
  const sortedTables = Object.keys(tableToFiles).sort();

  push(
    "",
    `### 2.5 런타임 DB 테이블별 접근 코드 매트릭스 (${sortedTables.length}개 테이블)`,
    "",
    "> DDL 정의 전용 파일(`schema.sql`, `scripts/init_erp_supabase.cjs`, `scripts/migrate_*.cjs`)을 제외한 런타임 API·도메인 라이브러리·RPA 스크립트 기준 테이블 접근 현황이다.",
    "",
    "| DB 테이블명 | 접근 파일 수 | 접근 파일 목록 |",
    "| :--- | :---: | :--- |",
  );
  for (const tbl of sortedTables) {
    const refs = tableToFiles[tbl].slice().sort();
    push(`| \`${tbl}\` | ${refs.length} | ${formatCodeList(refs)} |`);
  }

  // Chapter 3: 34 Menu Mapping
  const fileLookup = Object.fromEntries(analysis.files.map((f) => [f.path, f]));
  const collectSubmodulesAndApis = (tabPath) => {
    const tab = fileLookup[tabPath];
    if (!tab) return { submodules: [], apis: [] };
    const subSet = new Set();
    const apiSet = new Set(tab.apiEndpointsCalled || []);
    const visited = new Set([tabPath]);
    const queue = [...tab.internalImports];
    while (queue.length > 0) {
      const dep = queue.shift();
      if (visited.has(dep)) continue;
      visited.add(dep);
      const depEntry = fileLookup[dep];
      if (!depEntry) continue;
      if (depEntry.layer === "L4_UI_SUBMODULES" || depEntry.layer === "L5_STATIC_DATA") {
        subSet.add(dep);
      }
      for (const ep of depEntry.apiEndpointsCalled || []) {
        apiSet.add(ep);
      }
      if (depEntry.layer === "L4_UI_SUBMODULES" || depEntry.layer === "L2_UI_SHARED") {
        for (const subDep of depEntry.internalImports) {
          if (!visited.has(subDep)) queue.push(subDep);
        }
      }
    }
    return {
      submodules: Array.from(subSet).sort(),
      apis: Array.from(apiSet).sort(),
    };
  };

  push(
    "",
    "---",
    "",
    "## 제3장. 7개 그룹·34개 `ErpMenuKey` 메뉴 ↔ UI 탭 ↔ API ↔ 권한키 1:1 매핑 총괄표",
    "",
    "`src/app/erp/erpMenuConfig.ts`의 `CATEGORIES` 및 `MENU_PERM_KEY_MAP`과 `src/app/erp/page.tsx`의 `renderMenuContent` 분기를 AST로 추출한 메뉴 연결 표이다.",
    "",
    "| 그룹 | `ErpMenuKey` | 메뉴 레이블 | 권한키(`permKey`) | 연결 UI 탭 컴포넌트 | 하위 모듈·데이터 파일 | 호출 API 엔드포인트 |",
    "| :--- | :--- | :--- | :--- | :--- | :--- | :--- |",
  );

  for (const cat of analysis.menuRouting.categories) {
    for (const item of cat.items) {
      const permKey = analysis.menuRouting.permKeyMap[item.key] || "-";
      const tabPath = analysis.menuRouting.menuComponentMap[item.key] || "-";
      const { submodules, apis } = collectSubmodulesAndApis(tabPath);
      push(
        `| ${cat.label} (\`${cat.key}\`) | \`${item.key}\` | ${item.label} | \`${permKey}\` | \`${tabPath}\` | ${formatCodeList(submodules)} | ${formatCodeList(apis)} |`
      );
    }
  }

  // Chapter 4: Layer-by-layer detailed specifications
  push(
    "",
    "---",
    "",
    `## 제4장. 계층별 전체 코드 파일 상세 기능 명세 (${totalFiles}개 전수)`,
    ""
  );

  analysis.layers.forEach((layer, lIdx) => {
    const layerItems = analysis.files.filter((f) => f.layer === layer.key);
    push(
      `### 4.${lIdx + 1} \`${layer.key}\` — ${layer.label} (${layerItems.length}개)`,
      "",
      `대상 범위: ${layer.dirHint}`,
      ""
    );

    layerItems.forEach((f, fIdx) => {
      const num = `${lIdx + 1}.${fIdx + 1}`;
      const symText =
        f.exports.length > 0
          ? f.exports.slice(0, 12).map((e) => `\`${e}\``).join(", ") +
            (f.exports.length > 12 ? ` 외 ${f.exports.length - 12}개` : "")
          : "없음 (진입점/설정/정적파일)";
      const sigText =
        f.optimizationSignals.length > 0
          ? f.optimizationSignals.map((s) => `\`${s}\``).join(", ")
          : "없음";
      const counterpartText = f.counterpart ? `\`${f.counterpart}\`` : "없음";

      push(
        `#### 4.${num} \`${f.path}\``,
        `- **규모 / 계층 / 메뉴ID**: ${f.lines}줄 (${f.sizeKB} KB) / \`${f.layer}\` / \`${f.menuId}\` / 대칭·연관 쌍: ${counterpartText}`,
        `- **주요 Export 심볼**: ${symText}`,
        `- **정방향 의존 (\`Out\`)**: 내부 import ${formatCodeList(f.internalImports)} · 호출 API ${formatCodeList(f.apiEndpointsCalled)}`,
        `- **역방향 피참조 (\`In\`, \`Fan-In: ${f.fanIn}\`)**: ${formatCodeList(f.importedBy)}`,
        `- **접근 DB 테이블 / 최적화 시그널**: DB ${formatCodeList(f.dbTables)} · 시그널 ${sigText}`,
        `- **핵심 기능 명세**: ${f.description}`,
        ""
      );
    });
  });

  // Appendix A: Static documents
  push(
    "---",
    "",
    `## 부록 A. ERP 참조 정적 문서 목록 (${analysis.publicDocs.length}종)`,
    "",
    "`public/docs/` 및 `public/documents/` 하위에 배치되어 ERP 화면에서 조회·임베드하는 정적 HTML·PDF 문서 목록이다.",
    "",
    "| 경로 | URL 경로 | 용량(KB) | 참조 ERP 파일 |",
    "| :--- | :--- | :---: | :--- |",
  );
  for (const doc of analysis.publicDocs) {
    push(
      `| \`${doc.path}\` | \`${doc.webUrl}\` | ${doc.sizeKB} | ${formatCodeList(doc.referencedBy)} |`
    );
  }

  // Appendix B: Non-ERP boundary files
  push(
    "",
    "---",
    "",
    `## 부록 B. 동일 저장소 내 비ERP 제외 파일 경계 (${analysis.nonErpFiles.length}개)`,
    "",
    "동일 저장소(`www.dragonrpa.co.kr`) 내 존재하나 `/erp` 진입 셸 및 `/api/erp`·공유·주주명부 의존성 범위 외부에 속하는 공식 홈페이지·라이선스 스토어·스케치 릴레이·배포 정리 파일 목록이다.",
    "",
    "| 파일 경로 | 분류 도메인 | 라인 수 | 용량(KB) |",
    "| :--- | :--- | :---: | :---: |",
  );
  for (const nf of analysis.nonErpFiles) {
    push(`| \`${nf.path}\` | ${nf.domain} | ${nf.lines} | ${nf.sizeKB} |`);
  }
  push("");

  return lines.join("\n");
}

function extractHeadingLineMap(markdownText, layers) {
  const mdLines = markdownText.split(/\r?\n/);
  const map = {};
  for (let i = 0; i < mdLines.length; i++) {
    const line = mdLines[i];
    const lineNo = i + 1;
    if (line.startsWith("## 제1장.")) map.CH1 = lineNo;
    else if (line.startsWith("## 제2장.")) map.CH2 = lineNo;
    else if (line.startsWith("## 제3장.")) map.CH3 = lineNo;
    else if (line.startsWith("## 제4장.")) map.CH4 = lineNo;
    else if (line.startsWith("## 부록 A.")) map.APP_A = lineNo;
    else if (line.startsWith("## 부록 B.")) map.APP_B = lineNo;
    else {
      for (const layer of layers) {
        if (line.includes(`\`${layer.key}\` —`)) {
          map[layer.key] = lineNo;
        }
      }
    }
  }
  return map;
}

function buildSpecMarkdown(analysis) {
  let lineMap = {};
  let md = renderSpecMarkdownPass(analysis, lineMap);
  for (let pass = 0; pass < 4; pass++) {
    const nextMap = extractHeadingLineMap(md, analysis.layers);
    const nextMd = renderSpecMarkdownPass(analysis, nextMap);
    if (nextMd === md) {
      return { markdown: nextMd, lineMap: nextMap };
    }
    md = nextMd;
    lineMap = nextMap;
  }
  return { markdown: md, lineMap: extractHeadingLineMap(md, analysis.layers) };
}

function runSync() {
  const analysis = buildAnalysisData();
  if (!fs.existsSync(DOCS_DIR)) {
    fs.mkdirSync(DOCS_DIR, { recursive: true });
  }
  const manifestJson = buildManifestJson(analysis);
  const { markdown } = buildSpecMarkdown(analysis);

  fs.writeFileSync(MANIFEST_PATH, manifestJson, "utf8");
  fs.writeFileSync(SPEC_MD_PATH, markdown, "utf8");

  console.log(
    `[spec:sync] 완료: ERP 코드 파일 ${analysis.files.length}개, 정적 문서 ${analysis.publicDocs.length}종, 비ERP 제외 ${analysis.nonErpFiles.length}개`
  );
  console.log(`  - ${toPosix(path.relative(ROOT_DIR, MANIFEST_PATH))}`);
  console.log(`  - ${toPosix(path.relative(ROOT_DIR, SPEC_MD_PATH))}`);
}

function runVerify() {
  const errors = [];
  const analysis = buildAnalysisData();
  const { descCatalog } = analysis;
  const descKeys = Object.keys(descCatalog.FILES || {}).sort();
  const discoveredKeys = analysis.files.map((f) => f.path).sort();
  const descSet = new Set(descKeys);
  const discoveredSet = new Set(discoveredKeys);

  // 1. 파일 1:1 일치 검증
  const missingInDesc = discoveredKeys.filter((k) => !descSet.has(k));
  const extraInDesc = descKeys.filter((k) => !discoveredSet.has(k));
  if (missingInDesc.length > 0) {
    errors.push(`사전 누락 파일 (${missingInDesc.length}건): ${missingInDesc.join(", ")}`);
  }
  if (extraInDesc.length > 0) {
    errors.push(`디스크 미존재 잉여 파일 (${extraInDesc.length}건): ${extraInDesc.join(", ")}`);
  }

  // 2. 기능 설명 미기재 및 금지 수식어 검증
  const validLayers = new Set(analysis.layers.map((l) => l.key));
  for (const f of analysis.files) {
    if (!validLayers.has(f.layer)) {
      errors.push(`유효하지 않은 계층(${f.layer}): ${f.path}`);
    }
    if (!f.menuId) {
      errors.push(`menuId 미기재: ${f.path}`);
    }
    if (!f.description || !f.description.trim()) {
      errors.push(`기능 명세 미기재: ${f.path}`);
    } else {
      for (const word of FORBIDDEN_MODIFIERS) {
        if (f.description.includes(word)) {
          errors.push(`금지 수식어('${word}') 포함 (${f.path}): ${f.description}`);
        }
      }
    }
  }

  // 3. 산출물 존재 및 동기화·목차·보안 검증
  if (!fs.existsSync(MANIFEST_PATH) || !fs.existsSync(SPEC_MD_PATH)) {
    errors.push("docs/code_file_manifest.json 또는 docs/CODE_FILE_SPECIFICATION.md 파일이 없습니다.");
  } else {
    const expectedManifest = buildManifestJson(analysis);
    const actualManifest = fs.readFileSync(MANIFEST_PATH, "utf8");
    if (actualManifest !== expectedManifest) {
      errors.push("docs/code_file_manifest.json이 최신 AST 상태와 동기화되어 있지 않습니다.");
    }

    const { markdown: expectedMd, lineMap } = buildSpecMarkdown(analysis);
    const actualMd = fs.readFileSync(SPEC_MD_PATH, "utf8");
    if (actualMd !== expectedMd) {
      errors.push("docs/CODE_FILE_SPECIFICATION.md가 최신 AST 상태와 동기화되어 있지 않습니다.");
    }

    // 목차 라인 번호 검증
    for (const [key, ln] of Object.entries(lineMap)) {
      const actualLines = actualMd.split(/\r?\n/);
      const targetLine = actualLines[ln - 1] || "";
      if (key.startsWith("L") && !targetLine.includes(`\`${key}\``)) {
        errors.push(`목차 라인 색인 불일치(${key} -> L${ln}): '${targetLine}'`);
      }
    }

    // 금지 수식어 전체 마크다운 비코드 영역 검증
    const mdLines = actualMd.split(/\r?\n/);
    for (let i = 0; i < mdLines.length; i++) {
      const stripped = mdLines[i].replace(/`[^`]+`/g, "");
      for (const word of FORBIDDEN_MODIFIERS) {
        if (stripped.includes(word)) {
          errors.push(`마크다운 본문 L${i + 1} 금지 수식어('${word}') 검출`);
        }
      }
    }

    // 민감정보 노출 검증
    for (const pat of SENSITIVE_PATTERNS) {
      if (pat.test(actualManifest)) {
        errors.push(`매니페스트 민감정보 패턴 검출: ${pat}`);
      }
      if (pat.test(actualMd)) {
        errors.push(`마크다운 명세서 민감정보 패턴 검출: ${pat}`);
      }
    }
  }

  if (errors.length > 0) {
    console.error(`[spec:verify] FAIL (${errors.length}건):`);
    for (const err of errors) console.error(`  - ${err}`);
    process.exit(1);
  }

  console.log(
    `[spec:verify] PASS: 대상 ${analysis.files.length}개 파일 1:1 일치, 설명 누락 0건, 금지 수식어 0건, 민감정보 0건, 목차·매니페스트 동기화 완료 (지문: ${analysis.specFingerprint})`
  );
}

function runQuery(keyword) {
  if (!keyword) {
    console.error("사용법: node scripts/generate_code_file_spec.cjs --query <검색어>");
    process.exit(1);
  }
  let manifest;
  if (fs.existsSync(MANIFEST_PATH)) {
    manifest = JSON.parse(fs.readFileSync(MANIFEST_PATH, "utf8"));
  } else {
    const analysis = buildAnalysisData();
    manifest = JSON.parse(buildManifestJson(analysis));
  }

  const q = keyword.toLowerCase();
  const matches = manifest.files.filter((f) => {
    return (
      f.path.toLowerCase().includes(q) ||
      f.menuId.toLowerCase().includes(q) ||
      f.layer.toLowerCase().includes(q) ||
      f.description.toLowerCase().includes(q) ||
      f.exports.some((e) => e.toLowerCase().includes(q)) ||
      f.dbTables.some((t) => t.toLowerCase().includes(q)) ||
      f.apiEndpointsCalled.some((a) => a.toLowerCase().includes(q))
    );
  });

  console.log(`[spec:query] '${keyword}' 검색 결과: ${matches.length}건`);
  for (const m of matches) {
    console.log(`\n- ${m.path} (${m.lines}L, ${m.sizeKB}KB | ${m.layer} | menuId=${m.menuId})`);
    console.log(`  설명: ${m.description}`);
    console.log(`  Exports: ${m.exports.length ? m.exports.join(", ") : "없음"}`);
    console.log(`  Out: ${m.internalImports.length ? m.internalImports.join(", ") : "없음"}`);
    console.log(`  In (Fan-In=${m.fanIn}): ${m.importedBy.length ? m.importedBy.join(", ") : "없음"}`);
    console.log(`  DB Tables: ${m.dbTables.length ? m.dbTables.join(", ") : "없음"}`);
  }
}

function main() {
  const args = process.argv.slice(2);
  if (args.includes("--sync")) {
    runSync();
  } else if (args.includes("--verify")) {
    runVerify();
  } else {
    const qIdx = args.indexOf("--query");
    const keyword = qIdx !== -1 ? args.slice(qIdx + 1).join(" ") : args[0];
    runQuery(keyword);
  }
}

main();
