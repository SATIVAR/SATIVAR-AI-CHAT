@echo off
echo ================================================================================
echo TESTE MANUAL DA FASE 3 - API REAL (usando curl)
echo ================================================================================
echo.

echo 📱 Testando API de validação de WhatsApp...
echo    URL: http://localhost:9002/api/patients/validate-whatsapp-simple?slug=sativar
echo    WhatsApp: 85996201636
echo.

echo 🔄 Executando chamada para API...
curl -X POST "http://localhost:9002/api/patients/validate-whatsapp-simple?slug=sativar" ^
     -H "Content-Type: application/json" ^
     -d "{\"whatsapp\":\"85996201636\"}" ^
     -w "\n\nStatus Code: %%{http_code}\n"

echo.
echo ================================================================================
echo 📋 INSTRUÇÕES PARA TESTE MANUAL COMPLETO:
echo ================================================================================
echo 1. Abra o navegador em: http://localhost:9002/sativar
echo 2. Digite o WhatsApp: 85996201636
echo 3. Clique em "Continuar"
echo 4. Observe o resultado na interface
echo.
echo 📝 Para monitorar logs em tempo real:
echo    • Observe o terminal onde o SatiZap está rodando
echo    • Procure por mensagens "[FASE 1 - LOG X]"
echo    • Verifique se a URL construída está correta
echo.
echo ✅ Se o status for "patient_found": SUCESSO!
echo 📝 Se o status for "new_patient_step_2": Paciente não encontrado (normal)
echo ❌ Se houver erro: Verifique configurações do WordPress
echo.
pause