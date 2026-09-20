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
