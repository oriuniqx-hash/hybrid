'use client'
import { useState } from 'react'
import { sb } from '../../lib/supabase/client'
import { useMe } from '../../lib/useMe'
import { Modal, toast } from '../ui'

const REASONS = ['Spam', 'Nudity or sexual content', 'Hate speech or symbols', 'Harassment or bullying', 'Violence', 'False information', 'Intellectual property', 'Scam or fraud', 'Self-harm', 'Something else']

export default function ReportDialog({ postId, userId, open, onClose }: { postId?: string; userId?: string; open: boolean; onClose: () => void }) {
  const me = useMe()
  const [reason, setReason] = useState('')
  const [details, setDetails] = useState('')
  async function submit() {
    const { error } = await sb().from('reports').insert({ reporter_id: me.id, post_id: postId || null, reported_user_id: userId || null, reason, details: details || null })
    if (error) return toast(error.message)
    toast('Thanks — our moderators will review this'); onClose(); setReason(''); setDetails('')
  }
  return (
    <Modal open={open} onClose={onClose} title="Report">
      <div className="space-y-1">
        {REASONS.map(r => (
          <label key={r} className="flex cursor-pointer items-center gap-3 rounded-xl p-2.5 hover:bg-surface2">
            <input type="radio" name="reason" checked={reason === r} onChange={() => setReason(r)} className="accent-[rgb(var(--accent))]" />
            <span className="text-sm">{r}</span>
          </label>
        ))}
      </div>
      <textarea className="input mt-3 min-h-20" placeholder="Anything else we should know? (optional)" value={details} onChange={e => setDetails(e.target.value)} />
      <button disabled={!reason} onClick={submit} className="btn-primary mt-4 w-full">Submit report</button>
    </Modal>
  )
}
