-- CreateTable
CREATE TABLE `alteracoes` (
    `id` VARCHAR(191) NOT NULL,
    `tabela` VARCHAR(20) NOT NULL,
    `registro_id` VARCHAR(191) NOT NULL,
    `rotulo` VARCHAR(191) NOT NULL,
    `campo` VARCHAR(80) NOT NULL,
    `antes` TEXT NULL,
    `depois` TEXT NULL,
    `restrito` BOOLEAN NOT NULL DEFAULT false,
    `usuario_id` VARCHAR(191) NULL,
    `quem` VARCHAR(191) NOT NULL,
    `motivo` VARCHAR(191) NULL,
    `criado_em` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `alteracoes_tabela_registro_id_criado_em_idx`(`tabela`, `registro_id`, `criado_em`),
    INDEX `alteracoes_criado_em_idx`(`criado_em`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
