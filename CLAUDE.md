# Salty Baby · Sistema de estoque, consignação e vendas

Brechó infantil consignado de Caraguatatuba-SP que vende pelo WhatsApp (conversa privada e grupos) e, com este sistema, também por um site.
Este arquivo contém as regras de negócio já decididas. Siga-as sempre. Se um pedido contradizer uma regra, pergunte antes de mudar a regra.

- Plano completo: https://claude.ai/artifact/PkJ8zbuPxMTAkysBooPR4R
- Wireframes (apenas referência visual, não é a base final): https://claude.ai/artifact/C2niktPhwzbeMEsUdK5bAs

## Quem usa e como trabalhar

- O dono do projeto, Caio, **não é programador**. Todo o código é escrito pelo Claude Code.
  - Explique o que foi feito em português simples, sem jargão, e diga como testar no navegador.
  - Cuide você mesmo dos passos técnicos (instalar, configurar, migrar, publicar). Peça ao Caio apenas acessos de conta ou decisões de negócio.
  - Trabalhe em partes pequenas, e cada parte deve poder ser testada num link de prévia.
- O sistema tem 3 perfis de usuário, e uma mesma pessoa pode ter mais de um:
  - **Administradora:** gerencia tudo. Pode ter ajudantes com permissões menores.
  - **Cliente:** compra.
  - **Fornecedora:** consigna peças, acompanha as vendas e compra usando o próprio saldo.
- Toda a interface é em português do Brasil. Moeda em R$ no formato `R$ 1.234,56`, datas no formato `dd/mm/aaaa` e fuso `America/Sao_Paulo`.

## Stack

- Next.js (App Router) + TypeScript, em um projeto só: vitrine, área do cliente, área da fornecedora e painel.
- Tudo roda na VPS, sem serviços pagos de terceiros (decisão do Caio, para não gerar custo que cresce com o uso):
  - banco de dados **MySQL** do próprio CloudPanel, acessado pelo Prisma, com migrações versionadas no repositório;
  - login próprio com Auth.js e senhas com hash, com os perfis administradora, ajudante, cliente e fornecedora;
  - fotos numa pasta da VPS, fora do código, reduzidas no envio (sharp);
  - controle de acesso por perfil feito no servidor, em toda rota e ação (o MySQL não tem Row Level Security), com testes automáticos das permissões.
- Hospedagem na VPS própria da Salty, na Hostinger, com o painel CloudPanel (site Node.js). A VPS já tem outros sites, então o sistema não pode atrapalhá-los.
  - A publicação é automática a partir do GitHub, e o Caio nunca precisa rodar comandos no servidor. O build roda no GitHub Actions, não na VPS.
  - Existe um site de teste separado, com banco próprio, para testar cada parte antes de ela ir para o ar.
  - Tarefas agendadas (reserva, lembretes, relatórios) rodam no cron do servidor.
  - Backup diário do banco e das fotos, com uma cópia guardada fora da VPS.
- PWA instalável. O ícone é a cauda de baleia da marca.
- Valores em dinheiro são guardados em **centavos (inteiro)**, nunca em float.
- Repasse, desconto e lucro são **gravados em cada item vendido** no momento da venda. Uma mudança futura de percentual não pode alterar o histórico.

## Identidade visual

- Arquivos da marca: `public/marca/` (a cópia original está na pasta do projeto, `marca/`).
- Cores:
  - turquesa `#32AFB5`: ícones e destaques;
  - azul petróleo `#13506E`: textos, botões e links;
  - tinta `#13212B`: texto principal.
- O turquesa não tem contraste suficiente para texto sobre fundo branco.
- Slogan: "Moda Sustentável".

## Regras de negócio

### Códigos
- **Fornecedora:** `F` + número sequencial, gerado automaticamente (F01 a F47 já existem e são mantidos; a próxima é F48, depois de F99 vem F100). O código é um campo próprio, nunca parte do nome.
- **Peça:** `<código da fornecedora>-<5 dígitos>`, com numeração sequencial por fornecedora (ex.: `F48-00001`).
  - Peças importadas do Notion também **recebem código novo** nesse formato, numeradas por fornecedora na ordem de entrada. O código antigo fica guardado num campo próprio, e a busca encontra a peça pelos dois.
  - Peças da própria loja usam o prefixo `SB` (ex.: `SB-00012`).
- Um código nunca é reaproveitado, nem depois que a peça é excluída.

