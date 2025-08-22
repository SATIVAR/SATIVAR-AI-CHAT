
'use client';

import React from 'react';
import { cn } from '@/lib/utils';

const TypingIndicator: React.FC = () => {
  return (
    <div className="flex items-center space-x-2 animate-fade-in">
      <div className="flex items-center justify-center rounded-full bg-muted p-3">
        <div className="flex space-x-1">
          <div className={cn('h-1.5 w-1.5 rounded-full bg-muted-foreground animate-bounce [animation-delay:-0.3s]')} />
          <div className={cn('h-1.5 w-1.5 rounded-full bg-muted-foreground animate-bounce [animation-delay:-0.15s]')} />
          <div className={cn('h-1.5 w-1.5 rounded-full bg-muted-foreground animate-bounce')} />
        </div>
      </div>
    </div>
  );
};

export default TypingIndicator;
