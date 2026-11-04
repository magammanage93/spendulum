import { defineConfig, minimal2023Preset } from '@vite-pwa/assets-generator/config'

// logo.svg is full-bleed and opaque: iOS rounds the corners itself, and the
// artwork already sits inside the maskable safe zone, so no padding is added.
export default defineConfig({
  preset: {
    ...minimal2023Preset,
    transparent: { ...minimal2023Preset.transparent, padding: 0 },
    maskable: { ...minimal2023Preset.maskable, padding: 0 },
    apple: { ...minimal2023Preset.apple, padding: 0 },
  },
  images: ['public/logo.svg'],
})