### Peça
- A quantidade inicial é 1. A administradora pode alterar.
- Gênero: masculino, feminino ou unissex.
- Tamanhos, nesta ordem: Prematuro, RN (0 a 3 meses), P (3 a 6 meses), M (6 a 9 meses), G (9 meses a 1 ano), 1 ano, 18 meses, 2, 3, 4, 5, 6, 7, 8, 9, 10, 12, 14, 16 e 18 anos. A ordem é usada para filtrar a vitrine e sugerir o próximo tamanho.
- **Conservação** é um campo próprio: nova com etiqueta, seminova ou com marcas de uso. "Variação" é outro campo.
- Outros campos: marca, cor, tamanho, medidas, descrição, fotos e data de entrada.
- **Categorias:** escolhidas numa lista, e a peça pode ter mais de uma. A administradora inclui, renomeia e tira categorias do cadastro em `/painel/categorias`. As iniciais são Roupas, Calçados, Fantasias, Brinquedos, Livros, Acessórios, Utilitários, Acessórios para carro e Acessórios de bebê.
- As fotos podem vir da câmera ou da galeria do celular.
- Não é possível marcar uma peça como vendida sem valor de venda.

### Cálculos
- `% repasse` é a parte que vai para a **fornecedora**.
- Peça consignada: `repasse = valor pago pelo cliente × % repasse`, e `lucro = valor pago − repasse`.
- Peça da loja: `repasse = 0`, e `lucro = valor pago − custo`.
- O desconto é dividido entre a Salty e a fornecedora, porque o repasse é calculado sobre o valor **depois do desconto**.
- Um cupom sobre o total do pedido é distribuído entre as peças, na proporção do preço de cada uma.
  - Exemplo: peças de R$ 30 e R$ 10 com cupom de R$ 4 ficam R$ 27 e R$ 9. Com 40% de repasse, as fornecedoras recebem R$ 10,80 e R$ 3,60.
- Taxas de pagamento e despesas entram no Financeiro, para calcular o lucro real.

### Ciclo de vida da peça
- Caminho normal: `rascunho → publicada → reservada → vendida → na_sacolinha → enviada` (ou `retirada`).
- Saídas alternativas: `devolvida`, `doada` e `baixa` (avaria ou perda).

### Pedido, reserva e pagamento
- O cliente monta o **pedido** no site.
- Ao clicar em "Fechar pedido", as peças ficam **reservadas por 15 minutos** e abre o WhatsApp da Salty com a mensagem pronta (códigos, peças, tamanhos e total).
- Se o pagamento não for confirmado em 15 minutos, as peças voltam a ficar disponíveis. Quem está na **fila de espera** da peça é avisado.
- O pagamento acontece fora do sistema. A administradora clica em **Confirmar pagamento**, e então:
  - as peças viram vendidas e saem da vitrine;
  - os repasses são gerados;
  - a entrada é lançada no Financeiro;
  - a administradora escolhe entre "enviar agora" e "guardar na sacolinha".
- Canais de venda: site, WhatsApp privado, cada grupo de WhatsApp, Instagram, loja e Bag.
- Formas de pagamento: Pix, cartão, dinheiro e crédito da fornecedora.

### Sacolinha
- A sacolinha guarda peças **já pagas** na loja. Cada cliente tem uma sacolinha aberta por vez.
- O prazo padrão é de **3 meses** a partir da primeira peça, e a administradora pode alterar.
- O cliente recebe um aviso semanal com o que está na sacolinha, quanto tempo falta, as novidades no tamanho dele e um atalho para pedir o envio.
- Quando o prazo vence, as peças são **doadas**. Isso aparece claramente na compra, na página da sacolinha e nos lembretes. Peças vencidas vão para uma lista "a doar", que a administradora confirma.
- Ao pedir o envio, o cliente paga o frete. A sacolinha é fechada e vai para o histórico, e a próxima compra abre uma nova.

### Consignação e fornecedoras
- **Acerto mensal:** no dia 1, o sistema calcula os repasses do mês anterior (contas a pagar).
- O campo "Recebido" indica que a fornecedora já recebeu o repasse.
- A administradora pode registrar o pagamento de vários repasses de uma vez. Isso gera um comprovante com o resumo das vendas, enviado pelo WhatsApp e salvo na área da fornecedora.
- O **relatório mensal** da fornecedora é gerado no dia 1. Ele traz só as vendas (sem peças não vendidas), com gráfico. É enviado apenas pelo WhatsApp e fica na área da fornecedora.
- A **área da fornecedora** mostra, em tempo real, as peças, as vendas, o saldo, os acertos e os relatórios. A fornecedora pode comprar na Salty usando o saldo como crédito.
- O **contrato de consignação digital** é aceito na área da fornecedora e inclui a regra de divisão do desconto.
- Não existe remarcação automática de preço por tempo de consignação.

