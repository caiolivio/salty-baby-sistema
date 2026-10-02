-- AlterTable
ALTER TABLE `itens_venda` ADD COLUMN `desconto_por_conta` ENUM('dividido', 'loja', 'fornecedora', 'misto') NULL;

-- AlterTable
ALTER TABLE `vendas` ADD COLUMN `motivo_desconto` VARCHAR(200) NULL;

-- Vendas antigas com desconto seguiam a regra "dividido" (peças da loja: o desconto é da loja).
UPDATE `itens_venda` SET `desconto_por_conta` = IF(`percentual_repasse` IS NULL, 'loja', 'dividido')
WHERE `desconto_centavos` > 0 AND `desconto_por_conta` IS NULL;
