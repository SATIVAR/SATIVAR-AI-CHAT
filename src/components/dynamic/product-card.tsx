
'use client';

import React from 'react';
import Image from 'next/image';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardFooter, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { ProductCardData } from '@/lib/types';
import { PlusCircle } from 'lucide-react';

interface ProductCardProps {
  data: ProductCardData;
  onAddToOrder: (productId: string) => void;
}

const ProductCard: React.FC<ProductCardProps> = ({ data, onAddToOrder }) => {
  return (
    <Card className="w-full max-w-xs overflow-hidden shadow-md animate-slide-in-from-bottom">
      <CardHeader className="p-0">
        <Image
          src={data.imageUrl}
          alt={data.name}
          width={400}
          height={250}
          className="w-full object-cover"
          data-ai-hint="food meal"
        />
      </CardHeader>
      <CardContent className="p-4">
        <CardTitle className="text-lg font-bold">{data.name}</CardTitle>
        <CardDescription className="mt-1 text-sm">{data.description}</CardDescription>
      </CardContent>
      <CardFooter className="flex items-center justify-between bg-muted/50 p-4">
        <p className="text-lg font-semibold text-primary">
          {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(data.price)}
        </p>
        <Button size="sm" onClick={() => onAddToOrder(data.productId)}>
          <PlusCircle className="mr-2 h-4 w-4" />
          Adicionar
        </Button>
      </CardFooter>
    </Card>
  );
};

export default ProductCard;
