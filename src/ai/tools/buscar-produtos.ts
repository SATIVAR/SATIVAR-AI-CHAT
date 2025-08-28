import { ai } from '@/ai/genkit';
import { z } from 'zod';
import { getAllProducts, getAllCategories } from '@/lib/services/menu.service';

export const buscarProdutosTool = ai.defineTool(
  {
    name: 'buscarProdutos',
    description: 'Busca produtos de cannabis medicinal baseado em critérios específicos como nome, categoria, sintomas ou condições médicas',
    inputSchema: z.object({
      associationId: z.string().describe('ID da associação para filtrar produtos'),
      wordpressUrl: z.string().optional().describe('URL do WordPress da associação'),
      wordpressAuth: z.object({
        apiKey: z.string(),
        username: z.string(),
        password: z.string(),
      }).optional().describe('Credenciais do WordPress'),
      produtoNomes: z.array(z.string()).optional().describe('Lista de nomes de produtos para buscar'),
      categoria: z.string().optional().describe('Categoria de produto (ex: "Óleos", "Flores", "Extratos")'),
      sintomas: z.array(z.string()).optional().describe('Sintomas que o paciente quer tratar (ex: "dor", "ansiedade", "insônia")'),
      condicaoMedica: z.string().optional().describe('Condição médica específica'),
      limit: z.number().default(10).describe('Número máximo de produtos para retornar'),
    }),
    outputSchema: z.object({
      produtos: z.array(z.object({
        id: z.string(),
        nome: z.string(),
        descricao: z.string(),
        preco: z.number(),
        categoria: z.string(),
        imageUrl: z.string().optional(),
        indicacoes: z.array(z.string()).optional(),
        composicao: z.object({
          cbd: z.string().optional(),
          thc: z.string().optional(),
        }).optional(),
      })),
      totalEncontrados: z.number(),
      categoriasSugeridas: z.array(z.string()).optional(),
    }),
  },
  async (input) => {
    const { associationId, wordpressUrl, wordpressAuth, produtoNomes, categoria, sintomas, condicaoMedica, limit } = input;
    try {
      // Get all products and categories for the specific association
      const [produtos, categorias] = await Promise.all([
        getAllProducts(associationId), // Pass associationId to filter products
        getAllCategories(associationId), // Pass associationId to filter categories
      ]);

      // Future enhancement: Use wordpressUrl and wordpressAuth to fetch products
      // directly from WordPress API if association prefers external data source
      // if (wordpressUrl && wordpressAuth) {
      //   return await fetchProductsFromWordPress(wordpressUrl, wordpressAuth, input);
      // }

      let produtosFiltrados = produtos;

      // Filter by product names if provided
      if (produtoNomes && produtoNomes.length > 0) {
        produtosFiltrados = produtosFiltrados.filter(produto =>
          produtoNomes.some(nome =>
            produto.name.toLowerCase().includes(nome.toLowerCase())
          )
        );
      }

      // Filter by category if provided
      if (categoria) {
        const categoriaEncontrada = categorias.find(cat =>
          cat.name.toLowerCase().includes(categoria.toLowerCase())
        );
        
        if (categoriaEncontrada) {
          produtosFiltrados = produtosFiltrados.filter(produto =>
            produto.categoryId === categoriaEncontrada.id
          );
        }
      }

      // Filter by symptoms (basic keyword matching in description)
      if (sintomas && sintomas.length > 0) {
        produtosFiltrados = produtosFiltrados.filter(produto =>
          sintomas.some(sintoma =>
            produto.description.toLowerCase().includes(sintoma.toLowerCase()) ||
            produto.name.toLowerCase().includes(sintoma.toLowerCase())
          )
        );
      }

      // Filter by medical condition
      if (condicaoMedica) {
        produtosFiltrados = produtosFiltrados.filter(produto =>
          produto.description.toLowerCase().includes(condicaoMedica.toLowerCase())
        );
      }

      // Limit results
      const produtosLimitados = produtosFiltrados.slice(0, limit);

      // Map to output format
      const produtosFormatados = produtosLimitados.map(produto => ({
        id: produto.id,
        nome: produto.name,
        descricao: produto.description,
        preco: Number(produto.price),
        categoria: categorias.find(cat => cat.id === produto.categoryId)?.name || 'Sem categoria',
        imageUrl: produto.imageUrl || undefined,
        indicacoes: extrairIndicacoes(produto.description),
        composicao: extrairComposicao(produto.description),
      }));

      // Suggest relevant categories
      const categoriasSugeridas = categorias
        .filter(cat => cat.isActive)
        .map(cat => cat.name)
        .slice(0, 5);

      return {
        produtos: produtosFormatados,
        totalEncontrados: produtosFiltrados.length,
        categoriasSugeridas,
      };

    } catch (error) {
      console.error('Error in buscarProdutosTool:', error);
      return {
        produtos: [],
        totalEncontrados: 0,
        categoriasSugeridas: [],
      };
    }
  }
);

// Helper function to extract indications from description
function extrairIndicacoes(descricao: string): string[] {
  const indicacoes: string[] = [];
  const descricaoLower = descricao.toLowerCase();

  const possiveisIndicacoes = [
    'dor', 'ansiedade', 'insônia', 'depressão', 'epilepsia', 'câncer',
    'artrite', 'fibromialgia', 'glaucoma', 'esclerose múltipla',
    'parkinson', 'alzheimer', 'autismo', 'tdah', 'stress', 'inflamação',
    'náusea', 'vômito', 'perda de apetite', 'espasmos musculares'
  ];

  possiveisIndicacoes.forEach(indicacao => {
    if (descricaoLower.includes(indicacao)) {
      indicacoes.push(indicacao);
    }
  });

  return indicacoes;
}

// Helper function to extract CBD/THC composition from description
function extrairComposicao(descricao: string): { cbd?: string; thc?: string } {
  const composicao: { cbd?: string; thc?: string } = {};
  
  const cbdMatch = descricao.match(/cbd[:\s]*(\d+(?:\.\d+)?)\s*(?:%|mg)/i);
  const thcMatch = descricao.match(/thc[:\s]*(\d+(?:\.\d+)?)\s*(?:%|mg)/i);
  
  if (cbdMatch) {
    composicao.cbd = cbdMatch[1] + (cbdMatch[0].includes('%') ? '%' : 'mg');
  }
  
  if (thcMatch) {
    composicao.thc = thcMatch[1] + (thcMatch[0].includes('%') ? '%' : 'mg');
  }
  
  return composicao;
}