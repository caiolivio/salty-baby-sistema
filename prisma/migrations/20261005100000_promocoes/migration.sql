-- AlterTable
ALTER TABLE `itens_pedido` ADD COLUMN `desconto_centavos` INTEGER NOT NULL DEFAULT 0,
    ADD COLUMN `promocao_id` VARCHAR(191) NULL;

-- CreateTable
CREATE TABLE `promocoes` (
    `id` VARCHAR(191) NOT NULL,
    `nome` VARCHAR(80) NOT NULL,
    `tipo` ENUM('reais', 'percentual') NOT NULL,
    `valor` INTEGER NOT NULL,
    `inicio` DATE NOT NULL,
    `fim` DATE NOT NULL,
    `por_conta_da_loja` BOOLEAN NOT NULL DEFAULT false,
    `ativa` BOOLEAN NOT NULL DEFAULT true,
    `quem` VARCHAR(191) NOT NULL,
    `criado_em` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `atualizado_em` DATETIME(3) NOT NULL,

    INDEX `promocoes_inicio_fim_idx`(`inicio`, `fim`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `promocoes_pecas` (
    `promocao_id` VARCHAR(191) NOT NULL,
    `peca_id` VARCHAR(191) NOT NULL,

    INDEX `promocoes_pecas_peca_id_idx`(`peca_id`),
    PRIMARY KEY (`promocao_id`, `peca_id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `itens_pedido` ADD CONSTRAINT `itens_pedido_promocao_id_fkey` FOREIGN KEY (`promocao_id`) REFERENCES `promocoes`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `promocoes_pecas` ADD CONSTRAINT `promocoes_pecas_promocao_id_fkey` FOREIGN KEY (`promocao_id`) REFERENCES `promocoes`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `promocoes_pecas` ADD CONSTRAINT `promocoes_pecas_peca_id_fkey` FOREIGN KEY (`peca_id`) REFERENCES `pecas`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

