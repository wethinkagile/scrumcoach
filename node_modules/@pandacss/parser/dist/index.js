"use strict";
var __create = Object.create;
var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __getProtoOf = Object.getPrototypeOf;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __export = (target, all) => {
  for (var name in all)
    __defProp(target, name, { get: all[name], enumerable: true });
};
var __copyProps = (to, from, except, desc) => {
  if (from && typeof from === "object" || typeof from === "function") {
    for (let key of __getOwnPropNames(from))
      if (!__hasOwnProp.call(to, key) && key !== except)
        __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
  }
  return to;
};
var __toESM = (mod, isNodeMode, target) => (target = mod != null ? __create(__getProtoOf(mod)) : {}, __copyProps(
  // If the importer is in node compatibility mode or this is not an ESM
  // file that has been converted to a CommonJS file using a Babel-
  // compatible transform (i.e. "__esModule" has not been set), then set
  // "default" to the CommonJS "module.exports" for node compatibility.
  isNodeMode || !mod || !mod.__esModule ? __defProp(target, "default", { value: mod, enumerable: true }) : target,
  mod
));
var __toCommonJS = (mod) => __copyProps(__defProp({}, "__esModule", { value: true }), mod);

// src/index.ts
var src_exports = {};
__export(src_exports, {
  ParserResult: () => ParserResult,
  Project: () => Project
});
module.exports = __toCommonJS(src_exports);

// src/project.ts
var import_ts_morph2 = require("ts-morph");

// src/parser.ts
var import_extractor = require("@pandacss/extractor");
var import_logger = require("@pandacss/logger");
var import_shared2 = require("@pandacss/shared");
var import_ts_morph = require("ts-morph");
var import_ts_pattern = require("ts-pattern");

// src/get-import-declarations.ts
var import_ts_path = require("@pandacss/config/ts-path");

// src/get-module-specifier-value.ts
var getModuleSpecifierValue = (node) => {
  try {
    return node.getModuleSpecifierValue();
  } catch {
    return;
  }
};

// src/get-import-declarations.ts
function getImportDeclarations(context, sourceFile) {
  const { imports, tsOptions } = context;
  const importDeclarations = [];
  sourceFile.getImportDeclarations().forEach((node) => {
    const mod = getModuleSpecifierValue(node);
    if (!mod)
      return;
    node.getNamedImports().forEach((specifier) => {
      const name = specifier.getNameNode().getText();
      const alias = specifier.getAliasNode()?.getText() || name;
      const result = { name, alias, mod, kind: "named" };
      const found = imports.match(result, (mod2) => {
        if (!tsOptions?.pathMappings)
          return;
        return (0, import_ts_path.resolveTsPathPattern)(tsOptions.pathMappings, mod2);
      });
      if (!found)
        return;
      importDeclarations.push(result);
    });
    const namespace = node.getNamespaceImport();
    if (namespace) {
      const name = namespace.getText();
      const result = { name, alias: name, mod, kind: "namespace" };
      const found = imports.match(result, (mod2) => {
        if (!tsOptions?.pathMappings)
          return;
        return (0, import_ts_path.resolveTsPathPattern)(tsOptions.pathMappings, mod2);
      });
      if (!found)
        return;
      importDeclarations.push(result);
    }
  });
  return importDeclarations;
}

