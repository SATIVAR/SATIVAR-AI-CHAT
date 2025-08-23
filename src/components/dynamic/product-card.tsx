
'use client';

import React from 'react';
import Image from 'next/image';
import { motion } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardFooter, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { ProductCardData } from '@/lib/types';
import { PlusCircle } from 'lucide-react';

interface ProductCardProps {
  data: ProductCardData;
  onAddToOrder: (productId: string) => void;
}

const ProductCard: React.FC<ProductCardProps> = ({ data, onAddToOrder }) => {

  const cardVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: { opacity: 1, y: 0, transition: { duration: 0.4, ease: "easeOut" } }
  };

  return (
    <motion.div
        variants={cardVariants}
        initial="hidden"
        animate="visible"
        className="w-full max-w-xs"
        layout
    >
        <Card className="w-full overflow-hidden shadow-lg transition-transform duration-300 hover:scale-105 hover:shadow-xl border-border/60">
            <CardHeader className="p-0">
                <div className="aspect-video overflow-hidden">
                    <Image
                        src={data.imageUrl}
                        alt={data.name}
                        width={400}
                        height={250}
                        className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-110"
                        data-ai-hint="food meal"
                    />
                </div>
            </CardHeader>
            <CardContent className="p-4">
                <CardTitle className="text-base font-bold">{data.name}</CardTitle>
                <CardDescription className="mt-1 text-xs text-muted-foreground">{data.description}</CardDescription>
            </CardContent>
            <CardFooter className="flex items-center justify-between bg-muted/50 p-4">
                <p className="text-lg font-bold text-primary">
                {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(data.price)}
                </p>
                <Button size="sm" onClick={() => onAddToOrder(data.productId)}>
                    <PlusCircle className="mr-2 h-4 w-4" />
                    Adicionar
                </Button>
            </CardFooter>
        </Card>
    </motion.div>
  );
};

export default ProductCard;
