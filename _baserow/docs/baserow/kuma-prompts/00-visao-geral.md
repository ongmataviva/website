# Kuma AI — Prompts para criar o Schema do MataViva

Guia de uso dos prompts que criam as tabelas do domínio no Baserow (banco **MataViva**), usando o assistente nativo **Kuma AI**.

## Como usar

1. Acesse o Baserow em `http://localhost:8484` e abra o banco **MataViva**.
2. Abra o **Kuma AI** (assistente na barra lateral).
3. Copie e cole o prompt do arquivo indicado, **na ordem abaixo** (a ordem importa: cada tabela referencia tabelas já criadas).
4. Confirme na UI se o Kuma criou a tabela com os campos corretos.
5. Avise o agente para verificar via MCP (`list_tables` + `get_table_schema`).

## Ordem de criação (dependências primeiro)

| Ordem | Arquivo | Tabela | Depende de |
|---|---|---|---|
| 1 | `01-contato.md` | **Contato** | — |
| 2 | `01b-telefone.md` | **Telefone** | Contato |
| 3 | `01c-email.md` | **E-mail** | Contato |
| 4 | `01d-endereco.md` | **Endereço** | Contato |
| 5 | `02-comunicacao.md` | **Comunicação** | Contato |
| 6 | `03-reuniao.md` | **Reunião** | Comunicação, Contato |
| 7 | `04-bacia-hidrografica.md` | **Bacia Hidrográfica** | — |
| 8 | `04b-coordenada.md` | **Coordenada** | Bacia Hidrográfica |
| 9 | `05-terreno.md` | **Terreno** | Contato, Bacia Hidrográfica |
| 10 | `06-ocorrencia.md` | **Ocorrência** | Terreno, Contato |

> **Importante:** um campo "Link para tabela" só pode referenciar tabelas que já existem. Não pule a ordem. Os campos reversos (Telefones, E-mails, Endereços em Contato; Coordenadas e Terrenos em Bacia Hidrográfica) aparecem automaticamente ao criar as tabelas que carregam o link (passos 2–4, 8 e 9).

## Regras de ouro

- **Uma tabela por prompt.** Não peça duas tabelas de uma vez.
- Se o Kuma **não criar um campo link** no mesmo prompt: crie a tabela mesmo assim e depois use o prompt corretivo na seção "Notas" do arquivo daquela tabela.
- Se o Kuma criar um campo com nome/tipo diferente do especificado, peça a correção com o prompt corretivo e avise o agente para re-verificar.

## Workflow de verificação (agente)

Após cada tabela criada pelo usuário:

1. `list_tables` (database_id 1) — confirmar que a tabela existe e pegar o id.
2. `get_table_schema` (table_ids) — conferir cada campo esperado (nome, tipo, opções) contra a "Spec de verificação" do arquivo.
3. Se algo divergir, gerar o prompt corretivo da seção "Notas" e re-verificar.

## Estado final esperado

10 tabelas no banco MataViva, todas vazias (dados entram em iteração futura):

Contato, Telefone, E-mail, Endereço, Comunicação, Reunião, Bacia Hidrográfica, Coordenada, Terreno, Ocorrência

A tabela **Projects** existente é uma tabela de teste/raspão — permanece intocada.
