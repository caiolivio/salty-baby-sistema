-- Pedido do Caio (28/10/2026): todas as peças que estão à venda na vitrine
-- passam para "Não listado" (continuam à venda pelo link e no WhatsApp
-- Marketing, mas saem da vitrine). Só dados, roda uma vez. Cada peça ganha a
-- linha de sempre no histórico.
INSERT INTO `alteracoes` (`id`, `tabela`, `registro_id`, `rotulo`, `campo`, `antes`, `depois`, `restrito`, `usuario_id`, `quem`, `motivo`, `criado_em`)
SELECT CONCAT('mig', REPLACE(UUID(), '-', '')), 'peca', p.`id`, LEFT(CONCAT(p.`codigo`, ' · ', p.`nome`), 191),
       'Status', 'À venda', 'Não listado', 0, NULL, 'Sistema (automático)',
       'Todas as peças à venda passaram para Não listado (pedido do Caio)', NOW(3)
  FROM `pecas` p
 WHERE p.`status` = 'publicada' AND p.`nao_listada` = 0;

UPDATE `pecas`
   SET `nao_listada` = 1, `atualizado_em` = NOW(3)
 WHERE `status` = 'publicada' AND `nao_listada` = 0;
