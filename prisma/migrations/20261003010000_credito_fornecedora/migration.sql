-- AlterTable
ALTER TABLE `acertos` ADD COLUMN `abatido_centavos` INTEGER NOT NULL DEFAULT 0;

-- AlterTable
ALTER TABLE `pedidos` ADD COLUMN `credito_fornecedora_id` VARCHAR(191) NULL;

-- AlterTable
ALTER TABLE `vendas` ADD COLUMN `credito_centavos` INTEGER NOT NULL DEFAULT 0,
    ADD COLUMN `credito_fornecedora_id` VARCHAR(191) NULL;

-- CreateTable
CREATE TABLE `movimentos_credito` (
    `id` VARCHAR(191) NOT NULL,
    `fornecedora_id` VARCHAR(191) NOT NULL,
    `tipo` ENUM('compra', 'bonus', 'abatimento') NOT NULL,
    `repasse_centavos` INTEGER NOT NULL DEFAULT 0,
    `bonus_centavos` INTEGER NOT NULL DEFAULT 0,
    `venda_id` VARCHAR(191) NULL,
    `acerto_id` VARCHAR(191) NULL,
    `descricao` VARCHAR(191) NOT NULL,
    `quem` VARCHAR(191) NOT NULL,
    `criado_em` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `movimentos_credito_fornecedora_id_criado_em_idx`(`fornecedora_id`, `criado_em`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `vendas` ADD CONSTRAINT `vendas_credito_fornecedora_id_fkey` FOREIGN KEY (`credito_fornecedora_id`) REFERENCES `fornecedoras`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `movimentos_credito` ADD CONSTRAINT `movimentos_credito_fornecedora_id_fkey` FOREIGN KEY (`fornecedora_id`) REFERENCES `fornecedoras`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `movimentos_credito` ADD CONSTRAINT `movimentos_credito_venda_id_fkey` FOREIGN KEY (`venda_id`) REFERENCES `vendas`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `movimentos_credito` ADD CONSTRAINT `movimentos_credito_acerto_id_fkey` FOREIGN KEY (`acerto_id`) REFERENCES `acertos`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `pedidos` ADD CONSTRAINT `pedidos_credito_fornecedora_id_fkey` FOREIGN KEY (`credito_fornecedora_id`) REFERENCES `fornecedoras`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;
