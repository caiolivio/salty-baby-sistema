-- CreateTable
CREATE TABLE `pedidos` (
    `id` VARCHAR(191) NOT NULL,
    `numero` INTEGER NOT NULL,
    `nome_cliente` VARCHAR(120) NOT NULL,
    `status` ENUM('reservado', 'expirado', 'cancelado', 'pago') NOT NULL DEFAULT 'reservado',
    `reservado_ate` DATETIME(3) NOT NULL,
    `total_centavos` INTEGER NOT NULL,
    `criado_em` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `atualizado_em` DATETIME(3) NOT NULL,

    UNIQUE INDEX `pedidos_numero_key`(`numero`),
    INDEX `pedidos_status_reservado_ate_idx`(`status`, `reservado_ate`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `itens_pedido` (
    `pedido_id` VARCHAR(191) NOT NULL,
    `peca_id` VARCHAR(191) NOT NULL,
    `ordem` INTEGER NOT NULL DEFAULT 0,
    `preco_centavos` INTEGER NOT NULL,

    INDEX `itens_pedido_peca_id_idx`(`peca_id`),
    PRIMARY KEY (`pedido_id`, `peca_id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `itens_pedido` ADD CONSTRAINT `itens_pedido_pedido_id_fkey` FOREIGN KEY (`pedido_id`) REFERENCES `pedidos`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `itens_pedido` ADD CONSTRAINT `itens_pedido_peca_id_fkey` FOREIGN KEY (`peca_id`) REFERENCES `pecas`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;
