import { useCallback, useEffect, useRef, useState } from 'react'
import { Textarea } from '../../components/ui/primitives/textarea'

interface JsonEditorProps {
  value: object
  onChange: (value: object) => void
  readOnly?: boolean
  className?: string
}

export function JsonEditor({ value, onChange, readOnly = false, className }: JsonEditorProps) {
  const [text, setText] = useState(() => JSON.stringify(value, null, 2))
  const lastEmittedRef = useRef<string>(JSON.stringify(value))

  useEffect(() => {
    const valueStr = JSON.stringify(value)
    if (valueStr !== lastEmittedRef.current) {
      lastEmittedRef.current = valueStr
      setText(JSON.stringify(value, null, 2))
    }
  }, [value])
  const [error, setError] = useState<string | null>(null)

  const handleChange = useCallback(
    (e: React.ChangeEvent<HTMLTextAreaElement>) => {
      const newText = e.target.value
      setText(newText)
      setError(null)
      try {
        const parsed = JSON.parse(newText) as object
        lastEmittedRef.current = newText
        onChange(parsed)
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Invalid JSON')
      }
    },
    [onChange]
  )

  return (
    <div className={className}>
      <Textarea
        value={text}
        onChange={handleChange}
        readOnly={readOnly}
        className="min-h-[400px] font-mono text-sm"
      />
      {error && (
        <p className="mt-2 text-sm text-destructive">{error}</p>
      )}
    </div>
  )
}
