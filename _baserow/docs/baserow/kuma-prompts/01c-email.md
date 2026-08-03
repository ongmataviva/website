# 01c — Tabela E-mail

## Objetivo

Registrar **vários e-mails por contato**, cada um com um **tipo de preenchimento livre** (ex.: Trabalho, Pessoal, Técnico).

## Prompt para o Kuma

```
Crie uma tabela chamada "E-mail" no banco MataViva com os seguintes campos:

1. E-mail — campo Texto, marcado como campo primário
2. Contato — campo Link para tabela "Contato" (o contato dono deste e-mail)
3. Tipo — campo Texto de preenchimento livre (ex.: Trabalho, Pessoal, Técnico)

Não crie nenhum campo adicional.
```

## Spec de verificação

| Campo | Tipo | Opções |
|---|---|---|
| E-mail | Text (primário) | — |
| Contato | Link para Contato | — |
| Tipo | Text (livre) | — |

## Notas

- **Dependências:** tabela **Contato** (passo 01) já deve existir.
- **Resultado esperado:** tabela "E-mail" com 3 campos. Ao criar o link "Contato", o Baserow adiciona automaticamente o campo reverso **E-mails** na tabela Contato.
- **Prompt corretivo** (se faltar campo/link):

```
Na tabela "E-mail", ajuste os campos para ficarem exatamente assim:
E-mail (texto, primário), Contato (link para a tabela "Contato",
seleção única), Tipo (texto livre). Remova qualquer campo que não
esteja nessa lista.
```
