-- AlterTable
ALTER TABLE `clientes` ADD COLUMN `usuario_id` VARCHAR(191) NULL;

-- CreateTable
CREATE TABLE `favoritos` (
    `cliente_id` VARCHAR(191) NOT NULL,
    `peca_id` VARCHAR(191) NOT NULL,
    `criado_em` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `favoritos_peca_id_idx`(`peca_id`),
    PRIMARY KEY (`cliente_id`, `peca_id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `links_de_senha` (
    `id` VARCHAR(191) NOT NULL,
    `usuario_id` VARCHAR(191) NOT NULL,
    `codigo_hash` VARCHAR(64) NOT NULL,
    `expira_em` DATETIME(3) NOT NULL,
    `usado_em` DATETIME(3) NULL,
    `criado_em` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    UNIQUE INDEX `links_de_senha_codigo_hash_key`(`codigo_hash`),
    INDEX `links_de_senha_usuario_id_idx`(`usuario_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateIndex
CREATE UNIQUE INDEX `clientes_usuario_id_key` ON `clientes`(`usuario_id`);

-- AddForeignKey
ALTER TABLE `clientes` ADD CONSTRAINT `clientes_usuario_id_fkey` FOREIGN KEY (`usuario_id`) REFERENCES `usuarios`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `favoritos` ADD CONSTRAINT `favoritos_cliente_id_fkey` FOREIGN KEY (`cliente_id`) REFERENCES `clientes`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `favoritos` ADD CONSTRAINT `favoritos_peca_id_fkey` FOREIGN KEY (`peca_id`) REFERENCES `pecas`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `links_de_senha` ADD CONSTRAINT `links_de_senha_usuario_id_fkey` FOREIGN KEY (`usuario_id`) REFERENCES `usuarios`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
