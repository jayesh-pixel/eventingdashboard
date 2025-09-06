"use client"

import React from 'react'
import { Textarea } from "@/components/ui/textarea"
import { Button } from "@/components/ui/button"
import { Bold, Italic, List, Link, ListOrdered } from "lucide-react"

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
      case 'bulletList':
        // Handle bullet points properly
        if (selectedText) {
          // If text is selected, convert each line to a bullet point
          const lines = selectedText.split('\n')
          const bulletPoints = lines.map(line => {
            const trimmedLine = line.trim()
            if (trimmedLine && !trimmedLine.startsWith('• ') && !trimmedLine.startsWith('- ')) {
              return `• ${trimmedLine}`
            }
            return line
          }).join('\n')
          newText = value.substring(0, start) + bulletPoints + value.substring(end)
        } else {
          // If no text selected, add bullet point at cursor position
          const beforeCursor = value.substring(0, start)
          const afterCursor = value.substring(end)
          const lines = beforeCursor.split('\n')
          const currentLine = lines[lines.length - 1]
          
          if (currentLine.trim() === '') {
            // Empty line, just add bullet
            newText = beforeCursor + '• ' + afterCursor
          } else {
            // Add new line with bullet
            newText = beforeCursor + '\n• ' + afterCursor
          }
        }
        break
      case 'numberedList':
        // Handle numbered lists
        if (selectedText) {
          const lines = selectedText.split('\n')
          const numberedPoints = lines.map((line, index) => {
            const trimmedLine = line.trim()
            if (trimmedLine && !trimmedLine.match(/^\d+\.\s/)) {
              return `${index + 1}. ${trimmedLine}`
            }
            return line
          }).join('\n')
          newText = value.substring(0, start) + numberedPoints + value.substring(end)
        } else {
          const beforeCursor = value.substring(0, start)
          const afterCursor = value.substring(end)
          const lines = beforeCursor.split('\n')
          const currentLine = lines[lines.length - 1]
          
          if (currentLine.trim() === '') {
            newText = beforeCursor + '1. ' + afterCursor
          } else {
            newText = beforeCursor + '\n1. ' + afterCursor
          }
        }
        break
      default:
        break
    }
    
    onChange(newText)
    
    // Focus back to textarea after formatting
    setTimeout(() => {
      textarea.focus()
    }, 0)
  }

  // Handle keyboard shortcuts and auto-continuation of lists
  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    const textarea = textareaRef.current
    if (!textarea) return

    // Handle Ctrl/Cmd + shortcuts
    if (e.ctrlKey || e.metaKey) {
      switch (e.key.toLowerCase()) {
        case 'b':
          e.preventDefault()
          insertFormat('bold')
          break
        case 'i':
          e.preventDefault()
          insertFormat('italic')
          break
        default:
          break
      }
      return
    }

    // Handle Enter key for auto-continuation of lists
    if (e.key === 'Enter') {
      const start = textarea.selectionStart
      const beforeCursor = value.substring(0, start)
      const lines = beforeCursor.split('\n')
      const currentLine = lines[lines.length - 1]

      // Check if current line is a bullet point
      const bulletMatch = currentLine.match(/^(\s*)(•|\-)\s(.*)$/)
      const numberMatch = currentLine.match(/^(\s*)(\d+)\.\s(.*)$/)

      if (bulletMatch) {
        const [, indent, bullet, content] = bulletMatch
        if (content.trim() === '') {
          // Empty bullet point, remove it
          e.preventDefault()
          const newValue = value.substring(0, start - currentLine.length) + 
                          indent + value.substring(start)
          onChange(newValue)
        } else {
          // Continue bullet list
          e.preventDefault()
          const newValue = value.substring(0, start) + `\n${indent}• ` + value.substring(start)
          onChange(newValue)
          // Set cursor position after the bullet
          setTimeout(() => {
            textarea.setSelectionRange(start + indent.length + 3, start + indent.length + 3)
          }, 0)
        }
      } else if (numberMatch) {
        const [, indent, number, content] = numberMatch
        if (content.trim() === '') {
          // Empty numbered point, remove it
          e.preventDefault()
          const newValue = value.substring(0, start - currentLine.length) + 
                          indent + value.substring(start)
          onChange(newValue)
        } else {
          // Continue numbered list
          e.preventDefault()
          const nextNumber = parseInt(number) + 1
          const newValue = value.substring(0, start) + `\n${indent}${nextNumber}. ` + value.substring(start)
          onChange(newValue)
          // Set cursor position after the number
          setTimeout(() => {
            const newPos = start + indent.length + nextNumber.toString().length + 3
            textarea.setSelectionRange(newPos, newPos)
          }, 0)
        }
      }
    }
  }

  return (
    <div style={style} className="border rounded-md">
      {/* Enhanced toolbar */}
      <div className="flex gap-2 p-2 border-b bg-muted/30">
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={() => insertFormat('bold')}
          className="h-8 w-8 p-0"
          title="Bold (Ctrl+B)"
        >
          <Bold className="h-4 w-4" />
        </Button>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={() => insertFormat('italic')}
          className="h-8 w-8 p-0"
          title="Italic (Ctrl+I)"
        >
          <Italic className="h-4 w-4" />
        </Button>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={() => insertFormat('bulletList')}
          className="h-8 w-8 p-0"
          title="Bullet List"
        >
          <List className="h-4 w-4" />
        </Button>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={() => insertFormat('numberedList')}
          className="h-8 w-8 p-0"
          title="Numbered List"
        >
          <ListOrdered className="h-4 w-4" />
        </Button>
        <div className="flex items-center text-xs text-muted-foreground ml-auto">
          Press Enter to continue lists
        </div>
      </div>
      
      {/* Text area */}
      <Textarea
        ref={textareaRef}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onKeyDown={handleKeyDown}
        placeholder={placeholder}
        className="border-0 resize-none focus-visible:ring-0 min-h-[150px]"
        rows={6}
      />
    </div>
  )
}
