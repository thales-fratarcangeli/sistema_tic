# BT Fitas — Tutorial de instalação

Este guia explica como baixar, instalar e testar o sistema BT Fitas. Não
precisa saber programação — é só seguir os passos.

## 1. Baixar

Acesse a página de downloads do projeto:

**https://github.com/thales-fratarcangeli/sistema_tic/releases/latest**

Lá tem dois arquivos pra baixar:

| Arquivo | Para quem | O que é |
|---|---|---|
| `usuario.zip` | Todo computador que vai **usar** o sistema (financeiro, produção, estoque, admin) | O instalador do programa |
| `servidor.zip` | O computador que vai **guardar os dados** | Instruções + pasta pronta pra compartilhar na rede |

Se for testar tudo num computador só, baixe só o `usuario.zip` — dá pra
configurar um caminho local e não precisa mexer em rede.

## 2. Preparar o servidor (uma vez só)

> Pule esta etapa se estiver testando sozinho num computador só. Nesse
> caso, na primeira tela do sistema pode deixar preenchido o caminho
> local que já vem sugerido.

1. Baixe e extraia o `servidor.zip` no computador que vai ficar ligado o
   dia todo, guardando os dados.
2. Abra o arquivo `LEIA-ME.txt` que está dentro e siga os passos —
   basicamente é compartilhar uma pasta na rede do Windows.
3. Anote o caminho de rede que aparecer no final, algo como
   `\\NOME-DO-COMPUTADOR\bt_fitas`. Vai precisar dele no passo 4.

## 3. Instalar em cada computador de usuário

1. Baixe e extraia o `usuario.zip`.
2. Dê dois cliques em **`BT Fitas Setup x.x.x.exe`**.
3. Siga o instalador (pode clicar Avançar/Instalar nas telas padrão).
   Se o Windows perguntar se você confia no programa (SmartScreen),
   clique em "Mais informações" → "Executar assim mesmo" — é normal
   para programas que não compraram um certificado digital.
4. Ao terminar, vai aparecer um ícone **BT Fitas** na área de trabalho
   e no menu Iniciar. É esse ícone que abre o sistema — o launcher.
   Repita esses 4 passos em cada computador que vai usar o sistema.

## 4. Primeira abertura

1. Dê dois cliques no ícone **BT Fitas**.
2. Na tela de configuração inicial, informe o caminho da pasta
   compartilhada do servidor (o que você anotou no passo 2) — ou deixe
   o caminho local sugerido, se estiver testando sozinho.
3. Clique em **Salvar**.
4. Você vai cair na tela de login. Entre com o usuário criado
   automaticamente na primeira vez que alguém configura essa pasta:

   ```
   usuário: admin
   senha:   admin123
   ```

5. **Troque essa senha assim que entrar** — o perfil Admin tem uma
   aba "Usuários" pra isso, e também pra cadastrar os usuários de
   verdade (financeiro, produção, estoque).

## 5. Testando os quatro perfis

Logado como `admin`, você já tem acesso a tudo: as abas Financeiro,
Produção e Estoque dentro da própria tela de Admin. Se quiser testar o
login de cada perfil separadamente, cadastre um usuário pra cada um na
aba Usuários (nome, usuário, senha, perfil).

Fluxo pra testar de ponta a ponta:

1. **Financeiro** → cadastra um cliente, cadastra um produto, lança um
   pedido com pelo menos um item.
2. **Produção** → o pedido aparece como uma OP na fila. Aponta uma
   quantidade produzida e encerra a OP.
3. **Estoque** → a OP encerrada aparece aguardando conferência.
   Confirma a entrada, depois registra a saída/expedição.
4. O pedido fica marcado como **finalizado**.

## Problemas comuns

- **"Não foi possível usar esse caminho"** ao salvar a configuração:
  confira se você tem permissão de escrita na pasta (ou na pasta de
  rede) informada.
- **Usuário/senha não funciona no primeiro acesso**: confira se você
  digitou exatamente `admin` e `admin123` (tudo minúsculo, sem espaço).
- **Windows bloqueou o instalador (SmartScreen)**: clique em "Mais
  informações" → "Executar assim mesmo".

Qualquer outro problema, anota a mensagem de erro (se aparecer) e
manda pra quem tá cuidando do sistema.
