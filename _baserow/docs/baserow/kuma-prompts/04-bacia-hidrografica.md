# 04 — Tabela Bacia Hidrográfica

## Objetivo

Registrar a **bacia hidrográfica do Igarapé-Água Branca** — o contêiner geográfico que reúne os terrenos da área de atuação da Mata Viva. Os **vértices do polígono** da bacia são registrados na tabela **Coordenada** (passo 04b), cada um linkado à sua bacia. Espera-se tipicamente **uma única linha** (a bacia).

## Prompt para o Kuma

```
Crie uma tabela chamada "BaciaHidrográfica" no banco MataViva com os seguintes campos:

1. Nome — campo Texto, marcado como campo primário
2. Descrição — campo Texto longo

Não crie nenhum campo adicional.
NÃO crie campo de link nesta tabela: os links nascem nas tabelas
"Coordenada" (passo 04b) e "Terreno" (passo 05); os campos reversos
"Coordenadas" e "Terrenos" aparecem automaticamente aqui.
```

## Spec de verificação

| Campo | Tipo | Opções |
|---|---|---|
| Nome | Text (primário) | — |
| Descrição | Long text | — |

## Notas

- **Dependências:** nenhuma — criar antes das tabelas **Coordenada** (passo 04b) e **Terreno** (passo 05).
- **Decisão de modelagem:** sem polígono nativo no Baserow 2.3 — cada **vértice** do polígono da bacia é uma linha na tabela **Coordenada** (Latitude, Longitude, Ordem), linkada à bacia. Na fase futura de mapas, os pontos são unidos na ordem para desenhar o polígono.
- **Relação 1 bacia — N coordenadas / 1 bacia — N terrenos:** os links nascem nas tabelas filhas (Coordenada e Terreno); o Baserow cria automaticamente os campos reversos **Coordenadas** e **Terrenos** aqui em Bacia Hidrográfica.
- **Resultado esperado:** tabela "Bacia Hidrográfica" com 2 campos, sem links.
- **Prompt corretivo** (se faltar campo/tipo errado):

```
Na tabela "Bacia Hidrográfica", ajuste os campos para ficarem exatamente assim:
Nome (texto, primário), Descrição (texto longo).
Remova qualquer campo que não esteja nessa lista, inclusive links.
```
