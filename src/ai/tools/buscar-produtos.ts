import { ai } from '@/ai/genkit';
import { z } from 'zod';
import { getAllProducts, getAllCategories } from '@/lib/services/menu.service';
import { ApiConfig } from '@/lib/types';

export const buscarProdutosTool = ai.defineTool(
  {
    name: 'buscarProdutos',
    description: 'Busca produtos de cannabis medicinal baseado em critérios específicos como nome, categoria, sintomas ou condições médicas',
    inputSchema: z.object({
      associationId: z.string().describe('ID da associação para filtrar produtos'),
      // New structured API configuration
      apiConfig: z.object({
        credentials: z.object({
          apiKey: z.string().describe('Consumer Key do WooCommerce'),
          apiSecret: z.string().describe('Consumer Secret do WooCommerce'),
        }),
        endpoints: z.object({
          getProdutos: z.string().optional().describe('Endpoint para buscar produtos'),
          getCategorias: z.string().optional().describe('Endpoint para buscar categorias'),
          getClientes: z.string().optional().describe('Endpoint para buscar clientes'),
          createCliente: z.string().optional().describe('Endpoint para criar clientes'),
          createPedido: z.string().optional().describe('Endpoint para criar pedidos'),
        }),
      }).optional().describe('Configuração dinâmica da API'),
      // Legacy WordPress configuration (kept for backward compatibility)
      wordpressUrl: z.string().optional().describe('URL do WordPress da associação'),
      wordpressAuth: z.object({
        apiKey: z.string(),
        username: z.string(),
        password: z.string(),
      }).optional().describe('Credenciais legadas do WordPress'),
      // Search parameters
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
    const { associationId, apiConfig, wordpressUrl, wordpressAuth, produtoNomes, categoria, sintomas, condicaoMedica, limit } = input;
    try {
      // Priority 1: Use new apiConfig if available
      if (apiConfig?.credentials?.apiKey && apiConfig?.endpoints?.getProdutos) {
        console.log('Using dynamic apiConfig for products search');
        return await fetchProductsFromWordPress({
          ...apiConfig,
          authMethod: 'applicationPassword'
        } as any, input);
      }
      
      // Priority 2: Use legacy wordpressAuth if available
      if (wordpressUrl && wordpressAuth?.apiKey) {
        console.log('Using legacy WordPress configuration for products search');
        return await fetchProductsFromWordPressLegacy(wordpressUrl, wordpressAuth, input);
      }
      
      // Priority 3: Fallback to local database
      console.log('Using local database for products search');
      return await fetchProductsFromLocalDB(associationId, { produtoNomes, categoria, sintomas, condicaoMedica, limit });

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

/**
 * Fetch products from WordPress using new apiConfig structure
 */
async function fetchProductsFromWordPress(
  apiConfig: ApiConfig,
  input: any
): Promise<any> {
  try {
    const { credentials, endpoints } = apiConfig;
    const { produtoNomes, categoria, sintomas, condicaoMedica, limit } = input;
    
    if (!endpoints.getProdutos) {
      throw new Error('Endpoint getProdutos não configurado');
    }
    
    // Create Basic Auth header
    const authHeader = Buffer.from(
      `${(credentials as any).apiKey}:${(credentials as any).apiSecret}`
    ).toString('base64');
    
    // Build query parameters for WooCommerce API
    const queryParams = new URLSearchParams();
    if (limit) queryParams.append('per_page', limit.toString());
    if (categoria) queryParams.append('category', categoria);
    
    // Add search term if provided
    if (produtoNomes && produtoNomes.length > 0) {
      queryParams.append('search', produtoNomes.join(' '));
    }
    
    const url = `${endpoints.getProdutos}?${queryParams.toString()}`;
    
    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'Authorization': `Basic ${authHeader}`,
        'Content-Type': 'application/json',
      },
      signal: AbortSignal.timeout(10000), // 10 second timeout
    });
    
    if (!response.ok) {
      throw new Error(`WordPress API error: ${response.status} ${response.statusText}`);
    }
    
    const wordpressProducts = await response.json();
    
    // Transform WordPress products to our format
    const produtos = (Array.isArray(wordpressProducts) ? wordpressProducts : []).map((product: any) => ({
      id: product.id?.toString() || 'unknown',
      nome: product.name || 'Produto sem nome',
      descricao: product.short_description || product.description || '',
      preco: parseFloat(product.price) || 0,
      categoria: product.categories?.[0]?.name || 'Sem categoria',
      imageUrl: product.images?.[0]?.src || undefined,
      indicacoes: extrairIndicacoes(product.description || ''),
      composicao: extrairComposicao(product.description || ''),
    }));
    
    // Apply additional filtering if needed
    let produtosFiltrados = produtos;
    
    if (sintomas && sintomas.length > 0) {
      produtosFiltrados = produtosFiltrados.filter((produto: any) =>
        sintomas.some((sintoma: string) =>
          produto.descricao.toLowerCase().includes(sintoma.toLowerCase()) ||
          produto.nome.toLowerCase().includes(sintoma.toLowerCase())
        )
      );
    }
    
    if (condicaoMedica) {
      produtosFiltrados = produtosFiltrados.filter((produto: any) =>
        produto.descricao.toLowerCase().includes(condicaoMedica.toLowerCase())
      );
    }
    
    return {
      produtos: produtosFiltrados.slice(0, limit || 10),
      totalEncontrados: produtosFiltrados.length,
      categoriasSugeridas: ['CBD', 'Óleos', 'Flores', 'Extratos'], // Static for now
    };
    
  } catch (error) {
    console.error('Error fetching from WordPress:', error);
    // Fallback to local DB
    return await fetchProductsFromLocalDB(input.associationId, input);
  }
}

/**
 * Fetch products from WordPress using legacy configuration
 */
async function fetchProductsFromWordPressLegacy(
  wordpressUrl: string,
  wordpressAuth: any,
  input: any
): Promise<any> {
  // Convert legacy format to new format and use main function
  const apiConfig: ApiConfig = {
    credentials: {
      applicationPassword: {
        username: wordpressAuth.username,
        password: wordpressAuth.password
      },
      apiSecret: wordpressAuth.password, // Map password to apiSecret
    },
    endpoints: {
      getProdutos: `${wordpressUrl}/wp-json/wc/v3/products`,
    },
  };
  
  return await fetchProductsFromWordPress(apiConfig, input);
}

/**
 * Fetch products from local database (fallback)
 */
async function fetchProductsFromLocalDB(
  associationId: string,
  filters: any
): Promise<any> {
  const { produtoNomes, categoria, sintomas, condicaoMedica, limit } = filters;
  
  // Get all products and categories for the specific association
  const [produtos, categorias] = await Promise.all([
    getAllProducts(associationId),
    getAllCategories(associationId),
  ]);
  
  let produtosFiltrados = produtos;

  // Filter by product names if provided
  if (produtoNomes && produtoNomes.length > 0) {
    produtosFiltrados = produtosFiltrados.filter(produto =>
      produtoNomes.some((nome: string) =>
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
      sintomas.some((sintoma: string) =>
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
  const produtosLimitados = produtosFiltrados.slice(0, limit || 10);

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
}

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
  
  const cbdMatch = descricao.match(/cbd[:\\s]*(\\d+(?:\\.\\d+)?)\\s*(?:%|mg)/i);
  const thcMatch = descricao.match(/thc[:\\s]*(\\d+(?:\\.\\d+)?)\\s*(?:%|mg)/i);
  
  if (cbdMatch) {
    composicao.cbd = cbdMatch[1] + (cbdMatch[0].includes('%') ? '%' : 'mg');
  }
  
  if (thcMatch) {
    composicao.thc = thcMatch[1] + (thcMatch[0].includes('%') ? '%' : 'mg');
  }
  
  return composicao;
}