### Descontos
- **Cupom:** um código com percentual ou valor fixo, validade, limite de usos e pedido mínimo. Pode ser restrito a cliente, marca, tamanho, gênero ou fornecedora.
- **Promoção:** peças escolhidas com um desconto e um período definidos. A vitrine mostra o preço antigo riscado.

### Grupos de WhatsApp
- Os grupos são: Menino, Meninas, Liquida Salty, Acessórios e Calçados. A lista pode ser editada no painel.
- **Grupo sugerido para cada peça:**
  - acessório vai para Acessórios, e calçado para Calçados;
  - peça em promoção vai para Liquida Salty;
  - nos outros casos vale o gênero: masculino vai para Menino, feminino para Meninas e unissex para os dois.
- O botão "Divulgar no grupo" monta o texto e a foto prontos para copiar. O link leva a marca do grupo de origem, para medir as vendas por grupo.
- **Resumo semanal:** um post por grupo com as novidades da semana.
- A postagem nos grupos é manual (copiar e colar). Os lembretes começam como lista "enviar hoje", com links `wa.me`. A automação pela API oficial fica para depois.

### Clientes
- O cadastro tem os dados de contato e o **perfil da criança** (nascimento ou tamanho, e gênero), usado para filtrar a vitrine e sugerir o próximo tamanho.
- O cliente pode criar **favoritos** e **alertas** ("me avise quando chegar", por tamanho, marca ou categoria). A Salty vê quem favoritou cada peça.

### Outros
- Não há emissão de nota fiscal por enquanto.
- LGPD:
  - CPF e CNPJ só aparecem para a administradora;
  - o cadastro tem um aviso de privacidade;
  - há um histórico de alterações (quem mudou preço ou status).
- O painel tem exportação para Excel/CSV em todas as tabelas, e o banco tem backup diário.
- Etiqueta com QR code: o QR abre a peça no painel.
- Cadastro rápido pelo celular: a foto é tirada pela câmera, reduzida automaticamente, e há o botão "duplicar peça".
- Fora do escopo: novidades com hora marcada, mensagem fixada nos grupos, remarcação automática.

## Importação do Notion

- Hoje a loja usa o modelo "Organiza Brechó 2.0" no Notion (cerca de 271 peças, fornecedoras F01 a F47). As bases chegam exportadas em CSV.
- Na importação:
  - dar código novo a todas as peças (ver "Códigos") e guardar o código antigo;
  - a fornecedora vem do vínculo da peça no Notion, não do código antigo (há peças com o prefixo errado);
  - peças com "Consignado = Não" são da loja (a F43, Ana Carolina, é a dona da Salty), recebem o prefixo `SB` e não têm repasse;
  - o repasse de 1% do Macaquinho F10-0000 é erro de digitação e vira 40%;
  - vendas ainda não acertadas têm o repasse recalculado sobre o valor com desconto (o Notion calculou sobre o preço cheio);
  - separar o código da fornecedora do nome;
  - mover "Usado" do campo Variação para Conservação;
  - **recalcular o lucro**, porque o Notion ignora o repasse. Exemplo: R$ 15 com 40% de repasse dá R$ 9 de lucro, e o Notion mostra R$ 15.
- Vendas antigas podem ter até 5 produtos (limite do Notion). No sistema novo, um pedido não tem limite de itens.

## Fases

1. **Base:**
   - importação do Notion;
   - login e perfis;
   - fornecedoras;
   - estoque, cadastro rápido e etiqueta com QR;
   - vitrine;
   - pedido pelo WhatsApp com reserva;
   - confirmar pagamento e vendas;
   - clientes;
   - post pronto e grupo sugerido;
   - exportação e backup;
   - histórico de alterações.
2. **Repasse:**
   - consignação e acerto em lote com comprovante;
   - contas a pagar;
   - área da fornecedora com compra em crédito;
   - relatório mensal;
   - contrato digital;
   - financeiro com taxas e despesas;
   - indicadores e dashboards;
   - cupons e promoções.
3. **Cliente:**
   - área do cliente;
   - sacolinha com avisos e frete;
   - favoritos e alertas;
   - perfil da criança;
   - fila de espera;
   - PWA.
