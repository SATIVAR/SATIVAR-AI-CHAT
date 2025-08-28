
'use client';

import React from 'react';
import Image from 'next/image';
import { AnimatePresence, motion } from 'framer-motion';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription, SheetFooter, SheetClose } from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { OrderItem } from '@/lib/types';
import { ScrollArea } from '../ui/scroll-area';
import { Separator } from '../ui/separator';
import { MinusCircle, PlusCircle, Trash2, ShoppingCart } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface CartModalProps {
    isOpen: boolean;
    setIsOpen: (isOpen: boolean) => void;
    order: OrderItem[];
    onUpdateOrder: (productId: string, newQuantity: number) => void;
    onFinalizeOrder: () => void;
    onCancelOrder: () => void;
}

const CartModal: React.FC<CartModalProps> = ({ isOpen, setIsOpen, order, onUpdateOrder, onFinalizeOrder, onCancelOrder }) => {
    const { toast } = useToast();
    const total = order.reduce((acc, item) => acc + item.price * item.quantity, 0);

    const handleFinalize = () => {
        if (order.length === 0) {
            toast({
                variant: 'destructive',
                title: 'Orçamento Vazio',
                description: 'Você precisa adicionar itens ao orçamento antes de finalizar o pedido.',
            });
            return;
        }
        onFinalizeOrder();
    }

    return (
        <Sheet open={isOpen} onOpenChange={setIsOpen}>
            <SheetContent className="sm:max-w-lg flex flex-col">
                <SheetHeader>
                    <SheetTitle className="text-2xl">🛒 Seu Orçamento</SheetTitle>
                    <SheetDescription>
                        Revise os itens do seu orçamento. Você pode alterar as quantidades ou remover produtos.
                    </SheetDescription>
                </SheetHeader>

                <Separator className="my-4" />
                
                {order.length === 0 ? (
                    <div className="flex-grow flex flex-col items-center justify-center text-center text-muted-foreground gap-4">
                        <ShoppingCart size={48} />
                        <p className="font-medium">Seu carrinho está vazio</p>
                        <p className="text-sm">Explore nosso catálogo para adicionar itens!</p>
                    </div>
                ) : (
                    <ScrollArea className="flex-grow pr-4 -mr-6">
                        <motion.div layout className="space-y-4">
                            <AnimatePresence>
                                {order.map((item) => (
                                <motion.div 
                                    key={item.id} 
                                    className="flex items-center gap-4"
                                    layout
                                    initial={{ opacity: 0, y: 20 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    exit={{ opacity: 0, x: -20, transition: { duration: 0.2 } }}
                                >
                                    <Image src={item.imageUrl} alt={item.name} width={64} height={64} className="rounded-md object-cover border" />
                                    <div className="flex-grow">
                                        <p className="font-semibold leading-tight">{item.name}</p>
                                        <p className="text-sm text-muted-foreground">{new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(item.price)}</p>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <Button variant="ghost" size="icon" className="h-7 w-7 rounded-full" onClick={() => onUpdateOrder(item.id, item.quantity - 1)}>
                                            <MinusCircle size={18} />
                                        </Button>
                                        <span className="font-bold w-5 text-center">{item.quantity}</span>
                                        <Button variant="ghost" size="icon" className="h-7 w-7 rounded-full" onClick={() => onUpdateOrder(item.id, item.quantity + 1)}>
                                            <PlusCircle size={18} />
                                        </Button>
                                    </div>
                                    <Button variant="ghost" size="icon" className="h-7 w-7 rounded-full text-destructive" onClick={() => onUpdateOrder(item.id, 0)}>
                                        <Trash2 size={16} />
                                    </Button>
                                </motion.div>
                                ))}
                            </AnimatePresence>
                        </motion.div>
                    </ScrollArea>
                )}


                <SheetFooter className="mt-auto pt-6 border-t">
                    <div className="w-full space-y-4">
                         <div className="flex justify-between items-center text-xl font-bold">
                            <span>Total:</span>
                            <span className="text-primary">{new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(total)}</span>
                        </div>
                        <div className="grid grid-cols-2 gap-2">
                            <Button variant="outline" onClick={onCancelOrder}>Cancelar Orçamento</Button>
                            <Button onClick={handleFinalize}>Finalizar Orçamento</Button>
                        </div>
                    </div>
                </SheetFooter>
            </SheetContent>
        </Sheet>
    )
}

export default CartModal;
