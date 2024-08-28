import { PluginCreator } from 'postcss';

interface PluginOptions {
    configPath?: string;
    cwd?: string;
    logfile?: string;
    allow?: RegExp[];
}
declare const loadConfig: () => any;
declare const pandacss: PluginCreator<PluginOptions>;

export { type PluginOptions, pandacss as default, loadConfig, pandacss };
