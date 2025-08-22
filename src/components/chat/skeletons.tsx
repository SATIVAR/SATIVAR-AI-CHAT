
'use client';

import React from 'react';
import { motion } from 'framer-motion';
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from '@/lib/utils';
import { Bot } from 'lucide-react';

const bubbleVariants = {
    hidden: { opacity: 0, y: 10 },
    visible: { opacity: 1, y: 0, transition: { duration: 0.3, ease: 'easeOut' } }
};

export const ChatBubbleSkeleton = () => (
    <motion.div 
        className="flex items-start gap-3 md:gap-4"
        variants={bubbleVariants}
        initial="hidden"
        animate="visible"
        exit="hidden"
        layout
    >
        <Skeleton className="h-8 w-8 md:h-10 md:w-10 rounded-full flex-shrink-0 flex items-center justify-center">
            <Bot size={18} className="text-muted-foreground" />
        </Skeleton>
        <div className="flex flex-col gap-2 w-full max-w-[60%]">
            <Skeleton className="h-16 w-full rounded-2xl rounded-bl-lg" />
            <Skeleton className="h-4 w-16 rounded-md" />
        </div>
    </motion.div>
);

export const OrderSummaryCardSkeleton = () => (
    <motion.div
        className="w-full"
        variants={bubbleVariants}
        initial="hidden"
        animate="visible"
        layout
    >
        <Skeleton className="h-64 w-full rounded-lg" />
    </motion.div>
);
