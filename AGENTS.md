# Regras específicas do projeto cronometro-oficial

## Branches

- development = Desenvolvimento / Testes.
- main = Oficial / Estável.
- Trabalhe normalmente na branch development.
- Não faça merge, push, deploy ou publicação para main sem autorização explícita do usuário.
- Não altere main diretamente para tarefas de desenvolvimento.

## Projeto de referência

Existe uma cópia de referência em:

../cronometro-app-reference

Ela corresponde ao repositório cronometro-app na branch uze-beta.

Use essa pasta apenas para:
- consultar implementações;
- comparar comportamento;
- identificar recursos que podem ser aproveitados;
- portar alterações específicas quando solicitado.

Não:
- copie o cronometro-app-reference inteiro por cima deste projeto;
- substitua arquivos em massa sem analisar diferenças;
- presuma que o projeto de referência é mais novo ou melhor em tudo;
- remova recursos próprios do cronometro-oficial apenas para igualar os dois projetos.

## Forma de trabalhar

- Preserve as funcionalidades existentes do cronometro-oficial que não fazem parte da tarefa.
- Prefira alterações pequenas, localizadas e reversíveis.
- Antes de portar um recurso do projeto de referência, compare as duas implementações.
- Quando houver conflito entre recursos dos dois projetos, preserve o comportamento atual e adapte apenas o necessário.
- Execute verificações e testes relevantes antes de concluir.
- Se a tarefa envolver interface, verifique responsividade e comportamento em telas mobile quando possível.
- No relatório final, diga claramente:
  - o que foi alterado;
  - quais arquivos foram modificados;
  - quais testes foram executados;
  - se algo ainda precisa de validação manual.


## Relatórios para o ChatGPT

Ao concluir qualquer tarefa substancial de análise, implementação, correção ou revisão:

1. Gere um relatório completo em Markdown em `/tmp/codex-report.md`.
2. O relatório deve incluir, quando aplicável:
   - resumo do trabalho;
   - arquivos modificados/adicionados;
   - decisões técnicas importantes;
   - testes/verificações executados e resultados;
   - erros ou limitações;
   - estado do Git;
   - SHA de eventual commit;
   - conclusão e recomendação para o próximo passo.
3. Publique o relatório executando:
   `tools/publish_codex_report.sh /tmp/codex-report.md <slug-curto>`
4. O script publica somente `.codex-reports/latest.md` e uma cópia histórica na branch `codex-reports`.
5. O push para `codex-reports` está previamente autorizado apenas para relatórios.
6. Não envie alterações funcionais do aplicativo para `codex-reports`.
7. Não faça merge de `codex-reports` em `development` ou `main`.
8. Regras normais de autorização continuam valendo para push de código em `development`, `main`, deploy ou publicação.
