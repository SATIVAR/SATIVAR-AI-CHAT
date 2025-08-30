
'use client';

import React from 'react';
import Image from 'next/image';
import { motion } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { ProductCardData } from '@/lib/types';
import { Plus } from 'lucide-react';

interface CompactProductCardProps {
  data: ProductCardData;
  onAddToOrder: (productId: string) => void;
  onImageClick: (imageUrl: string) => void;
}

const CompactProductCard: React.FC<CompactProductCardProps> = ({ data, onAddToOrder, onImageClick }) => {

  const cardVariants = {
    hidden: { opacity: 0, x: -20 },
    visible: { opacity: 1, x: 0, transition: { duration: 0.4, ease: "easeOut" } }
  };

  return (
    <motion.div
        variants={cardVariants}
        className="w-full"
        layout
    >
        <div className="flex items-center p-2 bg-background rounded-lg shadow-sm w-full transition-all hover:bg-secondary/60 dark:hover:bg-card">
            <div 
                onClick={() => onImageClick(data.imageUrl)}
                className="relative w-16 h-16 rounded-full overflow-hidden flex-shrink-0 cursor-pointer border-2 border-background shadow-md"
            >
                <Image
                    src={data.imageUrl}
                    alt={data.name}
                    fill
                    className="object-cover"
                    sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
                    data-ai-hint="food meal"
                />
            </div>
            
            <div className="flex-grow ml-3">
                <p className="font-bold text-base line-clamp-1">{data.name}</p>
                <p className="text-sm text-muted-foreground">
                    {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(data.price)}
                </p>
            </div>

            <Button size="icon" className="w-9 h-9 rounded-full ml-2 flex-shrink-0 bg-primary/90 hover:bg-primary" onClick={() => onAddToOrder(data.productId)}>
                <Plus size={18} />
                <span className="sr-only">Adicionar</span>
            </Button>
        </div>
    </motion.div>
  );
};

export default CompactProductCard;
