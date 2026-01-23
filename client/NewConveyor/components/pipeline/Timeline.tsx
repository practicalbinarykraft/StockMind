import { usePipelineStore } from '../../lib/store/pipeline-store'

export function Timeline() {
  const scenes = usePipelineStore((state) => state.scenes)
  const totalDuration = usePipelineStore((state) => state.totalDuration())
  const fps = usePipelineStore((state) => state.fps)

  if (!scenes || scenes.length === 0 || totalDuration === 0) {
    return (
      <div className="w-full h-8 rounded-md bg-dark-700/50 flex items-center justify-center text-xs text-gray-400 border border-dark-600/50">
        Нет сцен
      </div>
    )
  }

  return (
    <div className="w-full h-8 rounded-md overflow-hidden flex border border-dark-600/50">
      {scenes.map((scene, index) => {
        const sceneDuration = scene.durationInFrames || 90
        const widthPercent = (sceneDuration / totalDuration) * 100
        const durationInSeconds = sceneDuration / fps
        const bgColor = index % 2 === 0 ? 'bg-dark-700' : 'bg-dark-600'

        return (
          <div
            key={scene.id}
            className={`${bgColor} border-r border-dark-800 flex items-center justify-center text-xs text-gray-200 px-1 truncate cursor-help hover:opacity-90 transition-opacity group relative`}
            style={{ width: `${widthPercent}%` }}
            title={`Сцена ${scene.order}: ${scene.text || '(без текста)'} - ${durationInSeconds.toFixed(1)} сек`}
          >
            {scene.text ? (
              <span className="truncate w-full text-center text-[10px]">{scene.text}</span>
            ) : (
              <span>{index + 1}</span>
            )}
          </div>
        )
      })}
    </div>
  )
}
