-- AlterTable
ALTER TABLE `pedidos` ADD COLUMN `grupo_id` VARCHAR(191) NULL;

-- AlterTable
ALTER TABLE `vendas` ADD COLUMN `grupo_id` VARCHAR(191) NULL;

-- CreateTable
CREATE TABLE `grupos_whatsapp` (
    `id` VARCHAR(191) NOT NULL,
    `nome` VARCHAR(60) NOT NULL,
    `codigo` VARCHAR(40) NOT NULL,
    `papel` ENUM('masculino', 'feminino', 'promocao', 'acessorios', 'calcados') NULL,
    `ordem` INTEGER NOT NULL DEFAULT 0,
    `ativo` BOOLEAN NOT NULL DEFAULT true,
    `criado_em` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    UNIQUE INDEX `grupos_whatsapp_nome_key`(`nome`),
    UNIQUE INDEX `grupos_whatsapp_codigo_key`(`codigo`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `vendas` ADD CONSTRAINT `vendas_grupo_id_fkey` FOREIGN KEY (`grupo_id`) REFERENCES `grupos_whatsapp`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `pedidos` ADD CONSTRAINT `pedidos_grupo_id_fkey` FOREIGN KEY (`grupo_id`) REFERENCES `grupos_whatsapp`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- Grupos iniciais (CLAUDE.md, "Grupos de WhatsApp"). Novos entram pelo painel.
INSERT INTO `grupos_whatsapp` (`id`, `nome`, `codigo`, `papel`, `ordem`) VALUES
    ('grupo_menino', 'Menino', 'menino', 'masculino', 1),
    ('grupo_meninas', 'Meninas', 'meninas', 'feminino', 2),
    ('grupo_liquida', 'Liquida Salty', 'liquida', 'promocao', 3),
    ('grupo_acessorios', 'Acessórios', 'acessorios', 'acessorios', 4),
    ('grupo_calcados', 'Calçados', 'calcados', 'calcados', 5);

-- Vendas já registradas com o nome do grupo passam a apontar para ele.
UPDATE `vendas` v JOIN `grupos_whatsapp` g ON g.`nome` = v.`grupo` SET v.`grupo_id` = g.`id` WHERE v.`grupo` IS NOT NULL;
