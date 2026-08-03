# 02 — Tabela Comunicação

## Objetivo

Registrar **todas as tentativas de comunicação** da Mata Viva (enviadas ou recebidas): ofícios, e-mails, mensagens, ligações, visitas — "comunicação indo" e "comunicação voltando".

## Prompt para o Kuma

```
Crie uma tabela chamada "Comunicação" no banco MataViva com os seguintes campos:

1. Título — campo Texto, marcado como campo primário
2. Tipo — campo Seleção única (Single select) com as opções:
   - Ofício
   - E-mail
   - Mensagem
   - Ligação
   - Visita
   - Outro
3. Direção — campo Seleção única (Single select) com as opções:
   - Enviada
   - Recebida
4. Data — campo Data
5. Contato — campo Link para tabela "Contato" (o interlocutor da comunicação)
6. Conteúdo — campo Texto longo
7. Status — campo Seleção única (Single select) com as opções:
   - Pendente
   - Respondida
   - Arquivada

Não crie nenhum campo adicional.
```

## Spec de verificação

| Campo | Tipo | Opções |
|---|---|---|
| Título | Text (primário) | — |
| Tipo | Single select | Ofício, E-mail, Mensagem, Ligação, Visita, Outro |
| Direção | Single select | Enviada, Recebida |
| Data | Date | — |
| Contato | Link para Contato | — |
| Conteúdo | Long text | — |
| Status | Single select | Pendente, Respondida, Arquivada |

## Notas

- **Dependências:** tabela **Contato** (passo 01) já deve existir.
- **Resultado esperado:** tabela "Comunicação" com 7 campos, incluindo o link para Contato.
- **Prompt corretivo** (se faltar o campo link):

```
Na tabela "Comunicação", adicione um campo chamado "Contato" do tipo
"Link para tabela" apontando para a tabela "Contato", permitindo selecionar
um único contato por comunicação.
```
