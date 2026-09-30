-- AlterTable
ALTER TABLE `pedidos` ADD COLUMN `cliente_id` VARCHAR(191) NULL,
    ADD COLUMN `observacao` TEXT NULL,
    ADD COLUMN `telefone_cliente` VARCHAR(40) NULL;

-- AddForeignKey
ALTER TABLE `pedidos` ADD CONSTRAINT `pedidos_cliente_id_fkey` FOREIGN KEY (`cliente_id`) REFERENCES `clientes`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;