// src/parser-result.ts
var import_shared = require("@pandacss/shared");
var ParserResult = class {
  constructor(context, encoder) {
    this.context = context;
    this.encoder = encoder ?? context.encoder;
  }
  /** Ordered list of all ResultItem */
  all = [];
  jsx = /* @__PURE__ */ new Set();
  css = /* @__PURE__ */ new Set();
  cva = /* @__PURE__ */ new Set();
  sva = /* @__PURE__ */ new Set();
  recipe = /* @__PURE__ */ new Map();
  pattern = /* @__PURE__ */ new Map();
  filePath;
  encoder;
  append(result) {
    this.all.push(result);
    return result;
  }
  set(name, result) {
    switch (name) {
      case "css":
        this.setCss(result);
        break;
      case "cva":
        this.setCva(result);
        break;
      case "sva":
        this.setSva(result);
        break;
      default:
        throw new import_shared.PandaError("UNKNOWN_TYPE", `Unknown result type ${name}`);
    }
  }
  setCss(result) {
    this.css.add(this.append(Object.assign({ type: "css" }, result)));
    const encoder = this.encoder;
    result.data.forEach((obj) => encoder.processAtomic(obj));
  }
  setCva(result) {
    this.cva.add(this.append(Object.assign({ type: "cva" }, result)));
    const encoder = this.encoder;
    result.data.forEach((data) => encoder.processAtomicRecipe(data));
  }
  setSva(result) {
    this.sva.add(this.append(Object.assign({ type: "sva" }, result)));
    const encoder = this.encoder;
    result.data.forEach((data) => encoder.processAtomicSlotRecipe(data));
  }
  setJsx(result) {
    this.jsx.add(this.append(Object.assign({ type: "jsx" }, result)));
    const encoder = this.encoder;
    result.data.forEach((obj) => encoder.processStyleProps(obj));
  }
  setPattern(name, result) {
    const set = (0, import_shared.getOrCreateSet)(this.pattern, name);
    set.add(this.append(Object.assign({ type: "pattern", name }, result)));
    const encoder = this.encoder;
    result.data.forEach(
      (obj) => encoder.processPattern(name, obj, result.type ?? "pattern", result.name)
    );
  }
  setRecipe(recipeName, result) {
    const set = (0, import_shared.getOrCreateSet)(this.recipe, recipeName);
    set.add(this.append(Object.assign({ type: "recipe" }, result)));
    const encoder = this.encoder;
    const recipes = this.context.recipes;
    const recipeConfig = recipes.getConfig(recipeName);
    if (!recipeConfig)
      return;
    const recipe = result;
    if (result.type) {
      recipe.data.forEach((data) => {
        const [recipeProps, styleProps] = recipes.splitProps(recipeName, data);
        encoder.processStyleProps(styleProps);
        encoder.processRecipe(recipeName, recipeProps);
      });
    } else {
      recipe.data.forEach((data) => {
        encoder.processRecipe(recipeName, data);
      });
    }
  }
  isEmpty() {
    return this.all.length === 0;
  }
  setFilePath(filePath) {
    this.filePath = filePath;
    return this;
  }
  merge(result) {
    result.css.forEach((item) => this.css.add(this.append(item)));
    result.cva.forEach((item) => this.cva.add(this.append(item)));
    result.sva.forEach((item) => this.sva.add(this.append(item)));
    result.jsx.forEach((item) => this.jsx.add(this.append(item)));
    result.recipe.forEach((items, name) => {
      const set = (0, import_shared.getOrCreateSet)(this.recipe, name);
      items.forEach((item) => set.add(this.append(item)));
    });
    result.pattern.forEach((items, name) => {
      const set = (0, import_shared.getOrCreateSet)(this.pattern, name);
      items.forEach((item) => set.add(this.append(item)));
    });
    return this;
  }
  toArray() {
    return this.all;
  }
  toJSON() {
    return {
      css: Array.from(this.css),
      cva: Array.from(this.cva),
      sva: Array.from(this.sva),
      jsx: Array.from(this.jsx),
      recipe: Object.fromEntries(Array.from(this.recipe.entries()).map(([key, value]) => [key, Array.from(value)])),
      pattern: Object.fromEntries(Array.from(this.pattern.entries()).map(([key, value]) => [key, Array.from(value)]))
    };
  }
};

