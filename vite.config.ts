import { resolve } from 'path'
import { defineConfig } from 'vite'
import { transformerDirectives, presetUno, presetIcons } from 'unocss'
import unocss from 'unocss/vite'
import { name } from './package.json'
import eslint from 'vite-plugin-eslint2'

export default defineConfig({
  plugins: [
    eslint({
      emitErrorAsWarning: true,
    }),
    unocss({
      presets: [
        presetUno(),
        presetIcons(),
      ],
      transformers: [
        transformerDirectives(),
      ],
    }),
  ],
  build: {
    cssCodeSplit: true,
    rollupOptions: {
      input: {
        main: resolve(__dirname, 'index.html'),
      },
    },
    lib: {
      entry: resolve(__dirname, 'src/index.ts'),
      name,
      fileName: format => `index.${format}.js`,
    },
  },
  resolve: {
    alias: {
      '@': resolve(__dirname, './src'),
    },
  },
})
