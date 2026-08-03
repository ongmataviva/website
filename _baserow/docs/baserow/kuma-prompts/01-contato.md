# 01 — Tabela Contato

## Objetivo

Registrar **com quem** a ONG Mata Viva se comunica, com cadastro único de **Pessoa Física (PF)** e **Pessoa Jurídica (PJ)** — estilo CRM: uma PF pode estar vinculada a várias PJs (órgãos públicos, condomínios, empresas que representa).

## Prompt para o Kuma

```
Crie uma tabela chamada "Contato" no banco MataViva com os seguintes campos:

1. Nome — campo Texto, marcado como campo primário
   (nome da pessoa física ou razão social da pessoa jurídica)
2. Tipo — campo Seleção única (Single select) com as opções:
   - Pessoa Física
   - Pessoa Jurídica
3. CPF — campo Texto (preencher apenas quando Tipo = Pessoa Física)
4. CNPJ — campo Texto (preencher apenas quando Tipo = Pessoa Jurídica)
5. Vínculos — campo Link para tabela "Contato" (a própria tabela),
   permitindo selecionar vários contatos (ex.: uma Pessoa Física
   vinculada a várias Pessoas Jurídicas que representa)
6. Observações — campo Texto longo

Não crie nenhum campo adicional.
NÃO crie outros campos de link além de "Vínculos": os telefones, e-mails
e endereços serão tabelas separadas (passos 01b, 01c e 01d) e os campos
de link reversos aparecerão automaticamente em "Contato".
```

## Spec de verificação

| Campo | Tipo | Opções |
|---|---|---|
| Nome | Text (primário) | — |
| Tipo | Single select | Pessoa Física, Pessoa Jurídica |
| CPF | Text | — |
| CNPJ | Text | — |
| Vínculos | Link para Contato (a própria tabela, múltiplo) | — |
| Observações | Long text | — |

Após criar as tabelas **Telefone** (01b), **E-mail** (01c) e **Endereço** (01d), o Baserow adiciona automaticamente em Contato os campos reversos **Telefones**, **E-mails** e **Endereços** (link para as respectivas tabelas).

## Notas

- **Dependências:** nenhuma — criar primeiro.
- **Resultado esperado:** tabela "Contato" com 6 campos, incluindo o link **auto-referenciado** Vínculos (PF↔PJ). Os links para Telefone/E-mail/Endereço chegam via campo reverso automático (01b–01d).
- **Modelagem:** cadastro único de PF e PJ (discriminado por "Tipo"); relação PF↔PJ (uma PF representa várias PJs, como num CRM) via "Vínculos". Telefones, e-mails e endereços são 1:N em tabelas próprias.
- **Prompt corretivo** (se faltar campo/tipo errado):

```
Na tabela "Contato", ajuste os campos para ficarem exatamente assim:
Nome (texto, primário), Tipo (seleção única: Pessoa Física, Pessoa
Jurídica), CPF (texto), CNPJ (texto), Vínculos (link para a própria
tabela "Contato", seleção múltipla), Observações (texto longo).
Remova qualquer campo que não esteja nessa lista.
```
