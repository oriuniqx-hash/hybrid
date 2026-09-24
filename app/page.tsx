import { readFileSync } from 'node:fs'
import path from 'node:path'

function readExportedString(filePath: string) {
  const source = readFileSync(filePath, 'utf8').trim()
  const expression = source
    .replace(/^export default\s+/, '')
    .replace(/\s+as string;?$/, '')
    .trim()
  return JSON.parse(expression) as string
}

function readTail(filePath: string) {
  const source = readExportedString(filePath)
  return Buffer.from(source, 'base64').toString('utf8')
}

export default function Home() {
  const base = path.join(process.cwd(), 'lib', 'hybrid-layout')
  const html = [
    readExportedString(path.join(base, 'part01.ts')),
    readExportedString(path.join(base, 'part02.ts')),
    readExportedString(path.join(base, 'part03.ts')),
    readExportedString(path.join(base, 'part04.ts')),
    readExportedString(path.join(base, 'part05.ts')),
    readTail(path.join(base, 'part06.b64.ts')),
  ].join('')

  return (
    <main className="fixed inset-0 overflow-hidden bg-[#05070c]">
      <iframe
        title="HYBRID by OriUniqx"
        srcDoc={html}
        className="h-full w-full border-0"
        sandbox="allow-scripts allow-same-origin allow-forms allow-popups"
      />
    </main>
  )
}
