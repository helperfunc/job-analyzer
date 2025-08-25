import React from 'react'

interface VisibilitySelectorProps {
  value: 'public' | 'private' | 'friends'
  onChange: (visibility: 'public' | 'private' | 'friends') => void
  className?: string
  disabled?: boolean
  compact?: boolean
}

const VisibilitySelector: React.FC<VisibilitySelectorProps> = ({
  value,
  onChange,
  className = '',
  disabled = false,
  compact = false
}) => {
  const options = [
    {
      value: 'public',
      label: 'Public',
      icon: '🌐',
      description: 'Visible to everyone'
    },
    {
      value: 'friends',
      label: 'Friends',
      icon: '👥',
      description: 'Visible to friends only'
    },
    {
      value: 'private',
      label: 'Private',
      icon: '🔒',
      description: 'Only visible to you'
    }
  ]

  if (compact) {
    // Compact version - dropdown select
    return (
      <div className={`flex items-center gap-2 ${className}`}>
        <span className="text-sm text-gray-600">Visibility:</span>
        <select
          value={value}
          onChange={(e) => onChange(e.target.value as any)}
          disabled={disabled}
          className="text-sm border border-gray-300 rounded px-2 py-1 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
        >
          {options.map((option) => (
            <option key={option.value} value={option.value}>
              {option.icon} {option.label}
            </option>
          ))}
        </select>
      </div>
    )
  }

  return (
    <div className={`space-y-2 ${className}`}>
      <label className="block text-sm font-medium text-gray-700 mb-2">
        Visibility
      </label>
      <div className="space-y-2">
        {options.map((option) => (
          <label
            key={option.value}
            className={`flex items-center p-3 border rounded-lg cursor-pointer hover:bg-gray-50 ${
              value === option.value
                ? 'border-blue-500 bg-blue-50'
                : 'border-gray-200'
            } ${disabled ? 'opacity-50 cursor-not-allowed' : ''}`}
          >
            <input
              type="radio"
              name="visibility"
              value={option.value}
              checked={value === option.value}
              onChange={(e) => onChange(e.target.value as any)}
              disabled={disabled}
              className="sr-only"
            />
            <span className="text-lg mr-3">{option.icon}</span>
            <div className="flex-1">
              <div className="font-medium text-gray-900">{option.label}</div>
              <div className="text-sm text-gray-500">{option.description}</div>
            </div>
            {value === option.value && (
              <svg className="w-5 h-5 text-blue-500" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
              </svg>
            )}
          </label>
        ))}
      </div>
    </div>
  )
}

export default VisibilitySelector