
'use client';

import React from 'react';
import { Button } from '@/components/ui/button';
import { QuickReplyButtonData } from '@/lib/types';

interface QuickReplyButtonProps {
  data: QuickReplyButtonData;
  onSendMessage: (text: string) => void;
}

const QuickReplyButton: React.FC<QuickReplyButtonProps> = ({ data, onSendMessage }) => {
  return (
    <Button
      variant="outline"
      className="w-full justify-start bg-accent/10 border-accent/50 text-accent-foreground/80 hover:bg-accent/20 animate-slide-in-from-bottom"
      onClick={() => onSendMessage(data.payload)}
    >
      {data.label}
    </Button>
  );
};

export default QuickReplyButton;
