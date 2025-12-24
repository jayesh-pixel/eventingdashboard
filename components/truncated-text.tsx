"use client"

import * as React from "react"
import { Button } from "@/components/ui/button"

interface TruncatedTextProps {
  text: string
  maxLines?: number
  className?: string
}

export function TruncatedText({ text, maxLines = 3, className = "" }: TruncatedTextProps) {
  const [isExpanded, setIsExpanded] = React.useState(false)
  const [isTruncated, setIsTruncated] = React.useState(false)
  const textRef = React.useRef<HTMLDivElement>(null)

  React.useEffect(() => {
    const checkTruncation = () => {
      if (textRef.current) {
        const lineHeight = parseInt(window.getComputedStyle(textRef.current).lineHeight)
        const maxHeight = lineHeight * maxLines
        setIsTruncated(textRef.current.scrollHeight > maxHeight)
      }
    }

    checkTruncation()
    window.addEventListener('resize', checkTruncation)
    return () => window.removeEventListener('resize', checkTruncation)
  }, [text, maxLines])

  const stripHtmlTags = (html: string) => {
    const tmp = document.createElement("DIV")
    tmp.innerHTML = html
    return tmp.textContent || tmp.innerText || ""
  }

  const displayText = stripHtmlTags(text)

  return (
    <div className={className}>
      <div
        ref={textRef}
        className={`text-sm text-muted-foreground ${!isExpanded ? 'line-clamp-' + maxLines : ''}`}
        style={{
          display: '-webkit-box',
          WebkitLineClamp: isExpanded ? 'unset' : maxLines,
          WebkitBoxOrient: 'vertical',
          overflow: isExpanded ? 'visible' : 'hidden',
        }}
      >
        {displayText}
      </div>
      {isTruncated && (
        <Button
          variant="link"
          size="sm"
          className="p-0 h-auto font-normal text-primary hover:text-primary/80 mt-1"
          onClick={() => setIsExpanded(!isExpanded)}
        >
          {isExpanded ? 'Show less' : 'Read more'}
        </Button>
      )}
    </div>
  )
}