4. **Automação:**
   - Pix automático por gateway;
   - envios automáticos pelo WhatsApp;
   - resumo semanal por grupo.

## Como entregar cada parte

- Um pull request por parte, com uma descrição em português simples do que mudou e de como testar.
- Rode lint, typecheck e testes antes de abrir o PR. Os cálculos de repasse, desconto e lucro precisam de testes automáticos.
- Nunca coloque senhas ou chaves no código. Use variáveis de ambiente.

## Para o Claude Code

- Esta versão do Next.js tem mudanças em relação ao que você conhece. Leia `AGENTS.md` e a documentação em `node_modules/next/dist/docs/` antes de escrever código do Next.
- Comandos: `npm run lint`, `npm run typecheck`, `npm test`, `npm run build`.
- Publicação: `.github/workflows/verificar-e-publicar.yml` publica no teste.saltybaby.com.br (porta 4100, usuário SSH `sbdeployteste`) em todo pull request e em toda mudança na `main`. O script que roda na VPS é `scripts/servidor/publicar.sh`. O app.saltybaby.com.br (porta 3100, usuário `sbdeployapp`) ainda não recebe publicação.
- Não há acesso SSH à VPS a partir do Claude Code: para investigar a publicação, leia os registros da execução no GitHub Actions.
- Banco: Prisma com o adaptador MariaDB (`src/lib/banco.ts`). Toda mudança de estrutura é uma migração em `prisma/migrations`, aplicada pela publicação. Migrações precisam funcionar com a versão anterior do sistema ainda no ar.
- Acesso: as regras de quem entra onde ficam em `src/lib/permissoes.ts` (com testes). Toda página, layout e ação do servidor protegidos começa com `exigirAcesso(...)` de `src/lib/acesso.ts`.
- Fotos: gravadas por `src/lib/fotos.ts` em `FOTOS_DIR` (na VPS, `~/saltybaby/fotos`, fora das versões) e servidas em `/fotos/...`.
- Importação do Notion: a administradora envia o .zip do export em `/painel/importar`. As regras ficam em `src/lib/importacao/notion.ts` (com testes) e só rodam com o banco vazio. No site de teste (`IMPORTACAO_PODE_APAGAR=sim`) dá para apagar e importar de novo.
- Fornecedoras: o código novo vem da tabela `sequencias` (chave `fornecedora`), reservado dentro da transação em `src/lib/fornecedoras/gravar.ts`. As regras do formulário ficam em `src/lib/fornecedoras/dados.ts` (com testes).
- Peças: o código vem da tabela `sequencias` (chave `peca:<prefixo>`), reservado em `src/lib/pecas/gravar.ts`. As regras do formulário ficam em `src/lib/pecas/dados.ts` (com testes). A fornecedora de uma peça não muda depois do cadastro, porque o código leva o dela. As fotos são reduzidas no navegador (`src/componentes/reduzir-foto.ts`) e de novo no servidor.
- Segredos da publicação: `AUTH_SECRET` é criado na própria VPS (`~/saltybaby/segredos-do-servidor.env`). `CODIGO_PRIMEIRO_ACESSO` é um segredo do GitHub, usado só para criar a primeira administradora.
- Etiquetas: `/etiquetas?ids=...&formato=a4|rolo` imprime etiquetas de 50 × 30 mm (fora do layout do painel, mas com `exigirAcesso("painel")`). O QR grava o endereço curto `/e/<código>` (`src/lib/etiquetas.ts`), que abre a peça no painel e pede login antes, se preciso.
- Vitrine: `src/app/(loja)/` (início `/` e `/peca/<código em minúsculas>`), regras em `src/lib/vitrine.ts` (com testes). Mostra só peças `publicada` com estoque; a página da peça também abre as `reservada`. Nunca mostra fornecedora, custo ou repasse. Peça sem gênero aparece nos filtros de menina e de menino. O botão do WhatsApp usa o número da loja, (12) 98105-3623 (`WHATSAPP_LOJA` em `src/lib/vitrine.ts`; a variável de ambiente de mesmo nome pode trocar).
- Carrinho e pedido: o carrinho fica num cookie (`carrinho`, ids das peças) e só o "Fechar pedido" grava no banco (`src/lib/pedidos/gravar.ts`): reserva cada peça com `UPDATE ... WHERE status = publicada` (duas clientes nunca pegam a mesma), cria o pedido com número da tabela `sequencias` (chave `pedido`) e abre o WhatsApp com a mensagem de `src/lib/pedidos/regras.ts` (com testes). Reservas vencidas são liberadas por `liberarReservasVencidas()`, chamada antes de mostrar vitrine, carrinho, pedido e painel (não depende de cron). Pedidos no painel em `/painel/pedidos`.
- Vendas: "Confirmar pagamento" fica em `/painel/pedidos/<id>` (só administradora) e grava a venda por `src/lib/vendas/gravar.ts`. Repasse, desconto e lucro de cada item vêm de `calcularItens` em `src/lib/vendas/regras.ts` (com testes, usa `src/lib/calculos.ts`). Pedido com reserva vencida pode ser confirmado se as peças ainda estiverem à venda. Lista em `/painel/vendas` (só administradora).
- Detalhes do pedido: `/painel/pedidos/<id>` mostra fotos, fornecedora e cliente, e permite tirar ou incluir peças (`tirarPecaDoPedido` e `incluirPecaNoPedido` em `src/lib/pedidos/gravar.ts`) enquanto o pedido não foi pago. A página enxuta de confirmação fica em `/painel/pedidos/<id>/confirmar`. A cliente informa o WhatsApp ao fechar o pedido; no painel dá para ligar o pedido a uma cliente do cadastro, e a venda leva essa cliente.
- Venda direta: `/painel/vendas/nova` (só administradora) registra vendas do WhatsApp, grupos, Instagram, loja e Bag. As peças escolhidas ficam no cookie `venda_painel` (`src/app/painel/vendas/nova/pecas-da-venda.ts`) e entram pelo código, pelo botão "Vender esta peça" ou lendo o QR com a câmera (BarcodeDetector ou `jsqr`). A venda é gravada por `registrarVendaDireta` em `src/lib/vendas/gravar.ts`; canal, grupo e data vêm de `lerVendaDireta` em `src/lib/vendas/regras.ts` (com testes). O grupo vem da tabela `grupos_whatsapp`.
- Clientes: `/painel/clientes` (lista com busca, compras e última compra), `/painel/clientes/nova` e `/painel/clientes/<id>` (dados, compras e pedidos em aberto). Regras do formulário em `src/lib/clientes/dados.ts` (com testes): WhatsApp guardado só com os números e o DDD, e CPF só a administradora vê e altera (a ajudante salva sem mexer nele). Não deixa cadastrar duas clientes com o mesmo WhatsApp.
- Resumo da cliente (página `/painel/clientes/<id>`): ticket médio, gasto no período (anual = últimos 12 meses, mensal ou por datas, escolhido na URL por `?periodo=anual|mensal|periodo`; gráfico em SVG, só administradora), marcas mais compradas e crianças estimadas pelos tamanhos e datas das compras (`src/lib/clientes/perfil.ts`, com testes; é estimativa). As crianças de verdade ficam na tabela `criancas` (nome, nascimento, sexo), cadastradas na mesma página.
- WhatsApp Marketing: `/painel/marketing` (administradora e ajudante) monta uma divulgação com várias peças: busca por código, nome, categoria, tamanho e público, lista guardada no cookie `divulgacao_painel` (até 30 peças, `src/app/painel/marketing/lista-da-divulgacao.ts`), grupo (o mais sugerido para as peças vem marcado), título e texto (guardados no navegador) e o post pronto de `textoDaDivulgacao`. Copia o texto, baixa as fotos em JPEG e, no celular, compartilha fotos e texto (`src/componentes/compartilhar.ts`). A mesma página mostra as vendas por grupo (só administradora).
- Grupos de WhatsApp: tabela `grupos_whatsapp` (nome, `codigo` da marca no link, `papel` da regra de sugestão, ativo), editada em `/painel/marketing/grupos` (só administradora). Regras do grupo sugerido e do texto do post em `src/lib/grupos/regras.ts` (com testes). A página da peça no painel tem "Divulgar no grupo" para uma peça só (`src/app/painel/pecas/divulgar-no-grupo.tsx`). O link do post é `/peca/<código>?g=<codigo do grupo>`; o `src/proxy.ts` guarda o grupo no cookie `grupo_origem`, o "Fechar pedido" grava em `pedidos.grupo_id` e a venda confirmada leva o grupo (`vendas.grupo_id` e o nome em `vendas.grupo`).
- Compartilhar no site: a página da peça na vitrine tem "Compartilhar com alguém no WhatsApp" (`wa.me` sem número, mensagem de `mensagemParaAmiga` em `src/lib/vitrine.ts`).
