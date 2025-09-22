"use client"

import * as React from "react"
import { MessageCircle, X } from "lucide-react"
import ChatWindow from "@/components/ai/ChatWindow"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"

export default function ChatWidget() {
  const [open, setOpen] = React.useState(false)

  return (
    <>
      {/* Toggle button */}
      <button
        aria-label="Open chat"
        onClick={() => setOpen(true)}
        className={`fixed bottom-4 right-4 z-50 rounded-full shadow-lg border bg-primary text-primary-foreground p-3 transition-opacity hover:bg-primary/90 ${open ? "opacity-0 pointer-events-none" : "opacity-100"}`}
      >
        <MessageCircle className="h-5 w-5" />
      </button>

      {/* Floating panel */}
      {open && (
        <div className="fixed bottom-4 right-4 z-50 w-[360px] max-w-[92vw]">
          <Card className="overflow-hidden border shadow-xl">
            <CardHeader className="flex items-center justify-between py-2 pl-4 pr-2">
              <CardTitle className="text-sm">AI Assistant</CardTitle>
              <button
                aria-label="Close chat"
                onClick={() => setOpen(false)}
                className="rounded-md p-1 text-muted-foreground hover:bg-accent"
              >
                <X className="h-4 w-4" />
              </button>
            </CardHeader>
            <CardContent className="p-0">
              {/* Reuse existing ChatWindow (UI-only) */}
              <div className="h-[520px]">
                <ChatWindow />
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </>
  )
}
