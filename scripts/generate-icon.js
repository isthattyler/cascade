const sharp = require('sharp')
const path = require('path')

const sizes = [64, 128, 256, 512]
const svg = path.resolve(__dirname, '../assets/icon.svg')
const outDir = path.resolve(__dirname, '../build')

async function main() {
  for (const size of sizes) {
    const pngPath = path.join(outDir, `icon-${size}.png`)
    await sharp(svg)
      .resize(size, size)
      .png()
      .toFile(pngPath)
    console.log(`Generated ${pngPath} (${size}x${size})`)
  }

  // 512x512 as the default icon (electron-builder scales as needed)
  await sharp(svg)
    .resize(512, 512)
    .png()
    .toFile(path.join(outDir, 'icon.png'))
  console.log('Generated build/icon.png (512x512)')
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
