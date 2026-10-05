-- CreateTable
CREATE TABLE `alertas` (
    `id` VARCHAR(191) NOT NULL,
    `cliente_id` VARCHAR(191) NOT NULL,
    `tamanho` VARCHAR(20) NULL,
    `publico` VARCHAR(10) NULL,
    `categoria_id` VARCHAR(40) NULL,
    `marca` VARCHAR(80) NULL,
    `criado_em` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `alertas_cliente_id_idx`(`cliente_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `avisos_alerta` (
    `cliente_id` VARCHAR(191) NOT NULL,
    `peca_id` VARCHAR(191) NOT NULL,
    `avisado_em` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `avisos_alerta_peca_id_idx`(`peca_id`),
    PRIMARY KEY (`cliente_id`, `peca_id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `alertas` ADD CONSTRAINT `alertas_cliente_id_fkey` FOREIGN KEY (`cliente_id`) REFERENCES `clientes`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `avisos_alerta` ADD CONSTRAINT `avisos_alerta_cliente_id_fkey` FOREIGN KEY (`cliente_id`) REFERENCES `clientes`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `avisos_alerta` ADD CONSTRAINT `avisos_alerta_peca_id_fkey` FOREIGN KEY (`peca_id`) REFERENCES `pecas`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

