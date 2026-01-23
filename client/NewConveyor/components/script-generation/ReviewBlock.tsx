import { Clock, CheckCircle } from 'lucide-react'
import { Review } from '../../types'
import { ReviewComment } from './ReviewComment'

interface ReviewBlockProps {
  review: Review
}

export function ReviewBlock({ review }: ReviewBlockProps) {
  const scorePercentage = (review.overallScore / 10) * 100

  return (
    <div className="glass rounded-lg p-6 border-l-4 border-green-500">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-lg bg-green-500/20">
            <CheckCircle className="w-5 h-5 text-green-400" />
          </div>
          <div>
            <h4 className="text-lg font-bold text-white">Рецензия #{review.id}</h4>
            <div className="flex items-center gap-2 text-sm text-gray-400">
              <Clock className="w-4 h-4" />
              {new Date(review.createdAt).toLocaleString('ru-RU')}
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-lg font-bold text-white">{review.overallScore}/10</span>
          <div className="w-24 h-2 bg-dark-700 rounded-full overflow-hidden">
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
      <div className="glass rounded-lg p-4 mb-4">
        <h5 className="text-md font-semibold text-white mb-2">Общий комментарий</h5>
        <p className="text-sm text-gray-300 leading-relaxed">{review.overallComment}</p>
      </div>

      {/* Scene Comments */}
      <div className="space-y-4">
        {review.sceneComments.map((sceneComment) => (
          <div key={sceneComment.sceneId} className="glass rounded-lg p-4">
            <h5 className="text-md font-semibold text-white mb-3">
              Сцена {sceneComment.sceneNumber} - Комментарии
            </h5>
            <div className="space-y-2">
              {sceneComment.comments.map((comment) => (
                <ReviewComment key={comment.id} comment={comment} />
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