// src/parser.ts
var combineResult = (unboxed) => {
  return [...unboxed.conditions, unboxed.raw, ...unboxed.spreadConditions];
};
var defaultEnv = {
  preset: "ECMA"
};
var evaluateOptions = {
  environment: defaultEnv
};
function createParser(context) {
  const { jsx, imports, recipes, syntax } = context;
  return function parse2(sourceFile, encoder, options) {
    if (!sourceFile)
      return;
    const importDeclarations = getImportDeclarations(context, sourceFile);
    const file = imports.file(importDeclarations);
    const filePath = sourceFile.getFilePath();
    import_logger.logger.debug(
      "ast:import",
      !file.isEmpty() ? `Found import { ${file.toString()} } in ${filePath}` : `No import found in ${filePath}`
    );
    const parserResult = new ParserResult(context, encoder);
    if (file.isEmpty() && !jsx.isEnabled) {
      return parserResult;
    }
    const extractResultByName = (0, import_extractor.extract)({
      ast: sourceFile,
      components: jsx.isEnabled ? {
        matchTag: (prop) => {
          if (options?.matchTag) {
            const isPandaComponent = file.isPandaComponent(prop.tagName);
            return isPandaComponent || options.matchTag(prop.tagName, isPandaComponent);
          }
          return !!file.matchTag(prop.tagName);
        },
        matchProp: (prop) => {
          const isPandaProp = file.matchTagProp(prop.tagName, prop.propName);
          if (options?.matchTagProp) {
            return isPandaProp && options.matchTagProp(prop.tagName, prop.propName);
          }
          return isPandaProp;
        }
      } : void 0,
      functions: {
        matchFn: (prop) => file.matchFn(prop.fnName),
        matchProp: () => true,
        matchArg: (prop) => {
          if (file.isJsxFactory(prop.fnName) && prop.index === 1 && import_ts_morph.Node.isIdentifier(prop.argNode))
            return false;
          return true;
        }
      },
      taggedTemplates: syntax === "template-literal" ? {
        matchTaggedTemplate: (tag) => file.matchFn(tag.fnName)
      } : void 0,
      getEvaluateOptions: (node) => {
        if (!import_ts_morph.Node.isCallExpression(node))
          return evaluateOptions;
        const propAccessExpr = node.getExpression();
        if (!import_ts_morph.Node.isPropertyAccessExpression(propAccessExpr))
          return evaluateOptions;
        let name = propAccessExpr.getText();
        if (!file.isRawFn(name)) {
          return evaluateOptions;
        }
        name = name.replace(".raw", "");
        return {
          environment: Object.assign({}, defaultEnv, {
            extra: {
              [name]: { raw: (v) => v }
            }
          })
        };
      },
      flags: { skipTraverseFiles: true }
    });
    extractResultByName.forEach((result, alias) => {
      const name = file.getName(file.normalizeFnName(alias));
      import_logger.logger.debug(`ast:${name}`, name !== alias ? { kind: result.kind, alias } : { kind: result.kind });
      if (result.kind === "function") {
        (0, import_ts_pattern.match)(name).when(imports.matchers.css.match, (name2) => {
          result.queryList.forEach((query) => {
            if (query.kind === "call-expression") {
              if (query.box.value.length > 1) {
                parserResult.set(name2, {
                  name: name2,
                  box: query.box,
                  data: query.box.value.reduce(
                    (acc, value) => [...acc, ...combineResult((0, import_extractor.unbox)(value))],
                    []
                  )
                });
              } else {
                parserResult.set(name2, {
                  name: name2,
                  box: query.box.value[0] ?? import_extractor.box.fallback(query.box),
                  data: combineResult((0, import_extractor.unbox)(query.box.value[0]))
                });
              }
            } else if (query.kind === "tagged-template") {
              const obj = (0, import_shared2.astish)(query.box.value);
              parserResult.set(name2, {
                name: name2,
                box: query.box ?? import_extractor.box.fallback(query.box),
                data: [obj]
              });
            }
          });
        }).when(file.isValidPattern, (name2) => {
          result.queryList.forEach((query) => {
            if (query.kind === "call-expression") {
              parserResult.setPattern(name2, {
                name: name2,
                box: query.box.value[0] ?? import_extractor.box.fallback(query.box),
                data: combineResult((0, import_extractor.unbox)(query.box.value[0]))
              });
            }
          });
        }).when(file.isValidRecipe, (name2) => {
          result.queryList.forEach((query) => {
            if (query.kind === "call-expression") {
              parserResult.setRecipe(name2, {
                name: name2,
                box: query.box.value[0] ?? import_extractor.box.fallback(query.box),
                data: combineResult((0, import_extractor.unbox)(query.box.value[0]))
              });
            }
          });
        }).when(jsx.isJsxFactory, () => {
          result.queryList.forEach((query) => {
            if (query.kind === "call-expression" && query.box.value[1]) {
              const map = query.box.value[1];
              const boxNode = import_extractor.box.isMap(map) ? map : import_extractor.box.fallback(query.box);
              const combined = combineResult((0, import_extractor.unbox)(boxNode));
              const transformed = options?.transform?.({ type: "jsx-factory", data: combined });
              const result2 = { name, box: boxNode, data: transformed ?? combined };
              if (import_extractor.box.isRecipe(map)) {
                parserResult.setCva(result2);
              } else {
                parserResult.set("css", result2);
              }
              const recipeOptions = query.box.value[2];
              if (import_extractor.box.isUnresolvable(map) && recipeOptions && import_extractor.box.isMap(recipeOptions) && recipeOptions.value.has("defaultProps")) {
                const maybeIdentifier = map.getNode();
                if (import_ts_morph.Node.isIdentifier(maybeIdentifier)) {
                  const name2 = maybeIdentifier.getText();
                  const recipeName = file.getName(name2);
                  parserResult.setRecipe(recipeName, {
                    type: "jsx-recipe",
                    name: recipeName,
                    box: recipeOptions,
                    data: combineResult((0, import_extractor.unbox)(recipeOptions.value.get("defaultProps")))
                  });
                }
              }
            } else if (query.kind === "tagged-template") {
              const obj = (0, import_shared2.astish)(query.box.value);
              parserResult.set("css", {
                name,
                box: query.box ?? import_extractor.box.fallback(query.box),
                data: [obj]
              });
            }
          });
        }).when(file.isJsxFactory, (name2) => {
          result.queryList.forEach((query) => {
            if (query.kind === "call-expression") {
              const map = query.box.value[0];
              const boxNode = import_extractor.box.isMap(map) ? map : import_extractor.box.fallback(query.box);
              const combined = combineResult((0, import_extractor.unbox)(boxNode));
              const transformed = options?.transform?.({ type: "jsx-factory", data: combined });
              const result2 = { name: name2, box: boxNode, data: transformed ?? combined };
              if (import_extractor.box.isRecipe(map)) {
                parserResult.setCva(result2);
              } else {
                parserResult.set("css", result2);
              }
            } else if (query.kind === "tagged-template") {
              const obj = (0, import_shared2.astish)(query.box.value);
              parserResult.set("css", {
                name: name2,
                box: query.box ?? import_extractor.box.fallback(query.box),
                data: [obj]
              });
            }
          });
        }).otherwise(() => {
        });
      } else if (jsx.isEnabled && result.kind === "component") {
        result.queryList.forEach((query) => {
          const data = combineResult((0, import_extractor.unbox)(query.box));
          switch (true) {
            case (file.isJsxFactory(name) || file.isJsxFactory(alias)): {
              parserResult.setJsx({ type: "jsx-factory", name, box: query.box, data });
              break;
            }
            case (jsx.isJsxTagPattern(name) || jsx.isJsxTagPattern(alias)): {
              parserResult.setPattern(name, { type: "jsx-pattern", name, box: query.box, data });
              break;
            }
            case jsx.isJsxTagRecipe(name): {
              const matchingRecipes = recipes.filter(name);
              matchingRecipes.map((recipe) => {
                parserResult.setRecipe(recipe.baseName, { type: "jsx-recipe", name, box: query.box, data });
              });
              break;
            }
            case jsx.isJsxTagRecipe(alias): {
              const matchingRecipes = recipes.filter(alias);
              matchingRecipes.map((recipe) => {
                parserResult.setRecipe(recipe.baseName, { type: "jsx-recipe", name: alias, box: query.box, data });
              });
              break;
            }
            default: {
              parserResult.setJsx({ type: "jsx", name, box: query.box, data });
            }
          }
        });
      }
    });
    return parserResult;
  };
}

