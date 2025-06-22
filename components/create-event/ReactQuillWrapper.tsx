"use client"

import React from 'react'
import { Textarea } from "@/components/ui/textarea"
import { Button } from "@/components/ui/button"
import { Bold, Italic, List, Link } from "lucide-react"

interface ReactQuillWrapperProps {
  value: string
  onChange: (content: string) => void
  placeholder?: string
  theme?: string
  style?: React.CSSProperties
}

export const ReactQuillWrapper: React.FC<ReactQuillWrapperProps> = ({ 
  value, 
  onChange, 
  placeholder = "", 
  style
}) => {
  const textareaRef = React.useRef<HTMLTextAreaElement>(null)

  const insertFormat = (format: string) => {
    const textarea = textareaRef.current
    if (!textarea) return

    const start = textarea.selectionStart
    const end = textarea.selectionEnd
    const selectedText = value.substring(start, end)
    
    let newText = value
    
    switch (format) {
      case 'bold':
        newText = value.substring(0, start) + `**${selectedText}**` + value.substring(end)
        break
      case 'italic':
        newText = value.substring(0, start) + `*${selectedText}*` + value.substring(end)
        break
      case 'list':
        newText = value.substring(0, start) + `- ${selectedText}` + value.substring(end)
        break
      default:
        break
    }
    
    onChange(newText)
  }

  return (
    <div style={style} className="border rounded-md">
      {/* Simple toolbar */}
      <div className="flex gap-2 p-2 border-b bg-muted/30">
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={() => insertFormat('bold')}
          className="h-8 w-8 p-0"
        >
          <Bold className="h-4 w-4" />
        </Button>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={() => insertFormat('italic')}
          className="h-8 w-8 p-0"
        >
          <Italic className="h-4 w-4" />
        </Button>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={() => insertFormat('list')}
          className="h-8 w-8 p-0"
        >
          <List className="h-4 w-4" />
        </Button>
      </div>
      
      {/* Text area */}
      <Textarea
        ref={textareaRef}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="border-0 resize-none focus-visible:ring-0 min-h-[150px]"
        rows={6}
      />
    </div>  )
}
