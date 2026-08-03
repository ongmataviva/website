# 01d — Tabela Endereço

## Objetivo

Registrar **vários endereços por contato**, cada um com um **tipo de preenchimento livre** (ex.: Residencial, Comercial, Notificação).

## Prompt para o Kuma

```
Crie uma tabela chamada "Endereço" no banco MataViva com os seguintes campos:

1. Endereço — campo Texto, marcado como campo primário
   (ex.: rua, número, bairro, cidade)
2. Contato — campo Link para tabela "Contato" (o contato dono deste endereço)
3. Tipo — campo Texto de preenchimento livre (ex.: Residencial, Comercial, Notificação)

Não crie nenhum campo adicional.
```

## Spec de verificação

| Campo | Tipo | Opções |
|---|---|---|
| Endereço | Text (primário) | — |
| Contato | Link para Contato | — |
| Tipo | Text (livre) | — |

## Notas

- **Dependências:** tabela **Contato** (passo 01) já deve existir.
- **Resultado esperado:** tabela "Endereço" com 3 campos. Ao criar o link "Contato", o Baserow adiciona automaticamente o campo reverso **Endereços** na tabela Contato.
- **Prompt corretivo** (se faltar campo/link):

```
Na tabela "Endereço", ajuste os campos para ficarem exatamente assim:
Endereço (texto, primário), Contato (link para a tabela "Contato",
seleção única), Tipo (texto livre). Remova qualquer campo que não
esteja nessa lista.
```
