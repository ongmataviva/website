# 04b — Tabela Coordenada

## Objetivo

Registrar os **vértices do polígono da bacia** — cada linha é um ponto (`latitude`, `longitude`) com sua **ordem**, linkado à bacia. Unindo os pontos na ordem (fechando no primeiro), forma-se o polígono da bacia.

## Prompt para o Kuma

```
Crie uma tabela chamada "Coordenada" no banco MataViva com os seguintes campos:

1. Ponto — campo Texto, marcado como campo primário (rótulo do vértice, ex.: P1, P2, ...)
2. Ordem — campo Número (inteiro) (ordem do vértice na sequência do polígono)
3. Latitude — campo Número (decimal)
4. Longitude — campo Número (decimal)
5. Bacia — campo Link para tabela "Bacia Hidrográfica" (a bacia cujo
   polígono este ponto compõe)

Não crie nenhum campo adicional.
```

## Spec de verificação

| Campo | Tipo | Opções |
|---|---|---|
| Ponto | Text (primário) | — |
| Ordem | Number (inteiro) | — |
| Latitude | Number (decimal) | — |
| Longitude | Number (decimal) | — |
| Bacia | Link para Bacia Hidrográfica | — |

## Notas

- **Dependências:** tabela **Bacia Hidrográfica** (passo 04) já deve existir.
- **Decisão de modelagem:** o polígono da bacia é formado pelos pontos desta tabela, unidos na ordem do campo **Ordem** e fechando no primeiro ponto. Na fase futura de mapas, esses pontos são unidos para desenhar o polígono.
- **Resultado esperado:** tabela "Coordenada" com 5 campos. Ao criar o link "Bacia", o Baserow adiciona automaticamente o campo reverso **Coordenadas** na tabela Bacia Hidrográfica.
- **Prompt corretivo** (se faltar campo/link):

```
Na tabela "Coordenada", ajuste os campos para ficarem exatamente assim:
Ponto (texto, primário), Ordem (número inteiro), Latitude (número decimal),
Longitude (número decimal), Bacia (link para a tabela "Bacia Hidrográfica",
seleção única). Remova qualquer campo que não esteja nessa lista.
```
