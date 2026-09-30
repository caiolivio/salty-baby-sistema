-- AlterTable
ALTER TABLE `pedidos` ADD COLUMN `venda_id` VARCHAR(191) NULL;

-- CreateIndex
CREATE UNIQUE INDEX `pedidos_venda_id_key` ON `pedidos`(`venda_id`);

-- AddForeignKey
ALTER TABLE `pedidos` ADD CONSTRAINT `pedidos_venda_id_fkey` FOREIGN KEY (`venda_id`) REFERENCES `vendas`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;
