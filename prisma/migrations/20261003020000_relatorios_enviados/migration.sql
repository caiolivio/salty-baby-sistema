-- CreateTable
CREATE TABLE `relatorios_enviados` (
    `id` VARCHAR(191) NOT NULL,
    `fornecedora_id` VARCHAR(191) NOT NULL,
    `mes` VARCHAR(7) NOT NULL,
    `enviado_em` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `quem` VARCHAR(191) NOT NULL,

    INDEX `relatorios_enviados_mes_idx`(`mes`),
    UNIQUE INDEX `relatorios_enviados_fornecedora_id_mes_key`(`fornecedora_id`, `mes`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `relatorios_enviados` ADD CONSTRAINT `relatorios_enviados_fornecedora_id_fkey` FOREIGN KEY (`fornecedora_id`) REFERENCES `fornecedoras`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
