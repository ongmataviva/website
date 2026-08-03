# 06 — Tabela Ocorrência

## Objetivo

Registrar **ocorrências geolocalizadas de problemas** na área da bacia (poluição, esgoto, desmatamento etc.) ao longo do tempo, vinculadas ao terreno e ao contato que reportou.

## Prompt para o Kuma

```
Crie uma tabela chamada "Ocorrência" no banco MataViva com os seguintes campos:

1. Título — campo Texto, marcado como campo primário
2. Descrição — campo Texto longo
3. Data — campo Data
4. Tipo — campo Seleção única (Single select) com as opções:
   - Poluição
   - Esgoto
   - Desmatamento
   - Queimada
   - Enchente
   - Outro
5. Latitude — campo Número (decimal)
6. Longitude — campo Número (decimal)
7. Status — campo Seleção única (Single select) com as opções:
   - Aberta
   - Em andamento
   - Resolvida
8. Terreno — campo Link para tabela "Terreno"
9. Contato — campo Link para tabela "Contato" (quem reportou)

Não crie nenhum campo adicional.
```

## Spec de verificação

| Campo | Tipo | Opções |
|---|---|---|
| Título | Text (primário) | — |
| Descrição | Long text | — |
| Data | Date | — |
| Tipo | Single select | Poluição, Esgoto, Desmatamento, Queimada, Enchente, Outro |
| Latitude | Number (decimal) | — |
| Longitude | Number (decimal) | — |
| Status | Single select | Aberta, Em andamento, Resolvida |
| Terreno | Link para Terreno | — |
| Contato | Link para Contato | — |

## Notas

- **Dependências:** tabelas **Terreno** (passo 05) e **Contato** (passo 01) já devem existir.
- **Decisão de modelagem:** localização por **coordenadas** (lat/lng) — sem polígonos nesta fase.
- **Resultado esperado:** tabela "Ocorrência" com 9 campos, incluindo os dois links.
- **Prompt corretivo** (se faltar algum link):

```
Na tabela "Ocorrência", adicione:
1. Campo "Terreno" do tipo "Link para tabela" apontando para "Terreno",
   seleção única.
2. Campo "Contato" do tipo "Link para tabela" apontando para "Contato",
   seleção única.
```
