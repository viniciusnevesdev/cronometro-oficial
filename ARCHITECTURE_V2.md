# Arquitetura v2 — duas Betas limpas

Esta branch cria duas novas Betas sem alterar nem substituir as quatro versões públicas atuais.

## Produtos

- apps/areas/beta/: cronômetros + áreas + modelos. Não possui cadastro de clientes nem clientId.
- apps/clientes/beta/: cronômetros + clientes + atendimentos + modelos. Não possui Áreas, areaId ou store de áreas.

## Base compartilhada

Os dois aplicativos consomem exatamente os mesmos arquivos:

- shared/v2-app.js: motor de cronômetros, persistência, componentes e controlador comum.
- shared/v2.css: sistema visual comum.

Uma alteração nesses arquivos compartilhados afeta as duas Betas.

## Bancos isolados

- Áreas Beta: cronometro_areas_beta_v1
- Clientes Beta: cronometro_clientes_beta_v1

Nenhum banco reaproveita os bancos das versões antigas.

## Estado inicial

A fundação já permite cadastrar área ou cliente, criar modelos, iniciar e parar cronômetros, salvar registros/atendimentos, consultar histórico e limpar somente a Beta correspondente.

As versões antigas permanecem intactas e servem como referência para migrar gradualmente as funções avançadas.