// src/svelte-to-tsx.ts
var import_magic_string = __toESM(require("magic-string"));
var regex_style_tags = /<!--[^]*?-->|<style(\s[^]*?)?(?:>([^]*?)<\/style>|\/>)/gi;
var regex_script_tags = /<!--[^]*?-->|<script(\s[^]*?)?(?:>([^]*?)<\/script>|\/>)/gi;
var svelteToTsx = (code) => {
  try {
    const scripts = [];
    const original = new import_magic_string.default(code);
    let match2;
    while ((match2 = regex_script_tags.exec(code)) != null) {
      const [fullMatch, _attributesStr, scriptContent] = match2;
      if (scriptContent) {
        scripts.push(scriptContent);
        original.remove(match2.index, match2.index + fullMatch.length);
      }
    }
    const templateContent = original.toString().trimStart().replace(regex_style_tags, "").replace(regex_style_tags, "");
    const transformed = `${scripts.join("")}
const render = <div>${templateContent}</div>`;
    return transformed.toString().trim();
  } catch (err) {
    return "";
  }
};

// src/vue-to-tsx.ts
var import_compiler_sfc = require("@vue/compiler-sfc");
var import_magic_string2 = __toESM(require("magic-string"));
var NodeTypes = {
  ROOT: 0,
  ELEMENT: 1,
  TEXT: 2,
  COMMENT: 3,
  SIMPLE_EXPRESSION: 4,
  INTERPOLATION: 5,
  ATTRIBUTE: 6,
  DIRECTIVE: 7,
  COMPOUND_EXPRESSION: 8,
  IF: 9,
  IF_BRANCH: 10,
  FOR: 11,
  TEXT_CALL: 12,
  VNODE_CALL: 13,
  JS_CALL_EXPRESSION: 14,
  JS_OBJECT_EXPRESSION: 15,
  JS_PROPERTY: 16,
  JS_ARRAY_EXPRESSION: 17,
  JS_FUNCTION_EXPRESSION: 18,
  JS_CONDITIONAL_EXPRESSION: 19,
  JS_CACHE_EXPRESSION: 20,
  JS_BLOCK_STATEMENT: 21,
  JS_TEMPLATE_LITERAL: 22,
  JS_IF_STATEMENT: 23,
  JS_ASSIGNMENT_EXPRESSION: 24,
  JS_SEQUENCE_EXPRESSION: 25,
  JS_RETURN_STATEMENT: 26
};
var vueToTsx = (code) => {
  try {
    const parsed = (0, import_compiler_sfc.parse)(code);
    const fileStr = new import_magic_string2.default(`<template>${parsed.descriptor.template?.content}</template>` ?? "");
    const rewriteProp = (prop) => {
      if (prop.type === NodeTypes.DIRECTIVE && prop.exp?.type === NodeTypes.SIMPLE_EXPRESSION && prop.arg?.type === NodeTypes.SIMPLE_EXPRESSION) {
        fileStr.replace(prop.loc.source, `${prop.arg.content}={${prop.exp.content}}`);
      }
    };
    const stack = Array.from(parsed.descriptor.template?.ast?.children ?? []);
    while (stack.length) {
      const node = stack.pop();
      if (!node)
        continue;
      if (node.type === NodeTypes.ELEMENT) {
        node.props.forEach(rewriteProp);
        node.children.forEach((child) => stack.push(child));
      }
    }
    const scriptContent = (parsed.descriptor.scriptSetup ?? parsed.descriptor.script)?.content + "\n";
    const transformed = new import_magic_string2.default(`${scriptContent}
const render = ${fileStr.toString()}`);
    return transformed.toString();
  } catch (err) {
    return "";
  }
};

