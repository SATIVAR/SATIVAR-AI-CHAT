<?php
/**
 * FASE 2: Implementação da Busca Inteligente no WordPress
 * 
 * Este arquivo contém o código PHP que deve ser adicionado ao plugin
 * WordPress para implementar a busca inteligente de telefones.
 * 
 * INSTRUÇÕES DE INSTALAÇÃO:
 * 1. Localize o arquivo do seu plugin WordPress (provavelmente em wp-content/plugins/)
 * 2. Adicione este código ao arquivo principal do plugin
 * 3. Ative ou reative o plugin no WordPress
 */

// Prevenir acesso direto
if (!defined('ABSPATH')) {
    exit;
}

/**
 * Função para normalizar números de telefone
 * Remove todos os caracteres não numéricos
 */
function sativar_normalize_phone($phone) {
    if (empty($phone)) {
        return '';
    }
    
    // Remove todos os caracteres que não são dígitos
    $normalized = preg_replace('/[^0-9]/', '', $phone);
    
    // Log para debug
    error_log("SATIVAR: Normalized phone '$phone' to '$normalized'");
    
    return $normalized;
}

/**
 * Endpoint personalizado para busca inteligente de clientes
 * URL: /wp-json/sativar/v1/clientes/smart-search?telefone=85996201636
 */
add_action('rest_api_init', function () {
    register_rest_route('sativar/v1', '/clientes/smart-search', array(
        'methods' => 'GET',
        'callback' => 'sativar_smart_search_clientes',
        'permission_callback' => function() {
            // Verificar se o usuário tem permissão (ajuste conforme necessário)
            return current_user_can('read');
        }
    ));
});

/**
 * Callback para busca inteligente de clientes
 */
function sativar_smart_search_clientes($request) {
    $telefone = $request->get_param('telefone');
    
    if (empty($telefone)) {
        return new WP_Error('missing_phone', 'Parâmetro telefone é obrigatório', array('status' => 400));
    }
    
    // Normalizar o telefone recebido
    $telefone_normalizado = sativar_normalize_phone($telefone);
    
    error_log("SATIVAR Smart Search: Searching for phone '$telefone' (normalized: '$telefone_normalizado')");
    
    // Buscar usuários com meta_query personalizada
    $users = get_users(array(
        'meta_query' => array(
            'relation' => 'OR',
            array(
                'key' => 'telefone',
                'value' => $telefone_normalizado,
                'compare' => '='
            ),
            array(
                'key' => 'whatsapp',
                'value' => $telefone_normalizado,
                'compare' => '='
            )
        ),
        'number' => 5 // Limitar resultados
    ));
    
    // Se não encontrou com busca direta, tentar busca inteligente
    if (empty($users)) {
        error_log("SATIVAR Smart Search: Direct search failed, trying intelligent search");
        
        // Buscar todos os usuários com campos de telefone e comparar após normalização
        $all_users = get_users(array(
            'meta_query' => array(
                'relation' => 'OR',
                array(
                    'key' => 'telefone',
                    'value' => '',
                    'compare' => '!='
                ),
                array(
                    'key' => 'whatsapp',
                    'value' => '',
                    'compare' => '!='
                )
            ),
            'number' => 100 // Buscar mais usuários para análise
        ));
        
        foreach ($all_users as $user) {
            $user_telefone = get_user_meta($user->ID, 'telefone', true);
            $user_whatsapp = get_user_meta($user->ID, 'whatsapp', true);
            
            // Normalizar telefones do usuário e comparar
            if (sativar_normalize_phone($user_telefone) === $telefone_normalizado ||
                sativar_normalize_phone($user_whatsapp) === $telefone_normalizado) {
                
                error_log("SATIVAR Smart Search: Found match via intelligent search - User ID: {$user->ID}");
                $users = array($user);
                break;
            }
        }
    }
    
    if (empty($users)) {
        error_log("SATIVAR Smart Search: No users found for phone '$telefone'");
        return array(); // Retornar array vazio
    }
    
    // Formatar resposta
    $response = array();
    foreach ($users as $user) {
        $user_data = array(
            'id' => $user->ID,
            'name' => $user->display_name,
            'username' => $user->user_login,
            'email' => $user->user_email,
            'first_name' => $user->first_name,
            'last_name' => $user->last_name,
            'acf' => array()
        );
        
        // Adicionar campos ACF/meta
        $meta_fields = array('telefone', 'whatsapp', 'cpf', 'nome_completo', 'tipo_associacao', 'nome_responsavel', 'cpf_responsavel');
        foreach ($meta_fields as $field) {
            $value = get_user_meta($user->ID, $field, true);
            if (!empty($value)) {
                $user_data['acf'][$field] = $value;
            }
        }
        
        $response[] = $user_data;
        
        error_log("SATIVAR Smart Search: Returning user data for ID: {$user->ID}, Name: {$user->display_name}");
    }
    
    return $response;
}

