# 05 — Tabela Terreno

## Objetivo

Registrar os **terrenos** adjacentes ao Igarapé-Água Branca (terrenos que margeiam o igarapé), vinculados ao seu **proprietário (uma Pessoa Física do cadastro de Contato)** e à **bacia** à qual pertencem.

## Prompt para o Kuma

```
Crie uma tabela chamada "Terreno" no banco MataViva com os seguintes campos:

1. Código — campo Texto, marcado como campo primário (ex.: T-001, T-002)
2. Proprietário — campo Link para tabela "Contato" (o contato Pessoa Física
   dono do terreno)
3. Bacia — campo Link para tabela "Bacia Hidrográfica" (a bacia à qual o
   terreno pertence; um terreno pertence a uma única bacia)
4. Localização — campo Texto longo (descrição textual do terreno)
5. Área (m²) — campo Número (decimal)

Não crie nenhum campo adicional.
```

## Spec de verificação

| Campo | Tipo | Opções |
|---|---|---|
| Código | Text (primário) | — |
| Proprietário | Link para Contato | — |
| Bacia | Link para Bacia Hidrográfica | — |
| Localização | Long text | — |
| Área (m²) | Number (decimal) | — |

## Notas

- **Dependências:** tabelas **Contato** (passo 01) e **Bacia Hidrográfica** (passo 04) já devem existir.
- **Decisão de modelagem:** não existe entidade "Proprietário" — o proprietário **é** um contato **Pessoa Física** (princípio: pessoas são sempre PFs referenciadas em outros lugares). Use sempre contatos com Tipo = Pessoa Física no campo "Proprietário" (o Baserow não permite restringir o tipo no link, então é uma convenção).
- **Decisão de modelagem:** por enquanto **sem geometria** (sem polígonos no mapa) — a localização é descrição textual. Os polígonos entram numa fase futura de mapas.
- **Relação 1 bacia — N terrenos:** o link mora aqui (campo "Bacia"); o Baserow cria automaticamente o campo reverso **Terrenos** na tabela Bacia Hidrográfica.
- **Resultado esperado:** tabela "Terreno" com 5 campos, incluindo os links para Contato e Bacia.
- **Prompt corretivo** (se faltar o campo link):

```
Na tabela "Terreno", adicione um campo chamado "Proprietário" do tipo
"Link para tabela" apontando para a tabela "Contato", seleção única.
```
