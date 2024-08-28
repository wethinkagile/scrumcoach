// ../../node_modules/.pnpm/tsup@8.0.2_typescript@5.3.3/node_modules/tsup/assets/esm_shims.js
import { fileURLToPath } from "url";
import path from "path";
var getFilename = () => fileURLToPath(import.meta.url);
var getDirname = () => path.dirname(getFilename());
var __dirname = /* @__PURE__ */ getDirname();

// src/index.ts
import { Builder, setLogStream } from "@pandacss/node";
import { createRequire } from "module";
import path2 from "path";
var customRequire = createRequire(__dirname);
var PLUGIN_NAME = "pandacss";
var interopDefault = (obj) => obj && obj.__esModule ? obj.default : obj;
var loadConfig = () => interopDefault(customRequire("@pandacss/postcss"));
var stream;
var builder = new Builder();
var pandacss = (options = {}) => {
  const { configPath, cwd, logfile, allow } = options;
  if (!stream && logfile) {
    stream = setLogStream({ cwd, logfile });
  }
  return {
    postcssPlugin: PLUGIN_NAME,
    plugins: [
      async function(root, result) {
        const fileName = result.opts.from;
        const skip = shouldSkip(fileName, allow);
        if (skip)
          return;
        await builder.setup({ configPath, cwd });
        if (!builder.isValidRoot(root))
          return;
        await builder.emit();
        builder.extract();
        builder.registerDependency((dep) => {
          result.messages.push({
            ...dep,
            plugin: PLUGIN_NAME,
            parent: result.opts.from
          });
        });
        builder.write(root);
        root.walk((node) => {
          if (!node.source) {
            node.source = root.source;
          }
        });
      }
    ]
  };
};
pandacss.postcss = true;
var src_default = pandacss;
var nodeModulesRegex = /node_modules/;
function isValidCss(file) {
  const [filePath] = file.split("?");
  return path2.extname(filePath) === ".css";
}
var shouldSkip = (fileName, allow) => {
  if (!fileName)
    return true;
  if (!isValidCss(fileName))
    return true;
  if (allow?.some((p) => p.test(fileName)))
    return false;
  return nodeModulesRegex.test(fileName);
};
export {
  src_default as default,
  loadConfig,
  pandacss
};
