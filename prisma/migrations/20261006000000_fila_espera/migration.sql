-- CreateTable
CREATE TABLE `fila_espera` (
    `id` VARCHAR(191) NOT NULL,
    `cliente_id` VARCHAR(191) NOT NULL,
    `peca_id` VARCHAR(191) NOT NULL,
    `criado_em` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `avisado_em` DATETIME(3) NULL,

    INDEX `fila_espera_peca_id_idx`(`peca_id`),
    UNIQUE INDEX `fila_espera_cliente_id_peca_id_key`(`cliente_id`, `peca_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `fila_espera` ADD CONSTRAINT `fila_espera_cliente_id_fkey` FOREIGN KEY (`cliente_id`) REFERENCES `clientes`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `fila_espera` ADD CONSTRAINT `fila_espera_peca_id_fkey` FOREIGN KEY (`peca_id`) REFERENCES `pecas`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

