-- CreateTable
CREATE TABLE `paginas` (
    `chave` VARCHAR(30) NOT NULL,
    `titulo` VARCHAR(160) NOT NULL,
    `conteudo` MEDIUMTEXT NOT NULL,
    `publicada` BOOLEAN NOT NULL DEFAULT true,
    `versao` INTEGER NOT NULL DEFAULT 1,
    `atualizado_em` DATETIME(3) NOT NULL,
    `quem` VARCHAR(191) NOT NULL,

    PRIMARY KEY (`chave`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `paginas_versoes` (
    `id` VARCHAR(191) NOT NULL,
    `chave` VARCHAR(30) NOT NULL,
    `versao` INTEGER NOT NULL,
    `titulo` VARCHAR(160) NOT NULL,
    `conteudo` MEDIUMTEXT NOT NULL,
    `publicada` BOOLEAN NOT NULL,
    `exigiu_aceite` BOOLEAN NOT NULL DEFAULT false,
    `usuario_id` VARCHAR(191) NULL,
    `quem` VARCHAR(191) NOT NULL,
    `criado_em` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    UNIQUE INDEX `paginas_versoes_chave_versao_key`(`chave`, `versao`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

