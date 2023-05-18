import fs from 'node:fs'
import path from 'node:path'
import { cpus } from 'node:os'
import { ImagePool } from '@squoosh/lib'
import { commands, window } from 'vscode'
import { type ExtensionContext } from 'vscode'
import recursive from 'recursive-readdir'

const supportExtensions = ['.webp', '.png', '.jpg', 'jpeg']

async function compress(imageFiles: Array<string>) {
  const imagePool = new ImagePool(cpus().length)
  for (let index = 0; index < imageFiles.length; index++) {
    const imageFile = imageFiles[index]
    const extension = path.extname(imageFile)
    const fileName = imageFile.replace(extension, '')
    const file = await fs.readFileSync(imageFile)
    const image = await imagePool.ingestImage(file)
    const encodeOptions = {
      webp: {
        quality: 75,
        effort: 6,
      },
    }
    await image.encode(encodeOptions)
    const rawData = (await image.encodedWith.webp)?.binary
    if (rawData)
      fs.writeFileSync(`${fileName}.webp`, rawData)
  }
  imagePool.close()
  window.showInformationMessage('压缩完成...')
}

function ignoreFunc(file: string, stats: fs.Stats) {
  const ext = path.extname(file)
  if (file.endsWith('DS_Store'))
    return true
  if (stats.isFile() && !supportExtensions.includes(ext))
    return true
  return false
}

function activate(context: ExtensionContext) {
  const disposable = commands.registerCommand('convert', async (obj) => {
    const filePath = obj.fsPath
    const ext = path.extname(filePath)
    // folder
    if (fs.statSync(filePath).isDirectory()) {
      recursive(filePath, [ignoreFunc], (err, files) => {
        if (err)
          window.showErrorMessage('发生错误了', err.message)
        compress(files)
      })
    }
    if (fs.statSync(filePath).isFile()) {
      if (supportExtensions.includes(ext))
        compress([filePath])
      else
        window.showErrorMessage('not support file')
    }
  })
  context.subscriptions.push(disposable)
}

function deactivate() {}

module.exports = {
  activate,
  deactivate,
}
