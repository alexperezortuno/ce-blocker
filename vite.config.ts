import {defineConfig} from 'vite'
import vue from '@vitejs/plugin-vue'
import webExtension, {readJsonFile} from "vite-plugin-web-extension";
import * as path from "node:path";

function generateManifest() {
    const manifest = readJsonFile("src/manifest.json");
    const pkg = readJsonFile("package.json");
    return {
        name: pkg.name,
        description: pkg.description,
        version: pkg.version,
        ...manifest,
    };
}

export default defineConfig({
    plugins: [
        vue(),
    ],
    resolve: {
        alias: {
            '~bootstrap': path.resolve(__dirname, 'node_modules/bootstrap'),
        }
    },
    build: {
        target: "esnext",
        rollupOptions: {
            input: {
                popup: "index.html",
                background: "src/background/background.ts",
            },
            output: {
                entryFileNames: "assets/[name].js"
            }
        }
    }
});
