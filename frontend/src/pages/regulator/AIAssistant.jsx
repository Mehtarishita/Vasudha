import React, { useState } from 'react'
import { PaperAirplaneIcon } from '@heroicons/react/24/outline'

const AIAssistant = () => {
  const [messages, setMessages] = useState([{
    from: 'assistant',
    text: 'Hello! I can help you analyze risk, scan reports, or draft notices. What would you like to do?'
  }])
  const [input, setInput] = useState('')

  const send = () => {
    if (!input.trim()) return
    const userMsg = { from: 'user', text: input }
    setMessages((m) => [...m, userMsg])
    setInput('')
    // Mock assistant reply
    setTimeout(() => {
      setMessages((m) => [...m, { from: 'assistant', text: `Received: "${userMsg.text}" — (This is a mock response).` }])
    }, 700)
  }

  return (
    <div className="flex flex-col h-full">
      <div className="mb-4">
        <h1 className="text-2xl font-bold text-gray-900">AI Assistant</h1>
        <p className="text-gray-600">Ask for insights, summaries, or next steps. (Mock assistant)</p>
      </div>

      <div className="flex-1 p-4 overflow-y-auto bg-white rounded-lg border border-gray-200">
        {messages.map((m, idx) => (
          <div key={idx} className={`mb-3 max-w-xl ${m.from === 'assistant' ? 'text-left' : 'ml-auto text-right'}`}>
            <div className={`inline-block px-4 py-2 rounded-lg ${m.from === 'assistant' ? 'bg-gray-100 text-gray-800' : 'bg-green-600 text-white'}`}>
              {m.text}
            </div>
          </div>
        ))}
      </div>

      <div className="mt-4">
        <div className="flex items-center gap-2">
          <input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && send()}
            placeholder="Type a question or request..."
            className="flex-1 px-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-green-500"
          />
          <button onClick={send} className="p-2 bg-green-600 rounded-lg text-white">
            <PaperAirplaneIcon className="w-5 h-5 rotate-90" />
          </button>
        </div>
      </div>
    </div>
  )
}

export default AIAssistant
