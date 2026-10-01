-- CreateTable
CREATE TABLE `google_drive` (
    `id` INTEGER NOT NULL,
    `email` VARCHAR(191) NULL,
    `autorizacao_cifrada` TEXT NOT NULL,
    `pasta_id` VARCHAR(191) NULL,
    `pasta_fotos_id` VARCHAR(191) NULL,
    `conectado_em` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `backups` (
    `id` VARCHAR(191) NOT NULL,
    `situacao` ENUM('rodando', 'ok', 'erro') NOT NULL DEFAULT 'rodando',
    `origem` VARCHAR(20) NOT NULL,
    `arquivo` VARCHAR(191) NULL,
    `tamanho` INTEGER NULL,
    `no_drive` BOOLEAN NOT NULL DEFAULT false,
    `fotos_enviadas` INTEGER NOT NULL DEFAULT 0,
    `mensagem` TEXT NULL,
    `iniciado_em` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `terminado_em` DATETIME(3) NULL,

    INDEX `backups_iniciado_em_idx`(`iniciado_em`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `backup_fotos` (
    `caminho` VARCHAR(191) NOT NULL,
    `drive_id` VARCHAR(191) NOT NULL,
    `enviada_em` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    PRIMARY KEY (`caminho`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
