
import { Menu } from './types';

export const menu: Menu = {
  categories: [
    { id: 'espetinhos', name: 'Espetinhos', description: 'Nossos famosos espetinhos, feitos na brasa.' },
    { id: 'guarnicoes', name: 'Guarnições', description: 'Acompanhamentos perfeitos para sua refeição.' },
    { id: 'bebidas', name: 'Bebidas', description: 'Para refrescar e acompanhar.' },
  ],
  items: [
    // Espetinhos
    {
      id: 'alcatra-1',
      name: 'Espetinho de Alcatra',
      description: '200g de alcatra suculenta em cubos, intercalada com pimentão e cebola.',
      price: 18.00,
      imageUrl: 'https://placehold.co/600x400.png',
      category: 'espetinhos',
    },
    {
      id: 'frango-1',
      name: 'Espetinho de Frango',
      description: '200g de filé de frango marinado em ervas finas.',
      price: 15.00,
      imageUrl: 'https://placehold.co/600x400.png',
      category: 'espetinhos',
    },
    {
      id: 'coracao-1',
      name: 'Espetinho de Coração',
      description: '200g de coraçõezinhos de galinha temperados no ponto certo.',
      price: 14.00,
      imageUrl: 'https://placehold.co/600x400.png',
      category: 'espetinhos',
    },
    {
      id: 'vegetariano-1',
      name: 'Espetinho Vegetariano',
      description: 'Legumes frescos da estação e queijo coalho na brasa.',
      price: 13.00,
      imageUrl: 'https://placehold.co/600x400.png',
      category: 'espetinhos',
    },
    // Guarnições
    {
      id: 'feijoada-1',
      name: 'Porção de Feijoada',
      description: 'Nossa famosa feijoada, um acompanhamento que harmoniza perfeitamente.',
      price: 25.00,
      imageUrl: 'https://placehold.co/600x400.png',
      category: 'guarnicoes',
    },
    {
      id: 'arroz-1',
      name: 'Arroz Branco',
      description: 'Porção individual de arroz branco soltinho.',
      price: 8.00,
      imageUrl: 'https://placehold.co/600x400.png',
      category: 'guarnicoes',
    },
    {
      id: 'farofa-1',
      name: 'Farofa da Casa',
      description: 'Uma receita especial com bacon e ervas.',
      price: 10.00,
      imageUrl: 'https://placehold.co/600x400.png',
      category: 'guarnicoes',
    },
    // Bebidas
    {
      id: 'coca-1',
      name: 'Coca-Cola',
      description: 'Lata 350ml, geladíssima.',
      price: 6.00,
      imageUrl: 'https://placehold.co/600x400.png',
      category: 'bebidas',
    },
    {
      id: 'guarana-1',
      name: 'Guaraná Antarctica',
      description: 'Lata 350ml, o sabor do Brasil.',
      price: 6.00,
      imageUrl: 'https://placehold.co/600x400.png',
      category: 'bebidas',
    },
    {
      id: 'agua-1',
      name: 'Água Mineral',
      description: 'Garrafa 500ml, com ou sem gás.',
      price: 4.00,
      imageUrl: 'https://placehold.co/600x400.png',
      category: 'bebidas',
    },
  ],
};
