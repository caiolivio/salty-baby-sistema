-- AlterTable
ALTER TABLE `itens_venda` ADD COLUMN `acerto_id` VARCHAR(191) NULL;

-- CreateTable
CREATE TABLE `acertos` (
    `id` VARCHAR(191) NOT NULL,
    `numero` INTEGER NOT NULL,
    `fornecedora_id` VARCHAR(191) NOT NULL,
    `data` DATE NOT NULL,
    `forma` ENUM('pix', 'dinheiro', 'transferencia', 'outro') NOT NULL,
    `total_centavos` INTEGER NOT NULL,
    `pecas` INTEGER NOT NULL,
    `observacao` VARCHAR(200) NULL,
    `usuario_id` VARCHAR(191) NULL,
    `quem` VARCHAR(191) NOT NULL,
    `criado_em` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `cancelado_em` DATETIME(3) NULL,
    `cancelado_por` VARCHAR(191) NULL,

    UNIQUE INDEX `acertos_numero_key`(`numero`),
    INDEX `acertos_fornecedora_id_data_idx`(`fornecedora_id`, `data`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateIndex
CREATE INDEX `itens_venda_acerto_id_idx` ON `itens_venda`(`acerto_id`);

-- AddForeignKey
ALTER TABLE `itens_venda` ADD CONSTRAINT `itens_venda_acerto_id_fkey` FOREIGN KEY (`acerto_id`) REFERENCES `acertos`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `acertos` ADD CONSTRAINT `acertos_fornecedora_id_fkey` FOREIGN KEY (`fornecedora_id`) REFERENCES `fornecedoras`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;