// src/project.ts
var createTsProject = (options) => new import_ts_morph2.Project({
  skipAddingFilesFromTsConfig: true,
  skipFileDependencyResolution: true,
  skipLoadingLibFiles: true,
  ...options,
  compilerOptions: {
    allowJs: true,
    strictNullChecks: false,
    skipLibCheck: true,
    ...options.compilerOptions
  }
});
var Project = class {
  constructor(options) {
    this.options = options;
    const { parserOptions } = options;
    this.project = createTsProject(options);
    this.parser = createParser(parserOptions);
    this.createSourceFiles();
  }
  project;
  parser;
  get files() {
    return this.options.getFiles();
  }
  getSourceFile = (filePath) => {
    return this.project.getSourceFile(filePath);
  };
  createSourceFile = (filePath) => {
    const { readFile } = this.options;
    return this.project.createSourceFile(filePath, readFile(filePath), {
      overwrite: true,
      scriptKind: import_ts_morph2.ScriptKind.TSX
    });
  };
  createSourceFiles = () => {
    const files = this.getFiles();
    for (const file of files) {
      this.createSourceFile(file);
    }
  };
  addSourceFile = (filePath, content) => {
    return this.project.createSourceFile(filePath, content, {
      overwrite: true,
      scriptKind: import_ts_morph2.ScriptKind.TSX
    });
  };
  removeSourceFile = (filePath) => {
    const sourceFile = this.project.getSourceFile(filePath);
    if (sourceFile) {
      return this.project.removeSourceFile(sourceFile);
    }
    return false;
  };
  reloadSourceFile = (filePath) => {
    return this.getSourceFile(filePath)?.refreshFromFileSystemSync();
  };
  reloadSourceFiles = () => {
    const files = this.getFiles();
    for (const file of files) {
      const source = this.getSourceFile(file);
      source?.refreshFromFileSystemSync() ?? this.project.addSourceFileAtPath(file);
    }
  };
  get readFile() {
    return this.options.readFile;
  }
  get getFiles() {
    return this.options.getFiles;
  }
  parseJson = (filePath) => {
    const { readFile, parserOptions } = this.options;
    const content = readFile(filePath);
    parserOptions.encoder.fromJSON(JSON.parse(content));
    const result = new ParserResult(parserOptions);
    return result.setFilePath(filePath);
  };
  parseSourceFile = (filePath, encoder) => {
    const { hooks } = this.options;
    if (filePath.endsWith(".json")) {
      return this.parseJson(filePath);
    }
    const sourceFile = this.project.getSourceFile(filePath);
    if (!sourceFile)
      return;
    const original = sourceFile.getText();
    const options = {};
    const custom = hooks["parser:before"]?.({
      filePath,
      content: original,
      configure(opts) {
        const { matchTag, matchTagProp } = opts;
        if (matchTag) {
          options.matchTag = matchTag;
        }
        if (matchTagProp) {
          options.matchTagProp = matchTagProp;
        }
      }
    });
    const transformed = custom ?? this.transformFile(filePath, original);
    if (original !== transformed) {
      sourceFile.replaceWithText(transformed);
    }
    if (hooks["parser:preprocess"]) {
      options.transform = hooks["parser:preprocess"];
    }
    const result = this.parser(sourceFile, encoder, options)?.setFilePath(filePath);
    hooks["parser:after"]?.({ filePath, result });
    return result;
  };
  transformFile = (filePath, content) => {
    if (filePath.endsWith(".vue")) {
      return vueToTsx(content);
    }
    if (filePath.endsWith(".svelte")) {
      return svelteToTsx(content);
    }
    return content;
  };
};
// Annotate the CommonJS export names for ESM import in node:
0 && (module.exports = {
  ParserResult,
  Project
});
