# 03 — Tabela Reunião

## Objetivo

Registrar as **reuniões** (encontros) da Mata Viva com moradores, órgãos públicos e parceiros. Toda reunião é uma comunicação — cada linha de Reunião aponta para uma linha pai em Comunicação.

## Prompt para o Kuma

```
Crie uma tabela chamada "Reunião" no banco MataViva com os seguintes campos:

1. Título — campo Texto, marcado como campo primário
2. Comunicação — campo Link para tabela "Comunicação" (a comunicação pai da reunião, uma reunião = uma comunicação)
3. Data e hora — campo Data com opção de incluir hora
4. Local — campo Texto
5. Participantes — campo Link para tabela "Contato", permitindo selecionar vários contatos
6. Pauta — campo Texto longo
7. Ata — campo Texto longo
8. Conclusões — campo Texto longo
9. Decisões — campo Texto longo
10. Status — campo Seleção única (Single select) com as opções:
    - Agendada
    - Realizada
    - Cancelada

Não crie nenhum campo adicional.
```

## Spec de verificação

| Campo | Tipo | Opções |
|---|---|---|
| Título | Text (primário) | — |
| Comunicação | Link para Comunicação | — |
| Data e hora | Date (com hora) | — |
| Local | Text | — |
| Participantes | Link para Contato (múltiplo) | — |
| Pauta | Long text | — |
| Ata | Long text | — |
| Conclusões | Long text | — |
| Decisões | Long text | — |
| Status | Single select | Agendada, Realizada, Cancelada |

## Notas

- **Dependências:** tabelas **Comunicação** (passo 02) e **Contato** (passo 01) já devem existir.
- **Resultado esperado:** tabela "Reunião" com 10 campos, com os dois links (Comunicação pai + Participantes).
- **Prompt corretivo** (se faltar algum link):

```
Na tabela "Reunião", adicione:
1. Campo "Comunicação" do tipo "Link para tabela" apontando para "Comunicação",
   seleção única.
2. Campo "Participantes" do tipo "Link para tabela" apontando para "Contato",
   permitindo selecionar vários contatos.
```