/**
 * Modificar o endpoint padrão de clientes para usar busca inteligente
 * URL: /wp-json/sativar/v1/clientes?acf_filters[telefone]=85996201636
 */
add_action('rest_api_init', function () {
    register_rest_route('sativar/v1', '/clientes', array(
        'methods' => 'GET',
        'callback' => 'sativar_get_clientes_intelligent',
        'permission_callback' => function() {
            return current_user_can('read');
        }
    ));
});

/**
 * Callback inteligente para busca de clientes
 */
function sativar_get_clientes_intelligent($request) {
    $acf_filters = $request->get_param('acf_filters');
    
    // Se há filtro de telefone, usar busca inteligente
    if (isset($acf_filters['telefone'])) {
        $telefone = $acf_filters['telefone'];
        
        // Redirecionar para a função de busca inteligente
        $smart_request = new WP_REST_Request('GET', '/sativar/v1/clientes/smart-search');
        $smart_request->set_param('telefone', $telefone);
        
        return sativar_smart_search_clientes($smart_request);
    }
    
    // Para outros filtros, usar lógica padrão
    // (implementar conforme necessário)
    return array();
}

/**
 * Hook para normalizar telefones ao salvar usuários
 * Isso garante que novos usuários tenham telefones normalizados
 */
add_action('user_register', 'sativar_normalize_user_phone_on_save');
add_action('profile_update', 'sativar_normalize_user_phone_on_save');

function sativar_normalize_user_phone_on_save($user_id) {
    $telefone = get_user_meta($user_id, 'telefone', true);
    $whatsapp = get_user_meta($user_id, 'whatsapp', true);
    
    if (!empty($telefone)) {
        $normalized_telefone = sativar_normalize_phone($telefone);
        update_user_meta($user_id, 'telefone_normalized', $normalized_telefone);
    }
    
    if (!empty($whatsapp)) {
        $normalized_whatsapp = sativar_normalize_phone($whatsapp);
        update_user_meta($user_id, 'whatsapp_normalized', $normalized_whatsapp);
    }
}

/**
 * Comando WP-CLI para normalizar telefones existentes
 * Uso: wp sativar normalize-phones
 */
if (defined('WP_CLI') && WP_CLI) {
    WP_CLI::add_command('sativar normalize-phones', function() {
        $users = get_users(array('number' => -1));
        $count = 0;
        
        foreach ($users as $user) {
            $telefone = get_user_meta($user->ID, 'telefone', true);
            $whatsapp = get_user_meta($user->ID, 'whatsapp', true);
            
            $updated = false;
            
            if (!empty($telefone)) {
                $normalized = sativar_normalize_phone($telefone);
                update_user_meta($user->ID, 'telefone_normalized', $normalized);
                $updated = true;
            }
            
            if (!empty($whatsapp)) {
                $normalized = sativar_normalize_phone($whatsapp);
                update_user_meta($user->ID, 'whatsapp_normalized', $normalized);
                $updated = true;
            }
            
            if ($updated) {
                $count++;
                WP_CLI::log("Normalized phones for user ID: {$user->ID} ({$user->display_name})");
            }
        }
        
        WP_CLI::success("Normalized phones for $count users");
    });
}

/**
 * Função de teste para verificar se a implementação está funcionando
 * URL: /wp-json/sativar/v1/test-phone-search?telefone=85996201636
 */
add_action('rest_api_init', function () {
    register_rest_route('sativar/v1', '/test-phone-search', array(
        'methods' => 'GET',
        'callback' => 'sativar_test_phone_search',
        'permission_callback' => '__return_true' // Público para testes
    ));
});

function sativar_test_phone_search($request) {
    $telefone = $request->get_param('telefone');
    
    if (empty($telefone)) {
        return array('error' => 'Parâmetro telefone é obrigatório');
    }
    
    $normalized = sativar_normalize_phone($telefone);
    
    // Buscar usando a função inteligente
    $smart_request = new WP_REST_Request('GET', '/sativar/v1/clientes/smart-search');
    $smart_request->set_param('telefone', $telefone);
    $results = sativar_smart_search_clientes($smart_request);
    
    return array(
        'input' => $telefone,
        'normalized' => $normalized,
        'results_count' => count($results),
        'results' => $results,
        'test_status' => count($results) > 0 ? 'SUCCESS' : 'NO_RESULTS',
        'message' => count($results) > 0 ? 'Busca inteligente funcionando!' : 'Nenhum resultado encontrado'
    );
}

// Log de ativação
error_log('SATIVAR: Smart phone search implementation loaded');

?>