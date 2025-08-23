
'use client';

import React, { useState } from 'react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { SendHorizonal } from 'lucide-react';
import { AnimatePresence, motion } from 'framer-motion';


interface ChatInputProps {
  onSendMessage: (text: string) => void;
  isLoading: boolean;
}

const ChatInput: React.FC<ChatInputProps> = ({ onSendMessage, isLoading }) => {
  const [inputText, setInputText] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (inputText.trim() && !isLoading) {
      onSendMessage(inputText);
      setInputText('');
    }
  };

  return (
    <form onSubmit={handleSubmit} className="relative flex items-center w-full">
      <Input
        type="text"
        placeholder="Diga olá para começar..."
        value={inputText}
        onChange={(e) => setInputText(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === 'Enter' && !e.shiftKey) {
            handleSubmit(e);
          }
        }}
        disabled={isLoading}
        className="flex-1 pr-14 h-12 rounded-full bg-background dark:bg-secondary/40 focus:bg-background border-border/60 focus-visible:ring-primary focus-visible:ring-2 shadow-sm"
        autoComplete="off"
      />
      <AnimatePresence>
        {inputText.trim() && (
          <motion.div
            initial={{ scale: 0.5, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.5, opacity: 0 }}
            transition={{ type: "spring", stiffness: 500, damping: 30 }}
            className="absolute right-1.5 flex items-center"
          >
            <Button type="submit" size="icon" className="rounded-full w-9 h-9 bg-primary hover:bg-primary/90" disabled={isLoading || !inputText.trim()}>
              <SendHorizonal size={18} />
              <span className="sr-only">Enviar</span>
            </Button>
          </motion.div>
        )}
      </AnimatePresence>
    </form>
  );
};

export default ChatInput;
