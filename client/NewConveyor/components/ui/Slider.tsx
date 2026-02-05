import { InputHTMLAttributes } from 'react'

interface SliderProps extends Omit<InputHTMLAttributes<HTMLInputElement>, 'type'> {
  label?: string
  value: number
  min?: number
  max?: number
  step?: number
  onChange: (value: number) => void
}

export default function Slider({
  label,
  value,
  min = 0,
  max = 100,
  step = 1,
  onChange,
  className = '',
  ...props
}: SliderProps) {
  return (
    <div className={`w-full ${className}`}>
      {label && (
        <div className="flex items-center justify-between mb-2">
          <label className="block text-sm font-medium text-gray-300">
            {label}
          </label>
          <span className="text-sm text-gray-400">{value}</span>
        </div>
      )}
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        className="w-full h-2 bg-dark-700 rounded-lg appearance-none cursor-pointer slider"
        {...props}
      />
      <style>{`
        .slider::-webkit-slider-thumb {
          appearance: none;
          width: 16px;
          height: 16px;
          border-radius: 50%;
          background: rgb(59, 130, 246);
          cursor: pointer;
          border: 2px solid rgb(30, 41, 59);
        }
        .slider::-moz-range-thumb {
          width: 16px;
          height: 16px;
          border-radius: 50%;
          background: rgb(59, 130, 246);
          cursor: pointer;
          border: 2px solid rgb(30, 41, 59);
        }
      `}</style>
    </div>
  )
}
