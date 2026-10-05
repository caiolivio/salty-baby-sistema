-- AlterTable
ALTER TABLE `vendas` ADD COLUMN `taxa_ajustada` BOOLEAN NOT NULL DEFAULT false,
    ADD COLUMN `taxa_centavos` INTEGER NOT NULL DEFAULT 0;

-- CreateTable
CREATE TABLE `taxas_pagamento` (
    `forma` ENUM('pix', 'cartao', 'dinheiro', 'credito_fornecedora') NOT NULL,
    `percentual` INTEGER NOT NULL,
    `atualizado_em` DATETIME(3) NOT NULL,
    `quem` VARCHAR(191) NOT NULL,

    PRIMARY KEY (`forma`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `despesas` (
    `id` VARCHAR(191) NOT NULL,
    `data` DATE NOT NULL,
    `descricao` VARCHAR(160) NOT NULL,
    `categoria` VARCHAR(40) NOT NULL,
    `valor_centavos` INTEGER NOT NULL,
    `usuario_id` VARCHAR(191) NULL,
    `quem` VARCHAR(191) NOT NULL,
    `criado_em` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `despesas_data_idx`(`data`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

