import Link from 'next/link'
export default function RichText({ text }: { text: string }) {
  const parts = text.split(/([#@][\p{L}0-9_]+)/gu)
  return <>{parts.map((p, i) => p.startsWith('#') && p.length > 1
    ? <Link key={i} href={`/explore?q=${encodeURIComponent(p)}`} className="font-medium text-accent hover:underline">{p}</Link>
    : p.startsWith('@') && p.length > 1 ? <Link key={i} href={`/u/${p.slice(1).toLowerCase()}`} className="font-medium text-accent hover:underline">{p}</Link>
    : <span key={i}>{p}</span>)}</>
}
