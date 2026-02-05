import { CheckCircle, XCircle, Lightbulb, Info } from 'lucide-react'
import { ReviewComment as ReviewCommentType } from '../../types'

interface ReviewCommentProps {
  comment: ReviewCommentType
}

const commentIcons = {
  positive: CheckCircle,
  negative: XCircle,
  suggestion: Lightbulb,
  info: Info,
}

const commentColors = {
  positive: 'text-green-400',
  negative: 'text-red-400',
  suggestion: 'text-yellow-400',
  info: 'text-gray-400',
}

export function ReviewComment({ comment }: ReviewCommentProps) {
  const Icon = commentIcons[comment.type]
  const colorClass = commentColors[comment.type]

  return (
    <div className="flex items-start gap-2">
      <Icon className={`w-4 h-4 mt-0.5 flex-shrink-0 ${colorClass}`} />
      <span className={`text-sm ${colorClass}`}>{comment.text}</span>
    </div>
  )
}
