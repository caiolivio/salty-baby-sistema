-- AlterTable
ALTER TABLE `itens_pedido` ADD COLUMN `desconto_cupom_centavos` INTEGER NOT NULL DEFAULT 0;

-- AlterTable
ALTER TABLE `pedidos` ADD COLUMN `cupom_codigo` VARCHAR(30) NULL,
    ADD COLUMN `cupom_id` VARCHAR(191) NULL,
    ADD COLUMN `desconto_cupom_centavos` INTEGER NOT NULL DEFAULT 0;

-- CreateTable
CREATE TABLE `cupons` (
    `id` VARCHAR(191) NOT NULL,
    `codigo` VARCHAR(30) NOT NULL,
    `tipo` ENUM('reais', 'percentual') NOT NULL,
    `valor` INTEGER NOT NULL,
    `inicio` DATE NULL,
    `fim` DATE NULL,
    `limite_usos` INTEGER NULL,
    `pedido_minimo_centavos` INTEGER NOT NULL DEFAULT 0,
    `por_conta_da_loja` BOOLEAN NOT NULL DEFAULT false,
    `ativo` BOOLEAN NOT NULL DEFAULT true,
    `cliente_id` VARCHAR(191) NULL,
    `marca` VARCHAR(80) NULL,
    `tamanho` VARCHAR(30) NULL,
    `genero` ENUM('masculino', 'feminino', 'unissex') NULL,
    `fornecedora_id` VARCHAR(191) NULL,
    `quem` VARCHAR(191) NOT NULL,
    `criado_em` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `atualizado_em` DATETIME(3) NOT NULL,

    UNIQUE INDEX `cupons_codigo_key`(`codigo`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `pedidos` ADD CONSTRAINT `pedidos_cupom_id_fkey` FOREIGN KEY (`cupom_id`) REFERENCES `cupons`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

