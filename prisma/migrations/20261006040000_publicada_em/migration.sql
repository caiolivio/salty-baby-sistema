-- Contrato, cláusula 11.2: o prazo de 6 meses para pedir a peça de volta conta do
-- dia em que ela entrou à venda no site, não da data de entrada na loja.
ALTER TABLE `pecas` ADD COLUMN `publicada_em` DATE NULL;

-- Peças que já passaram pela venda: o primeiro dia em que o histórico mostra a
-- peça "À venda" ou "Não listado" (horário de Brasília); sem esse registro
-- (cadastrada já à venda ou importada do Notion), a data de entrada.
UPDATE `pecas` p
SET p.`publicada_em` = COALESCE(
  (SELECT DATE(CONVERT_TZ(MIN(a.`criado_em`), '+00:00', '-03:00'))
     FROM `alteracoes` a
    WHERE a.`tabela` = 'peca' AND a.`registro_id` = p.`id` AND a.`campo` = 'Status'
      AND a.`depois` IN ('À venda', 'Não listado')
      AND (a.`antes` IS NULL OR a.`antes` = 'Rascunho')),
  p.`data_entrada`)
WHERE p.`status` <> 'rascunho' OR EXISTS (
  SELECT 1 FROM `alteracoes` a
   WHERE a.`tabela` = 'peca' AND a.`registro_id` = p.`id` AND a.`campo` = 'Status' AND a.`depois` IN ('À venda', 'Não listado'));
