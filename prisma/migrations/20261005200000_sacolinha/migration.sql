-- AlterTable
ALTER TABLE `configuracao_loja` ADD COLUMN `meses_sacolinha` INTEGER NOT NULL DEFAULT 3;

-- AlterTable
ALTER TABLE `itens_venda` ADD COLUMN `sacolinha_id` VARCHAR(191) NULL;

-- CreateTable
CREATE TABLE `sacolinhas` (
    `id` VARCHAR(191) NOT NULL,
    `cliente_id` VARCHAR(191) NOT NULL,
    `situacao` ENUM('aberta', 'envio_pedido', 'enviada', 'retirada', 'doada') NOT NULL DEFAULT 'aberta',
    `aberta_em` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `prazo` DATE NOT NULL,
    `envio_pedido_em` DATETIME(3) NULL,
    `frete_centavos` INTEGER NULL,
    `observacao` VARCHAR(255) NULL,
    `fechada_em` DATETIME(3) NULL,
    `ultimo_aviso_em` DATETIME(3) NULL,

    INDEX `sacolinhas_cliente_id_situacao_idx`(`cliente_id`, `situacao`),
    INDEX `sacolinhas_situacao_prazo_idx`(`situacao`, `prazo`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `itens_venda` ADD CONSTRAINT `itens_venda_sacolinha_id_fkey` FOREIGN KEY (`sacolinha_id`) REFERENCES `sacolinhas`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `sacolinhas` ADD CONSTRAINT `sacolinhas_cliente_id_fkey` FOREIGN KEY (`cliente_id`) REFERENCES `clientes`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;


-- Peças que já estavam "Na sacolinha" entram na sacolinha da cliente da venda
-- (uma por cliente), com prazo de 3 meses a partir da venda mais antiga.
INSERT INTO `sacolinhas` (`id`, `cliente_id`, `situacao`, `aberta_em`, `prazo`)
SELECT CONCAT('sacmig', LEFT(MD5(v.`cliente_id`), 19)), v.`cliente_id`, 'aberta', MIN(v.`data`), DATE_ADD(MIN(v.`data`), INTERVAL 3 MONTH)
FROM `itens_venda` i
JOIN `vendas` v ON v.`id` = i.`venda_id`
JOIN `pecas` p ON p.`id` = i.`peca_id`
WHERE p.`status` = 'na_sacolinha' AND v.`cliente_id` IS NOT NULL
GROUP BY v.`cliente_id`;

UPDATE `itens_venda` i
JOIN `vendas` v ON v.`id` = i.`venda_id`
JOIN `pecas` p ON p.`id` = i.`peca_id`
SET i.`sacolinha_id` = CONCAT('sacmig', LEFT(MD5(v.`cliente_id`), 19))
WHERE p.`status` = 'na_sacolinha' AND v.`cliente_id` IS NOT NULL;
