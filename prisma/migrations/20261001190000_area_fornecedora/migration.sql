-- AlterTable
ALTER TABLE `pecas` MODIFY `status` ENUM('rascunho', 'publicada', 'reservada', 'vendida', 'na_sacolinha', 'enviada', 'retirada', 'devolvida', 'devolucao_pedida', 'doada', 'baixa') NOT NULL DEFAULT 'rascunho';

-- CreateTable
CREATE TABLE `devolucoes` (
    `id` VARCHAR(191) NOT NULL,
    `peca_id` VARCHAR(191) NOT NULL,
    `fornecedora_id` VARCHAR(191) NOT NULL,
    `situacao` ENUM('pedida', 'devolvida', 'cancelada') NOT NULL DEFAULT 'pedida',
    `status_anterior` ENUM('rascunho', 'publicada', 'reservada', 'vendida', 'na_sacolinha', 'enviada', 'retirada', 'devolvida', 'devolucao_pedida', 'doada', 'baixa') NOT NULL,
    `nao_listada_anterior` BOOLEAN NOT NULL DEFAULT false,
    `pedida_em` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `concluida_em` DATETIME(3) NULL,

    INDEX `devolucoes_situacao_idx`(`situacao`),
    INDEX `devolucoes_peca_id_idx`(`peca_id`),
    INDEX `devolucoes_fornecedora_id_idx`(`fornecedora_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `convites_fornecedora` (
    `id` VARCHAR(191) NOT NULL,
    `fornecedora_id` VARCHAR(191) NOT NULL,
    `codigo_hash` VARCHAR(64) NOT NULL,
    `expira_em` DATETIME(3) NOT NULL,
    `usado_em` DATETIME(3) NULL,
    `criado_em` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    UNIQUE INDEX `convites_fornecedora_codigo_hash_key`(`codigo_hash`),
    INDEX `convites_fornecedora_fornecedora_id_idx`(`fornecedora_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `devolucoes` ADD CONSTRAINT `devolucoes_peca_id_fkey` FOREIGN KEY (`peca_id`) REFERENCES `pecas`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `devolucoes` ADD CONSTRAINT `devolucoes_fornecedora_id_fkey` FOREIGN KEY (`fornecedora_id`) REFERENCES `fornecedoras`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `convites_fornecedora` ADD CONSTRAINT `convites_fornecedora_fornecedora_id_fkey` FOREIGN KEY (`fornecedora_id`) REFERENCES `fornecedoras`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
