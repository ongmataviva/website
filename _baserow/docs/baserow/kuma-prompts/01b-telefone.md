# 01b — Tabela Telefone

## Objetivo

Registrar **vários telefones por contato**, cada um com suas **capacidades** (fixo, SMS, WhatsApp, Telegram etc.).

## Prompt para o Kuma

```
Crie uma tabela chamada "Telefone" no banco MataViva com os seguintes campos:

1. Número — campo Texto, marcado como campo primário
2. Contato — campo Link para tabela "Contato" (o contato dono deste telefone)
3. Capacidades — campo Seleção múltipla (Multiple select) com as opções:
   - Fixo
   - SMS
   - WhatsApp
   - Telegram
   - Outro

Não crie nenhum campo adicional.
```

## Spec de verificação

| Campo | Tipo | Opções |
|---|---|---|
| Número | Text (primário) | — |
| Contato | Link para Contato | — |
| Capacidades | Multiple select | Fixo, SMS, WhatsApp, Telegram, Outro |

## Notas

- **Dependências:** tabela **Contato** (passo 01) já deve existir.
- **Resultado esperado:** tabela "Telefone" com 3 campos. Ao criar o link "Contato", o Baserow adiciona automaticamente o campo reverso **Telefones** na tabela Contato.
- **Prompt corretivo** (se faltar campo/link):

```
Na tabela "Telefone", ajuste os campos para ficarem exatamente assim:
Número (texto, primário), Contato (link para a tabela "Contato",
seleção única), Capacidades (seleção múltipla: Fixo, SMS, WhatsApp,
Telegram, Outro). Remova qualquer campo que não esteja nessa lista.
```
