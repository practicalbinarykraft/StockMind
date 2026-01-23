import { Clock, CheckCircle } from 'lucide-react'
import type { Review } from '../../types'
import { ReviewComment } from './ReviewComment'
import { Card } from '@/shared/ui/card'

interface ReviewBlockProps {
  review: Review
}

export function ReviewBlock({ review }: ReviewBlockProps) {
  const scorePercentage = (review.overallScore / 10) * 100

  return (
    <Card className="p-6 border-l-4 border-green-500">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-lg bg-green-500/20">
            <CheckCircle className="w-5 h-5 text-green-400" />
          </div>
          <div>
            <h4 className="text-lg font-bold">Рецензия #{review.id}</h4>
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Clock className="w-4 h-4" />
              {new Date(review.createdAt).toLocaleString('ru-RU')}
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-lg font-bold">{review.overallScore}/10</span>
          <div className="w-24 h-2 bg-muted rounded-full overflow-hidden">
            <div
              className={`h-full ${
                scorePercentage >= 70 ? 'bg-green-500' : scorePercentage >= 50 ? 'bg-yellow-500' : 'bg-red-500'
              }`}
              style={{ width: `${scorePercentage}%` }}
            />
          </div>
        </div>
      </div>

      {/* Overall Comment */}
      <Card className="p-4 mb-4 bg-muted/50">
        <h5 className="text-md font-semibold mb-2">Общий комментарий</h5>
        <p className="text-sm leading-relaxed text-muted-foreground">{review.overallComment}</p>
      </Card>

      {/* Scene Comments */}
      <div className="space-y-4">
        {review.sceneComments.map((sceneComment) => (
          <Card key={sceneComment.sceneId} className="p-4 bg-muted/30">
            <h5 className="text-md font-semibold mb-3">
              Сцена {sceneComment.sceneNumber} - Комментарии
            </h5>
            <div className="space-y-2">
              {sceneComment.comments.map((comment) => (
                <ReviewComment key={comment.id} comment={comment} />
              ))}
            </div>
          </Card>
        ))}
      </div>
    </Card>
  )
}
