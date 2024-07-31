import { resolve } from 'path'
import { defineConfig } from 'vite'
import UnoCSS from 'unocss/vite'
import { transformerDirectives, presetUno, presetIcons } from 'unocss'
import { name } from './package.json'

export default defineConfig({
  plugins: [
    UnoCSS({
      presets: [
        presetUno(),
        presetIcons(),
      ],
      transformers: [
        transformerDirectives(),
      ],
    })
  ],
  build: {
    lib: {
      entry: resolve(__dirname, 'src/index.ts'),
      name,
      fileName: (format) => `index.${format}.js`
    }
  }
})