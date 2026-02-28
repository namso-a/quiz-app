'use client'

import { useState } from 'react'

interface Props {
  shareCode: string
  submissionId: string
}

export default function CopyResultLink({ shareCode, submissionId }: Props) {
  const [copied, setCopied] = useState(false)

  function copy() {
    const url = `${window.location.origin}/q/${shareCode}/result/${submissionId}`
    navigator.clipboard.writeText(url)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <button
      onClick={copy}
      className="text-xs font-medium text-brand hover:text-brand-dark transition-colors"
    >
      {copied ? 'Kopieret!' : 'Kopiér resultatlink til elev'}
    </button>
  )
}
