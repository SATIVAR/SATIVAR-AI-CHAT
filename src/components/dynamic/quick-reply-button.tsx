
'use client';

import React from 'react';
import { motion } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { QuickReplyButtonData } from '@/lib/types';
import { Send } from 'lucide-react';

interface QuickReplyButtonProps {
  data: QuickReplyButtonData;
  onSendMessage: (text: string) => void;
}

const QuickReplyButton: React.FC<QuickReplyButtonProps> = ({ data, onSendMessage }) => {

  const buttonVariants = {
    hidden: { opacity: 0, x: -20 },
    visible: { opacity: 1, x: 0, transition: { duration: 0.3, ease: 'easeOut' } },
  };

  return (
    <motion.div
      variants={buttonVariants}
      initial="hidden"
      animate="visible"
      layout
    >
      <Button
        variant="outline"
        className="w-full justify-start shadow-sm bg-background hover:bg-accent hover:text-accent-foreground border-primary/20 hover:border-primary/50 text-primary"
        onClick={() => onSendMessage(data.payload)}
      >
        <Send className="mr-2 h-4 w-4 -rotate-45" />
        {data.label}
      </Button>
    </motion.div>
  );
};

export default QuickReplyButton;
